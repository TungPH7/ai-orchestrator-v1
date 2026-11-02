import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readRoster } from '../../lib/agents/roster.mjs';
import { readContract } from '../../lib/contract.mjs';
import { readGates } from '../../lib/quality/gates.mjs';
import { readMapping } from '../../lib/tracker/mapping.mjs';
import { PURPOSES, resumePrompt } from '../../lib/workflow/prompts.mjs';
import { decideStep, noteKey } from '../../lib/workflow/steps.mjs';
import { CONTRACT_DIR, ROOT } from '../helpers/kit.mjs';

const contract = readContract(CONTRACT_DIR);
const roster = readRoster(join(ROOT, 'agents'));
const gates = readGates(join(ROOT, 'quality'));
const mapping = readMapping(join(ROOT, 'tracker'));
const options = { roster, contract, gates, mapping };
const HEAD = 'd1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4';
const OLD = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';

const sub = (key, role, more = {}) => ({ key, summary: `${role === 'be-dev' ? 'BE' : 'FE'}: xóa một dòng`, workType: 'sub-task', state: 'to-do', status: 'To Do', labels: [`ao-${role}`], role, roles: [role], effort: null, ...more });
// Story DEMO-21 of Epic DEMO-20, Ready, with a BE and an FE Sub-task; the Epic's docs PR #14 is merged.
function storyFacts(change = {}) {
  const { item = {}, ...rest } = change;
  return {
    command: 'build',
    arg: 'DEMO-21',
    space: 'DEMO',
    item: {
      key: 'DEMO-21', type: 'Story', workType: 'story', state: 'ready', status: 'Ready', summary: 'Xóa sản phẩm khỏi giỏ hàng', labels: [], role: null, roles: [], effort: null, agent: null, rework: 0,
      flagged: false, flag: null, parent: { key: 'DEMO-20', type: 'Epic', status: 'In Progress' }, subtasks: [sub('DEMO-23', 'fe-dev', { effort: 'xhigh', labels: ['ao-fe-dev', 'ao-effort-xhigh'] }), sub('DEMO-22', 'be-dev')], blockedBy: [], requests: [], ...item,
    },
    epic: null,
    docs: { branch: 'feature/DEMO-20-spec', exists: false, pr: { number: 14, state: 'closed', merged: true } },
    pr: null,
    dependenciesMerged: true,
    wip: { epicShaping: { used: 0, limit: 1 }, devAgent: { 'be-dev': true, 'fe-dev': true } },
    ledger: false,
    run: null,
    ...rest,
  };
}
// PR #15 of DEMO-21, open, CI green on HEAD.
const report = (more = {}) => ({ sha: HEAD, at: '2026-11-04T09:00:00Z', ok: true, blocking: 0, state: 'COMMENTED', onHead: true, ...more });
const pr = (more = {}) => ({
  number: 15, title: 'feat(cart): remove a line from the cart (DEMO-21)', state: 'open', merged: false, draft: false, headRef: 'feature/DEMO-21-remove-line', headSha: HEAD, base: 'develop', files: ['apps/api/src/cart.ts'], protectedPaths: [], docsEpic: null,
  ci: { green: true, failed: false, pending: false }, reports: { reviewer: null, security: null }, changesRequested: false, approved: false, securityCompare: null, ...more,
});
const prFacts = (command, prMore = {}, change = {}) => storyFacts({ command, arg: '15', pr: pr(prMore), ...change, item: { state: 'in-review', status: 'In Review', agent: 'fe-dev', subtasks: [sub('DEMO-22', 'be-dev', { state: 'done' }), sub('DEMO-23', 'fe-dev', { state: 'done' })], ...change.item } });
const decide = (command, facts, more = {}) => decideStep(command, facts, { ...options, ...more });
const plan = (decision) => decision.runs.map(({ role, key, effort, purpose }) => `${role} ${key} ${effort} ${purpose}`);

test('/ao-build of a Story: BE Sub-task first from develop, then FE, at the effort of its label, which opens the PR', () => {
  const decision = decide('build', storyFacts());
  assert.equal(decision.go, true);
  assert.deepEqual(plan(decision), ['be-dev DEMO-22 high build', 'fe-dev DEMO-23 xhigh build']);
  const [be, fe] = decision.runs;
  assert.equal(be.prompt, 'Build Sub-task DEMO-22, the BE Sub-task of Story DEMO-21, which is Ready. The branch develop is checked out and up to date with origin.');
  assert.deepEqual(be.checkout, { branch: 'develop', pull: true });
  assert.equal(fe.prompt, 'Build Sub-task DEMO-23, the FE Sub-task of Story DEMO-21. Sub-task DEMO-22 is done on the branch of the Story, which is checked out; read its handover comment. Open the PR of the Story when your Sub-task is done.');
  assert.equal(fe.checkout, undefined, 'FE goes on on the branch BE left');
  assert.equal(be.story, 'DEMO-21');
  assert.match(decision.lines[0], /^DEMO-21 Story "Xóa sản phẩm khỏi giỏ hàng": Ready; Sub-task DEMO-23 \(ao-fe-dev\), DEMO-22 \(ao-be-dev\); no PR$/);
});

test('/ao-build of a Task by its role label; the roster effort when there is no effort label', () => {
  const task = storyFacts({ item: { key: 'DEMO-24', type: 'Task', workType: 'task', subtasks: [], labels: ['ao-devops'], role: 'devops', roles: ['devops'] }, wip: { epicShaping: { used: 0, limit: 1 }, devAgent: { devops: true } } });
  const decision = decide('build', task);
  assert.deepEqual(decision.runs, [{ role: 'devops', key: 'DEMO-24', effort: roster.roles.devops.effort, purpose: 'build', prompt: 'Do Task DEMO-24. It is Ready. The branch develop is checked out and up to date with origin.', checkout: { branch: 'develop', pull: true } }]);
  assert.equal(decide('build', storyFacts({ item: { ...task.item, effort: 'max', labels: ['ao-devops', 'ao-effort-max'] }, wip: task.wip })).runs[0].effort, 'max');
});

// dev-workflow T18: be-dev and fe-dev each flagged their Sub-task Needs you, and /ao-build still went ahead (jira-guard then
// refused the Start) or stopped saying only that the run "still has to run".
test('/ao-build stops when a Sub-task still to build is flagged Needs you, and says what to do on it', () => {
  const held = storyFacts({ item: { state: 'in-progress', status: 'In Progress', subtasks: [sub('DEMO-22', 'be-dev', { state: 'done' }), sub('DEMO-23', 'fe-dev', { state: 'in-progress', status: 'In Progress', flagged: true })] }, subtaskLedgers: ['DEMO-22', 'DEMO-23'] });
  const decision = decide('build', held);
  assert.equal(decision.go, false);
  assert.equal(decision.reason, 'Sub-task DEMO-23 of DEMO-21 is flagged Needs you');
  assert.equal(decision.next, 'Read the newest comment on DEMO-23 and answer it there, remove the flag and the needs-you label, then /ao-build DEMO-21');
  const done = storyFacts({ item: { state: 'in-progress', status: 'In Progress', subtasks: [sub('DEMO-22', 'be-dev', { state: 'done', flagged: true }), sub('DEMO-23', 'fe-dev')] }, subtaskLedgers: ['DEMO-22'] });
  assert.equal(decide('build', done).go, true, 'a done Sub-task with a flag left on it does not hold the build');
});

// The agents of a split Story keep the ledgers of its Sub-tasks, not of the Story (dev-workflow T18: /ao-build stopped
// after be-dev finished DEMO-22, saying DEMO-21 had no ledger).
test('/ao-build goes on after the BE Sub-task is done, and an In Progress item with a ledger is built again', () => {
  const half = storyFacts({ item: { state: 'in-progress', status: 'In Progress', agent: 'be-dev', subtasks: [sub('DEMO-22', 'be-dev', { state: 'done' }), sub('DEMO-23', 'fe-dev')] }, subtaskLedgers: ['DEMO-22'] });
  // BE is done: FE goes on on the branch BE left, and opens the PR.
  assert.deepEqual(decide('build', half).runs.map(({ role, key, purpose, prompt, checkout }) => [role, key, purpose, prompt, checkout]), [
    ['fe-dev', 'DEMO-23', 'build', PURPOSES['build-next']({ key: 'DEMO-23', story: 'DEMO-21', role: 'fe-dev', previous: 'DEMO-22', last: true }), undefined],
  ]);
  // BE stopped half way with its ledger: be-dev reads it and goes on, then FE.
  const midway = storyFacts({ item: { state: 'in-progress', status: 'In Progress', agent: 'be-dev', subtasks: [sub('DEMO-22', 'be-dev', { state: 'in-progress', status: 'In Progress' }), sub('DEMO-23', 'fe-dev')] }, subtaskLedgers: ['DEMO-22'] });
  assert.deepEqual(decide('build', midway).runs.map(({ role, key, prompt }) => [role, key, prompt]), [
    ['be-dev', 'DEMO-22', PURPOSES['build-again']({ key: 'DEMO-22', status: 'In Progress' })],
    ['fe-dev', 'DEMO-23', PURPOSES['build-next']({ key: 'DEMO-23', story: 'DEMO-21', role: 'fe-dev', previous: 'DEMO-22', last: true })],
  ]);
  // A Task with no Sub-task keeps its own ledger.
  const task = storyFacts({ item: { key: 'DEMO-24', type: 'Task', workType: 'task', state: 'in-progress', status: 'In Progress', agent: 'devops', subtasks: [], labels: ['ao-devops'], role: 'devops', roles: ['devops'] }, ledger: true });
  assert.deepEqual(decide('build', task).runs.map(({ role, prompt }) => [role, prompt]), [['devops', PURPOSES['build-again']({ key: 'DEMO-24', status: 'In Progress' })]]);
  const resumed = { ...half, run: { key: 'DEMO-21', runs: [{ n: 1, command: 'build', role: 'fe-dev', purpose: 'build', session: 's-fe', outcome: 'usage-limit', effort: 'xhigh' }] } };
  assert.deepEqual(decide('build', resumed).runs, [{ role: 'fe-dev', key: 'DEMO-21', effort: 'xhigh', purpose: 'build', resume: 's-fe', prompt: resumePrompt('DEMO-21'), checkout: undefined }]);
});

test('/ao-build stops: not Ready, a dependency not merged, the docs PR not merged, no role label, WIP full, an open PR', () => {
  const cases = [
    [storyFacts({ item: { state: 'new', status: 'New' } }), /is New, not Ready/, /refined/],
    [storyFacts({ item: { state: 'in-progress', status: 'In Progress' } }), /has no ledger/, /\/ao-build DEMO-21/],
    [storyFacts({ dependenciesMerged: false, item: { blockedBy: ['DEMO-19'] } }), /depends on \(DEMO-19\) is not merged/, /\/ao-status DEMO-19/],
    [storyFacts({ docs: { branch: 'feature/DEMO-20-spec', exists: true, pr: { number: 14, state: 'open', merged: false } } }), /docs PR of Epic DEMO-20 is not merged/, /\/ao-plan DEMO-20/],
    [storyFacts({ item: { subtasks: [sub('DEMO-22', 'be-dev', { roles: [], role: null, labels: [] })] } }), /DEMO-22 has no role label: \/ao-build does not guess/, /label it ao-<role>/],
    [storyFacts({ item: { subtasks: [], roles: ['be-dev', 'fe-dev'], role: 'be-dev' } }), /DEMO-21 has 2 role labels/, /label it/],
    [storyFacts({ wip: { epicShaping: { used: 0, limit: 1 }, devAgent: { 'be-dev': false, 'fe-dev': true } } }), /be-dev is at its WIP limit dev-agent/, /\/ao-status/],
    [storyFacts({ pr: pr() }), /PR #15 of DEMO-21 is open: the build is done/, /^\/ao-review 15$/],
    [storyFacts({ item: { type: 'Sub-task', workType: 'sub-task', parent: { key: 'DEMO-21', type: 'Story' } } }), /is a Sub-task/, /^\/ao-build DEMO-21$/],
    [storyFacts({ item: { type: 'Epic', workType: 'epic' } }), /is an Epic/, /^\/ao-plan DEMO-21$/],
    [storyFacts({ item: { flagged: true, flag: 'rework' } }), /flagged Needs you by the rework limit/, /flag comment/],
  ];
  for (const [facts, reason, next] of cases) {
    const decision = decide('build', facts);
    assert.equal(decision.go, false, String(reason));
    assert.match(decision.reason, reason);
    assert.match(decision.next, next);
  }
});

test('/ao-review: reviewer on the whole PR, then security on the whole PR at the roster effort when the PR touches a path of security_review', () => {
  const decision = decide('review', prFacts('review', { files: ['apps/api/src/cart/cart.controller.ts'] }));
  assert.deepEqual(plan(decision), [`reviewer DEMO-21 ${roster.roles.reviewer.effort} review`, `security DEMO-21 ${roster.roles.security.effort} review`]);
  assert.deepEqual(decision.runs.map(({ prompt }) => prompt), ['Review PR #15.', 'Review PR #15.']);
  assert.equal(decision.runs[1].scope, 'no security report on this PR yet');
  assert.equal(decision.runs[1].effortWhy, 'the PR touches apps/api/src/cart/cart.controller.ts');
  assert.deepEqual(plan(decide('review', prFacts('review', { files: ['apps/api/src/cart/cart.controller.ts'], reports: { reviewer: report(), security: null } }))), [`security DEMO-21 ${roster.roles.security.effort} review`]);
});

test('/ao-review of a low-risk PR: security reviews the whole PR at high, and the printout says why', () => {
  const item = { subtasks: [sub('DEMO-22', 'be-dev', { state: 'done' }), sub('DEMO-23', 'fe-dev', { state: 'done' })] };
  const decision = decide('review', prFacts('review', { files: ['apps/web/src/app/cart/cart-line.tsx'] }, { item }));
  const security = decision.runs[1];
  assert.deepEqual([security.effort, security.purpose, security.effortWhy], ['high', 'review', 'no protected path, no path of security_review, no effort label']);
});

test('/ao-review after a small fix: security reviews only the changes since its last report, at high', () => {
  const facts = prFacts('review', { reports: { reviewer: report({ sha: OLD, onHead: false }), security: report({ sha: OLD, onHead: false, at: '2026-11-04T08:00:00Z' }) }, securityCompare: { base: OLD, status: 'ahead', files: [{ filename: 'apps/api/test/cart.spec.ts', additions: 40, deletions: 2 }] } });
  const [reviewer, security] = decide('review', facts).runs;
  assert.deepEqual([reviewer.role, reviewer.purpose], ['reviewer', 'review'], 'reviewer always reviews the whole PR');
  assert.deepEqual([security.role, security.effort, security.purpose, security.scope], ['security', 'high', 'review-delta', '42 lines changed since a1b2c3d']);
  assert.equal(security.prompt, 'Review PR #15, only the changes since a1b2c3d; your full report on a1b2c3d is the review of 2026-11-04. Write the line Scope: changes since a1b2c3d in your report.');
});

test('/ao-review stops: CI running or red, both reports on the head, a docs PR, a closed PR', () => {
  const cases = [
    [prFacts('review', { ci: { green: false, failed: false, pending: true } }), /CI is still running on the head d1d2d3d/, /once CI is done/],
    [prFacts('review', { ci: { green: false, failed: true, pending: false } }), /CI is red/, /^\/ao-fix 15$/],
    [prFacts('review', { reports: { reviewer: report(), security: report() } }), /both reports are on the head d1d2d3d of PR #15: it waits for you at gate ③/, /approve it; merge-gate merges it/],
    [prFacts('review', { reports: { reviewer: report(), security: report() }, protectedPaths: ['.github/workflows/ci.yml'] }), /gate ③/, /Squash and merge it yourself: it changes \.github\/workflows\/ci\.yml/],
    [prFacts('review', { reports: { reviewer: report({ blocking: 1, state: 'CHANGES_REQUESTED' }), security: report() }, changesRequested: true }), /ask for changes \(Critical or High: reviewer 1\)/, /^\/ao-fix 15$/],
    [prFacts('review', { docsEpic: 'DEMO-20' }), /docs PR of DEMO-20: merge-gate merges it after gate ②/, /\/ao-plan DEMO-20/],
    [prFacts('review', { state: 'closed', merged: true }), /PR #15 is merged/, /\/ao-status DEMO-21/],
  ];
  for (const [facts, reason, next] of cases) {
    const decision = decide('review', facts);
    assert.equal(decision.go, false, String(reason));
    assert.match(decision.reason, reason);
    assert.match(decision.next, next);
  }
});

test('/ao-fix: the dev agent of the item fixes what was asked on its branch, then the reviews run again', () => {
  const asked = prFacts('fix', { changesRequested: true, reports: { reviewer: report({ blocking: 1, state: 'CHANGES_REQUESTED' }), security: report() } });
  const decision = decide('fix', asked);
  assert.deepEqual(decision.runs.map(({ role, purpose }) => `${role} ${purpose}`), ['fe-dev fix', 'reviewer review', 'security review']);
  const [dev] = decision.runs;
  assert.equal(dev.effort, roster.roles['fe-dev'].effort);
  assert.deepEqual(dev.checkout, { branch: 'feature/DEMO-21-remove-line', pull: true });
  assert.equal(dev.head, HEAD, 'the head before the fix, to know when it is pushed');
  assert.equal(dev.prompt, 'Fix PR #15 of DEMO-21: the changes requested on d1d2d3d; the 1 Critical or High findings of the reviewer report. The branch feature/DEMO-21-remove-line is checked out and up to date with origin.');
});

test('/ao-fix with your note, at Rework 2 at least xhigh; red CI is a reason too', () => {
  const noted = decide('fix', prFacts('fix', {}), { note: 'Sửa hai finding Low của reviewer.' });
  assert.match(noted.runs[0].prompt, /: what the human asks below\. The branch .*\n\nThe human asks:\n\nSửa hai finding Low của reviewer\.$/);
  const second = decide('fix', prFacts('fix', { ci: { green: false, failed: true, pending: false } }, { item: { rework: 2 } }));
  assert.deepEqual([second.runs[0].effort, second.runs[0].prompt.includes('the red CI on d1d2d3d')], ['xhigh', true]);
  const maxed = decide('fix', prFacts('fix', { changesRequested: true }, { item: { rework: 3, effort: 'max' } }));
  assert.equal(maxed.runs[0].effort, 'max', 'a higher label stays');
});

test('/ao-fix after its fix is pushed reviews the new head; with nothing to fix it says so', () => {
  const pushed = prFacts('fix', { reports: { reviewer: report({ sha: OLD, onHead: false }), security: report({ sha: OLD, onHead: false }) }, securityCompare: { base: OLD, status: 'ahead', files: [{ filename: 'apps/web/cart.tsx', additions: 5, deletions: 1 }] } }, {
    run: { key: 'DEMO-21', runs: [{ n: 1, command: 'fix', role: 'fe-dev', purpose: 'fix', outcome: 'done', head: OLD, session: 's', note: noteKey('the note was for the fix already made') }] },
  });
  assert.deepEqual(decide('fix', pushed, { note: 'the note was for the fix already made' }).runs.map(({ role, purpose }) => `${role} ${purpose}`), ['reviewer review', 'security review-delta']);
  const nothing = decide('fix', prFacts('fix', { reports: { reviewer: report(), security: report() } }));
  assert.deepEqual([nothing.go, nothing.reason], [false, 'PR #15 has nothing to fix: no request for changes, no red CI, no blocking finding']);
  assert.match(nothing.next, /approve it/);
});

// Pilot 1, PR #4 of ao-sample: after the fix and the reviewer's run of the same /ao-fix, the note sent be-dev to fix
// again, because only the newest run of the command was read, and it was the review.
test('/ao-fix with your note runs the dev agent once: after its fix and a review, only the missing review is left', () => {
  const run = { key: 'DEMO-21', runs: [
    { n: 1, command: 'fix', role: 'fe-dev', purpose: 'fix', outcome: 'done', head: OLD, session: 's1' },
    { n: 2, command: 'fix', role: 'reviewer', purpose: 'review', outcome: 'done', session: 's2' },
  ] };
  run.runs[0].note = noteKey('the note was for the fix already made');
  const reviewed = prFacts('fix', { reports: { reviewer: report(), security: null } }, { run });
  const decision = decide('fix', reviewed, { note: 'the note was for the fix already made' });
  assert.equal(decision.go, true);
  assert.deepEqual(decision.runs.map(({ role, purpose }) => `${role} ${purpose}`), ['security review']);
  // A new note, on a later /ao-fix, is a new fix.
  const again = decide('fix', prFacts('fix', { reports: { reviewer: report(), security: report() } }, { run }), { note: 'Đổi tên biến cho rõ hơn.' });
  assert.deepEqual(again.runs.map(({ role, purpose }) => `${role} ${purpose}`), ['fe-dev fix', 'reviewer review', 'security review']);
  assert.equal(again.runs[0].note, noteKey('Đổi tên biến cho rõ hơn.'), 'the runner keeps which note the fix was for');
});

test('a Done or Cancelled item has no next command', async () => {
  const { nextFor } = await import('../../lib/workflow/steps.mjs');
  assert.equal(nextFor({ key: 'DEMO-12', workType: 'story', state: 'done' }, null), 'done');
  assert.equal(nextFor({ key: 'DEMO-12', workType: 'task', state: 'cancelled' }, null), 'cancelled');
});

test('/ao-review and /ao-fix stop on a PR whose branch names an item outside the space (T15a)', () => {
  for (const command of ['review', 'fix']) {
    const decision = decide(command, { ...prFacts(command, { headRef: 'feature/SHOP-5-x' }), item: null, outside: 'SHOP-5' });
    assert.equal(decision.go, false);
    assert.match(decision.reason ?? JSON.stringify(decision), /SHOP-5 .*not in DEMO|not in DEMO/);
  }
});
