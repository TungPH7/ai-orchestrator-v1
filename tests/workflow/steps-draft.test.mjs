import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readRoster } from '../../lib/agents/roster.mjs';
import { readContract } from '../../lib/contract.mjs';
import { readGates } from '../../lib/quality/gates.mjs';
import { decideStep, nextFor } from '../../lib/workflow/steps.mjs';
import { CONTRACT_DIR, ROOT } from '../helpers/kit.mjs';

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
