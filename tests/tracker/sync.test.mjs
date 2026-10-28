import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadContract } from '../../lib/contract.mjs';
import { readMapping } from '../../lib/tracker/mapping.mjs';
import { runSync, syncEvent } from '../../lib/tracker/sync.mjs';
import { fakeJira, jiraIssue, jiraStatus, recordedClient } from '../helpers/jira.mjs';
import { CONTRACT_DIR, ROOT } from '../helpers/kit.mjs';

const contract = loadContract(CONTRACT_DIR);
const mapping = readMapping(join(ROOT, 'tracker'));

// One trimmed payload per event of spec section 2.7, for PR #5 of DEMO-12 or the deployment of DEMO-11. GitHub answers
// from the recording of facts-github.test.mjs: PR #5 is open and green, PR #4 of DEMO-11 is merged and deployed to
// development.
const payload = (event) => JSON.parse(readFileSync(join(ROOT, `tests/fixtures/tracker/events/${event}.json`), 'utf8'));
const answers = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/tracker/api/github.json'), 'utf8'));
const github = (change = () => {}) => {
  const copy = structuredClone(answers);
  change(copy);
  return recordedClient(copy);
};
// PR #4 approved by you, with green checks, so only the deployment decides for DEMO-11.
const approved = (a) => {
  a['/pulls/4/reviews'] = [{ user: { login: 'TungPH7' }, state: 'APPROVED', commit_id: 'c4', submitted_at: '2026-11-01T11:00:00Z' }];
  a['/commits/c4/check-runs'] = { total_count: 1, check_runs: [{ name: 'test', status: 'completed', conclusion: 'success' }] };
  a['/commits/c4/status'] = { state: 'pending', total_count: 0, statuses: [] };
};

const IN_PROGRESS = jiraStatus('In Progress', 'indeterminate');
const IN_REVIEW = jiraStatus('In Review', 'indeterminate');
const DONE = jiraStatus('Done', 'done');
const NEW = jiraStatus('New', 'new');
const story = (key, st, extra = {}) => jiraIssue({ key, st, subtasks: [['DEMO-13', DONE]], ...extra });
const WAITING_FOR_DEPLOY = 'project = "DEMO" AND status in ("In Review")';

const sync = (event, jira, { gh = github(), body = payload(event) } = {}) =>
  syncEvent({ event, payload: body, jira, github: gh, contract, mapping, space: 'DEMO', approvers: ['TungPH7'] });
const chosen = ({ keys, actions }) => ({ keys, actions: actions.map(({ key, transition, effect }) => `${key} ${transition ?? effect}`) });

test('pull_request: the item of the PR branch and title; open and green with sub-tasks done, it is submitted', async () => {
  const jira = fakeJira({ issues: [story('DEMO-12', IN_PROGRESS)] });
  assert.deepEqual(chosen(await sync('pull_request', jira)), { keys: ['DEMO-12'], actions: ['DEMO-12 submit'] });
});

test('workflow_run of CI: a red run sends the item in review back', async () => {
  const jira = fakeJira({ issues: [story('DEMO-12', IN_REVIEW)] });
  const red = (a) => (a['/commits/c5/check-runs'].check_runs[0].conclusion = 'failure');
  assert.deepEqual(chosen(await sync('workflow_run', jira, { gh: github(red) })), { keys: ['DEMO-12'], actions: ['DEMO-12 request-changes'] });
});

test('pull_request_review: changes asked on the newest commit send the item back', async () => {
  const jira = fakeJira({ issues: [story('DEMO-12', IN_REVIEW)] });
  // The review of the event, as the REST API lists it (upper-case state).
  const { review } = payload('pull_request_review');
  const asked = (a) => a['/pulls/5/reviews'].push({ ...review, state: review.state.toUpperCase() });
  assert.deepEqual(chosen(await sync('pull_request_review', jira, { gh: github(asked) })), { keys: ['DEMO-12'], actions: ['DEMO-12 request-changes'] });
});

test('deployment_status: a successful deployment reconciles every item in review; the merged one goes to QA', async () => {
  const jira = fakeJira({ issues: [story('DEMO-11', IN_REVIEW), story('DEMO-12', IN_REVIEW)], search: { [WAITING_FOR_DEPLOY]: [{ key: 'DEMO-11' }, { key: 'DEMO-12' }] } });
  assert.deepEqual(chosen(await sync('deployment_status', jira, { gh: github(approved) })), {
    keys: ['DEMO-11', 'DEMO-12'],
    actions: ['DEMO-11 deploy-to-qa'],
  });
  assert.deepEqual(jira.searches, [WAITING_FOR_DEPLOY]);
});

test('deployment_status: a failed deployment concerns no item, and one to staging leaves a new item in review', async () => {
  const jira = fakeJira({ issues: [story('DEMO-11', IN_REVIEW)], search: { [WAITING_FOR_DEPLOY]: [{ key: 'DEMO-11' }] } });
  const failed = payload('deployment_status');
  failed.deployment_status.state = 'failure';
  assert.deepEqual(chosen(await sync('deployment_status', jira, { body: failed })), { keys: [], actions: [] });

  const staging = payload('deployment_status');
  Object.assign(staging.deployment, { id: 30, sha: 'd30', ref: 'release/1.2.0', environment: 'staging' });
  staging.deployment_status.environment = 'staging';
  // New work goes to QA on development (routing.yaml), and nothing reached development after the merge.
  const onlyStaging = (a) => {
    approved(a);
    a['/deployments?environment=development'] = [];
  };
  assert.deepEqual(chosen(await sync('deployment_status', jira, { body: staging, gh: github(onlyStaging) })), { keys: ['DEMO-11'], actions: [] });
});

test('workflow_dispatch: reconciles the item given; an Epic in progress refines its children that meet DoR', async () => {
  const parent = { key: 'DEMO-10', type: 'Epic', st: IN_PROGRESS };
  // SCRUM-7 meets DoR too, but lies outside the project space.
  const kids = [jiraIssue({ key: 'DEMO-15', st: NEW, parent }), jiraIssue({ key: 'DEMO-16', st: NEW, parent, description: '' }), jiraIssue({ key: 'SCRUM-7', st: NEW, parent })];
  const jira = fakeJira({ issues: [jiraIssue({ key: 'DEMO-10', type: 'Epic', st: IN_PROGRESS }), ...kids], search: { 'parent = "DEMO-10"': kids } });
  assert.deepEqual(chosen(await sync('workflow_dispatch', jira)), { keys: ['DEMO-10'], actions: ['DEMO-15 refine'] });
});

test('items outside the project space, and other events, are left alone', async () => {
  const jira = fakeJira({});
  const other = payload('pull_request');
  Object.assign(other.pull_request, { title: 'feat(cart): add the cart (SCRUM-3)', head: { ref: 'feature/SCRUM-3-cart', sha: 'x' } });
  assert.deepEqual(chosen(await sync('pull_request', jira, { body: other })), { keys: [], actions: [] });
  assert.deepEqual(chosen(await sync('workflow_dispatch', jira, { body: { inputs: { item: 'SCRUM-1' } } })), { keys: [], actions: [] });
  assert.deepEqual(chosen(await sync('push', jira, { body: {} })), { keys: [], actions: [] });
});

// runSync prints and, unless it is a dry run, makes the changes.
const runEvent = async (event, jira, options = {}) => {
  const lines = [];
  const result = await runSync({ event, payload: payload(event), jira, github: github(), contract, mapping, space: 'DEMO', approvers: ['TungPH7'], log: (line) => lines.push(line), ...options });
  return { lines, failures: result.failures.map(({ key, error }) => `${key}: ${error.message}`) };
};

test('a dry run prints the transitions it would make and writes nothing', async () => {
  const jira = fakeJira({ issues: [story('DEMO-12', IN_PROGRESS)] });
  assert.deepEqual((await runEvent('pull_request', jira, { dryRun: true })).lines, ['pull_request: DEMO-12', 'Would make DEMO-12: Submit (in-progress → in-review)']);
  assert.deepEqual(jira.writes, []);
});

test('a run makes the transitions with their Jira names', async () => {
  const jira = fakeJira({ issues: [story('DEMO-12', IN_PROGRESS)] });
  assert.deepEqual((await runEvent('pull_request', jira)).lines, ['pull_request: DEMO-12', 'Made DEMO-12: Submit (in-progress → in-review)']);
  assert.deepEqual(jira.writes, [['transition', 'DEMO-12', 'Submit']]);
});

test('flag-needs-you sets Flagged and the label, and comments why', async () => {
  const back = (n) => ({ created: `2026-11-0${n}T09:00:00.000+0700`, items: [{ field: 'status', fromString: 'In Review', toString: 'In Progress' }] });
  const jira = fakeJira({
    issues: [jiraIssue({ key: 'DEMO-12', st: IN_PROGRESS, subtasks: [['DEMO-13', IN_PROGRESS]] })],
    fields: [{ id: 'customfield_10021', name: 'Flagged' }, { id: 'labels', name: 'Labels' }],
    changelogs: { 'DEMO-12': [back(2), back(3), back(4)] },
  });
  assert.deepEqual((await runEvent('pull_request', jira)).lines, ['pull_request: DEMO-12', 'Made DEMO-12: flag-needs-you (rework 3)']);
  assert.deepEqual(jira.writes, [
    ['edit', 'DEMO-12', { fields: { customfield_10021: [{ value: 'Impediment' }] }, update: { labels: [{ add: 'needs-you' }] } }],
    ['comment', 'DEMO-12', 'jira-sync: DEMO-12 went back 3 times, the limit in policies.yaml. It is flagged with the label needs-you and waits for you.'],
  ]);
});

test('a change that fails is reported, and the others are still made', async () => {
  const parent = { key: 'DEMO-10', type: 'Epic', st: IN_PROGRESS };
  const kids = [jiraIssue({ key: 'DEMO-15', st: NEW, parent }), jiraIssue({ key: 'DEMO-18', st: NEW, parent })];
  const jira = fakeJira({
    issues: [jiraIssue({ key: 'DEMO-10', type: 'Epic', st: IN_PROGRESS }), ...kids],
    search: { 'parent = "DEMO-10"': kids },
    failOn: ['DEMO-15'],
  });
  const { lines, failures } = await runEvent('workflow_dispatch', jira);
  assert.deepEqual(lines, ['workflow_dispatch: DEMO-10', 'Failed DEMO-15: Refine (new → ready): Jira refused transition on DEMO-15', 'Made DEMO-18: Refine (new → ready)']);
  assert.deepEqual(failures, ['DEMO-15: Jira refused transition on DEMO-15']);
  assert.deepEqual(jira.writes, [['transition', 'DEMO-18', 'Refine']]);
});

test('an item that cannot be reconciled is reported, and the others go on', async () => {
  const jira = fakeJira({ issues: [story('DEMO-11', jiraStatus('Blocked', 'indeterminate')), story('DEMO-12', IN_REVIEW)], search: { [WAITING_FOR_DEPLOY]: [{ key: 'DEMO-11' }, { key: 'DEMO-12' }] } });
  const { lines, failures } = await runEvent('deployment_status', jira);
  assert.deepEqual(failures, ['DEMO-11: DEMO-11 has the status Blocked, which AO standard does not map']);
  assert.deepEqual(lines, ['deployment_status: DEMO-11, DEMO-12', 'Failed DEMO-11: DEMO-11 has the status Blocked, which AO standard does not map', 'No change']);
});
