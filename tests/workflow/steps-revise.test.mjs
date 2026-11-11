import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readRoster } from '../../lib/agents/roster.mjs';
import { readContract } from '../../lib/contract.mjs';
import { PURPOSES } from '../../lib/workflow/prompts.mjs';
import { decideStep, noteKey } from '../../lib/workflow/steps.mjs';
import { CONTRACT_DIR, ROOT } from '../helpers/kit.mjs';

// A change the human asks for in the SPEC or the plan before its gate (human-loop spec 3.2).
const contract = readContract(CONTRACT_DIR);
const roster = readRoster(join(ROOT, 'agents'));
const BRANCH = 'feature/DEMO-20-spec';
const CHECKOUT = { branch: BRANCH, from: 'develop' };
const SPEC = '# Spec\n\nMàn hình ở `docs/specs/DEMO-20/design.md`.\n\n### Non-functional requirements\n\n- nhanh\n\n## Open Questions\n\nKhông có.\n';
const ASKING = SPEC.replace('Không có.', '- Q1: có cần nút xóa tất cả không?');
const DESIGN = '# Design\n\n## Open Questions\n\nKhông có.\n';
const PLAN = '# Plan\n\n## Task List\n\n- [ ] Story: Xóa một dòng · be-dev, fe-dev (Sub-task)\n\n## Open Questions\n\n- Không có.\n';
const NOTE = 'Bỏ AC3; thêm AC: xóa dòng cuối thì giỏ hiện "Giỏ hàng trống".';
const ci = { green: true, failed: false, pending: false, started: true };

function epicFacts(state, { command = 'spec', pr = { number: 14, state: 'open', merged: false, ci }, spec = SPEC, plan = state === 'specifying' ? null : PLAN, runs = [], children } = {}) {
  const status = { specifying: 'Specifying', planning: 'Planning', 'in-progress': 'In Progress' }[state];
  return {
    command,
    space: 'DEMO',
    item: { key: 'DEMO-20', type: 'Epic', workType: 'epic', state, status, summary: 'Xóa sản phẩm', labels: [], flagged: false, flag: null, children: children ?? (state === 'specifying' ? [] : [{ key: 'DEMO-21', state: 'new', subtasks: [] }]), requests: [], subtasks: [], gates: { 'spec-approval': '2026-11-10T09:00:00Z' } },
    docs: { branch: BRANCH, exists: true, pr, spec, design: DESIGN, plan },
    pr: null,
    wip: { epicShaping: { used: 1, limit: 1 }, devAgent: {} },
    ledger: false,
    run: runs.length > 0 ? { key: 'DEMO-20', runs: runs.map((r, i) => ({ n: i + 1, effort: 'xhigh', checkout: CHECKOUT, ...r })) } : null,
  };
}
const decide = (command, facts, note) => decideStep(command, facts, { roster, contract, ...(note !== undefined && { note }) });
const plan = (decision) => decision.runs.map(({ role, purpose }) => `${role} ${purpose}`);

test('/ao-spec <EPIC> <change>: ba changes the SPEC on the docs branch and pushes it to the open docs PR, then the command stops at gate ① again', () => {
  const decision = decide('spec', epicFacts('specifying'), NOTE);
  assert.equal(decision.go, true);
  assert.deepEqual(plan(decision), ['ba spec-revise']);
  const [run] = decision.runs;
  assert.deepEqual(run.checkout, CHECKOUT);
  assert.equal(run.note, noteKey(NOTE));
  assert.equal(run.prompt, PURPOSES['spec-revise']({ key: 'DEMO-20', branch: BRANCH, pr: 14, note: NOTE }));
  assert.match(run.prompt, /The human asks for a change to the SPEC before gate ①:\n\nBỏ AC3/);
  assert.match(run.prompt, /a criterion you drop keeps its number with "\(bỏ\)", and a new one takes the next free number/);
  assert.match(run.prompt, /"Cần ux:" or "Cần sa:"/);
  assert.match(run.prompt, /push the branch, so the docs PR #14 shows it/);
  // Before the docs PR is open, ba commits and the stage goes on as before.
  const early = decide('spec', epicFacts('specifying', { pr: null }), NOTE);
  assert.deepEqual(plan(early), ['ba spec-revise', 'ba docs-pr']);
  assert.doesNotMatch(early.runs[0].prompt, /push/);
});

test('the same change is not made twice; a new one is', () => {
  const done = epicFacts('specifying', { runs: [{ command: 'spec', role: 'ba', purpose: 'spec-revise', note: noteKey(NOTE), outcome: 'done', session: 's1' }] });
  const again = decide('spec', done, NOTE);
  assert.equal(again.go, false);
  assert.match(again.reason, /waits for you at gate ① spec-approval/);
  assert.deepEqual(plan(decide('spec', done, 'Thêm AC: hoàn tác trong 5 giây.')), ['ba spec-revise']);
});

test('/ao-spec with a change: open questions come first, a SPEC must be there, and past gate ① the change goes into a new Epic', () => {
  const asking = decide('spec', epicFacts('specifying', { spec: ASKING }), NOTE);
  assert.equal(asking.go, false);
  assert.ok(asking.questions);
  const none = decide('spec', epicFacts('specifying', { spec: null, pr: null }), NOTE);
  assert.equal(none.go, false);
  assert.equal(none.reason, 'DEMO-20 has no SPEC yet: a change waits for stage spec to write one');
  assert.equal(none.next, '/ao-spec DEMO-20');
  const past = decide('spec', epicFacts('planning'), NOTE);
  assert.equal(past.go, false);
  assert.equal(past.reason, 'DEMO-20 is past gate ① spec-approval: its SPEC no longer changes before the gate');
  assert.equal(past.next, '/ao-intake with the change, for a new Epic');
});

test('/ao-plan <EPIC> <change>: sa changes the plan and pushes it; the command stops at gate ② again', () => {
  const decision = decide('plan', epicFacts('planning', { command: 'plan' }), 'Gộp Task 2 vào Story 1.');
  assert.deepEqual(plan(decision), ['sa plan-revise']);
  const [run] = decision.runs;
  assert.deepEqual(run.checkout, CHECKOUT);
  assert.equal(run.prompt, PURPOSES['plan-revise']({ key: 'DEMO-20', branch: BRANCH, pr: 14, note: 'Gộp Task 2 vào Story 1.' }));
  assert.match(run.prompt, /comment on DEMO-20 with "Cần ba:" and the lines that changed/);
  const done = epicFacts('planning', { command: 'plan', runs: [{ command: 'plan', role: 'sa', purpose: 'plan-revise', note: noteKey('Gộp Task 2 vào Story 1.'), outcome: 'done', session: 's1' }] });
  assert.match(decide('plan', done, 'Gộp Task 2 vào Story 1.').reason, /wait for you at gate ② plan-approval/);
});

test('/ao-plan with a change: the plan must be written, and past gate ② the change goes into a new Epic', () => {
  const none = decide('plan', epicFacts('planning', { command: 'plan', plan: null, children: [] }), 'Gộp Task 2.');
  assert.equal(none.reason, 'DEMO-20 has no plan yet: a change waits for stage plan to write one');
  assert.equal(none.next, '/ao-plan DEMO-20');
  const past = decide('plan', epicFacts('in-progress', { command: 'plan' }), 'Gộp Task 2.');
  assert.equal(past.go, false);
  assert.equal(past.reason, 'DEMO-20 is past gate ② plan-approval: its plan no longer changes before the gate');
  assert.equal(past.next, '/ao-intake with the change, for a new Epic');
});
