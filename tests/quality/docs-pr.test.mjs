import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readContract } from '../../lib/contract.mjs';
import { decideAudit, runAudit } from '../../lib/quality/audit.mjs';
import { docsConditions, docsPullRequest, gatePassage, readDocsFacts } from '../../lib/quality/docs-pr.mjs';
import { readGates } from '../../lib/quality/gates.mjs';
import { decideMerge, runMergeGate } from '../../lib/quality/merge-gate.mjs';
import { readMapping } from '../../lib/tracker/mapping.mjs';
import { recordedClient } from '../helpers/jira.mjs';
import { CONTRACT_DIR, ROOT } from '../helpers/kit.mjs';

const gates = readGates(join(ROOT, 'quality'));
const contract = readContract(CONTRACT_DIR);
const mapping = readMapping(join(ROOT, 'tracker'));
const apps = { dev: 'tungph7-ao-dev', review: 'tungph7-ao-review' };
const passage = gatePassage(contract, mapping, gates.docs_pull_requests.gate);
// The docs PR #14 of Epic DEMO-20 (dev-workflow spec 2.4): the ao-dev App opened it from feature/DEMO-20-spec, it changes
// only the Epic's documents and an ADR, and the CI run of its head started at 09:40 (+07:00), before you approved the plan
// at 10:00. An older head had a CI run at 09:10.
const answers = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/quality/api/docs-pr.json'), 'utf8'));
const HEAD = answers['/pulls/14'].head.sha;
const BRANCH = answers['/pulls/14'].head.ref;
const RUNS = `/actions/runs?branch=${BRANCH}&event=pull_request`;
const EPIC = '/rest/api/3/issue/DEMO-20?fields=issuetype,status';
const CHANGELOG = '/rest/api/3/issue/DEMO-20/changelog';
const epicOf = (a) => ({
  key: 'DEMO-20',
  type: a.jira[EPIC].fields.issuetype.name,
  status: a.jira[EPIC].fields.status.name,
  histories: a.jira[CHANGELOG].values,
});

// The facts of PR #14 after `change` edits a copy of the recording.
const facts = (change = () => {}) => {
  const copy = structuredClone(answers);
  change(copy);
  return {
    pr: copy['/pulls/14'],
    commits: copy['/pulls/14/commits'],
    files: copy['/pulls/14/files'],
    reviews: copy['/pulls/14/reviews'],
    checks: { green: true, failed: false },
    gates,
    apps,
    approvers: ['approver'],
    docs: { epic: epicOf(copy), runs: copy[RUNS].workflow_runs, passage },
  };
};
const decide = (change, more = {}) => decideMerge({ ...facts(change), ...more });
const planning = (a) => {
  a.jira[EPIC].fields.status.name = 'Planning';
  a.jira[CHANGELOG].values.pop();
};
// A commit pushed after you approved: its CI run starts at 10:20 (+07:00).
const late = (a) => {
  for (const run of a[RUNS].workflow_runs) run.created_at = '2026-11-04T03:20:00Z';
};

test('gate ② is passed by Approve plan, from Planning to In Progress; past it the Epic is In Progress or Done', () => {
  assert.deepEqual(passage, { gate: 'plan-approval', transition: 'Approve plan', from: ['Planning'], to: 'In Progress', past: ['In Progress', 'Done'], epicType: 'Epic' });
  assert.deepEqual(gatePassage(contract, mapping, 'spec-approval').past, ['Planning', 'In Progress', 'Done']);
});

test('a docs PR: from the spec branch of an Epic, opened by ao-dev, every file under the Epic\'s specs or the ADRs', () => {
  const { pr, files } = facts();
  assert.equal(docsPullRequest({ pr, files, gates, apps }), 'DEMO-20');
  // A rename counts by its old name too.
  assert.equal(docsPullRequest({ pr, files: [...files, { filename: 'docs/adr/0003-x.md', previous_filename: 'docs/adr/0002-x.md' }], gates, apps }), 'DEMO-20');
});

test('not a docs PR: a file elsewhere, another Epic\'s specs, another branch, another author, or no file', () => {
  const { pr, files } = facts();
  const not = (change, label) => {
    const copy = { pr: structuredClone(pr), files: structuredClone(files) };
    change(copy);
    assert.equal(docsPullRequest({ ...copy, gates, apps }), null, label);
  };
  not((c) => c.files.push({ filename: 'apps/web/app/cart/page.tsx' }), 'a code file');
  not((c) => c.files.push({ filename: 'docs/specs/DEMO-11/spec.md' }), 'the specs of another Epic');
  not((c) => c.files.push({ filename: 'README.md' }), 'a file at the root');
  not((c) => c.files.push({ filename: 'docs/specs/DEMO-20/../../../.github/workflows/ci.yml' }), 'a path that climbs out');
  not((c) => c.files.push({ filename: 'docs/adr/0002-new.md', previous_filename: '.claude/settings.json' }), 'a file renamed from a protected path');
  not((c) => (c.pr.head.ref = 'feature/DEMO-20-remove-line'), 'a work branch, not the spec branch');
  not((c) => (c.pr.head.ref = 'feature/DEMO-21-spec'), 'the spec branch of another item');
  not((c) => (c.pr.user.login = 'approver'), 'a PR you opened');
  not((c) => (c.pr.user.login = 'tungph7-ao-review[bot]'), 'a PR of the review App');
  not((c) => (c.files = []), 'no file');
});

test('merge-gate squashes a docs PR without reports or approval once the Epic is past gate ② and its CI ran before you approved', () => {
  assert.deepEqual(decide(), {
    action: 'merge',
    method: 'squash',
    sha: HEAD,
    title: 'docs(spec): remove a product from the cart (DEMO-20)',
    body: '- docs(spec): write the SPEC of DEMO-20 (DEMO-20)\n- docs(spec): add the screens of DEMO-20 (DEMO-20)\n- docs(spec): add the plan and ADR-0002 of DEMO-20 (DEMO-20)',
    docs: 'DEMO-20',
  });
});

test('before gate ② a docs PR waits for it, and asks for no report or approval', () => {
  assert.deepEqual(decide(planning), { action: 'wait', missing: ['DEMO-20 past gate plan-approval (it is Planning)'], docs: 'DEMO-20' });
});

test('a docs PR whose head came after you approved the plan is reviewed like any PR: reports and your approval', () => {
  const decision = decide(late);
  assert.equal(decision.action, 'wait');
  assert.deepEqual(decision.missing, ['reviewer report on head d0c5d0c', 'security report on head d0c5d0c', 'approval on head d0c5d0c']);
  assert.match(decision.note, /^head d0c5d0c came after Approve plan of DEMO-20 at 2026-11-04T03:00:00\.000Z, so it is reviewed like any PR$/);
});

test('the newest CI run of the docs branch counts: it must be on the head and start before you approved', () => {
  const run = (more) => ({ id: 9100, name: 'CI', event: 'pull_request', head_branch: BRANCH, head_sha: HEAD, created_at: '2026-11-04T03:20:00Z', run_attempt: 1, ...more });
  // A push after you approved, even back to the commit you read, starts a new run of that commit.
  const pushedBack = (a) => a[RUNS].workflow_runs.unshift(run());
  assert.match(decide(pushedBack).note, /^head d0c5d0c came after Approve plan of DEMO-20/);
  // The head moved and its run has not started yet: the newest run is of another commit, so it waits.
  const moved = (a) => a[RUNS].workflow_runs.unshift(run({ head_sha: 'c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0', created_at: '2026-11-04T02:50:00Z' }));
  assert.deepEqual(decide(moved), { action: 'wait', missing: ['a CI run on head d0c5d0c'], docs: 'DEMO-20' });
  // Only a run of the docs branch for its PR counts: a run of the same commit elsewhere, or by hand, does not.
  for (const [label, more] of [['another branch', { head_branch: 'feature/DEMO-21-x' }], ['a manual run', { event: 'workflow_dispatch' }], ['another workflow', { name: 'jira-sync' }]]) {
    const only = (a) => (a[RUNS].workflow_runs = [run({ created_at: '2026-11-04T02:30:00Z', ...more })]);
    assert.deepEqual(decide(only), { action: 'wait', missing: ['a CI run on head d0c5d0c'], docs: 'DEMO-20' }, label);
  }
  const noCi = (a) => (a[RUNS].workflow_runs = a[RUNS].workflow_runs.filter(({ name }) => name !== 'CI'));
  assert.deepEqual(decide(noCi), { action: 'wait', missing: ['a CI run on head d0c5d0c'], docs: 'DEMO-20' });
});

test('the conditions of every PR still hold for a docs PR: CI, title, description, conflicts and a request for changes', () => {
  const red = decide(undefined, { checks: { green: false, failed: true } });
  assert.deepEqual(red, { action: 'wait', missing: ['CI green on head d0c5d0c'], docs: 'DEMO-20' });
  assert.deepEqual(decide((a) => (a['/pulls/14'].mergeable = false)).missing, ['conflicts with develop resolved']);
  assert.match(decide((a) => (a['/pulls/14'].title = 'spec of the cart')).missing[0], /^valid title/);
  const asked = (a) => a['/pulls/14/reviews'].push({ user: { login: 'approver' }, state: 'CHANGES_REQUESTED', commit_id: HEAD, body: 'Đổi AC2' });
  assert.deepEqual(decide(asked).missing, ['answer to the changes requested on head d0c5d0c']);
});

test('a docs PR is not merged on its own when the Epic is not an Epic, or Jira cannot be read', () => {
  const story = (a) => (a.jira[EPIC].fields.issuetype.name = 'Story');
  assert.equal(decide(story).action, 'wait');
  assert.match(decide(story).note, /DEMO-20 is a Story, not an Epic/);
  assert.deepEqual(decide(undefined, { docs: undefined }), { action: 'wait', missing: ['JIRA_CI_TOKEN, for merge-gate to read DEMO-20'], docs: 'DEMO-20' });
  // Past the gate with no Approve plan in the changelog: the time cannot be checked, so it is reviewed like any PR.
  assert.match(decide((a) => (a.jira[CHANGELOG].values = [])).note, /no Approve plan in the changelog of DEMO-20/);
});

test('docsConditions alone, for audit and merge-gate alike', () => {
  const { pr, docs } = facts();
  assert.deepEqual(docsConditions({ pr, key: 'DEMO-20', ...docs }), { docs: true, missing: [] });
});

// runMergeGate with recorded GitHub and Jira answers, and a writer that records what it would send.
async function runOnce({ change = () => {}, jira = true, dryRun = false } = {}) {
  const copy = structuredClone(answers);
  change(copy);
  const { jira: jiraAnswers, ...github } = copy;
  const sent = [];
  const lines = [];
  const writer = { request: async (method, path, query, body) => sent.push({ method, path, body }) };
  await runMergeGate({
    github: recordedClient(github),
    mergeClient: async () => writer,
    docs: jira ? { jira: recordedClient(jiraAnswers), passage } : undefined,
    gates,
    apps,
    approvers: ['approver'],
    dryRun,
    log: (line) => lines.push(line),
  });
  return { lines, sent };
}

test('a run reads the Epic and the CI runs of a docs PR, and merges it with the ao-dev App', async () => {
  const { lines, sent } = await runOnce();
  assert.deepEqual(lines, ['Merged #14: docs(spec): remove a product from the cart (DEMO-20) (squash at d0c5d0c), the docs PR of DEMO-20']);
  assert.deepEqual(sent.map(({ method, path, body }) => [method, path, body.sha, body.merge_method]), [['PUT', '/pulls/14/merge', HEAD, 'squash']]);
});

test('a run says what a docs PR waits for, and why a late one is reviewed like any PR', async () => {
  assert.deepEqual((await runOnce({ change: planning })).lines, ['Waiting #14: the docs PR of DEMO-20: DEMO-20 past gate plan-approval (it is Planning)']);
  const lateRun = await runOnce({ change: late });
  assert.deepEqual(lateRun.lines, [
    'Waiting #14: reviewer report on head d0c5d0c; security report on head d0c5d0c; approval on head d0c5d0c (head d0c5d0c came after Approve plan of DEMO-20 at 2026-11-04T03:00:00.000Z, so it is reviewed like any PR)',
  ]);
  assert.deepEqual((await runOnce({ jira: false })).lines, ['Waiting #14: the docs PR of DEMO-20: JIRA_CI_TOKEN, for merge-gate to read DEMO-20']);
});

test('readDocsFacts reads the Epic, its changelog and the pull_request runs of the docs branch', async () => {
  const { jira: jiraAnswers, ...github } = structuredClone(answers);
  const read = await readDocsFacts({ github: recordedClient(github), jira: recordedClient(jiraAnswers), key: 'DEMO-20', branch: BRANCH });
  assert.deepEqual(read.epic, epicOf(answers));
  assert.deepEqual(read.runs.map(({ id }) => id), [9002, 9001, 9000]);
});

// audit of the squash commit of PR #14 on develop.
const SQUASH = 'e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9';
const auditFacts = (change) => {
  const f = facts(change);
  Object.assign(f.pr, { state: 'closed', merged_at: '2026-11-04T03:05:00Z', merge_commit_sha: SQUASH, merged_by: { login: 'tungph7-ao-dev[bot]' } });
  return { sha: SQUASH, branch: 'develop', message: f.pr.title, pull: f.pr, files: f.files, reviews: f.reviews, checks: f.checks, gates, apps, approvers: f.approvers, docs: f.docs };
};

test('audit passes the merge of a docs PR that met its conditions, and fails one whose head came after you approved', () => {
  assert.deepEqual(decideAudit(auditFacts()), { ok: true, pr: 14, problems: [], keys: ['DEMO-20'] });
  const failed = decideAudit(auditFacts(late));
  assert.equal(failed.ok, false);
  assert.deepEqual(failed.problems, ['PR #14 was merged without: reviewer report on head d0c5d0c; security report on head d0c5d0c; approval on head d0c5d0c (head d0c5d0c came after Approve plan of DEMO-20 at 2026-11-04T03:00:00.000Z, so it is reviewed like any PR)']);
  assert.equal(decideAudit(auditFacts(planning)).ok, false, 'merged before gate ②');
});

test('a run of audit reads the docs facts of a docs PR with the Jira client', async () => {
  const { jira: jiraAnswers, ...github } = structuredClone(answers);
  github[`/commits/${SQUASH}`] = { sha: SQUASH, commit: { message: answers['/pulls/14'].title } };
  github[`/commits/${SQUASH}/pulls`] = [{ ...answers['/pulls/14'], state: 'closed', merged_at: '2026-11-04T03:05:00Z', merge_commit_sha: SQUASH }];
  github['/pulls/14'] = { ...github[`/commits/${SQUASH}/pulls`][0], merged_by: { login: 'tungph7-ao-dev[bot]' } };
  const lines = [];
  const result = await runAudit({ github: recordedClient(github), docs: { jira: recordedClient(jiraAnswers), passage }, mapping, space: 'DEMO', sha: SQUASH, branch: 'develop', gates, apps, approvers: ['approver'], dryRun: true, log: (line) => lines.push(line) });
  assert.equal(result.ok, true, lines.join('\n'));
  assert.deepEqual(lines, ['audit passed: e9e9e9e on develop is the merge of PR #14, the docs PR of DEMO-20, which met every gate']);
});

test('the docs branch of an Epic outside the space is not a docs PR: merge-gate and audit review it like any PR (T15a)', async () => {
  const { pr, files } = facts();
  assert.equal(docsPullRequest({ pr, files, gates, apps, space: 'DEMO' }), 'DEMO-20');
  assert.equal(docsPullRequest({ pr, files, gates, apps, space: 'SHOP' }), null);
  assert.deepEqual(decide(undefined, { space: 'SHOP' }), { action: 'wait', missing: ['reviewer report on head d0c5d0c', 'security report on head d0c5d0c', 'approval on head d0c5d0c'] });
  assert.equal(decideAudit({ ...auditFacts(), space: 'SHOP' }).ok, false);
  const { jira: jiraAnswers, ...github } = structuredClone(answers);
  const lines = [];
  await runMergeGate({ github: recordedClient(github), mergeClient: async () => assert.fail('no merge'), docs: { jira: recordedClient({}), passage, space: 'SHOP' }, gates, apps, approvers: ['approver'], log: (line) => lines.push(line) });
  assert.deepEqual(lines, ['Waiting #14: reviewer report on head d0c5d0c; security report on head d0c5d0c; approval on head d0c5d0c'], 'and Jira is not read');
  assert.ok(jiraAnswers);
});
