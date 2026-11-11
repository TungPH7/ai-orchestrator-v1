import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readRoster } from '../../lib/agents/roster.mjs';
import { readContract } from '../../lib/contract.mjs';
import { PURPOSES } from '../../lib/workflow/prompts.mjs';
import { decideStep } from '../../lib/workflow/steps.mjs';
import { CONTRACT_DIR, ROOT } from '../helpers/kit.mjs';

// /ao-request and the requests /ao-spec and /ao-plan run on their Epic (human-loop spec 3.3).
const contract = readContract(CONTRACT_DIR);
const roster = readRoster(join(ROOT, 'agents'));
const options = { roster, contract };
const decide = (command, facts) => decideStep(command, facts, options);
const BRANCH = 'feature/DEMO-20-spec';
const T1 = Date.parse('2026-11-11T03:00:00Z');
const T2 = Date.parse('2026-11-11T04:00:00Z');
const SPEC = '# Spec\n\nMàn hình ở `docs/specs/DEMO-20/design.md`.\n\n### Non-functional requirements\n\n- nhanh\n\n## Open Questions\n\nKhông có.\n';
const DESIGN = '# Design\n\n## Open Questions\n\nKhông có.\n';
const PLAN = '# Plan\n\n## Task List\n\n- [ ] Story: Xóa một dòng · be-dev, fe-dev (Sub-task)\n\n## Open Questions\n\n- Không có.\n';
const ci = { green: true, failed: false, pending: false, started: true };
const docsPr = { number: 14, state: 'open', merged: false, ci };

// Story DEMO-21 In Progress, with the open requests given.
function storyFacts(requests, item = {}) {
  return {
    command: 'request',
    space: 'DEMO',
    item: { key: 'DEMO-21', type: 'Story', workType: 'story', state: 'in-progress', status: 'In Progress', summary: 'Xóa một dòng', labels: [], flagged: false, flag: null, subtasks: [], roles: ['fe-dev'], role: 'fe-dev', requests, ...item },
    epic: null,
    docs: null,
    pr: null,
    wip: { epicShaping: { used: 0, limit: 1 }, devAgent: {} },
    ledger: false,
    run: null,
  };
}

// Epic DEMO-20 in `state`, with the open requests given, its stage done up to its gate.
function epicFacts(state, requests, command = 'request') {
  const status = { specifying: 'Specifying', planning: 'Planning', 'in-progress': 'In Progress' }[state];
  return {
    command,
    space: 'DEMO',
    item: { key: 'DEMO-20', type: 'Epic', workType: 'epic', state, status, summary: 'Xóa sản phẩm', labels: [], flagged: false, flag: null, children: state === 'specifying' ? [] : [{ key: 'DEMO-21', state: 'new', subtasks: [] }], requests, subtasks: [] },
    docs: { branch: BRANCH, exists: true, pr: docsPr, spec: SPEC, design: DESIGN, plan: state === 'specifying' ? null : PLAN },
    pr: null,
    wip: { epicShaping: { used: 1, limit: 1 }, devAgent: {} },
    ledger: false,
    run: null,
  };
}

const request = (to, at, from = 'fe-dev', text = 'tạo Task cho bảng tràn ở 320 px') => ({ from, to, text, at });

test('/ao-request runs the oldest open request to ba, ux or sa; on an item past stage plan, from develop and on Jira only', () => {
  const decision = decide('request', storyFacts([request('sa', T2), request('ba', T1)].sort((a, b) => a.at - b.at)));
  assert.equal(decision.go, true);
  assert.equal(decision.runs.length, 1);
  const [run] = decision.runs;
  assert.deepEqual({ role: run.role, key: run.key, purpose: run.purpose, effort: run.effort, request: run.request, checkout: run.checkout }, { role: 'ba', key: 'DEMO-21', purpose: 'request', effort: roster.roles.ba.effort, request: T1, checkout: { branch: 'develop', pull: true } });
  assert.equal(run.prompt, PURPOSES.request({ key: 'DEMO-21', role: 'ba', from: 'fe-dev', at: T1 }));
  assert.match(run.prompt, /fe-dev asked you on DEMO-21 .*"Cần ba:".*2026-11-11T03:00:00/);
  assert.match(run.prompt, /commit nothing/);
  assert.match(run.prompt, /flag the item Needs you/);
});

test('your own request, a comment with no Agent name, counts like an agent\'s', () => {
  const [run] = decide('request', storyFacts([request('ux', T1, null)])).runs;
  assert.equal(run.role, 'ux');
  assert.match(run.prompt, /^The human asked you on DEMO-21/);
});

test('requests to other roles are not run: the command stops and names them', () => {
  const decision = decide('request', storyFacts([request('be-dev', T1, 'fe-dev')]));
  assert.equal(decision.go, false);
  assert.equal(decision.reason, 'DEMO-21 has no open request to ba, ux or sa; 1 open request goes to another role (be-dev)');
  assert.equal(decision.next, '/ao-status DEMO-21');
  assert.equal(decide('request', storyFacts([])).reason, 'DEMO-21 has no open request to ba, ux or sa');
});

test('a flagged item waits for you before any request runs', () => {
  const decision = decide('request', storyFacts([request('ba', T1)], { flagged: true, flag: 'other' }));
  assert.equal(decision.go, false);
  assert.match(decision.reason, /flagged Needs you/);
});

test('on an Epic in stage spec or plan, the request runs on its docs branch, and pushes when the docs PR is open', () => {
  for (const state of ['specifying', 'planning']) {
    const [run] = decide('request', epicFacts(state, [request('ba', T1, 'ux', 'S2 cần nút hoàn tác không?')])).runs;
    assert.deepEqual(run.checkout, { branch: BRANCH, from: 'develop' }, state);
    assert.equal(run.prompt, PURPOSES.request({ key: 'DEMO-20', role: 'ba', from: 'ux', at: T1, branch: BRANCH, pr: 14 }), state);
    assert.match(run.prompt, /The branch feature\/DEMO-20-spec is checked out: commit your change there, then push it, so the docs PR #14 shows it/);
  }
  const [after] = decide('request', epicFacts('in-progress', [request('ba', T1)])).runs;
  assert.deepEqual(after.checkout, { branch: 'develop', pull: true }, 'past gate ②, Jira only');
});

test('/ao-spec runs the open requests to ba, ux or sa on its Epic before it stops at gate ①; others wait', () => {
  const asked = decide('spec', epicFacts('specifying', [request('ba', T1, 'ux', 'S2 cần nút hoàn tác không?')], 'spec'));
  assert.equal(asked.go, true);
  assert.deepEqual(asked.runs.map(({ role, purpose }) => `${role} ${purpose}`), ['ba request']);
  const none = decide('spec', epicFacts('specifying', [request('be-dev', T1, 'ux')], 'spec'));
  assert.equal(none.go, false);
  assert.match(none.reason, /waits for you at gate ① spec-approval/);
});

test('/ao-plan runs the open requests on its Epic before it stops at gate ②', () => {
  const asked = decide('plan', epicFacts('planning', [request('ba', T1, 'sa', 'cập nhật item theo Task List: thêm dòng 3')], 'plan'));
  assert.equal(asked.go, true);
  assert.deepEqual(asked.runs.map(({ role, purpose }) => `${role} ${purpose}`), ['ba request']);
  assert.equal(decide('plan', epicFacts('planning', [], 'plan')).go, false);
});

test('an unsigned request of the agents account is put to the role as an agent request, not yours (review of ao-sample PR #21)', () => {
  const [run] = decide('request', storyFacts([request('ba', T1, 'agent')])).runs;
  assert.match(run.prompt, /^An agent that did not start its comment with its Agent value asked you on DEMO-21/);
  assert.match(run.prompt, /leave anything that changes acceptance criteria, scope or items to the human/);
});

test('a request run that stopped goes on in its session with its request, so it is not made again after it', () => {
  const facts = storyFacts([request('ba', T1)]);
  facts.run = { key: 'DEMO-21', runs: [{ n: 1, command: 'request', role: 'ba', purpose: 'request', outcome: 'usage-limit', session: 's1', effort: 'high', request: T1, checkout: { branch: 'develop', pull: true } }] };
  const [run] = decide('request', facts).runs;
  assert.deepEqual([run.resume, run.request], ['s1', T1]);
});
