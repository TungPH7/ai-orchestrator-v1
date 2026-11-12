import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readRoster } from '../../lib/agents/roster.mjs';
import { readContract } from '../../lib/contract.mjs';
import { readGates } from '../../lib/quality/gates.mjs';
import { readMapping } from '../../lib/tracker/mapping.mjs';
import { agentNames, gatherFacts, reviewReports, workLabels } from '../../lib/workflow/facts.mjs';
import { fakeJira, recordedClient } from '../helpers/jira.mjs';
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

test('/ao-review compares a kit copy only on an open PR with green CI, while a report is missing on the head', async () => {
  const asked = [];
  const kitCopy = async (pr) => {
    asked.push(pr.number);
    return { ok: false, reason: 'src/a.mjs differs' };
  };
  const read = (command, change = () => {}) => {
    const copy = structuredClone(recording);
    // PR #11 of the recording is merged: open it again for the compare.
    Object.assign(copy.github['/pulls/11'], { state: 'open', merged_at: null });
    change(copy);
    return gatherFacts({ command, arg: '11', jira: recordedClient(copy.jira), github: recordedClient(copy.github), local: noLocal, ...ctx, kitCopy });
  };
  const closed = await read('review', (copy) => { copy.github['/pulls/11/reviews'] = []; copy.github['/pulls/11'].state = 'closed'; });
  assert.deepEqual([asked, closed.kitCopy], [[], undefined], 'a closed PR is not compared');
  const missing = await read('review', (copy) => { copy.github['/pulls/11/reviews'] = []; });
  assert.deepEqual([asked, missing.kitCopy], [[11], { ok: false, reason: 'src/a.mjs differs' }]);
  asked.length = 0;
  const onHead = await read('review');
  assert.deepEqual(Object.values(onHead.pr.reports).map((report) => report?.onHead), [true, true], 'the recording has both reports on its head');
  assert.deepEqual([asked, onHead.kitCopy], [[], undefined]);
  await read('fix', (copy) => { copy.github['/pulls/11/reviews'] = []; });
  assert.deepEqual(asked, [], 'only /ao-review compares');
  const none = await gatherFacts({ command: 'review', arg: '11', jira: recordedClient(structuredClone(recording).jira), github: recordedClient(structuredClone(recording).github), local: noLocal, ...ctx, kitCopy: async () => null });
  assert.equal('kitCopy' in none, false, 'no claim, no fact');
});

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
  assert.deepEqual(pr.ci, { green: true, failed: false, pending: false, started: true });
  assert.deepEqual(pr.reports.reviewer, { sha: pr.headSha, at: '2026-10-30T19:46:40Z', ok: true, blocking: 0, open: [], state: 'COMMENTED', onHead: true });
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
  assert.deepEqual(facts.pr.ci, { green: true, failed: false, pending: false, started: true });
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
  assert.deepEqual(securityFull, { sha: X, at: '2026-11-04T08:00:00Z', ok: true, blocking: 0, open: [], state: 'COMMENTED', onHead: false });
  assert.equal(reviewReports(reviews.slice(2, 3), { roles: ['reviewer', 'security'], bot, head: Z }).securityFull, null, 'only a report of the new part');
});

// Pilot 1, second review of ao-sample PR #13: the High of a full report stays open through a report of the new part
// that leaves it out, and the next review of the new part is given the findings to check.
test('a report of the new part counts the earlier findings it does not list as Fixed', () => {
  const bot = 'tungph7-ao-review[bot]';
  const [X, Y] = ['a'.repeat(40), 'b'.repeat(40)];
  const HIGH = '| Severity | Axis | Where | Finding | Suggested fix |\n|---|---|---|---|---|\n| High | Security | review-tree.mjs:7 | AGENTS.md reaches the review | remove it |\n| Low | Security | a.ts:1 | x | y |\n';
  const body = (findings, more = '') => `# Review: fix(kit): x (SMP-15)\n\nRole: security\n${more}\n## Findings\n${findings}\n## Verdict\n- [x] **Request changes**\n`;
  const review = (sha, at, text) => ({ user: { login: bot }, commit_id: sha, submitted_at: at, state: 'COMMENTED', body: text });
  const full = review(X, '2026-11-04T08:00:00Z', body(HIGH));
  const leftOut = review(Y, '2026-11-04T09:00:00Z', body('Không có finding.\n', `Scope: changes since ${X.slice(0, 7)}\n`));
  const { reports, securityFull } = reviewReports([full, leftOut], { roles: ['security'], bot, head: Y });
  assert.equal(reports.security.blocking, 1, 'the High of the full report is still open');
  assert.deepEqual(securityFull.open, [{ severity: 'High', where: 'review-tree.mjs:7', finding: 'AGENTS.md reaches the review' }]);
  assert.deepEqual(reports.security.open, securityFull.open, 'the report that left it out keeps its name, for the next review to check');
  const listed = review(Y, '2026-11-04T09:00:00Z', `${body('Không có finding.\n', `Scope: changes since ${X.slice(0, 7)}\n`)}\n## Earlier findings\n| Severity | Where | Finding | Status |\n|---|---|---|---|\n| High | review-tree.mjs:7 | AGENTS.md reaches the review | Fixed |\n`);
  assert.equal(reviewReports([full, listed], { roles: ['security'], bot, head: Y }).reports.security.blocking, 0);
});

test('/ao-status of the space reads the items of an Epic In Progress, with their Fix Versions', async () => {
  const issue = (key, type, status, more = {}) => ({ key, fields: { summary: key, issuetype: { name: type }, status: { name: status }, labels: [], ...more } });
  const open = `project = "DEMO" AND statusCategory != Done ORDER BY Rank ASC`;
  const jira = fakeJira({
    search: {
      [open]: [issue('DEMO-11', 'Epic', 'In Progress'), issue('DEMO-30', 'Epic', 'Specifying'), issue('DEMO-15', 'Task', 'New')],
      'project = "DEMO" AND parent = "DEMO-11"': [issue('DEMO-12', 'Story', 'Done', { fixVersions: [{ name: 'v0.2.0', released: true }] })],
    },
  });
  const { items } = await gatherFacts({ command: 'status', jira, github: { getAll: async () => [] }, local: noLocal, ...ctx });
  assert.deepEqual(items[0].children.map(({ key, state, fixVersions }) => [key, state, fixVersions]), [['DEMO-12', 'done', [{ name: 'v0.2.0', released: true }]]]);
  assert.deepEqual(items.slice(1).map(({ children }) => children), [undefined, undefined], 'only an Epic In Progress can be completed');
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

test('the children of an Epic come with their Sub-tasks, each with its role and effort labels (T17)', async () => {
  const labelled = (a) => {
    a.jira['/rest/api/3/search/jql?fields=summary,issuetype,status,labels,parent&jql=project = "DEMO" AND parent in ("DEMO-12")'].issues[1].fields.labels = ['ao-fe-dev', 'ao-effort-xhigh'];
  };
  const { epic } = await gather('build', 'DEMO-11', { change: labelled });
  assert.deepEqual(epic.children[0].subtasks.map(({ key, role, effort }) => [key, role, effort]), [['DEMO-13', null, null], ['DEMO-14', 'fe-dev', 'xhigh']]);
});

// Pilot 1, T9: the next build after gate ② has to know which child blocks which, so each child comes with its blockers.
test('the children of an Epic come with the items that block them (the inward side of "is blocked by")', async () => {
  const linked = (a) => {
    a.jira['/rest/api/3/search/jql?fields=summary,issuetype,status,labels,issuelinks,fixVersions&jql=project = "DEMO" AND parent = "DEMO-11"'].issues[0].fields.issuelinks = [
      { type: { inward: 'is blocked by', outward: 'blocks' }, inwardIssue: { key: 'DEMO-9' } },
      { type: { inward: 'is blocked by', outward: 'blocks' }, outwardIssue: { key: 'DEMO-30' } },
      { type: { inward: 'is cloned by', outward: 'clones' }, inwardIssue: { key: 'DEMO-31' } },
    ];
  };
  const { epic } = await gather('build', 'DEMO-11', { change: linked });
  assert.deepEqual(epic.children[0].blockedBy, ['DEMO-9']);
  const { epic: plain } = await gather('build', 'DEMO-11');
  assert.deepEqual(plain.children[0].blockedBy, [], 'a child with no link has none');
});

test('a PR on the branch of an item outside the space reads no item, and the children of an Epic are read in the space only (T15a)', async () => {
  const foreign = (a) => (a.github['/pulls/11'].head.ref = 'feature/SHOP-5-coupon-code');
  const facts = await gather('review', '11', { change: foreign });
  assert.deepEqual([facts.item, facts.outside], [null, 'SHOP-5']);
  assert.ok(Object.keys(recording.jira).some((key) => key.includes('jql=project = "DEMO" AND parent = "DEMO-11"')), 'the recorded JQL names the space');
});

// Pilot 1, review of ao-sample PR #6: a file renamed out of a path of security_review counted only by its new name, so a
// full security review fell to high.
test('the files of a PR name a renamed file by its old name and its new one', async () => {
  const renamed = { filename: 'src/common/jwt.ts', previous_filename: 'src/auth/jwt.guard.ts', status: 'renamed', additions: 3, deletions: 1 };
  const facts = await gather('review', '11', { change: (copy) => copy.github['/pulls/11/files'].push(renamed) });
  assert.deepEqual(facts.pr.files.slice(-2), ['src/auth/jwt.guard.ts', 'src/common/jwt.ts']);
});

// GitHub lists at most 3000 files of a PR: /ao-preview compares how many it read with how many the PR changes
// (live-run-fixes spec 2.7). A renamed file is one of each, though files names it twice.
test('a PR says how many files it changes and how many GitHub listed', async () => {
  const renamed = { filename: 'src/common/jwt.ts', previous_filename: 'src/auth/jwt.guard.ts', status: 'renamed', additions: 3, deletions: 1 };
  const facts = await gather('review', '11', { change: (copy) => {
    copy.github['/pulls/11/files'].push(renamed);
    copy.github['/pulls/11'].changed_files = copy.github['/pulls/11/files'].length + 2;
  } });
  assert.equal(facts.pr.filesRead, facts.pr.changedFiles - 2);
  assert.equal(facts.pr.files.length, facts.pr.filesRead + 1);
});

// /ao-preview runs only a branch of this repository (review of ao-sample PR #21). GitHub gives head.repo null once the
// fork of a PR is deleted: that PR is not shown to be from here, so it counts as one from a fork (live-run-fixes 2.8).
test('a PR is from a fork unless its head and base are both this repository; a deleted fork counts as a fork', async () => {
  const repoOf = (head, base) => (copy) => Object.assign(copy.github['/pulls/11'], { head: { ...copy.github['/pulls/11'].head, repo: head }, base: { ...copy.github['/pulls/11'].base, repo: base } });
  const here = { full_name: 'TungPH7/ao-pilot' };
  assert.equal((await gather('review', '11', { change: repoOf(here, here) })).pr.fromFork, false);
  assert.equal((await gather('review', '11', { change: repoOf({ full_name: 'someone/ao-pilot' }, here) })).pr.fromFork, true);
  assert.equal((await gather('review', '11', { change: repoOf(null, here) })).pr.fromFork, true);
});
