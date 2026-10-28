import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadContract } from '../../lib/contract.mjs';
import { readMapping } from '../../lib/tracker/mapping.mjs';
import { planMoves, reconcile } from '../../lib/tracker/reconcile.mjs';
import { recordedClient } from '../helpers/jira.mjs';
import { CONTRACT_DIR, ROOT } from '../helpers/kit.mjs';

const contract = loadContract(CONTRACT_DIR);
const mapping = readMapping(join(ROOT, 'tracker'));

// planMoves decides from the guards alone. A second run starts where the first left the item.
const plan = (state, guards, options = {}) => planMoves(contract, 'story', { state, guards, ...options });
const ids = ({ moves }) => moves.map(({ transition }) => transition);
const again = (first, guards) => plan(first.state, guards, { reworkCount: first.reworkCount });

test('PR open, CI green and sub-tasks done: submit; a second run changes nothing', () => {
  const guards = ['subtasks-done', 'pr-open', 'ci-green'];
  const first = plan('in-progress', guards);
  assert.deepEqual(first.moves, [{ transition: 'submit', from: 'in-progress', to: 'in-review' }]);
  assert.equal(first.state, 'in-review');
  assert.deepEqual(ids(again(first, guards)), []);
  assert.deepEqual(ids(plan('in-progress', ['pr-open', 'ci-green'])), []);
});

test('CI red in review: request-changes, counted as rework; a second run changes nothing', () => {
  const guards = ['subtasks-done', 'pr-open', 'changes-requested'];
  const first = plan('in-review', guards);
  assert.deepEqual(first.moves, [{ transition: 'request-changes', from: 'in-review', to: 'in-progress' }]);
  assert.equal(first.reworkCount, 1);
  assert.deepEqual(ids(again(first, guards)), []);
});

test('changes asked on the newest commit while CI is green: no submit, since request-changes would undo it', () => {
  const guards = ['subtasks-done', 'pr-open', 'ci-green', 'changes-requested'];
  assert.deepEqual(ids(plan('in-progress', guards)), []);
  assert.deepEqual(ids(plan('in-review', guards)), ['request-changes']);
});

test('PR approved, merged and deployed to its QA environment: deploy-to-qa; a second run changes nothing', () => {
  const guards = ['merge-approved', 'pr-merged', 'qa-deployed'];
  const first = plan('in-review', guards);
  assert.deepEqual(first.moves, [{ transition: 'deploy-to-qa', from: 'in-review', to: 'ready-for-qa' }]);
  assert.deepEqual(ids(again(first, guards)), []);
  // Without your approval the item waits in review (plan, question 1).
  assert.deepEqual(ids(plan('in-review', ['pr-merged', 'qa-deployed'])), []);
});

test('one run moves on until no automation transition holds', () => {
  // GitHub never has a PR both open and merged; the guards only show that one run reaches the end.
  const first = plan('in-progress', ['subtasks-done', 'pr-open', 'ci-green', 'merge-approved', 'pr-merged', 'qa-deployed']);
  assert.deepEqual(ids(first), ['submit', 'deploy-to-qa']);
  assert.equal(first.state, 'ready-for-qa');
});

test('no move where only agents or you act, and refine only with dor-met', () => {
  for (const state of ['ready', 'ready-for-qa', 'in-qa', 'done', 'cancelled']) {
    assert.deepEqual(ids(plan(state, ['dor-met', 'qa-report-passed', 'qa-report-failed', 'resolution-set'])), [], state);
  }
  assert.deepEqual(ids(plan('new', [])), []);
  assert.deepEqual(ids(plan('new', ['dor-met'])), ['refine']);
});

test('the rework that reaches the limit flags the item, and a flag an agent missed is set later', () => {
  const back = plan('in-review', ['changes-requested'], { reworkCount: 2 });
  assert.deepEqual([ids(back), back.reworkCount, back.flag], [['request-changes'], 3, true]);
  assert.equal(plan('in-review', ['changes-requested'], { reworkCount: 2, flagged: true }).flag, false);
  // An agent reached the limit but did not flag the item (plan, decision 2).
  assert.equal(plan('in-progress', [], { reworkCount: 3 }).flag, true);
  assert.equal(plan('in-progress', [], { reworkCount: 3, flagged: true }).flag, false);
  assert.equal(plan('in-progress', [], { reworkCount: 2 }).flag, false);
});

// reconcile reads the item, its history and the facts. Jira answers in the shape of GET /issue; GitHub from the
// recording of facts-github.test.mjs, where PR #5 of DEMO-12 is open and green, and PR #4 of DEMO-11 is merged and
// deployed to development.
const answers = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/tracker/api/github.json'), 'utf8'));
const reworkHistory = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/tracker/api/changelog-rework.json'), 'utf8')).values;
const status = (name, category) => ({ name, statusCategory: { key: category } });
const DONE = status('Done', 'done');
const EPIC_IN_PROGRESS = status('In Progress', 'indeterminate');
const issue = ({ key, type = 'Story', st, parent, subtasks = [], description = 'Có user story', labels = [] }) => ({
  key,
  fields: {
    issuetype: { name: type },
    status: st,
    labels,
    description: description && { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }] },
    parent: parent && { key: parent.key, fields: { issuetype: { name: parent.type }, status: parent.st } },
    subtasks: subtasks.map(([k, s]) => ({ key: k, fields: { status: s } })),
    issuelinks: [],
  },
});

function fakeJira({ issues, changelogs = {}, children = {} }) {
  return {
    async get(path) {
      const found = issues.find(({ key }) => key === decodeURIComponent(path.split('/').pop()));
      if (!found) throw new Error(`Jira GET ${path} returned 404`);
      return found;
    },
    getAll: async (path) => changelogs[path.split('/').at(-2)] ?? [],
    searchAll: async (jql) => children[jql] ?? [],
  };
}

const github = (change = () => {}) => {
  const copy = structuredClone(answers);
  change(copy);
  return recordedClient(copy);
};
const run = (key, jira, gh = github()) => reconcile(key, { jira, github: gh, contract, mapping, approvers: ['TungPH7'] });

test('reconciles a Story from Jira and GitHub, and names the transition as Jira does', async () => {
  const story = issue({ key: 'DEMO-12', st: status('In Progress', 'indeterminate'), subtasks: [['DEMO-13', DONE], ['DEMO-14', DONE]] });
  assert.deepEqual(await run('DEMO-12', fakeJira({ issues: [story] })), [
    { key: 'DEMO-12', transition: 'submit', name: 'Submit', from: 'in-progress', to: 'in-review' },
  ]);
  const open = issue({ key: 'DEMO-12', st: status('In Progress', 'indeterminate'), subtasks: [['DEMO-13', status('In Progress', 'indeterminate')]] });
  assert.deepEqual(await run('DEMO-12', fakeJira({ issues: [open] })), []);
});

test('a deployment to development moves the merged item to QA; one to staging leaves a new item in review', async () => {
  const merged = (a) => {
    a['/pulls/4/reviews'] = [{ user: { login: 'TungPH7' }, state: 'APPROVED', commit_id: 'c4', submitted_at: '2026-11-01T11:00:00Z' }];
    a['/commits/c4/check-runs'] = { total_count: 1, check_runs: [{ name: 'test', status: 'completed', conclusion: 'success' }] };
    a['/commits/c4/status'] = { state: 'pending', total_count: 0, statuses: [] };
  };
  const jira = fakeJira({ issues: [issue({ key: 'DEMO-11', st: status('In Review', 'indeterminate') })] });
  assert.deepEqual(await run('DEMO-11', jira, github(merged)), [
    { key: 'DEMO-11', transition: 'deploy-to-qa', name: 'Deploy to QA', from: 'in-review', to: 'ready-for-qa' },
  ]);
  // New work goes to QA on development (routing.yaml), so a deployment to staging is not one for this item.
  const stagingOnly = (a) => {
    merged(a);
    a['/deployments?environment=development'] = [];
    a['/deployments?environment=staging'] = [{ id: 30, sha: 'd30', ref: 'release/1.2.0', environment: 'staging', created_at: '2026-11-01T13:00:00Z' }];
  };
  assert.deepEqual(await run('DEMO-11', jira, github(stagingOnly)), []);
});

test('flags an item whose rework reached the limit, once', async () => {
  const thirdRework = { created: '2026-11-04T09:00:00.000+0700', items: [{ field: 'status', fromString: 'In Review', toString: 'In Progress' }] };
  const changelogs = { 'DEMO-12': [...reworkHistory, thirdRework] };
  const story = (labels) => issue({ key: 'DEMO-12', st: status('In Progress', 'indeterminate'), subtasks: [['DEMO-13', status('To Do', 'new')]], labels });
  assert.deepEqual(await run('DEMO-12', fakeJira({ issues: [story([])], changelogs })), [{ key: 'DEMO-12', effect: 'flag-needs-you', reworkCount: 3 }]);
  assert.deepEqual(await run('DEMO-12', fakeJira({ issues: [story(['needs-you'])], changelogs })), []);
});

test('an Epic in progress refines its children that meet DoR, and nothing before its plan is approved', async () => {
  const epic = (st) => issue({ key: 'DEMO-10', type: 'Epic', st });
  const parent = { key: 'DEMO-10', type: 'Epic', st: EPIC_IN_PROGRESS };
  const NEW = status('New', 'new');
  const kids = [
    issue({ key: 'DEMO-11', st: status('In Review', 'indeterminate'), parent }),
    issue({ key: 'DEMO-15', st: NEW, parent }),
    issue({ key: 'DEMO-16', st: NEW, parent, description: '' }),
    issue({ key: 'DEMO-17', type: 'Bug', st: NEW, parent }),
  ];
  const children = { 'parent = "DEMO-10"': kids };
  assert.deepEqual(await run('DEMO-10', fakeJira({ issues: [epic(EPIC_IN_PROGRESS), ...kids], children })), [
    { key: 'DEMO-15', transition: 'refine', name: 'Refine', from: 'new', to: 'ready' },
  ]);
  assert.deepEqual(await run('DEMO-10', fakeJira({ issues: [epic(status('Planning', 'new')), ...kids], children })), []);
});
