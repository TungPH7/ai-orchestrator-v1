import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findingsComment, findingsStep, findingsTask, recordedLine } from '../../lib/workflow/findings.mjs';

const MINOR = [
  { role: 'reviewer', severity: 'Medium', where: 'apps/api/src/cart/cart.service.ts:12', finding: 'Giỏ rỗng làm hỏng tổng. Tái hiện: giỏ có 0 sản phẩm → 500', id: 'a1b2c3d4' },
  { role: 'security', severity: 'Low', where: 'apps/web/src/cart.tsx:3', finding: 'Tên biến\nkhó đọc', id: 'e5f60718', asked: 'Medium' },
];

test('the comment names the PR on its first line, then one finding a line with its severity, id, role and place', () => {
  const text = findingsComment({ key: 'DEMO-21', pr: 15, findings: MINOR });
  assert.deepEqual(text.split('\n'), [
    'Finding chưa sửa của PR #15 (DEMO-21):',
    '',
    '- Medium a1b2c3d4, reviewer: apps/api/src/cart/cart.service.ts:12: Giỏ rỗng làm hỏng tổng. Tái hiện: giỏ có 0 sản phẩm → 500',
    '- Low (Medium không có dòng tái hiện) e5f60718, security: apps/web/src/cart.tsx:3: Tên biến khó đọc',
  ]);
  assert.ok(text.startsWith(recordedLine(15)));
  assert.ok(!text.startsWith(recordedLine(1)), 'PR #1 is not PR #15');
});

test('the Task follows templates/task.md, in Vietnamese under English headings', () => {
  const { summary, description } = findingsTask({ epic: 'DEMO-20' });
  assert.equal(summary, 'Finding Medium và Low chưa sửa của DEMO-20');
  for (const heading of ['## Goal', '## Technical Checklist', '## Dependencies', '## Verification']) assert.ok(description.includes(heading), heading);
});

test('the step: only for a merged PR of an item in an Epic, with Medium or Low on its head, not recorded yet', () => {
  const facts = (more = {}) => ({ item: { key: 'DEMO-21' }, epic: { key: 'DEMO-20' }, pr: { number: 15, merged: true, minorFindings: MINOR }, findings: { key: null, recorded: false }, ...more });
  assert.deepEqual(findingsStep(facts()), { action: 'findings-task', key: 'DEMO-21', epic: 'DEMO-20', task: null, pr: 15, findings: MINOR, continue: true });
  assert.equal(findingsStep(facts({ findings: { key: 'DEMO-40', recorded: false } })).task, 'DEMO-40', 'the Task the Epic has');
  assert.equal(findingsStep(facts({ findings: { key: 'DEMO-40', recorded: true } })), null, 'recorded already');
  assert.equal(findingsStep(facts({ epic: null })), null, 'an item outside an Epic');
  assert.equal(findingsStep(facts({ pr: { number: 15, merged: true, minorFindings: [] } })), null, 'no Medium or Low');
  assert.equal(findingsStep(facts({ pr: { number: 15, merged: false, minorFindings: MINOR } })), null, 'not merged');
  assert.equal(findingsStep(facts({ findings: { key: 'DEMO-21', recorded: false } })), null, 'the PR of the findings Task itself (SHOP-85 of shop)');
});
