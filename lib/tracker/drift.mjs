// Compares the live Jira configuration of a space with tracker/jira.yaml (tracker-integration spec section 2.10).
// readJiraConfig turns API answers into a snapshot through a client passed in; findDrift has no I/O.

const CATEGORY_OF = { TODO: 'to-do', IN_PROGRESS: 'in-progress', DONE: 'done' };
const CATEGORY_NAMES = { 'to-do': 'To Do', 'in-progress': 'In Progress', done: 'Done' };

// Snapshot: { space, issueTypes: [name], scheme: { name, defaultWorkflow, issueTypes: { type: workflow } } | null,
// workflows: [{ name, statuses: [{ name, category }], transitions: [{ name, type, from: [status], to }] }] }.
export async function readJiraConfig(client, { space, mapping }) {
  const project = await client.get(`/rest/api/3/project/${encodeURIComponent(space)}`);
  const issueTypes = await client.get('/rest/api/3/issuetype/project', { projectId: project.id });
  const schemes = await client.get('/rest/api/3/workflowscheme/project', { projectId: project.id });
  const typeName = new Map(issueTypes.map(({ id, name }) => [id, name]));
  const scheme = schemes.values?.[0]?.workflowScheme;

  const workflows = [];
  for (const { jira_workflow: name } of Object.values(mapping.workflows)) {
    const statuses = new Map();
    let found;
    // The search matches names that contain the query, so keep only the exact name.
    for await (const page of client.pages('/rest/api/3/workflows/search', { queryString: name, expand: 'values.transitions' })) {
      for (const status of page.statuses ?? []) statuses.set(status.statusReference, status);
      found ??= page.values?.find((workflow) => workflow.name === name);
    }
    if (!found) continue;
    const statusName = (ref) => statuses.get(ref)?.name ?? ref;
    workflows.push({
      name,
      statuses: found.statuses.map(({ statusReference: ref }) => ({ name: statusName(ref), category: CATEGORY_OF[statuses.get(ref)?.statusCategory] })),
      transitions: found.transitions.map((t) => ({
        name: t.name,
        type: t.type,
        from: (t.links ?? []).map((link) => statusName(link.fromStatusReference)),
        to: statusName(t.toStatusReference),
      })),
    });
  }

  return {
    space: project.key,
    issueTypes: issueTypes.map(({ name }) => name),
    scheme: scheme
      ? {
          name: scheme.name,
          defaultWorkflow: scheme.defaultWorkflow,
          issueTypes: Object.fromEntries(Object.entries(scheme.issueTypeMappings ?? {}).map(([id, workflow]) => [typeName.get(id) ?? id, workflow])),
        }
      : null,
    workflows,
  };
}

// Returns every difference as { kind, message }, workflow by workflow in mapping order, then the scheme.
export function findDrift(snapshot, { contract, mapping }) {
  const drift = [];
  const add = (kind, message) => drift.push({ kind, message });

  for (const [id, workflow] of Object.entries(contract.workflows)) {
    const mapped = mapping.workflows[id];
    const name = mapped.jira_workflow;
    const jira = snapshot.workflows.find((w) => w.name === name);
    if (!jira) {
      add('workflow-missing', `${name}: workflow not found`);
      continue;
    }
    const status = (state) => mapped.states[state].status;

    const initial = jira.transitions.find((t) => t.type === 'INITIAL');
    if (initial && initial.to !== status(workflow.initial)) {
      add('initial-status', `${name}: items are created in "${initial.to}", expected "${status(workflow.initial)}"`);
    }

    const expectedStatuses = Object.values(mapped.states);
    for (const { status: statusName, category } of expectedStatuses) {
      const found = jira.statuses.find((s) => s.name === statusName);
      if (!found) add('status-missing', `${name}: status "${statusName}" is missing`);
      else if (found.category !== category) {
        add('status-category', `${name}: status "${statusName}" is in category ${CATEGORY_NAMES[found.category] ?? found.category}, expected ${CATEGORY_NAMES[category]}`);
      }
    }
    for (const { name: statusName } of jira.statuses.filter((s) => !expectedStatuses.some((e) => e.status === s.name))) {
      add('status-extra', `${name}: status "${statusName}" is not in the mapping`);
    }

    // One Jira transition per contract transition and per `from`; a Jira transition with several `from` counts once
    // for each of them, and one from any status has no `from`.
    const expected = workflow.transitions.flatMap(({ id: transition, from, to }) =>
      [from].flat().map((source) => ({ name: mapped.transitions[transition].name, from: status(source), to: status(to) })),
    );
    const actual = jira.transitions
      .filter((t) => t.type !== 'INITIAL')
      .flatMap((t) => (t.from.length > 0 ? t.from : [null]).map((from) => ({ name: t.name, from, to: t.to })));
    const same = (a, b) => a.name === b.name && a.from === b.from && a.to === b.to;
    const missing = expected.filter((e) => !actual.some((a) => same(a, e)));
    const extra = actual.filter((a) => !expected.some((e) => same(a, e)));
    const path = (t) => `from ${t.from === null ? 'any status' : `"${t.from}"`} to "${t.to}"`;
    for (const e of missing) {
      // A Jira transition with the same name but another path is the same transition drawn wrong.
      const index = extra.findIndex((a) => a.name === e.name);
      if (index === -1) {
        add('transition-missing', `${name}: transition "${e.name}" ${path(e)} is missing`);
        continue;
      }
      const [wrong] = extra.splice(index, 1);
      add('transition-path', `${name}: transition "${e.name}" goes ${path(wrong)}, expected ${path(e)}`);
    }
    for (const a of extra) add('transition-extra', `${name}: transition "${a.name}" ${path(a)} is not in the mapping`);
  }

  const space = snapshot.space;
  if (!snapshot.scheme) add('scheme-missing', `${space}: the space has no workflow scheme`);
  else if (snapshot.scheme.name !== mapping.workflow_scheme) {
    add('scheme-name', `${space}: the space uses workflow scheme "${snapshot.scheme.name}", expected "${mapping.workflow_scheme}"`);
  }
  for (const { id, jira_issue_type: type } of contract.work_types) {
    if (!snapshot.issueTypes.includes(type)) {
      add('type-missing', `${space}: work type "${type}" is not in the space`);
      continue;
    }
    if (!snapshot.scheme) continue;
    const workflowId = Object.keys(contract.workflows).find((w) => contract.workflows[w].applies_to.includes(id));
    const want = mapping.workflows[workflowId].jira_workflow;
    const uses = snapshot.scheme.issueTypes[type] ?? snapshot.scheme.defaultWorkflow;
    if (uses !== want) add('type-workflow', `${space}: work type "${type}" uses workflow "${uses}", expected "${want}"`);
  }
  return drift;
}
