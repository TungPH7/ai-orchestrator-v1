import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadContract } from '../../lib/contract.mjs';
import { readMapping } from '../../lib/tracker/mapping.mjs';
import { findDrift, manualChecks, readJiraConfig, tokenWarnings } from '../../lib/tracker/drift.mjs';
import { recordedClient } from '../helpers/jira.mjs';
import { CONTRACT_DIR, ROOT } from '../helpers/kit.mjs';

const contract = loadContract(CONTRACT_DIR);
const mapping = readMapping(join(ROOT, 'tracker'));
// Every GET readJiraConfig made for the DEMO space on 2026-10-28, trimmed to the fields it reads.
const recording = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/tracker/api/demo.json'), 'utf8'));

const snapshot = await readJiraConfig(recordedClient(recording), { space: 'DEMO', mapping });
const drift = (change) => {
  const copy = structuredClone(snapshot);
  change(copy);
  return findDrift(copy, { contract, mapping });
};
const workflow = (snap, name) => snap.workflows.find((w) => w.name === name);
const transition = (snap, wf, name, from) => workflow(snap, wf).transitions.find((t) => t.name === name && (!from || t.from[0] === from));
// Reads the space again from a changed copy of the recording.
const reread = async (change) => {
  const copy = structuredClone(recording);
  change(copy);
  return findDrift(await readJiraConfig(recordedClient(copy), { space: 'DEMO', mapping }), { contract, mapping });
};

test('reads the space, its scheme and the three workflows with status names and categories', () => {
  assert.equal(snapshot.space, 'DEMO');
  assert.deepEqual(snapshot.scheme, {
    name: 'AO workflow scheme',
    defaultWorkflow: 'jira',
    issueTypes: { 'Sub-task': 'AO sub-task', Epic: 'AO epic', Bug: 'AO standard', Task: 'AO standard', Story: 'AO standard' },
  });
  assert.deepEqual(snapshot.issueTypes, ['Sub-task', 'Epic', 'Story', 'Bug', 'Task']);
  assert.deepEqual(snapshot.workflows.map(({ name }) => name), ['AO standard', 'AO epic', 'AO sub-task']);

  const standard = workflow(snapshot, 'AO standard');
  assert.ok(standard.statuses.some((s) => s.name === 'Ready for QA' && s.category === 'in-progress'));
  assert.ok(standard.transitions.some((t) => t.type === 'INITIAL' && t.to === 'New'));
  assert.ok(standard.transitions.some((t) => t.name === 'Start' && t.from.join() === 'Ready' && t.to === 'In Progress'));
});

test('reads transition rules with group names, the Resolution screen and the Resolution set', () => {
  assert.deepEqual(transition(snapshot, 'AO standard', 'Start').restrict, ['ao-agents']);
  assert.deepEqual(transition(snapshot, 'AO standard', 'Refine').restrict, ['ao-humans', 'ao-automation']);
  const cancel = transition(snapshot, 'AO standard', 'Cancel', 'New');
  assert.equal(cancel.screen.id, '3');
  assert.ok(cancel.screen.fields.includes('Resolution'));
  assert.equal(cancel.setsResolution, null);
  assert.equal(transition(snapshot, 'AO standard', 'Accept').setsResolution, 'Done');
  assert.equal(transition(snapshot, 'AO standard', 'Accept').screen, null);
});

test('reads groups, resolutions, fields and the board', () => {
  assert.deepEqual(snapshot.groups, { 'ao-humans': { members: undefined }, 'ao-agents': { members: ['orchestratoragent'] }, 'ao-automation': { members: ['orchestratorci'] } });
  assert.deepEqual(snapshot.resolutions, ['Done', 'Done', "Won't Do", 'Duplicate', 'Not a bug', 'Cannot Reproduce']);
  assert.deepEqual(snapshot.fields.Severity, { options: ['Critical', 'High', 'Medium', 'Low'] });
  assert.deepEqual(snapshot.fields['Fix versions'], {});
  assert.equal(snapshot.fields.Resolution, undefined);
  assert.equal(snapshot.board.filter, 'project = DEMO AND issuetype != Epic ORDER BY Rank ASC');
  assert.deepEqual(snapshot.board.columns.map(({ name }) => name), ['Backlog', 'Ready', 'In Progress', 'In Review', 'QA', 'Done']);
  assert.deepEqual(snapshot.board.columns[1], { name: 'Ready', statuses: ['To Do', 'Ready'], max: undefined });
  assert.equal(snapshot.board.columns[3].max, 2);
});

test('the DEMO space as recorded matches the mapping', () => {
  assert.deepEqual(findDrift(snapshot, { contract, mapping }), []);
});

test('a workflow missing from Jira', () => {
  assert.deepEqual(
    drift((s) => (s.workflows = s.workflows.filter((w) => w.name !== 'AO epic'))),
    [{ kind: 'workflow-missing', message: 'AO epic: workflow not found' }],
  );
});

test('a missing status, a status in the wrong category, and a status the mapping lacks', () => {
  assert.deepEqual(
    drift((s) => {
      const standard = workflow(s, 'AO standard');
      standard.statuses = standard.statuses.filter((st) => st.name !== 'Cancelled');
      standard.transitions = standard.transitions.filter((t) => t.to !== 'Cancelled');
      standard.statuses.find((st) => st.name === 'Ready').category = 'in-progress';
      standard.statuses.push({ name: 'Backlog', category: 'to-do' });
    }).filter(({ kind }) => kind.startsWith('status')),
    [
      { kind: 'status-category', message: 'AO standard: status "Ready" is in category In Progress, expected To Do' },
      { kind: 'status-missing', message: 'AO standard: status "Cancelled" is missing' },
      { kind: 'status-extra', message: 'AO standard: status "Backlog" is not in the mapping' },
    ],
  );
});

test('a transition with the wrong to status', () => {
  assert.deepEqual(
    drift((s) => (transition(s, 'AO standard', 'Start').to = 'In Review')),
    [{ kind: 'transition-path', message: 'AO standard: transition "Start" goes from "Ready" to "In Review", expected from "Ready" to "In Progress"' }],
  );
});

test('a transition with the wrong from status', () => {
  assert.deepEqual(
    drift((s) => (transition(s, 'AO epic', 'Cancel', 'Planning').from = ['Done'])),
    [{ kind: 'transition-path', message: 'AO epic: transition "Cancel" goes from "Done" to "Cancelled", expected from "Planning" to "Cancelled"' }],
  );
});

test('a missing transition, and one the mapping lacks', () => {
  assert.deepEqual(
    drift((s) => {
      const standard = workflow(s, 'AO standard');
      standard.transitions = standard.transitions.filter((t) => t.name !== 'QA fail');
      standard.transitions.push({ name: 'Reopen', type: 'DIRECTED', from: ['Done'], to: 'In Progress', restrict: null, screen: null, setsResolution: null });
    }),
    [
      { kind: 'transition-missing', message: 'AO standard: transition "QA fail" from "In QA" to "In Progress" is missing' },
      { kind: 'transition-extra', message: 'AO standard: transition "Reopen" from "Done" to "In Progress" is not in the mapping' },
    ],
  );
});

test('a transition from any status is never in the mapping', () => {
  assert.deepEqual(
    drift((s) => workflow(s, 'AO sub-task').transitions.push({ name: 'Done', type: 'GLOBAL', from: [], to: 'Done', restrict: null, screen: null, setsResolution: null })),
    [{ kind: 'transition-extra', message: 'AO sub-task: transition "Done" from any status to "Done" is not in the mapping' }],
  );
});

test('items created in the wrong status', () => {
  assert.deepEqual(
    drift((s) => (workflow(s, 'AO standard').transitions.find((t) => t.type === 'INITIAL').to = 'Ready')),
    [{ kind: 'initial-status', message: 'AO standard: items are created in "Ready", expected "New"' }],
  );
});

test('a transition without its Restrict rule, or restricted to other groups', () => {
  assert.deepEqual(
    drift((s) => {
      transition(s, 'AO standard', 'QA fail').restrict = null;
      transition(s, 'AO sub-task', 'Start').restrict = ['ao-humans'];
    }),
    [
      { kind: 'restrict-missing', message: 'AO standard: transition "QA fail" from "In QA" to "In Progress" has no Restrict rule, expected groups "ao-agents"' },
      { kind: 'restrict-groups', message: 'AO sub-task: transition "Start" from "To Do" to "In Progress" is restricted to "ao-humans", expected "ao-agents"' },
    ],
  );
});

test('a Restrict rule on a group outside the mapping shows its name', async () => {
  const result = await reread((r) => {
    const workflows = r['/rest/api/3/workflows/search?expand=values.transitions&queryString=AO standard'];
    const start = workflows.values[0].transitions.find((t) => t.name === 'Start');
    start.conditions.conditions[0].parameters.groupIds = 'g-other';
    r['/rest/api/3/group/bulk?groupId=g-other'] = { isLast: true, values: [{ name: 'jira-users', groupId: 'g-other' }] };
  });
  assert.deepEqual(result, [
    { kind: 'restrict-groups', message: 'AO standard: transition "Start" from "Ready" to "In Progress" is restricted to "jira-users", expected "ao-agents"' },
  ]);
});

test('a cancel that does not ask for a Resolution, or shows a screen without it', () => {
  assert.deepEqual(
    drift((s) => {
      transition(s, 'AO standard', 'Cancel', 'Ready').screen = null;
      transition(s, 'AO epic', 'Cancel', 'New').screen = { id: '1', fields: ['Summary'] };
    }),
    [
      { kind: 'resolution-screen', message: 'AO standard: transition "Cancel" from "Ready" to "Cancelled" does not ask for a Resolution' },
      { kind: 'resolution-screen', message: 'AO epic: transition "Cancel" from "New" to "Cancelled" shows screen 1, which has no Resolution field' },
    ],
  );
});

test('a transition into Done that does not set the Resolution, or sets another', () => {
  assert.deepEqual(
    drift((s) => {
      transition(s, 'AO standard', 'Accept').setsResolution = null;
      transition(s, 'AO epic', 'Complete').setsResolution = "Won't Do";
    }),
    [
      { kind: 'resolution-set', message: 'AO standard: transition "Accept" from "In QA" to "Done" does not set Resolution "Done"' },
      { kind: 'resolution-set', message: 'AO epic: transition "Complete" from "In Progress" to "Done" sets Resolution "Won\'t Do", expected "Done"' },
    ],
  );
});

test('the space has no workflow scheme, or another one', () => {
  assert.deepEqual(
    drift((s) => (s.scheme = null)),
    [{ kind: 'scheme-missing', message: 'DEMO: the space has no workflow scheme' }],
  );
  assert.deepEqual(
    drift((s) => (s.scheme.name = 'DEMO: Software Simplified Workflow Scheme')),
    [{ kind: 'scheme-name', message: 'DEMO: the space uses workflow scheme "DEMO: Software Simplified Workflow Scheme", expected "AO workflow scheme"' }],
  );
});

test('a work type missing from the space, or on the wrong workflow', () => {
  assert.deepEqual(
    drift((s) => {
      s.issueTypes = s.issueTypes.filter((t) => t !== 'Sub-task');
      delete s.scheme.issueTypes['Sub-task'];
      s.scheme.issueTypes.Bug = 'AO epic';
      delete s.scheme.issueTypes.Task;
    }),
    [
      { kind: 'type-missing', message: 'DEMO: work type "Sub-task" is not in the space' },
      { kind: 'type-workflow', message: 'DEMO: work type "Task" uses workflow "jira", expected "AO standard"' },
      { kind: 'type-workflow', message: 'DEMO: work type "Bug" uses workflow "AO epic", expected "AO standard"' },
    ],
  );
});

test('a missing group, and a service account outside its group', () => {
  assert.deepEqual(
    drift((s) => {
      delete s.groups['ao-humans'];
      s.groups['ao-agents'].members = [];
    }),
    [
      { kind: 'group-missing', message: 'group "ao-humans" not found' },
      { kind: 'group-member', message: 'group "ao-agents" does not contain "orchestratoragent"' },
    ],
  );
});

test('a missing resolution', () => {
  assert.deepEqual(
    drift((s) => (s.resolutions = s.resolutions.filter((r) => r !== 'Not a bug'))),
    [{ kind: 'resolution-missing', message: 'resolution "Not a bug" not found' }],
  );
});

test('a missing field, and a select field with other options', () => {
  assert.deepEqual(
    drift((s) => {
      delete s.fields.Flagged;
      s.fields.Severity.options = ['Critical', 'High', 'Low', 'Medium'];
    }),
    [
      { kind: 'field-options', message: 'field "Severity" has options "Critical", "High", "Low", "Medium", expected "Critical", "High", "Medium", "Low"' },
      { kind: 'field-missing', message: 'field "Flagged" not found' },
    ],
  );
});

test('the board filter ignores quotes, spaces and case', () => {
  assert.deepEqual(drift((s) => (s.board.filter = 'project = "DEMO" and issuetype != Epic   order by Rank ASC')), []);
  assert.deepEqual(
    drift((s) => (s.board.filter = 'project = DEMO ORDER BY Rank ASC')),
    [{ kind: 'board-filter', message: 'DEMO: the board filter is "project = DEMO ORDER BY Rank ASC", expected "project = DEMO AND issuetype != Epic ORDER BY Rank ASC"' }],
  );
});

test('board columns, their statuses, the WIP limit and a status that should stay off the board', () => {
  assert.deepEqual(
    drift((s) => {
      const [, ready, inProgress, inReview, qa, done] = s.board.columns;
      ready.statuses = ['Ready'];
      inReview.max = undefined;
      qa.max = 5;
      done.statuses.push('Cancelled');
      s.board.columns = [ready, inProgress, inReview, qa, done];
    }),
    [
      { kind: 'board-columns', message: 'DEMO: the board columns are "Ready", "In Progress", "In Review", "QA", "Done", expected "Backlog", "Ready", "In Progress", "In Review", "QA", "Done"' },
      { kind: 'board-column-statuses', message: 'DEMO: column "Ready" has statuses "Ready", expected "Ready", "To Do"' },
      { kind: 'board-wip', message: 'DEMO: column "In Review" has no limit, expected 2' },
      { kind: 'board-wip', message: 'DEMO: column "QA" allows 5 work items, expected no limit' },
      { kind: 'board-column-statuses', message: 'DEMO: column "Done" has statuses "Done", "Cancelled", expected "Done"' },
      { kind: 'board-unplaced', message: 'DEMO: status "Cancelled" is in column "Done", expected off the board' },
    ],
  );
});

test('a space without a Kanban board', () => {
  assert.deepEqual(drift((s) => (s.board = null)), [{ kind: 'board-missing', message: 'DEMO: the space has no Kanban board' }]);
});

test('a search that only finds workflows with a similar name counts as missing', async () => {
  const result = await reread((r) => {
    const epic = r['/rest/api/3/workflows/search?expand=values.transitions&queryString=AO epic'];
    epic.values[0].name = 'AO epic copy';
  });
  assert.deepEqual(result, [{ kind: 'workflow-missing', message: 'AO epic: workflow not found' }]);
});

test('lists what the API cannot show, for a check by hand', () => {
  assert.deepEqual(manualChecks(contract, mapping), [
    'The Kanban backlog is on and holds "New" (Board settings → Columns)',
    'The Atlassian MCP server accepts API tokens (admin.atlassian.com → Connectors)',
    'GitHub for Atlassian is connected to the project repository',
    'Each field is on the screens of the work types that use it (Space settings → Work items → Screens)',
  ]);
});

test('warns about tokens that expire within 14 days or have expired', () => {
  assert.deepEqual(tokenWarnings(mapping, new Date('2026-10-28T09:00:00Z')), []);
  assert.deepEqual(tokenWarnings(mapping, new Date('2027-10-13T09:00:00Z')), []);
  assert.deepEqual(tokenWarnings(mapping, new Date('2027-10-20T23:00:00Z')), [
    'the token of "orchestratoragent" (ATLASSIAN_AGENT_TOKEN) expires on 2027-10-27, in 7 days',
    'the token of "orchestratorci" (JIRA_CI_TOKEN) expires on 2027-10-27, in 7 days',
  ]);
  assert.deepEqual(tokenWarnings(mapping, new Date('2027-10-28T00:30:00Z')), [
    'the token of "orchestratoragent" (ATLASSIAN_AGENT_TOKEN) expired on 2027-10-27',
    'the token of "orchestratorci" (JIRA_CI_TOKEN) expired on 2027-10-27',
  ]);
});
