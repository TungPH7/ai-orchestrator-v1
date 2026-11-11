import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readRoster } from '../../lib/agents/roster.mjs';
import { readContract } from '../../lib/contract.mjs';
import { PURPOSES, answersPrompt, resumePrompt } from '../../lib/workflow/prompts.mjs';
import { decideStep } from '../../lib/workflow/steps.mjs';
import { CONTRACT_DIR, ROOT } from '../helpers/kit.mjs';

const contract = readContract(CONTRACT_DIR);
const roster = readRoster(join(ROOT, 'agents'));
const options = { roster, contract };
const BRANCH = 'feature/DEMO-20-spec';
const CHECKOUT = { branch: BRANCH, from: 'develop' };

const SPEC = '# Spec: Xóa sản phẩm khỏi giỏ hàng\n\n## Objective\n\nMàn hình ở `docs/specs/DEMO-20/design.md`.\n\n## Open Questions\n\nKhông có.\n';
const SPEC_NO_SCREENS = '# Spec: Dọn dữ liệu giỏ hàng cũ\n\n## Objective\n\nMột job chạy đêm.\n\n## Open Questions\n\n- Không có.\n';
const WITH_NFR = SPEC.replace('## Open Questions', '### Non-functional requirements\n\n- Hiệu năng: dưới 200 ms.\n\n## Open Questions');
const ASKING = SPEC.replace('Không có.', '1. **Q1 — Xóa hết giỏ:** có cần nút xóa tất cả không?\n2. **Q2 — Hoàn tác:** có cho hoàn tác không?');
const DESIGN = '# Design: Xóa sản phẩm\n\n## Screens\n\n- S1\n\n## Open Questions\n\nKhông còn câu hỏi mở.\n';
const PLAN = '# Plan: Xóa sản phẩm khỏi giỏ hàng\n\n## Task List\n\n- [ ] Story: Xóa một dòng · be-dev, fe-dev (Sub-task)\n\n## Open Questions\n\n- Không có.\n';

// The facts of Epic DEMO-20 in `state`, shaped as gatherFacts gives them, after `change`.
function epicFacts(state, change = {}) {
  const status = { new: 'New', specifying: 'Specifying', planning: 'Planning', 'in-progress': 'In Progress', done: 'Done' }[state];
  const { docs = {}, item = {}, ...rest } = change;
  return {
    command: 'spec',
    space: 'DEMO',
    item: { key: 'DEMO-20', type: 'Epic', workType: 'epic', state, status, summary: 'Xóa sản phẩm khỏi giỏ hàng', labels: [], flagged: false, flag: null, children: [], requests: [], subtasks: [], ...item },
    docs: { branch: BRANCH, exists: true, pr: null, spec: null, design: null, plan: null, ...docs },
    pr: null,
    wip: { epicShaping: { used: 1, limit: 1 }, devAgent: {} },
    ledger: false,
    run: null,
    ...rest,
  };
}
const decide = (command, facts, more = {}) => decideStep(command, facts, { ...options, ...more });
const plan = (decision) => decision.runs.map(({ role, purpose, when }) => `${role} ${purpose}${when ? ` (when ${when})` : ''}`);
const openPr = (number = 14, more = {}) => ({ number, state: 'open', merged: false, ...more });
const runState = (...runs) => ({ key: 'DEMO-20', runs: runs.map((r, i) => ({ n: i + 1, command: 'spec', effort: 'xhigh', checkout: CHECKOUT, ...r })) });

test('/ao-spec on a new Epic: ba, ux if the SPEC has screens, sa, then ba opens the docs PR, each at the effort of the roster', () => {
  const decision = decide('spec', epicFacts('specifying', { docs: { exists: false } }));
  assert.equal(decision.go, true);
  assert.deepEqual(plan(decision), ['ba spec-write', 'ux design (when the SPEC has screens)', 'sa spec-nfr', 'ba docs-pr']);
  const [first] = decision.runs;
  assert.deepEqual(first, { role: 'ba', key: 'DEMO-20', effort: roster.roles.ba.effort, purpose: 'spec-write', prompt: PURPOSES['spec-write']({ key: 'DEMO-20', branch: BRANCH }), checkout: CHECKOUT });
  assert.equal(decision.runs[1].effort, roster.roles.ux.effort);
  assert.match(decision.lines[0], /^DEMO-20 Epic "Xóa sản phẩm khỏi giỏ hàng": Specifying; no docs branch$/);
});

test('/ao-spec picks up where the artifacts are: ux only for a SPEC with screens, sa until its section is there', () => {
  assert.deepEqual(plan(decide('spec', epicFacts('specifying', { docs: { spec: SPEC } }))), ['ux design', 'sa spec-nfr', 'ba docs-pr']);
  assert.deepEqual(plan(decide('spec', epicFacts('specifying', { docs: { spec: SPEC_NO_SCREENS } }))), ['sa spec-nfr', 'ba docs-pr']);
  assert.deepEqual(plan(decide('spec', epicFacts('specifying', { docs: { spec: SPEC, design: DESIGN } }))), ['sa spec-nfr', 'ba docs-pr']);
  assert.deepEqual(plan(decide('spec', epicFacts('specifying', { docs: { spec: WITH_NFR, design: DESIGN } }))), ['ba docs-pr']);
});

test('open questions stop the command with the questions; your answers go to the session that asked them', () => {
  const asked = epicFacts('specifying', { docs: { spec: ASKING }, run: runState({ role: 'ba', purpose: 'spec-write', session: 's-ba', outcome: 'done' }) });
  const decision = decide('spec', asked);
  assert.equal(decision.go, false);
  assert.equal(decision.reason, 'ba left 2 open questions in docs/specs/DEMO-20/spec.md');
  assert.deepEqual(decision.questions, ['Q1 — Xóa hết giỏ: có cần nút xóa tất cả không?', 'Q2 — Hoàn tác: có cho hoàn tác không?']);
  assert.equal(decision.asker, 'ba');
  assert.match(decision.next, /--answers/);

  const answered = decide('spec', asked, { answers: 'Q1: không cần.\nQ2: có, trong 5 giây.' });
  assert.deepEqual(answered.runs, [{ role: 'ba', key: 'DEMO-20', effort: 'xhigh', purpose: 'spec-write', resume: 's-ba', prompt: answersPrompt('DEMO-20', 'Q1: không cần.\nQ2: có, trong 5 giây.'), checkout: CHECKOUT }]);

  const design = decide('spec', epicFacts('specifying', { docs: { spec: SPEC, design: DESIGN.replace('Không còn câu hỏi mở.', '- Q1: có cần ảnh sản phẩm không?') } }));
  assert.deepEqual([design.asker, design.questions], ['ux', ['Q1: có cần ảnh sản phẩm không?']]);
  // A question sa added to the SPEC goes back to sa.
  const bySa = epicFacts('specifying', { docs: { spec: ASKING }, run: runState({ role: 'ba', purpose: 'spec-write', session: 's-ba', outcome: 'done' }, { role: 'sa', purpose: 'spec-nfr', session: 's-sa', outcome: 'done' }) });
  assert.equal(decide('spec', bySa).asker, 'sa');
  assert.equal(decide('spec', epicFacts('specifying'), { answers: 'Q1: có' }).go, false, 'answers with no run that asked');
});

test('questions left in the design stop /ao-spec even once the docs PR is open; the answers go to ux, which pushes (SMP-2)', () => {
  const asking = DESIGN.replace('Không còn câu hỏi mở.', '- **Không có Figma.** Có cần khung Figma không?');
  const runs = runState(
    { role: 'ba', purpose: 'spec-write', session: 's-ba', outcome: 'done' },
    { role: 'ux', purpose: 'design', session: 's-ux', outcome: 'done' },
    { role: 'sa', purpose: 'spec-nfr', session: 's-sa', outcome: 'done' },
    { role: 'ba', purpose: 'docs-pr', session: 's-ba2', outcome: 'done' },
  );
  const facts = epicFacts('specifying', { docs: { spec: WITH_NFR, design: asking, pr: openPr() }, run: runs });
  const stopped = decide('spec', facts);
  assert.equal(stopped.reason, 'ux left 1 open question in docs/specs/DEMO-20/design.md');
  assert.deepEqual(stopped.questions, ['Không có Figma. Có cần khung Figma không?']);
  const answered = decide('spec', facts, { answers: 'Không cần Figma.' });
  assert.deepEqual(answered.runs, [{ role: 'ux', key: 'DEMO-20', effort: 'xhigh', purpose: 'design', resume: 's-ux', prompt: answersPrompt('DEMO-20', 'Không cần Figma.', { pr: 14 }), checkout: CHECKOUT }]);
  assert.match(answersPrompt('DEMO-20', 'x', { pr: 14 }), /The docs PR #14 is open: push the branch/);
  assert.doesNotMatch(answersPrompt('DEMO-20', 'x'), /push/);
});

test('a run that stopped before its end goes on in its session, with the ledger', () => {
  for (const outcome of ['unfinished', 'usage-limit']) {
    const facts = epicFacts('specifying', { docs: { spec: SPEC }, run: runState({ role: 'ux', purpose: 'design', session: 's-ux', outcome, effort: 'xhigh' }) });
    assert.deepEqual(decide('spec', facts).runs, [{ role: 'ux', key: 'DEMO-20', effort: 'xhigh', purpose: 'design', resume: 's-ux', prompt: resumePrompt('DEMO-20'), checkout: CHECKOUT }], outcome);
  }
  assert.match(resumePrompt('DEMO-20'), /\.ai\/ledger\/DEMO-20\.md/);
});

test('an agent that failed twice in a row on the same step stops the command; once is tried again', () => {
  const failed = (n) => runState(...Array.from({ length: n }, () => ({ role: 'sa', purpose: 'spec-nfr', session: 's', outcome: 'error' })));
  const twice = decide('spec', epicFacts('specifying', { docs: { spec: SPEC, design: DESIGN }, run: failed(2) }));
  assert.equal(twice.go, false);
  assert.match(twice.reason, /^sa failed 2 times in a row on DEMO-20 \(error\); the contract stops after 2$/);
  assert.deepEqual(plan(decide('spec', epicFacts('specifying', { docs: { spec: SPEC, design: DESIGN }, run: failed(1) }))), ['sa spec-nfr', 'ba docs-pr']);
  // A run of another command does not count.
  const otherCommand = { key: 'DEMO-20', runs: [{ n: 1, command: 'plan', role: 'sa', purpose: 'spec-nfr', outcome: 'error' }, { n: 2, command: 'plan', role: 'sa', purpose: 'spec-nfr', outcome: 'error' }] };
  assert.equal(decide('spec', epicFacts('specifying', { docs: { spec: SPEC, design: DESIGN }, run: otherCommand })).go, true);
});

test('/ao-spec stops with the reason and the command to run instead', () => {
  const cases = [
    [epicFacts('new'), /is New/, /Click Start spec on DEMO-20/],
    [epicFacts('planning'), /past gate ① spec-approval/, /^\/ao-plan DEMO-20$/],
    [epicFacts('in-progress'), /stage spec is over/, /^\/ao-status DEMO-20$/],
    [epicFacts('specifying', { item: { flagged: true, flag: 'audit' } }), /flagged Needs you by audit/, /Read the newest flag comment/],
    [epicFacts('specifying', { wip: { epicShaping: { used: 2, limit: 1 }, devAgent: {} } }), /over the WIP limit epic-shaping of 1/, /another Epic/],
    [epicFacts('specifying', { docs: { spec: WITH_NFR, pr: openPr() } }), /docs PR #14 of DEMO-20 is open: stage spec is done/, /click Approve spec on DEMO-20, then \/ao-plan DEMO-20/],
    [epicFacts('specifying', { item: { type: 'Story', workType: 'story' } }), /is a Story: \/ao-spec takes an Epic/, /^\/ao-build DEMO-20$/],
  ];
  for (const [facts, reason, next] of cases) {
    const decision = decide('spec', facts);
    assert.equal(decision.go, false, reason);
    assert.match(decision.reason, reason);
    assert.match(decision.next, next);
  }
});

test('/ao-plan: sa writes the plan and pushes it to the docs PR, then ba creates the items; it stops at gate ②', () => {
  const planning = (docs, item) => epicFacts('planning', { docs: { spec: WITH_NFR, design: DESIGN, pr: openPr(), ...docs }, item });
  const first = decide('plan', planning());
  assert.deepEqual(plan(first), ['sa plan-write', 'ba plan-items']);
  assert.equal(first.runs[0].prompt, PURPOSES['plan-write']({ key: 'DEMO-20', branch: BRANCH, pr: 14 }));
  assert.deepEqual(plan(decide('plan', planning({ plan: PLAN }))), ['ba plan-items']);
  const asked = decide('plan', planning({ plan: PLAN.replace('- Không có.', '- Q1: cache giỏ hàng ở đâu?') }));
  assert.deepEqual([asked.go, asked.asker], [false, 'sa']);

  const children = [{ key: 'DEMO-21', state: 'new', effort: null }, { key: 'DEMO-24', state: 'new', effort: 'xhigh' }];
  const done = decide('plan', planning({ plan: PLAN }, { children }));
  assert.equal(done.go, false);
  assert.equal(done.reason, 'the plan and the 2 items of DEMO-20 are done; 1 of them have an effort label. They wait for you at gate ② plan-approval');
  assert.match(done.next, /click Approve plan on DEMO-20, then \/ao-plan DEMO-20 again/);
  assert.match(decide('plan', planning({ plan: PLAN }, { children: children.slice(0, 1) })).reason, /none has an effort label/);
});

// dev-workflow T17, Epic DEMO-20: nobody set the Status of the SPEC and design after gate ①, and the stop before gate ②
// said no item had an effort label while Sub-task DEMO-22 had one.
test('/ao-plan: sa marks the SPEC and design approved on the day of gate ①, and Sub-tasks count for effort labels', () => {
  const planning = (docs, item) => epicFacts('planning', { docs: { spec: WITH_NFR, design: DESIGN, pr: openPr(), ...docs }, item });
  const gated = decide('plan', planning({}, { gates: { 'spec-approval': Date.parse('2026-11-01T08:58:53Z'), 'plan-approval': null } }));
  assert.match(gated.runs[0].prompt, /set the Status line of docs\/specs\/DEMO-20\/spec\.md and design\.md, where there is one, to Approved 2026-11-01/);
  const story = { key: 'DEMO-21', state: 'new', effort: null, subtasks: [{ key: 'DEMO-22', effort: 'xhigh' }, { key: 'DEMO-23', effort: null }] };
  assert.equal(decide('plan', planning({ plan: PLAN }, { children: [story] })).reason, 'the plan and the 3 items of DEMO-20 are done; 1 of them have an effort label. They wait for you at gate ② plan-approval');
});

test('/ao-plan stops before gate ①, without an open docs PR, or on an item that is not an Epic', () => {
  assert.match(decide('plan', epicFacts('specifying', { docs: { pr: openPr() } })).next, /Read the diff of the docs PR #14, click Approve spec/);
  assert.match(decide('plan', epicFacts('specifying')).next, /^Run \/ao-spec first/);
  assert.match(decide('plan', epicFacts('planning', { docs: { spec: SPEC } })).reason, /has no open docs PR on feature\/DEMO-20-spec/);
  assert.match(decide('plan', epicFacts('new')).next, /Click Start spec/);
  assert.match(decide('plan', epicFacts('planning', { item: { type: 'Task', workType: 'task' } })).reason, /is a Task/);
});

test('/ao-plan after gate ②: jira-sync refines the items and merge-gate merges the docs PR; no agent runs', () => {
  const past = (pr, children) => epicFacts('in-progress', { docs: { spec: WITH_NFR, plan: PLAN, pr }, item: { children } });
  const waiting = decide('plan', past(openPr(), [{ key: 'DEMO-21', state: 'new' }]));
  assert.deepEqual(waiting.runs, [{ action: 'jira-sync', key: 'DEMO-20', then: { mergeGate: 14 } }]);
  assert.deepEqual(decide('plan', past({ ...openPr(), state: 'closed', merged: true }, [{ key: 'DEMO-21', state: 'new' }])).runs, [{ action: 'jira-sync', key: 'DEMO-20', then: null }]);
  const done = decide('plan', past({ ...openPr(), state: 'closed', merged: true }, [{ key: 'DEMO-21', state: 'ready' }]));
  assert.deepEqual([done.go, done.next], [false, '/ao-build DEMO-21']);
  assert.match(done.reason, /docs PR #14 of DEMO-20 is merged and its items are refined/);
});

// Pilot 1, T9: after gate ② the command suggested the first Ready item of the Epic, SMP-11, which SMP-7 blocks.
test('/ao-plan after gate ②: the build it suggests is the first Ready item that no unmerged item blocks', () => {
  const merged = { ...openPr(), state: 'closed', merged: true };
  const past = (children) => decide('plan', epicFacts('in-progress', { docs: { spec: WITH_NFR, plan: PLAN, pr: merged }, item: { children } }));
  const item = (key, state, blockedBy = []) => ({ key, state, blockedBy });
  // Jira returns the items in no order that matters: the blocked ones come first here.
  const children = [item('DEMO-26', 'ready', ['DEMO-22']), item('DEMO-22', 'ready', ['DEMO-21', 'DEMO-23']), item('DEMO-21', 'ready'), item('DEMO-23', 'ready')];
  assert.equal(past(children).next, '/ao-build DEMO-21', 'not DEMO-26, which DEMO-22 blocks');
  // A blocker in Ready for QA or Done is merged; one in review is not.
  const half = [item('DEMO-26', 'ready', ['DEMO-22']), item('DEMO-22', 'ready', ['DEMO-21', 'DEMO-23']), item('DEMO-21', 'ready-for-qa'), item('DEMO-23', 'in-review')];
  assert.equal(past(half).next, '/ao-status DEMO-20');
  assert.match(past(half).reason, /every Ready item waits for an item that is not merged yet/);
  const merged2 = [item('DEMO-26', 'ready', ['DEMO-22']), item('DEMO-22', 'ready', ['DEMO-21', 'DEMO-23']), item('DEMO-21', 'ready-for-qa'), item('DEMO-23', 'done')];
  assert.equal(past(merged2).next, '/ao-build DEMO-22');
  // A blocker outside the Epic cannot be judged here: /ao-build checks it with its own guard.
  assert.equal(past([item('DEMO-26', 'ready', ['OTHER-1'])]).next, '/ao-build DEMO-26');
  // Items with no link data at all (an older fact) keep the order they had.
  assert.equal(past([{ key: 'DEMO-21', state: 'ready' }, { key: 'DEMO-23', state: 'ready' }]).next, '/ao-build DEMO-21');
});

// The guards of complete in contract/workflows.yaml, children-closed and children-released. Audit of 2026-11-06: DEMO-11
// could be completed, and /ao-status said "its items move on".
test('/ao-status asks you to complete an Epic whose items are all closed and released', () => {
  const released = [{ name: 'v0.2.0', released: true }];
  const next = (children) => decide('status', { command: 'status', space: 'DEMO', pulls: [], runs: [], items: [{ key: 'DEMO-11', type: 'Epic', workType: 'epic', state: 'in-progress', status: 'In Progress', summary: 'Mã giảm giá', flagged: false, requests: [], children }] }).lines;
  assert.deepEqual(next([{ state: 'done', fixVersions: released }, { state: 'cancelled', fixVersions: [] }]), [
    'Waiting for you:',
    '  DEMO-11: Click Complete on DEMO-11',
    '',
    'DEMO-11 Epic "Mã giảm giá": In Progress → Click Complete on DEMO-11',
  ]);
  const moving = ['DEMO-11 Epic "Mã giảm giá": In Progress → its items move on'];
  assert.deepEqual(next([{ state: 'done', fixVersions: [{ name: 'v0.3.0', released: false }] }]), moving, 'Done, but not in a release on Production yet');
  assert.deepEqual(next([{ state: 'done', fixVersions: released }, { state: 'new', fixVersions: [] }]), moving, 'an item still open');
  assert.deepEqual(next([{ state: 'cancelled', fixVersions: [] }, { state: 'done', fixVersions: [] }]), moving, 'Done without a Fix Version');
  assert.deepEqual(next([]), moving, 'no items yet');
  assert.deepEqual(next(undefined), moving, 'its items not read');
});

test('/ao-status of an Epic and of the space: the next command, what waits for you, open requests and costs', () => {
  const epic = decide('status', epicFacts('planning', { docs: { pr: openPr() }, run: runState({ role: 'ba', purpose: 'spec-write', outcome: 'done', costUsd: 1.8 }, { role: 'sa', purpose: 'spec-nfr', outcome: 'done', costUsd: 0.7 }) }));
  assert.equal(epic.status, true);
  assert.deepEqual(epic.lines, ['DEMO-20 Epic "Xóa sản phẩm khỏi giỏ hàng": Planning; docs PR #14 open', 'Runs: 2, 2.50 USD in all; the last: sa spec-nfr done, 0.70 USD']);
  assert.equal(epic.next, '/ao-plan DEMO-20');

  const space = decide('status', {
    command: 'status',
    space: 'DEMO',
    items: [
      { key: 'DEMO-20', type: 'Epic', workType: 'epic', state: 'new', status: 'New', summary: 'Xóa sản phẩm', flagged: false, requests: [] },
      { key: 'DEMO-21', type: 'Story', workType: 'story', state: 'in-review', status: 'In Review', summary: 'Xóa một dòng', flagged: false, requests: [{ from: 'fe-dev', to: 'ba', text: 'tạo Task cho bảng tràn ở 320 px.' }] },
      { key: 'DEMO-16', type: 'Task', workType: 'task', state: 'ready', status: 'Ready', summary: 'Timeout', flagged: true, requests: [] },
      { key: 'DEMO-22', type: 'Sub-task', workType: 'sub-task', state: 'done', status: 'Done', summary: 'BE', flagged: false, requests: [] },
    ],
    pulls: [{ number: 15, key: 'DEMO-21', draft: false }],
    runs: [{ key: 'DEMO-21', runs: [{ costUsd: 3.25 }, { costUsd: 1 }] }],
  });
  assert.deepEqual(space.lines, [
    'Waiting for you:',
    '  DEMO-20: Click Start spec on DEMO-20',
    '  DEMO-16: read the flag comment on DEMO-16 (Needs you)',
    '',
    'DEMO-20 Epic "Xóa sản phẩm": New → Click Start spec on DEMO-20',
    'DEMO-21 Story "Xóa một dòng": In Review, 4.25 USD → /ao-review 15 or /ao-fix 15',
    '  open request to ba from fe-dev: tạo Task cho bảng tràn ở 320 px. → /ao-request DEMO-21',
    'DEMO-16 Task "Timeout": Ready, flagged → read the flag comment on DEMO-16 (Needs you)',
  ]);
});

test('a prompt says only what the agent cannot know: no sentence of it is in the agent\'s own definition', () => {
  const context = { key: 'DEMO-20', branch: BRANCH, pr: 14 };
  const roleOf = { 'spec-write': 'ba', design: 'ux', 'spec-nfr': 'sa', 'docs-pr': 'ba', 'plan-write': 'sa', 'plan-items': 'ba' };
  for (const [purpose, make] of Object.entries(PURPOSES)) {
    if (!roleOf[purpose]) continue;
    const definition = readFileSync(join(ROOT, 'kit', '.claude', 'agents', `${roleOf[purpose]}.md`), 'utf8');
    for (const sentence of make(context).split(/(?<=\.)\s+/).filter((s) => s.length > 20)) {
      assert.ok(!definition.includes(sentence), `${purpose}: "${sentence}" is already in ${roleOf[purpose]}.md`);
    }
  }
});
