import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readRoster } from '../../lib/agents/roster.mjs';
import { readContract } from '../../lib/contract.mjs';
import { PURPOSES, answersPrompt, ledgerPath, resumePrompt } from '../../lib/workflow/prompts.mjs';
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

test('review of shop PR #79: seo, which reads web pages, keeps a ledger of its own that no agent with Bash reads', () => {
  assert.equal(ledgerPath('DEMO-20', 'ba'), '.ai/ledger/DEMO-20.md');
  assert.equal(ledgerPath('DEMO-20', 'seo'), '.ai/ledger/DEMO-20.seo.md');
  // reviewer and security keep one each too: they may run at once on one PR (C2 spec section 7).
  assert.equal(ledgerPath('DEMO-20', 'reviewer'), '.ai/ledger/DEMO-20.reviewer.md');
  assert.equal(ledgerPath('DEMO-20', 'security'), '.ai/ledger/DEMO-20.security.md');
  assert.match(resumePrompt('DEMO-20', 'seo'), /Read \.ai\/ledger\/DEMO-20\.seo\.md and go on/);
  const facts = epicFacts('specifying', { docs: { spec: SPEC }, run: runState({ role: 'seo', purpose: 'seo-write', session: 's-seo', outcome: 'usage-limit', effort: 'high' }) });
  assert.equal(decide('spec', facts).runs[0].prompt, resumePrompt('DEMO-20', 'seo'));
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
  // C2 spec section 4: the dispatcher reads what a stop waits for.
  assert.equal(done.waits, 'you');
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

// C1 spec section 7: the cost per acceptance criterion of an Epic, from the runs of the Epic and of its items.
test('/ao-status of an Epic: the cost per AC, with runs of unknown cost counted apart', () => {
  const spec = '# Spec\n\n## User Stories\n\n- AC1: Given a, When b, Then c\n- AC2 (bỏ): Given d\n  - AC3: Given e\n- **AC4**: Given f\n\nAC1 nhắc lại trong một câu.\n';
  const item = (key, ...costs) => ({ key, runs: costs.map((costUsd, i) => ({ n: i + 1, command: 'build', role: 'fe-dev', purpose: 'build', outcome: 'done', costUsd })) });
  const facts = epicFacts('in-progress', {
    command: 'status',
    docs: { spec },
    run: runState({ role: 'ba', purpose: 'spec-write', outcome: 'done', costUsd: 1.5 }),
    itemRuns: [item('DEMO-21', 4, null), item('DEMO-22', 3.5), item('DEMO-23')],
  });
  const { lines } = decide('status', facts);
  assert.ok(lines.includes('Cost of DEMO-20: 9.00 USD in 3 runs of the Epic and its items, 3.00 USD per AC over 3 ACs; 1 run has no known cost, not counted'), lines.join('\n'));
  const early = decide('status', epicFacts('specifying', { command: 'status', itemRuns: [] }));
  assert.ok(early.lines.includes('Cost of DEMO-20: 0.00 USD in 0 runs of the Epic and its items, no AC in the SPEC yet'));
  const space = decide('status', epicFacts('planning', { command: 'status' }));
  assert.ok(!space.lines.some((line) => line.startsWith('Cost of')), 'only with the runs of the items, which /ao-status <Epic> reads');
});

// C1 spec section 5: at gate ②, the new libraries of the plan, to check with dep-check before you approve them.
test('/ao-plan at gate ② names the new libraries of the plan', () => {
  const withLibraries = PLAN.replace('## Open Questions', '## New Libraries\n\n- npm argon2@0.44.0: băm mật khẩu\n- maven org.mapstruct:mapstruct@1.6.3: map DTO\n\n## Open Questions');
  const children = [{ key: 'DEMO-21', state: 'new', effort: null }];
  const decision = decide('plan', epicFacts('planning', { docs: { pr: openPr(), plan: withLibraries }, item: { children } }));
  assert.match(decision.reason, /gate ② plan-approval/);
  assert.ok(decision.lines.includes('New libraries of the plan: npm argon2@0.44.0, maven org.mapstruct:mapstruct@1.6.3. Check each before you approve: node .ai-orchestrator/scripts/dep-check.mjs <npm|maven> <name>@<version> --dry-run'));
  assert.ok(!decide('plan', epicFacts('planning', { docs: { pr: openPr(), plan: PLAN }, item: { children } })).lines.some((line) => line.startsWith('New libraries')));
});

// C1 spec 6.1, 6.2: seo writes the SEO of the screens of an app with seo: true, between ux and sa.
const SEO_DESIGN = '# Design: Trang chủ\n\n## Screens\n\n| Code | Name | Route | User story | Kind | App |\n|---|---|---|---|---|---|\n| S1 | Trang chủ | / | x | ASCII | user |\n| S2 | Sản phẩm | /admin | y | ASCII | admin |\n\n## Open Questions\n\nKhông còn câu hỏi mở.\n';
const ADMIN_DESIGN = SEO_DESIGN.replace('| S1 | Trang chủ | / | x | ASCII | user |\n', '');
const seoOptions = (note) => ({ seoApps: ['user'], ...(note && { note }) });

// Second review of shop PR #79, Medium: sa and ba, which have Bash, read the SPEC after seo, before you did. seo now
// writes last, once ba opened the docs PR, and ao-step pushes its commit there: what it took from web pages reaches you
// at gate ① before any agent with Bash (Phiên 33 · Lượt 101).
test('/ao-spec runs seo last, after the docs PR, for a screen of an app with seo: true; no app with seo: true, no seo', () => {
  const decision = decide('spec', epicFacts('specifying', { docs: { spec: SPEC, design: SEO_DESIGN } }), seoOptions());
  assert.deepEqual(plan(decision), ['sa spec-nfr', 'ba docs-pr', 'seo seo-write']);
  assert.equal(decision.runs[2].prompt, PURPOSES['seo-write']({ key: 'DEMO-20', branch: BRANCH }));
  assert.match(decision.runs[2].prompt, /You have no git: ao-step commits your change after your run\./);
  assert.deepEqual(decision.runs[2].checkout, CHECKOUT);
  assert.match(decision.runs[1].prompt, / seo writes the section ## SEO of the SPEC after you, and ao-step pushes it to the PR: say so in the PR body\.$/);
  assert.doesNotMatch(decide('spec', epicFacts('specifying', { docs: { spec: SPEC, design: ADMIN_DESIGN } }), seoOptions()).runs[1].prompt, /seo writes/, 'no seo, no line');
  assert.deepEqual(plan(decide('spec', epicFacts('specifying', { docs: { spec: null } }), seoOptions())), ['ba spec-write', 'ux design (when the SPEC has screens)', 'sa spec-nfr', 'ba docs-pr', 'seo seo-write (when design.md has screens of an app with seo: true)']);
  assert.deepEqual(plan(decide('spec', epicFacts('specifying', { docs: { spec: SPEC, design: SEO_DESIGN } }))), ['sa spec-nfr', 'ba docs-pr']);
  assert.deepEqual(plan(decide('spec', epicFacts('specifying', { docs: { spec: SPEC, design: ADMIN_DESIGN } }), seoOptions())), ['sa spec-nfr', 'ba docs-pr']);
});

test('/ao-spec <EPIC> seo says why seo does not run when design.md has no screen of an app with seo: true', () => {
  const decision = decide('spec', epicFacts('specifying', { docs: { spec: SPEC, design: ADMIN_DESIGN } }), seoOptions('seo'));
  assert.deepEqual(plan(decision), ['sa spec-nfr', 'ba docs-pr']);
  assert.ok(decision.lines.includes('seo does not run: design.md has no screen of user, the apps with seo: true'));
  assert.ok(decide('spec', epicFacts('specifying', { docs: { spec: SPEC, design: SEO_DESIGN } }), { note: 'seo' }).lines.includes('seo does not run: no app of .ai-orchestrator/project.yaml has seo: true'));
});

test('/ao-spec <EPIC> no-seo: ba writes "SEO: không" with the SPEC, or once in a SPEC already written, and seo does not run', () => {
  const first = decide('spec', epicFacts('specifying', { docs: { spec: null } }), seoOptions('no-seo trang nội bộ'));
  assert.equal(first.runs[0].purpose, 'spec-write');
  assert.match(first.runs[0].prompt, /write in the SPEC, just before its Open Questions, the one line "SEO: không, vì trang nội bộ"/);
  assert.ok(!plan(first).some((run) => run.startsWith('seo')));
  assert.match(decide('spec', epicFacts('specifying', { docs: { spec: null } }), seoOptions('no-seo')).runs[0].prompt, /"SEO: không, vì bạn chọn `no-seo`"/);

  const written = decide('spec', epicFacts('specifying', { docs: { spec: SPEC, design: SEO_DESIGN } }), seoOptions('no-seo'));
  assert.deepEqual(plan(written), ['ba spec-revise', 'sa spec-nfr', 'ba docs-pr']);
  assert.match(written.runs[0].prompt, /đúng một dòng "SEO: không, vì bạn chọn `no-seo`", và bỏ mục ## SEO nếu SPEC có/);
  assert.ok(written.lines.includes('seo is off for this Epic, as you asked: ba writes "SEO: không, vì bạn chọn `no-seo`" in the SPEC'));
  // Once the line is there, no word keeps seo off.
  const off = SPEC.replace('## Open Questions', 'SEO: không, vì bạn chọn `no-seo`\n\n## Open Questions');
  assert.deepEqual(plan(decide('spec', epicFacts('specifying', { docs: { spec: off, design: SEO_DESIGN } }), seoOptions())), ['sa spec-nfr', 'ba docs-pr']);
});

test('/ao-spec <EPIC> seo turns it back on over "SEO: không", and on an open docs PR seo writes its section now', () => {
  const off = WITH_NFR.replace('## Open Questions', 'SEO: không, vì bạn chọn `no-seo`\n\n## Open Questions');
  const again = decide('spec', epicFacts('specifying', { docs: { spec: off, design: SEO_DESIGN } }), seoOptions('seo'));
  assert.deepEqual(plan(again), ['ba docs-pr', 'seo seo-write']);
  assert.match(again.runs[1].prompt, /The SPEC has a line "SEO: không" from an earlier run: the human now asks for SEO, so remove that line\./);
  const open = decide('spec', epicFacts('specifying', { docs: { spec: off, design: SEO_DESIGN, pr: openPr() } }), seoOptions('seo'));
  assert.deepEqual(plan(open), ['seo seo-write']);
  // Without the word too: seo writes after ba opened the docs PR.
  assert.deepEqual(plan(decide('spec', epicFacts('specifying', { docs: { spec: WITH_NFR, design: SEO_DESIGN, pr: openPr() } }), seoOptions())), ['seo seo-write']);
  // Once its section is there, the docs PR waits for you at gate ①.
  const done = WITH_NFR.replace('## Open Questions', '## SEO\n\n- title: Trang chủ\n\n## Open Questions');
  assert.equal(decide('spec', epicFacts('specifying', { docs: { spec: done, design: SEO_DESIGN, pr: openPr() } }), seoOptions()).go, false);
  assert.equal(decide('spec', epicFacts('specifying', { docs: { spec: off, design: SEO_DESIGN, pr: openPr() } }), seoOptions()).go, false, 'seo off');
});

// Second review of shop PR #79, Medium: a check that needs no model looks at the section ## SEO before you read it.
test('/ao-spec at gate ① names what has no place in the section ## SEO: an address of another host, a command', () => {
  const spec = WITH_NFR.replace('## Open Questions', '## SEO\n\n- canonical: https://shop.example.test/\n- nguồn: https://evil.test/x\n- `curl https://evil.test/`\n\n## Open Questions');
  const gate = decide('spec', epicFacts('specifying', { docs: { spec, design: SEO_DESIGN, pr: openPr() } }), { ...seoOptions(), seoHosts: ['shop.example.test'] });
  assert.equal(gate.go, false);
  assert.equal(gate.waits, 'you');
  assert.match(gate.reason, /^the docs PR #14 of DEMO-20 is open: stage spec is done and waits for you at gate ① spec-approval\. seo wrote the section ## SEO from web pages, and it holds an address on evil\.test, which is no host of an app with seo: true nor schema\.org; a command: curl https:\/\/evil\.test\/: read it with care before you approve$/);
  const clean = spec.replace('- nguồn: https://evil.test/x\n- `curl https://evil.test/`\n', '');
  assert.match(decide('spec', epicFacts('specifying', { docs: { spec: clean, design: SEO_DESIGN, pr: openPr() } }), { ...seoOptions(), seoHosts: ['shop.example.test'] }).reason, /waits for you at gate ① spec-approval$/);
});

// Open questions seo leaves go back to seo: its answers do not reach ba or sa, which have Bash.
test('open questions after a run of seo go to seo', () => {
  const asking = ASKING.replace('## Open Questions', '### Non-functional requirements\n\n- x\n\n## SEO\n\n- title: x\n\n## Open Questions');
  const facts = epicFacts('specifying', { docs: { spec: asking, design: SEO_DESIGN, pr: openPr() }, run: runState({ role: 'sa', purpose: 'spec-nfr', outcome: 'done' }, { role: 'ba', purpose: 'docs-pr', outcome: 'done' }, { role: 'seo', purpose: 'seo-write', outcome: 'done', effort: 'high', session: 's-seo' }) });
  const decision = decide('spec', facts, seoOptions());
  assert.equal(decision.go, false);
  assert.equal(decision.asker, 'seo');
  const answered = decide('spec', facts, { ...seoOptions(), answers: 'Q1: có. Q2: không.' });
  assert.deepEqual(plan(answered), ['seo seo-write']);
  assert.equal(answered.runs[0].resume, 's-seo');
  assert.match(answered.runs[0].prompt, /You have no git: ao-step commits your change after your run, and pushes it to the docs PR #14\.$/);
});
