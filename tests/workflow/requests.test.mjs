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

// Review of shop PR #80 (reviewer and security, Medium): the hook of seo and this reader must read a request alike. The
// reader takes any Unicode space, a line break of its own or a decomposed letter as the plain text Jira would show.
test('a request after any Unicode space, line separator or zero-width mark, or with decomposed letters, is a request', () => {
  const SEO = { ...NAMES, seo: 'SEO Specialist' };
  for (const space of ['\u00a0', '\f', '\u2028', '\u2003', '\u3000', ' \u200b']) {
    const asks = openRequests([comment(9, `SEO Specialist:${space}Cần ba: thêm AC`)], SEO);
    assert.deepEqual(asks.map(({ from, to, text }) => [from, to, text]), [['seo', 'ba', 'thêm AC']], JSON.stringify(space));
  }
  assert.deepEqual(openRequests([comment(9, 'SEO Specialist: Cần ba: x'.normalize('NFD'))], SEO).map(({ to }) => to), ['ba'], 'NFD');
  assert.deepEqual(openRequests([comment(9, 'Frontend Developer: Cần\u00a0ba\uff1a x')], NAMES).map(({ to }) => to), ['ba'], 'a fullwidth colon');
});
