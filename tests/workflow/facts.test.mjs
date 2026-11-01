import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readRoster } from '../../lib/agents/roster.mjs';
import { readContract } from '../../lib/contract.mjs';
import { readGates } from '../../lib/quality/gates.mjs';
import { readMapping } from '../../lib/tracker/mapping.mjs';
import { agentNames, gatherFacts, reviewReports, workLabels } from '../../lib/workflow/facts.mjs';
import { recordedClient } from '../helpers/jira.mjs';
import { CONTRACT_DIR, ROOT } from '../helpers/kit.mjs';

const contract = readContract(CONTRACT_DIR);
const mapping = readMapping(join(ROOT, 'tracker'));
const roster = readRoster(join(ROOT, 'agents'));
const gates = readGates(join(ROOT, 'quality'));
const ctx = { contract, mapping, roster, gates, apps: { dev: 'tungph7-ao-dev', review: 'tungph7-ao-review' }, approvers: ['TungPH7'], space: 'DEMO' };
// Answers of DEMO and ao-pilot on 2026-11-01, read with the CI token and your gh login, trimmed and scrubbed: Epic
// DEMO-11 with its docs branch, Story DEMO-12 with two Sub-tasks and its merged PR #11, Task DEMO-15 with no PR.
const recording = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/workflow/api/demo.json'), 'utf8'));
const noLocal = { ledger: () => false, runState: () => null, runStates: () => [] };
const gather = (command, arg, { change = () => {}, local = noLocal } = {}) => {
  const copy = structuredClone(recording);
  change(copy);
  return gatherFacts({ command, arg, jira: recordedClient(copy.jira), github: recordedClient(copy.github), local, ...ctx });
};

test('the Agent field value of every role, in the names Jira uses', () => {
  const names = agentNames(contract, mapping);
  assert.equal(names.ba, 'Business Analyst');
  assert.equal(names['fe-dev'], 'Frontend Developer');
  assert.deepEqual(Object.keys(names).sort(), Object.keys(roster.roles).sort());
});

test('labels name the dev role and the effort (tracker/jira.yaml work_labels); others are left out', () => {
  assert.deepEqual(mapping.work_labels, { role_prefix: 'ao-', effort_prefix: 'ao-effort-' });
  assert.deepEqual(workLabels(['ao-fe-dev', 'ao-effort-xhigh', 'needs-you'], mapping, roster), { role: 'fe-dev', roles: ['fe-dev'], effort: 'xhigh' });
  assert.deepEqual(workLabels(['ao-qa-lead', 'ao-effort-huge', 'frontend'], mapping, roster), { role: null, roles: [], effort: null });
  assert.equal(workLabels(['ao-effort-xhigh', 'ao-effort-max'], mapping, roster).effort, 'max', 'the higher effort wins');
  assert.deepEqual(workLabels(['ao-be-dev', 'ao-fe-dev'], mapping, roster).roles, ['be-dev', 'fe-dev'], 'two roles are both kept, for build to refuse');
});

test('a Story with Sub-tasks: its state, Agent, parent Epic, each Sub-task, its newest PR and the Epic\'s docs', async () => {
  const facts = await gather('build', 'DEMO-12');
  const { item, epic, docs, pr } = facts;
  assert.deepEqual([item.key, item.workType, item.state, item.agent, item.rework, item.flagged], ['DEMO-12', 'story', 'done', 'qa', 0, false]);
  assert.deepEqual(item.parent, { key: 'DEMO-11', type: 'Epic', status: 'In Progress' });
  assert.deepEqual(item.subtasks.map(({ key, workType, state }) => [key, workType, state]), [['DEMO-13', 'sub-task', 'done'], ['DEMO-14', 'sub-task', 'done']]);
  assert.match(item.subtasks[0].summary, /^BE:/);
  assert.deepEqual(item.requests, []);

  assert.deepEqual([epic.key, epic.state], ['DEMO-11', 'in-progress']);
  assert.ok(epic.gates['spec-approval'] < epic.gates['plan-approval'], 'both gates passed, the spec first');
  assert.deepEqual(epic.children.map(({ key, workType, state }) => [key, workType, state]), [['DEMO-12', 'story', 'done']], 'the items ba created in stage plan');

  assert.deepEqual([docs.branch, docs.exists, docs.pr], ['feature/DEMO-11-spec', true, null]);
  assert.match(docs.spec, /^# Spec: /);
  assert.match(docs.design, /^# Design: |^# /);
  assert.match(docs.plan, /^# /);

  assert.deepEqual([pr.number, pr.state, pr.merged, pr.headRef, pr.base, pr.docsEpic], [11, 'closed', true, 'feature/DEMO-12-coupon-code', 'develop', null]);
  assert.deepEqual(pr.ci, { green: true, failed: false, pending: false });
  assert.deepEqual(pr.reports.reviewer, { sha: pr.headSha, at: '2026-10-30T19:46:40Z', ok: true, blocking: 0, state: 'COMMENTED', onHead: true });
  assert.equal(pr.reports.security.onHead, true);
  assert.deepEqual([pr.changesRequested, pr.approved, pr.protectedPaths], [false, true, []]);
  assert.deepEqual([facts.dependenciesMerged, facts.ledger, facts.run], [true, false, null]);
  assert.deepEqual(facts.wip, { epicShaping: { used: 0, limit: 1 }, devAgent: {} });
});

test('a PR command reads the PR first, then the item of its branch', async () => {
  const facts = await gather('review', '11');
  assert.deepEqual([facts.pr.number, facts.item.key, facts.epic.key], [11, 'DEMO-12', 'DEMO-11']);
});

test('an item with no PR and no Epic, and an empty .ai/runs/', async () => {
  const facts = await gather('build', 'DEMO-15');
  assert.deepEqual([facts.item.workType, facts.item.state, facts.pr, facts.epic, facts.docs, facts.run], ['task', 'new', null, null, null, null]);
  const status = await gather('status');
  assert.deepEqual(status.runs, []);
});

test('the WIP of each dev agent the item would start, and what .ai/ holds for it', async () => {
  const labelled = (a) => {
    a.jira['/rest/api/3/issue/DEMO-13?fields=summary,issuetype,status,labels'].fields.labels = ['ao-be-dev'];
    a.jira['/rest/api/3/issue/DEMO-14?fields=summary,issuetype,status,labels'].fields.labels = ['ao-fe-dev', 'ao-effort-xhigh'];
    const busy = (agent) => `/rest/api/3/search/jql?fields=subtasks&jql=project = "DEMO" AND "Agent" = "${agent}" AND status in ("In Progress")`;
    a.jira[busy('Backend Developer')] = { issues: [{ key: 'DEMO-31', fields: { subtasks: [] } }] };
    a.jira[busy('Frontend Developer')] = { issues: [] };
  };
  const local = { ledger: (key) => key === 'DEMO-12', runState: (key) => (key === 'DEMO-12' ? { key, runs: [] } : null), runStates: () => [] };
  const facts = await gather('build', 'DEMO-12', { change: labelled, local });
  assert.deepEqual(facts.item.subtasks.map(({ role, effort }) => [role, effort]), [['be-dev', null], ['fe-dev', 'xhigh']]);
  assert.deepEqual(facts.wip.devAgent, { 'be-dev': false, 'fe-dev': true });
  assert.deepEqual([facts.ledger, facts.run], [true, { key: 'DEMO-12', runs: [] }]);
});

test('status without a key lists the items not done, with their flags and requests, and the open PRs', async () => {
  const facts = await gather('status');
  const byKey = Object.fromEntries(facts.items.map((item) => [item.key, item]));
  assert.equal(byKey['DEMO-11'].state, 'in-progress');
  assert.equal(byKey['DEMO-16'].state, 'ready-for-qa');
  assert.equal(byKey['DEMO-5'].flag, 'audit', 'the flag of a failed audit');
  assert.ok(!('DEMO-12' in byKey), 'a Done item is left out');
  assert.deepEqual(facts.pulls, []);
});

test('the read-only App token cannot read the older commit statuses: CI is read from the check runs then (T12)', async () => {
  const statusless = (a) => (a.github['/commits/2e3689d23cc9ab587355836551a4fa3f5231d4bc/status'] = { $status: 403 });
  const facts = await gather('review', '11', { change: statusless });
  assert.deepEqual(facts.pr.ci, { green: true, failed: false, pending: false });
  const otherError = (a) => (a.github['/commits/2e3689d23cc9ab587355836551a4fa3f5231d4bc/check-runs'] = { $status: 403 });
  await assert.rejects(gather('review', '11', { change: otherError }), /returned 403/, 'only the statuses are read around');
});

test('ba labels items with the prefixes the facts read (tracker/jira.yaml work_labels)', () => {
  const ba = readFileSync(join(ROOT, 'agents', 'prompts', 'ba.md'), 'utf8');
  const { role_prefix: role, effort_prefix: effort } = mapping.work_labels;
  for (const label of [`${role}be-dev`, `${role}fe-dev`, `${role}devops`, `${effort}xhigh`, `${effort}max`]) assert.ok(ba.includes(`\`${label}\``), label);
});

test('the newest report of each role, and the newest full security report the new part counts from (spec 2.6)', () => {
  const body = (role, scope = '') => `# Review: fix(cart): x (DEMO-12)\n\nRole: ${role}\n${scope}\n## Findings\n\nKhông có finding.\n\n## Verdict\n- [x] **Approve**\n`;
  const bot = 'tungph7-ao-review[bot]';
  const [X, Y, Z] = ['a'.repeat(40), 'b'.repeat(40), 'c'.repeat(40)];
  const review = (role, sha, at, scope) => ({ user: { login: bot }, commit_id: sha, submitted_at: at, state: 'COMMENTED', body: body(role, scope) });
  const reviews = [
    review('security', X, '2026-11-04T08:00:00Z'),
    review('reviewer', Y, '2026-11-05T08:00:00Z'),
    review('security', Y, '2026-11-05T09:00:00Z', `Scope: changes since ${X.slice(0, 7)}\n`),
    { ...review('security', Z, '2026-11-05T10:00:00Z'), user: { login: 'someone' } },
  ];
  const { reports, securityFull } = reviewReports(reviews, { roles: ['reviewer', 'security'], bot, head: Z });
  assert.deepEqual([reports.reviewer.sha, reports.security.sha, reports.security.onHead], [Y, Y, false], 'a report of another login does not count');
  assert.deepEqual(securityFull, { sha: X, at: '2026-11-04T08:00:00Z', ok: true, blocking: 0, state: 'COMMENTED', onHead: false });
  assert.equal(reviewReports(reviews.slice(2, 3), { roles: ['reviewer', 'security'], bot, head: Z }).securityFull, null, 'only a report of the new part');
});

// Stage spec commits on the docs branch of this checkout and pushes only with the docs PR (spec 2.4): ba's SPEC is not
// on GitHub yet when ux and sa come next (T17 of dev-workflow, Epic DEMO-20).
test('the docs of an Epic are read from the docs branch of this checkout when it is here, before GitHub has it', async () => {
  const notPushed = (a) => {
    a.github['/branches/feature%2FDEMO-11-spec'] = { $status: 404 };
    for (const name of ['spec', 'design', 'plan']) a.github[`/contents/docs/specs/DEMO-11/${name}.md?ref=feature/DEMO-11-spec`] = { $status: 404 };
  };
  const here = { 'docs/specs/DEMO-11/spec.md': '# Spec: committed here\n' };
  const local = { ...noLocal, branch: (name) => name === 'feature/DEMO-11-spec', file: (branch, path) => (branch === 'feature/DEMO-11-spec' ? (here[path] ?? null) : null) };
  const { docs } = await gather('build', 'DEMO-11', { change: notPushed, local });
  assert.deepEqual([docs.exists, docs.spec, docs.design, docs.plan], [true, '# Spec: committed here\n', null, null]);
  const remote = await gather('build', 'DEMO-11', { change: notPushed });
  assert.deepEqual([remote.docs.exists, remote.docs.spec], [false, null], 'without the branch here, GitHub is read as before');
});

test('a PR on the branch of an item outside the space reads no item, and the children of an Epic are read in the space only (T15a)', async () => {
  const foreign = (a) => (a.github['/pulls/11'].head.ref = 'feature/SHOP-5-coupon-code');
  const facts = await gather('review', '11', { change: foreign });
  assert.deepEqual([facts.item, facts.outside], [null, 'SHOP-5']);
  assert.ok(Object.keys(recording.jira).some((key) => key.includes('jql=project = "DEMO" AND parent = "DEMO-11"')), 'the recorded JQL names the space');
});
