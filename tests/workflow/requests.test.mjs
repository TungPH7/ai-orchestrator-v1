import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openRequests, UNSIGNED_AGENT } from '../../lib/workflow/requests.mjs';

// The Agent field value of each role, as tracker/jira.yaml maps it (agents/rules.md: an agent's comment starts with it).
const NAMES = { ba: 'Business Analyst', ux: 'UI/UX designer', sa: 'Solution Architect', 'fe-dev': 'Frontend Developer', qa: 'Tester/QA Engineer' };
const adf = (text) => ({ type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });
const comment = (hour, text) => ({ created: `2026-11-03T${String(hour).padStart(2, '0')}:00:00.000+0700`, body: adf(text) });
const ASK = 'Frontend Developer: Cần ba: tạo Task cho bảng sản phẩm tràn ở 320 px.';

test('a comment that asks another role with "Cần <role>:" is open until that role comments on the item after it', () => {
  assert.deepEqual(openRequests([comment(9, ASK)], NAMES), [{ from: 'fe-dev', to: 'ba', text: 'tạo Task cho bảng sản phẩm tràn ở 320 px.', at: Date.parse('2026-11-03T02:00:00Z') }]);
  assert.deepEqual(openRequests([comment(9, ASK), comment(10, 'Business Analyst: đã tạo DEMO-30.')], NAMES), []);
});

test('a comment of another role, or one by the asked role before the request, does not answer it', () => {
  assert.equal(openRequests([comment(9, ASK), comment(10, 'Tester/QA Engineer: mình cũng thấy lỗi này.')], NAMES).length, 1);
  assert.equal(openRequests([comment(8, 'Business Analyst: đã tạo Story.'), comment(9, ASK)], NAMES).length, 1);
  // Comments come in any order; time decides.
  assert.equal(openRequests([comment(10, 'Business Analyst: đã tạo DEMO-30.'), comment(9, ASK)], NAMES).length, 0);
});

test('a request without the author prefix, from you, is a request too; an unknown role or plain text is not', () => {
  assert.deepEqual(openRequests([comment(9, 'Cần ux: vẽ thêm trạng thái trống của giỏ hàng.')], NAMES).map(({ from, to }) => [from, to]), [[null, 'ux']]);
  assert.deepEqual(openRequests([comment(9, 'Cần designer: vẽ lại.'), comment(10, 'Frontend Developer: cần ba xem lại AC2.')], NAMES), []);
  assert.deepEqual(openRequests([{ created: '2026-11-03T09:00:00.000+0700', body: 'Cần sa: ghi ADR cho cache.' }], NAMES).map(({ to }) => to), ['sa'], 'a body in plain text');
});

test('several requests are each tracked on their own', () => {
  const comments = [comment(9, ASK), comment(9, 'Frontend Developer: Cần ux: thêm màn hình lỗi mạng.'), comment(11, 'UI/UX designer: đã thêm S3.')];
  assert.deepEqual(openRequests(comments, NAMES).map(({ to }) => to), ['ba']);
});

test("an unsigned request of the agents' account is an agent's, never yours (review of ao-sample PR #21)", () => {
  const by = (accountId, hour, text) => ({ ...comment(hour, text), author: { accountId } });
  const asks = [by('agents-1', 9, 'Cần ba: đổi AC2.'), by('human-1', 10, 'Cần sa: ghi ADR cho cache.'), by('agents-1', 11, 'Frontend Developer: Cần ux: thêm S3.')];
  assert.deepEqual(openRequests(asks, NAMES, { agentAccount: 'agents-1' }).map(({ from, to }) => [from, to]), [['agent', 'ba'], [null, 'sa'], ['fe-dev', 'ux']]);
  assert.equal(UNSIGNED_AGENT, 'agent');
});
