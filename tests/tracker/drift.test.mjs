import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadContract } from '../../lib/contract.mjs';
import { readMapping } from '../../lib/tracker/mapping.mjs';
import { findDrift, readJiraConfig } from '../../lib/tracker/drift.mjs';
import { CONTRACT_DIR, ROOT } from '../helpers/kit.mjs';

const contract = loadContract(CONTRACT_DIR);
const mapping = readMapping(join(ROOT, 'tracker'));
const DEMO = join(ROOT, 'tests/fixtures/tracker/api/demo');
const fixture = (name) => JSON.parse(readFileSync(join(DEMO, `${name}.json`), 'utf8'));

// A client that answers like Jira did for the DEMO space, from the recorded fixtures.
function demoClient(overrides = {}) {
  const answers = {
    '/rest/api/3/project/DEMO': () => fixture('project'),
    '/rest/api/3/issuetype/project': () => fixture('issuetypes'),
    '/rest/api/3/workflowscheme/project': () => fixture('workflowscheme'),
    ...overrides,
  };
  return {
    async get(path, query) {
      if (!answers[path]) throw new Error(`unexpected GET ${path}`);
      return answers[path](query);
    },
    async *pages(path, query) {
      assert.equal(path, '/rest/api/3/workflows/search');
      assert.equal(query.expand, 'values.transitions');
      yield fixture(`workflows-${query.queryString.toLowerCase().replaceAll(' ', '-')}`);
    },
  };
}

const snapshot = await readJiraConfig(demoClient(), { space: 'DEMO', mapping });
const drift = (change) => {
  const copy = structuredClone(snapshot);
  change(copy);
  return findDrift(copy, { contract, mapping });
};
const workflow = (snap, name) => snap.workflows.find((w) => w.name === name);

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
    drift((s) => (workflow(s, 'AO standard').transitions.find((t) => t.name === 'Start').to = 'In Review')),
    [{ kind: 'transition-path', message: 'AO standard: transition "Start" goes from "Ready" to "In Review", expected from "Ready" to "In Progress"' }],
  );
});

test('a transition with the wrong from status', () => {
  assert.deepEqual(
    drift((s) => (workflow(s, 'AO epic').transitions.find((t) => t.name === 'Cancel' && t.from[0] === 'Planning').from = ['Done'])),
    [{ kind: 'transition-path', message: 'AO epic: transition "Cancel" goes from "Done" to "Cancelled", expected from "Planning" to "Cancelled"' }],
  );
});

test('a missing transition, and one the mapping lacks', () => {
  assert.deepEqual(
    drift((s) => {
      const standard = workflow(s, 'AO standard');
      standard.transitions = standard.transitions.filter((t) => t.name !== 'QA fail');
      standard.transitions.push({ name: 'Reopen', type: 'DIRECTED', from: ['Done'], to: 'In Progress' });
    }),
    [
      { kind: 'transition-missing', message: 'AO standard: transition "QA fail" from "In QA" to "In Progress" is missing' },
      { kind: 'transition-extra', message: 'AO standard: transition "Reopen" from "Done" to "In Progress" is not in the mapping' },
    ],
  );
});

test('a transition from any status is never in the mapping', () => {
  assert.deepEqual(
    drift((s) => workflow(s, 'AO sub-task').transitions.push({ name: 'Done', type: 'GLOBAL', from: [], to: 'Done' })),
    [{ kind: 'transition-extra', message: 'AO sub-task: transition "Done" from any status to "Done" is not in the mapping' }],
  );
});

test('items created in the wrong status', () => {
  assert.deepEqual(
    drift((s) => (workflow(s, 'AO standard').transitions.find((t) => t.type === 'INITIAL').to = 'Ready')),
    [{ kind: 'initial-status', message: 'AO standard: items are created in "Ready", expected "New"' }],
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

test('a search that only finds workflows with a similar name counts as missing', async () => {
  const client = demoClient();
  const pages = client.pages;
  client.pages = async function* (path, query) {
    for await (const page of pages(path, query)) {
      yield query.queryString === 'AO epic' ? { ...page, values: page.values.map((w) => ({ ...w, name: 'AO epic copy' })) } : page;
    }
  };
  const snap = await readJiraConfig(client, { space: 'DEMO', mapping });
  assert.deepEqual(findDrift(snap, { contract, mapping }), [{ kind: 'workflow-missing', message: 'AO epic: workflow not found' }]);
});
