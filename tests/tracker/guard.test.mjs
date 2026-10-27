import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { loadContract } from '../../lib/contract.mjs';
import { readMapping } from '../../lib/tracker/mapping.mjs';
import { decide } from '../../lib/tracker/guard.mjs';
import { CONTRACT_DIR, ROOT } from '../helpers/kit.mjs';

const contract = loadContract(CONTRACT_DIR);
const mapping = readMapping(join(ROOT, 'tracker'));

const status = (name, category = 'indeterminate') => ({ name, statusCategory: { key: category } });
// Jira as the agent's token sees it: one item, the transitions it may make there, and the agent's work in progress.
function fakeJira({ type = 'Story', st = status('Ready', 'new'), labels = [], transitions = [], busy = [], comments = [] } = {}) {
  const calls = [];
  return {
    calls,
    async get(path) {
      calls.push(path);
      if (path === '/rest/api/3/issue/DEMO-12/transitions') return { transitions };
      if (path === '/rest/api/3/issue/DEMO-12') {
        return { key: 'DEMO-12', fields: { issuetype: { name: type }, status: st, labels, description: null, parent: null, subtasks: [], issuelinks: [] } };
      }
      throw new Error(`Jira GET ${path} returned 404`);
    },
    async searchAll() {
      return busy.map((key) => ({ key, fields: { subtasks: [] } }));
    },
    async getAll() {
      return comments;
    },
  };
}
// GitHub with the branch of DEMO-12 already pushed and no blocking item.
const github = {
  async get(path) {
    if (path === '/git/matching-refs/heads/feature/DEMO-12-') return [{ ref: 'refs/heads/feature/DEMO-12-login' }];
    if (path.startsWith('/git/matching-refs/')) return [];
    throw new Error(`GitHub GET ${path} returned 404`);
  },
  async getAll() {
    return [];
  },
};
const call = (agentType, toolInput) => ({
  hook_event_name: 'PreToolUse',
  tool_name: 'mcp__atlassian__transitionJiraIssue',
  tool_input: { cloudId: mapping.cloud_id, issueIdOrKey: 'DEMO-12', ...toolInput },
  ...(agentType === undefined ? {} : { agent_type: agentType }),
});
const run = (input, jira = fakeJira(), gh = github) => decide(input, { contract, mapping, jira, github: gh });

test('the main session, or an agent without a role of the contract, may not move an item', async () => {
  const jira = fakeJira();
  assert.deepEqual(await run(call(undefined, { transitionName: 'Start' }), jira), {
    allow: false,
    reason: 'jira-guard: only an agent may move a Jira item; this call does not come from a subagent named after a role of the contract',
  });
  for (const role of ['general-purpose', 'human', 'automation']) {
    assert.deepEqual(await run(call(role, { transitionName: 'Start' }), jira), {
      allow: false,
      reason: `jira-guard: "${role}" is not an agent role of the contract`,
    });
  }
  // Decided without reading Jira.
  assert.deepEqual(jira.calls, []);
});

test('qa may not accept: the transition is for you', async () => {
  const jira = fakeJira({ st: status('In QA') });
  assert.deepEqual(await run(call('qa', { transitionName: 'Accept' }), jira), {
    allow: false,
    reason: 'jira-guard: qa may not make "Accept" on DEMO-12; it is for human',
  });
});

test('fe-dev may start when the guards hold', async () => {
  assert.deepEqual(await run(call('fe-dev', { transitionName: 'Start' })), { allow: true });
});

test('fe-dev may not start with no WIP left; the reason names the guard', async () => {
  assert.deepEqual(await run(call('fe-dev', { transitionName: 'Start' }), fakeJira({ busy: ['DEMO-3'] })), {
    allow: false,
    reason: 'jira-guard: "Start" on DEMO-12 needs wip-available',
  });
});

test('a missing branch shows up with the other missing guards', async () => {
  const noBranch = { ...github, get: async (path) => (path.startsWith('/git/matching-refs/') ? [] : github.get(path)) };
  assert.deepEqual(await run(call('fe-dev', { transitionName: 'Start' }), fakeJira({ busy: ['DEMO-3'] }), noBranch), {
    allow: false,
    reason: 'jira-guard: "Start" on DEMO-12 needs wip-available, branch-created',
  });
});

test('an item with the needs-you label waits for you, whatever the agent', async () => {
  assert.deepEqual(await run(call('fe-dev', { transitionName: 'Start' }), fakeJira({ labels: ['needs-you'] })), {
    allow: false,
    reason: 'jira-guard: DEMO-12 has the label needs-you and waits for you',
  });
});

test('a transition id is turned into its name through the transitions the agent may make', async () => {
  const jira = fakeJira({ transitions: [{ id: '21', name: 'Start', to: { name: 'In Progress' } }] });
  assert.deepEqual(await run(call('fe-dev', { transitionId: '21' }), jira), { allow: true });
  assert.deepEqual(await run(call('fe-dev', { transitionId: '41' }), jira), {
    allow: false,
    reason: 'jira-guard: transition 41 is not available on DEMO-12',
  });
});

test('a transition the contract does not have from the current status is refused', async () => {
  assert.deepEqual(await run(call('fe-dev', { transitionName: 'Submit' })), {
    allow: false,
    reason: 'jira-guard: the contract has no transition "Submit" from "Ready" for a Story',
  });
  assert.deepEqual(await run(call('fe-dev', { transitionName: 'Start' }), fakeJira({ type: 'Improvement' })), {
    allow: false,
    reason: 'jira-guard: DEMO-12 is a Improvement, which the contract does not know',
  });
});

test('a Sub-task uses its own workflow', async () => {
  const jira = fakeJira({ type: 'Sub-task', st: status('To Do', 'new') });
  assert.deepEqual(await run(call('be-dev', { transitionName: 'Start' }), jira), { allow: true });
  assert.deepEqual(await run(call('qa', { transitionName: 'Start' }), jira), {
    allow: false,
    reason: 'jira-guard: qa may not make "Start" on DEMO-12; it is for fe-dev, be-dev',
  });
});

test('when the facts cannot be read, the call is refused', async () => {
  const broken = { ...fakeJira(), get: async () => { throw new Error('Jira GET /rest/api/3/issue/DEMO-12 returned 401: Unauthorized'); } };
  assert.deepEqual(await run(call('fe-dev', { transitionName: 'Start' }), broken), {
    allow: false,
    reason: 'jira-guard: could not check DEMO-12: Jira GET /rest/api/3/issue/DEMO-12 returned 401: Unauthorized',
  });
});
