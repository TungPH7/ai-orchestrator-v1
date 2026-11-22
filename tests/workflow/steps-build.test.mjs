import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readRoster } from '../../lib/agents/roster.mjs';
import { readContract } from '../../lib/contract.mjs';
import { readLatestQaReport } from '../../lib/tracker/facts.mjs';
import { PURPOSES } from '../../lib/workflow/prompts.mjs';
import { decideStep } from '../../lib/workflow/steps.mjs';
import { CONTRACT_DIR, ROOT } from '../helpers/kit.mjs';

// /ao-build after QA fail (human-loop spec 5.2).
const contract = readContract(CONTRACT_DIR);
const roster = readRoster(join(ROOT, 'agents'));
const options = { roster, contract };
const AT = '2026-11-12T03:15:00.000Z';
const MERGED = '2026-11-12T01:00:00Z';
const R2 = 'feature/DEMO-21-remove-line-r2';
const SPLIT = 'be: tổng tiền vẫn là 120.000 đ sau khi xóa dòng cuối\nfe: giỏ trống không hiện chữ "Giỏ hàng trống"';

const sub = (key, role) => ({ key, workType: 'sub-task', state: 'done', status: 'Done', labels: [`ao-${role}`], role, roles: [role], effort: null });
function failed({ item = {}, pr = {}, report = { result: 'FAIL', at: AT }, runs = [] } = {}) {
  return {
    command: 'build',
    arg: 'DEMO-21',
    space: 'DEMO',
    item: {
      key: 'DEMO-21', type: 'Story', workType: 'story', state: 'in-progress', status: 'In Progress', summary: 'Xóa sản phẩm khỏi giỏ hàng', labels: [], role: null, roles: [], effort: null, agent: 'qa', rework: 1,
      flagged: false, flag: null, parent: { key: 'DEMO-20', type: 'Epic', status: 'In Progress' }, subtasks: [sub('DEMO-22', 'be-dev'), sub('DEMO-23', 'fe-dev')], blockedBy: [], requests: [], ...item,
    },
    epic: null,
    docs: { branch: 'feature/DEMO-20-spec', exists: false, pr: { number: 14, state: 'closed', merged: true } },
    pr: { number: 15, state: 'closed', merged: true, draft: false, mergeCommit: 'b'.repeat(40), mergedAt: MERGED, headRef: 'feature/DEMO-21-remove-line', headSha: 'a'.repeat(40), base: 'develop', ci: { green: true, failed: false, pending: false }, ...pr },
    qaReport: report,
    dependenciesMerged: true,
    wip: { epicShaping: { used: 0, limit: 1 }, devAgent: { 'be-dev': true, 'fe-dev': true } },
    ledger: false,
    subtaskLedgers: [],
    run: runs.length > 0 ? { key: 'DEMO-21', runs: runs.map((r, i) => ({ n: i + 1, command: 'build', effort: 'high', session: `s${i}`, ...r })) } : null,
  };
}
const decide = (facts, note) => decideStep('build', facts, { ...options, ...(note !== undefined && { note }) });
const plan = (decision) => decision.runs.map(({ role, purpose }) => `${role} ${purpose}`);

test('a Story with Sub-tasks no longer dead-ends after QA fail: its defects, split by be: and fe:, go on a new -r2 branch from develop', () => {
  const decision = decide(failed(), SPLIT);
  assert.equal(decision.go, true);
  assert.deepEqual(plan(decision), ['be-dev build', 'fe-dev build']);
  const [be, fe] = decision.runs;
  for (const r of [be, fe]) {
    assert.deepEqual(r.checkout, { branch: R2, from: 'develop' });
    assert.equal(r.rebuild, AT);
    assert.equal(r.key, 'DEMO-21', 'at the level of the Story: its Sub-tasks are done');
  }
  assert.equal(be.prompt, PURPOSES.rebuild({ key: 'DEMO-21', at: AT, branch: R2, pr: 15, part: 'tổng tiền vẫn là 120.000 đ sau khi xóa dòng cuối', others: [{ role: 'fe-dev', text: 'giỏ trống không hiện chữ "Giỏ hàng trống"' }], next: 'fe-dev' }));
  assert.match(be.prompt, /^DEMO-21 failed QA: fix the defects of its newest QA report, the comment of Tester\/QA Engineer written at 2026-11-12T03:15:00\.000Z, with Result FAIL\. DEMO-21 is In Progress already, through QA fail: make no transition/);
  assert.match(be.prompt, /Do not open the PR: fe-dev goes on after you, on this branch/);
  assert.match(fe.prompt, /Open the PR of DEMO-21 when your part is done\.$/);
  assert.match(decision.lines.at(-1), /QA fail on 2026-11-12 03:15 UTC: the fix goes on feature\/DEMO-21-remove-line-r2, new from develop/);
});

test('without the split, a Story with a BE and an FE Sub-task stops and asks for it', () => {
  const decision = decide(failed());
  assert.equal(decision.go, false);
  assert.equal(decision.reason, 'DEMO-21 failed QA and has a BE and an FE Sub-task: say which defects of its QA report go to whom');
  assert.equal(decide(failed(), 'sửa tổng tiền').go, false, 'a note with no prefix does not split them');
});

test('an item of one dev role goes to that role, with or without your words; -r2 becomes -r3; Rework 2 runs at xhigh', () => {
  const task = failed({ item: { type: 'Task', workType: 'task', subtasks: [], role: 'fe-dev', roles: ['fe-dev'] }, pr: { headRef: 'feature/DEMO-21-remove-line-r2' } });
  const decision = decide(task);
  assert.deepEqual(plan(decision), ['fe-dev build']);
  assert.deepEqual(decision.runs[0].checkout, { branch: 'feature/DEMO-21-remove-line-r3', from: 'develop' });
  assert.match(decision.runs[0].prompt, /Open the PR of DEMO-21/);
  const again = decide(failed({ item: { type: 'Task', workType: 'task', subtasks: [], role: 'be-dev', roles: ['be-dev'], rework: 2 } }));
  assert.equal(again.runs[0].effort, 'xhigh');
});

test('when ba changed the criteria on Jira after the merge, ba copies them into the SPEC first, once', () => {
  const qaRun = { command: 'qa', role: 'ba', purpose: 'ac-add', outcome: 'done', startedAt: '2026-11-12T03:00:00Z', endedAt: '2026-11-12T03:05:00Z' };
  const decision = decide(failed({ runs: [qaRun] }), SPLIT);
  assert.deepEqual(plan(decision), ['ba spec-sync', 'be-dev build', 'fe-dev build']);
  assert.equal(decision.runs[0].prompt, PURPOSES['spec-sync']({ key: 'DEMO-21', epic: 'DEMO-20', branch: R2 }));
  const synced = decide(failed({ runs: [qaRun, { role: 'ba', purpose: 'spec-sync', outcome: 'done', rebuild: AT }] }), SPLIT);
  assert.deepEqual(plan(synced), ['be-dev build', 'fe-dev build']);
  const before = { ...qaRun, endedAt: '2026-11-11T09:00:00Z', startedAt: '2026-11-11T08:55:00Z' };
  assert.deepEqual(plan(decide(failed({ runs: [before] }), SPLIT)), ['be-dev build', 'fe-dev build'], 'a change before the merge is in the SPEC already');
});

// T20 of human-loop, SMP-24: ba added AC12 in QA and spec-sync put it in spec.md on -r2, but plan.md kept AC1–AC11. The
// requests to ba, ux or sa written since ba changed the criteria now run on the new branch, after spec-sync and before
// the dev agents (live-run-fixes spec 2.2).
test('the requests to ba, ux or sa written since ba changed the criteria run on the new branch, after spec-sync, before the dev agents', () => {
  const qaRun = { command: 'qa', role: 'ba', purpose: 'ac-add', outcome: 'done', startedAt: '2026-11-12T03:00:00Z', endedAt: '2026-11-12T03:05:00Z' };
  const at = (min) => Date.parse('2026-11-12T03:00:00Z') + min * 60000;
  const epic = { key: 'DEMO-20', type: 'Epic', workType: 'epic', requests: [{ from: 'ba', to: 'ux', text: 'S1.4 theo AC12', at: at(4) }, { from: 'ba', to: 'sa', text: 'plan.md: thêm AC12', at: at(30) }, { from: null, to: 'sa', text: 'một yêu cầu cũ', at: at(-600) }] };
  const facts = { ...failed({ runs: [qaRun] }), epic };
  const decision = decide(facts, SPLIT);
  assert.deepEqual(plan(decision), ['ba spec-sync', 'ux request', 'sa request', 'be-dev build', 'fe-dev build']);
  const ux = decision.runs[1];
  assert.deepEqual([ux.key, ux.checkout, ux.rebuild, ux.request], ['DEMO-21', { branch: R2, from: 'develop' }, AT, at(4)]);
  assert.equal(ux.prompt, PURPOSES.request({ key: 'DEMO-20', role: 'ux', from: 'ba', at: at(4), branch: R2, item: 'DEMO-21' }));
  assert.match(ux.prompt, /The branch feature\/DEMO-21-remove-line-r2 of DEMO-21 is checked out, new from develop: change only documents there, such as those in docs\/specs\/, commit, and push the branch\. Change no code: the dev agents of DEMO-21 go on after you\./);
  const synced = { ...failed({ runs: [qaRun, { role: 'ba', purpose: 'spec-sync', outcome: 'done', rebuild: AT }] }), epic };
  assert.deepEqual(plan(decide(synced, SPLIT)), ['ux request', 'sa request', 'be-dev build', 'fe-dev build']);
  // With no change of the criteria after the merge, they still go through /ao-request.
  assert.deepEqual(plan(decide({ ...failed(), epic }, SPLIT)), ['be-dev build', 'fe-dev build']);
});

test('a side done for this QA report is not run again; a later QA fail is a rebuild of its own', () => {
  const half = decide(failed({ runs: [{ role: 'be-dev', purpose: 'build', outcome: 'done', rebuild: AT }] }), SPLIT);
  assert.deepEqual(plan(half), ['fe-dev build']);
  const older = decide(failed({ runs: [{ role: 'be-dev', purpose: 'build', outcome: 'done', rebuild: '2026-11-01T00:00:00.000Z' }] }), SPLIT);
  assert.deepEqual(plan(older), ['be-dev build', 'fe-dev build']);
});

test('readLatestQaReport gives the result and the time of the newest QA report, in ISO time', async () => {
  const report = (result) => `# QA report: DEMO-21 Xóa\n\n## Result\n\n${result}\n`;
  const client = { getAll: async () => [
    { created: '2026-11-12T10:15:00.000+0700', body: `Tester/QA Engineer:
${report('FAIL')}` },
    { created: '2026-11-11T09:00:00.000+0700', body: report('PASS') },
    { created: '2026-11-12T11:00:00.000+0700', body: 'Business Analyst: AC cũ và mới' },
  ] };
  assert.deepEqual(await readLatestQaReport(client, 'DEMO-21'), { result: 'FAIL', at: AT, id: null, failed: [] });
  // Its id and its failed criteria, for a QA again of only those (C1 spec section 2).
  const failing = { getAll: async () => [{ id: '10592', created: '2026-11-12T10:15:00.000+0700', body: `${report('FAIL')}
| Acceptance criterion | Result | Evidence |
|---|---|---|
| AC1: a | PASS | x |
| AC2: b | FAIL | y |
` }] };
  assert.deepEqual(await readLatestQaReport(failing, 'DEMO-21'), { result: 'FAIL', at: AT, id: '10592', failed: ['AC2'] });
  assert.equal(await readLatestQaReport({ getAll: async () => [] }, 'DEMO-21'), null);
});

test('a merged PR without a FAIL report is not a rebuild', () => {
  for (const report of [{ result: 'PASS', at: AT }, null]) {
    const decision = decide(failed({ report }), SPLIT);
    assert.equal(decision.go, false);
    assert.match(decision.reason, /has no ledger/);
  }
});

// Live check of shop, 2026-11-16: fe-dev of SHOP-11 started the Task (In Progress), then hit the usage limit before it
// wrote its ledger. The check "In Progress with no ledger" came before the run that stopped could go on, so /ao-build
// stopped for good. A build run that stopped with a session goes on first, whatever the ledger.
test('a build cut by the usage limit before its agent wrote a ledger goes on in its session', () => {
  const task = { key: 'DEMO-31', type: 'Task', workType: 'task', subtasks: [], labels: ['ao-fe-dev'], role: 'fe-dev', roles: ['fe-dev'], rework: 0, agent: 'fe-dev' };
  const facts = { ...failed({ item: task, pr: null, report: null, runs: [{ role: 'fe-dev', purpose: 'build', outcome: 'usage-limit', key: 'DEMO-31' }] }), arg: 'DEMO-31', pr: null, ledger: false };
  const decision = decide(facts);
  assert.equal(decision.go, true, decision.reason);
  assert.deepEqual(decision.runs.map(({ role, purpose, resume }) => `${role} ${purpose} ${resume}`), ['fe-dev build s0']);
  // With no run on record that can go on, the stop stays.
  const none = decide({ ...facts, run: null });
  assert.equal(none.go, false);
  assert.match(none.reason, /is In Progress but has no ledger/);
});

// Phiên 33 of shop: Tasks added to an Epic after its plan was approved (SHOP-39, 41, 42, 43, 45, the follow-ups of a
// review) stayed New, since jira-sync refined the children of the Epic only at Approve plan, and /ao-build stopped
// with "is New, not Ready". Now a New item that meets DoR gets jira-sync first, and the build goes on after it.
test('a New Story or Task that meets DoR gets jira-sync first, then the build goes on; one that does not stops as before', () => {
  const item = { state: 'new', status: 'New', type: 'Task', workType: 'task', subtasks: [], role: 'be-dev', roles: ['be-dev'], agent: null };
  const fresh = (refinable) => ({ ...failed({ item }), pr: null, qaReport: null, refinable });
  const synced = decide(fresh(true));
  assert.equal(synced.go, true);
  assert.deepEqual(synced.runs, [{ action: 'jira-sync', key: 'DEMO-21', continue: true }]);
  const waiting = decide(fresh(false));
  assert.deepEqual([waiting.go, waiting.reason], [false, 'DEMO-21 is New, not Ready']);
});

// Phiên 33 of shop, SHOP-34: be-dev finished the Sub-task SHOP-35 but wrote its ledger as .ai/ledger/SHOP-34.md, by the
// key of the Story, and /ao-build SHOP-34 stopped with "is In Progress but has no ledger". The prompt of a Sub-task now
// names its ledger, and a Story with a ledger of its own and a Sub-task done goes on with the next Sub-task.
test('a Story with its own ledger and a Sub-task done goes on with the next Sub-task; a Sub-task prompt names its ledger', () => {
  const story = {
    state: 'in-progress', status: 'In Progress', agent: 'be-dev',
    subtasks: [sub('DEMO-22', 'be-dev'), { ...sub('DEMO-23', 'fe-dev'), state: 'to-do', status: 'To Do' }],
  };
  const facts = { ...failed({ item: story }), pr: null, qaReport: null, ledger: true, subtaskLedgers: [] };
  const decision = decide(facts);
  assert.equal(decision.go, true, decision.reason);
  assert.deepEqual(plan(decision), ['fe-dev build']);
  assert.match(decision.runs[0].prompt, /^Build Sub-task DEMO-23, .* Keep your ledger in \.ai\/ledger\/DEMO-23\.md, by the key of the Sub-task\./);
  // SHOP-90 of shop (T14 of C2): be-dev put the key of the Task in its commits, and Complete, which looks for the key of
  // the Sub-task in a commit header (work-committed), was refused.
  assert.match(decision.runs[0].prompt, /End the header of each commit of your part with \(DEMO-23\), the key of the Sub-task, not of the Story: its Complete transition looks for that key in a commit header\./);
  const none = decide({ ...facts, ledger: false });
  assert.match(none.reason, /is In Progress but has no ledger/);
});

// Kit followups, batch 4 item 14: an ops Task (label ao-ops) is devops's: no branch, no commit, no PR. Its prompt says to
// leave the evidence and hand it over; the basic auth comes only with the label ao-env-auth, which only you put.
test('/ao-build of an ops Task runs devops with the ops prompt, with the basic auth only under ao-env-auth', () => {
  const item = { state: 'ready', status: 'Ready', type: 'Task', workType: 'task', subtasks: [], role: 'devops', roles: ['devops'], agent: null, labels: ['ao-ops', 'ao-devops'], ops: true, envAuth: false };
  const ready = (more = {}) => ({ ...failed({ item: { ...item, ...more } }), pr: null, qaReport: null, wip: { epicShaping: { used: 0, limit: 1 }, devAgent: { devops: true } } });
  const plain = decide(ready());
  assert.equal(plain.go, true, plain.reason);
  assert.deepEqual([plain.runs[0].role, plain.runs[0].purpose, plain.runs[0].envAuth], ['devops', 'build', undefined]);
  assert.match(plain.runs[0].prompt, /^Do ops Task DEMO-21\. It is Ready, and has no branch, no commit and no PR\./);
  assert.match(plain.runs[0].prompt, /## Ops evidence/);
  assert.match(plain.runs[0].prompt, /make the transition Hand over/);
  assert.doesNotMatch(plain.runs[0].prompt, /E2E_HTTP_PASSWORD/);
  const authed = decide(ready({ envAuth: true, labels: ['ao-ops', 'ao-devops', 'ao-env-auth'] }));
  assert.equal(authed.runs[0].envAuth, true);
  assert.match(authed.runs[0].prompt, /E2E_HTTP_USER and E2E_HTTP_PASSWORD hold the basic auth of Development and Staging: give them to curl on stdin/);
  const notDevops = decide(ready({ role: 'be-dev', roles: ['be-dev'], labels: ['ao-ops', 'ao-be-dev'] }));
  assert.equal(notDevops.go, false);
  assert.match(notDevops.reason, /^DEMO-21 is an ops Task, which only devops does, and its role label is ao-be-dev/);
});

// Review of shop PR #78 (Medium, and a Low of security): the build of an ops Task takes no lane, and a stopped devops run
// that goes on in its session keeps the basic auth its label gives.
test('the build of an ops Task takes no lane, and a stopped run of it goes on with its basic auth', () => {
  const item = { state: 'ready', status: 'Ready', type: 'Task', workType: 'task', subtasks: [], role: 'devops', roles: ['devops'], agent: null, labels: ['ao-ops', 'ao-devops', 'ao-env-auth'], ops: true, envAuth: true };
  const facts = (more = {}, rest = {}) => ({ ...failed({ item: { ...item, ...more } }), pr: null, qaReport: null, wip: { epicShaping: { used: 0, limit: 1 }, devAgent: { devops: true } }, ...rest });
  assert.equal(decide(facts()).runs[0].lane, false);
  const stopped = { key: 'DEMO-21', runs: [{ n: 1, command: 'build', role: 'devops', purpose: 'build', effort: 'high', outcome: 'unfinished', session: 's1', envAuth: true }] };
  const resumed = decide(facts({ state: 'in-progress', status: 'In Progress' }, { run: stopped }));
  assert.deepEqual([resumed.runs[0].resume, resumed.runs[0].envAuth, resumed.runs[0].lane], ['s1', true, false]);
});
