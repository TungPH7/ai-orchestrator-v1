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
  assert.deepEqual(await readLatestQaReport(client, 'DEMO-21'), { result: 'FAIL', at: AT });
  assert.equal(await readLatestQaReport({ getAll: async () => [] }, 'DEMO-21'), null);
});

test('a merged PR without a FAIL report is not a rebuild', () => {
  for (const report of [{ result: 'PASS', at: AT }, null]) {
    const decision = decide(failed({ report }), SPLIT);
    assert.equal(decision.go, false);
    assert.match(decision.reason, /has no ledger/);
  }
});
