import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readRoster } from '../../lib/agents/roster.mjs';
import { readContract } from '../../lib/contract.mjs';
import { readGates } from '../../lib/quality/gates.mjs';
import { PURPOSES } from '../../lib/workflow/prompts.mjs';
import { decideStep, nextFor, noteKey } from '../../lib/workflow/steps.mjs';
import { CONTRACT_DIR, ROOT } from '../helpers/kit.mjs';
import { checkChange } from '../../scripts/ao-step.mjs';

// A draft PR between build and review (human-loop spec 4.2, 4.7).
const contract = readContract(CONTRACT_DIR);
const roster = readRoster(join(ROOT, 'agents'));
const gates = readGates(join(ROOT, 'quality'));
const options = { roster, contract, gates };
const HEAD = 'd1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4';

const sub = (key, role, state = 'done') => ({ key, workType: 'sub-task', state, status: state === 'done' ? 'Done' : 'To Do', labels: [`ao-${role}`], role, roles: [role], effort: null });
const draft = (more = {}) => ({
  number: 15, title: 'feat(cart): remove a line from the cart (DEMO-21)', state: 'open', merged: false, draft: true, headRef: 'feature/DEMO-21-remove-line', headSha: HEAD, base: 'develop', files: ['apps/api/src/cart.ts'], protectedPaths: [], docsEpic: null,
  ci: { green: true, failed: false, pending: false }, reports: { reviewer: null, security: null }, changesRequested: false, approved: false, securityCompare: null, ...more,
});
const buildFacts = (prMore = {}) => ({
  command: 'build',
  arg: 'DEMO-21',
  space: 'DEMO',
  item: {
    key: 'DEMO-21', type: 'Story', workType: 'story', state: 'in-progress', status: 'In Progress', summary: 'Xóa sản phẩm khỏi giỏ hàng', labels: [], role: null, roles: [], effort: null, agent: 'fe-dev', rework: 0,
    flagged: false, flag: null, parent: { key: 'DEMO-20', type: 'Epic', status: 'In Progress' }, subtasks: [sub('DEMO-22', 'be-dev'), sub('DEMO-23', 'fe-dev')], blockedBy: [], requests: [],
  },
  epic: null,
  docs: { branch: 'feature/DEMO-20-spec', exists: false, pr: { number: 14, state: 'closed', merged: true } },
  pr: draft(prMore),
  dependenciesMerged: true,
  wip: { epicShaping: { used: 0, limit: 1 }, devAgent: { 'be-dev': true, 'fe-dev': true } },
  ledger: false,
  subtaskLedgers: ['DEMO-22', 'DEMO-23'],
  run: null,
});

test('/ao-build stops at the draft PR for your preview, with the preview files and the way to skip it', () => {
  const decision = decideStep('build', buildFacts(), options);
  assert.equal(decision.go, false);
  assert.equal(decision.reason, 'the draft PR #15 of DEMO-21 waits for your preview: the screenshots and API samples of its dev agents are in .ai/runs/DEMO-21/preview/');
  assert.equal(decision.next, '/ao-preview DEMO-21, or /ao-review 15 to skip the preview');
  const pending = decideStep('build', buildFacts({ ci: { green: false, failed: false, pending: true } }), options);
  assert.match(pending.reason, /waits for your preview \(CI still running\)/);
});

test('red CI on a draft PR goes to /ao-fix first', () => {
  const decision = decideStep('build', buildFacts({ ci: { green: false, failed: true, pending: false } }), options);
  assert.equal(decision.reason, 'CI is red on the draft PR #15 of DEMO-21');
  assert.equal(decision.next, '/ao-fix 15');
});

test('/ao-review of a draft PR marks it ready first, a script with no agent, then the reviews run in the same command', () => {
  const facts = { ...buildFacts(), command: 'review', arg: '15' };
  const decision = decideStep('review', facts, options);
  assert.equal(decision.go, true);
  assert.deepEqual(decision.runs[0], { action: 'pr-ready', key: 'DEMO-21', number: 15, continue: true });
  assert.deepEqual(decision.runs.slice(1).map(({ role }) => role), ['reviewer', 'security']);
  // Its CI still has to be green, as for any review.
  const red = decideStep('review', { ...buildFacts({ ci: { green: false, failed: true, pending: false } }), command: 'review', arg: '15' }, options);
  assert.equal(red.go, false);
  assert.match(red.reason, /CI is red/);
});

const fixFacts = (prMore = {}, more = {}) => ({ ...buildFacts(prMore), command: 'fix', arg: '15', ...more });
const OLDER = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';
const fixPlan = (decision) => decision.runs.map(({ role, purpose }) => `${role} ${purpose}`);
const REQUEST = 'be: API trả thêm trường updatedAt\nfe: hiện updatedAt dưới tiêu đề, dạng "2 phút trước"';

test('/ao-fix on a draft PR runs the dev agents only, BE first, each with its part and the other part to know (human-loop 4.4)', () => {
  const decision = decideStep('fix', fixFacts(), { ...options, note: REQUEST });
  assert.equal(decision.go, true);
  assert.deepEqual(fixPlan(decision), ['be-dev fix', 'fe-dev fix']);
  const [be, fe] = decision.runs;
  assert.equal(be.note, noteKey(REQUEST));
  assert.equal(be.prompt, PURPOSES.fix({ pr: 15, key: 'DEMO-21', branch: 'feature/DEMO-21-remove-line', reasons: ['what the human asks below'], note: 'API trả thêm trường updatedAt', others: [{ role: 'fe-dev', text: 'hiện updatedAt dưới tiêu đề, dạng "2 phút trước"' }], draft: true }));
  assert.match(be.prompt, /The PR is a draft the human previewed: update your preview files in \.ai\/runs\/DEMO-21\/preview\//);
  assert.match(be.prompt, /The human asks fe-dev for this part, which is not yours to do:\n\nhiện updatedAt/);
  assert.match(fe.prompt, /The human asks:\n\nhiện updatedAt dưới tiêu đề/);
  assert.match(fe.prompt, /The human asks be-dev for this part/);
});

test('a request without be: or fe: stops on a Story with a BE and an FE Sub-task; on an item of one dev role it goes to that role', () => {
  const stopped = decideStep('fix', fixFacts(), { ...options, note: 'đổi màu nút sang xanh' });
  assert.equal(stopped.go, false);
  assert.equal(stopped.reason, 'your request has no be: or fe:, and DEMO-21 has a BE and an FE Sub-task: /ao-fix does not guess who does it');
  assert.equal(stopped.next, 'Start each part of your request with be: or fe:, then /ao-fix 15 again');
  const task = fixFacts({}, {});
  task.item = { ...task.item, type: 'Task', workType: 'task', subtasks: [], role: 'fe-dev', roles: ['fe-dev'], agent: 'fe-dev' };
  assert.deepEqual(fixPlan(decideStep('fix', task, { ...options, note: 'đổi màu nút sang xanh' })), ['fe-dev fix']);
});

test('a part pushed already is not sent again; once all are pushed, the draft waits for your preview again', () => {
  const run = (role, head) => ({ n: 1, command: 'fix', role, purpose: 'fix', outcome: 'done', head, session: `s-${role}`, note: noteKey(REQUEST) });
  const half = fixFacts({}, { run: { key: 'DEMO-21', runs: [run('be-dev', OLDER)] } });
  assert.deepEqual(fixPlan(decideStep('fix', half, { ...options, note: REQUEST })), ['fe-dev fix']);
  const both = fixFacts({}, { run: { key: 'DEMO-21', runs: [run('be-dev', OLDER), run('fe-dev', OLDER)] } });
  const decision = decideStep('fix', both, { ...options, note: REQUEST });
  assert.equal(decision.go, false);
  assert.equal(decision.reason, 'the draft PR #15 of DEMO-21 has nothing left to fix: your request is pushed');
  assert.equal(decision.next, '/ao-preview DEMO-21 to look at it again, or /ao-review 15');
});

test('red CI on a draft PR goes to the dev agent of the item, with no review; a ready PR is reviewed again after the fix', () => {
  assert.deepEqual(fixPlan(decideStep('fix', fixFacts({ ci: { green: false, failed: true, pending: false } }), options)), ['fe-dev fix']);
  const ready = decideStep('fix', fixFacts({ draft: false }), { ...options, note: 'fe: chữ to hơn' });
  assert.deepEqual(fixPlan(ready), ['fe-dev fix', 'reviewer review', 'security review']);
  assert.doesNotMatch(ready.runs[0].prompt, /draft/);
});

test('what a request changes runs first: ba for the criteria, sa for the API contract or the whole Epic, on the PR branch (4.5)', () => {
  const cases = { none: [], ac: ['ba ac-revise'], api: ['sa api-revise'], epic: ['sa epic-revise'] };
  for (const [change, before] of Object.entries(cases)) {
    const decision = decideStep('fix', fixFacts(), { ...options, note: REQUEST, change });
    assert.deepEqual(fixPlan(decision), [...before, 'be-dev fix', 'fe-dev fix'], change);
  }
  const ac = decideStep('fix', fixFacts(), { ...options, note: REQUEST, change: 'ac' });
  const [ba, be] = ac.runs;
  assert.deepEqual(ba.checkout, { branch: 'feature/DEMO-21-remove-line', pull: true });
  assert.equal(ba.note, noteKey(REQUEST));
  assert.equal(ba.prompt, PURPOSES['ac-revise']({ pr: 15, key: 'DEMO-21', branch: 'feature/DEMO-21-remove-line', epic: 'DEMO-20', note: REQUEST }));
  assert.match(ba.prompt, /comment the old and the new criteria\. A new criterion takes the next free AC number of Epic DEMO-20, and no number is used again/);
  assert.match(ba.prompt, /docs\/specs\/DEMO-20\/spec\.md on the branch feature\/DEMO-21-remove-line/);
  assert.match(be.prompt, /The acceptance criteria of DEMO-21 changed for this request: read them on Jira first/);
  // Once ba pushed the criteria, it does not run again for the same request.
  const after = fixFacts({}, { run: { key: 'DEMO-21', runs: [{ n: 1, command: 'fix', role: 'ba', purpose: 'ac-revise', outcome: 'done', head: OLDER, session: 's', note: noteKey(REQUEST) }] } });
  assert.deepEqual(fixPlan(decideStep('fix', after, { ...options, note: REQUEST, change: 'ac' })), ['be-dev fix', 'fe-dev fix']);
});

test('a Task of an Epic becomes a Story through ba; anything else, or a Task with no Epic, stops', () => {
  const task = fixFacts();
  task.item = { ...task.item, type: 'Task', workType: 'task', subtasks: [], role: 'fe-dev', roles: ['fe-dev'], agent: 'fe-dev' };
  const decision = decideStep('fix', task, { ...options, note: 'hiện số dòng trong giỏ', change: 'story' });
  assert.deepEqual(fixPlan(decision), ['ba to-story', 'fe-dev fix']);
  assert.match(decision.runs[0].prompt, /Change its type to Story with editJiraIssue, with the field issuetype named Story; if Jira refuses, stop and say so/);
  const story = decideStep('fix', fixFacts(), { ...options, note: REQUEST, change: 'story' });
  assert.equal(story.reason, 'DEMO-21 is a Story: only a Task becomes a Story');
  const alone = { ...task, item: { ...task.item, parent: null } };
  assert.equal(decideStep('fix', alone, { ...options, note: 'x', change: 'story' }).reason, 'Task DEMO-21 has no Epic, and a Story needs one with an approved plan');
  assert.match(decideStep('fix', alone, { ...options, note: 'x', change: 'api' }).reason, /has no Epic, so no plan or SPEC to change/);
});

test('--change is one word of a fixed list, with /ao-fix or /ao-qa, and only with a request', () => {
  assert.equal(checkChange('fix', undefined, false), null);
  for (const change of ['none', 'ac', 'api', 'epic', 'story']) assert.equal(checkChange('fix', change, true), null, change);
  assert.equal(checkChange('fix', 'ac; rm -rf', true), '--change takes none, ac, api, epic, story, not ac; rm -rf');
  assert.equal(checkChange('qa', 'api', true), '--change takes none, ac, not api');
  assert.equal(checkChange('review', 'ac', true), '--change goes with /ao-fix and /ao-qa only');
  assert.equal(checkChange('fix', 'ac', false), '--change goes with --note: it says what your request changes');
});

test('the next command of an item In Progress with a draft PR is the preview, or the review', () => {
  const item = { key: 'DEMO-21', workType: 'story', state: 'in-progress', flagged: false };
  assert.equal(nextFor(item, 15, true), '/ao-preview DEMO-21 or /ao-review 15');
  assert.equal(nextFor(item, 15, false), '/ao-review 15');
  assert.equal(nextFor(item, 15), '/ao-review 15');
});

test('/ao-status lists a draft PR as one, with the preview as its next command, which waits for you', () => {
  const facts = {
    command: 'status',
    space: 'DEMO',
    item: null,
    items: [{ key: 'DEMO-21', type: 'Story', workType: 'story', state: 'in-progress', status: 'In Progress', summary: 'Xóa một dòng', flagged: false, requests: [] }],
    pulls: [{ number: 15, title: 't', headRef: 'feature/DEMO-21-remove-line', key: 'DEMO-21', draft: true }],
    runs: [],
  };
  const { lines, next } = decideStep('status', facts, options);
  assert.deepEqual(lines, [
    'Waiting for you:',
    '  DEMO-21: /ao-preview DEMO-21 or /ao-review 15',
    '',
    'DEMO-21 Story "Xóa một dòng": In Progress, draft PR #15 → /ao-preview DEMO-21 or /ao-review 15',
  ]);
  assert.equal(next, 'DEMO-21: /ao-preview DEMO-21 or /ao-review 15');
});
