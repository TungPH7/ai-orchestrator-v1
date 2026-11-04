import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { openQuestions, readRun } from '../../lib/workflow/runs.mjs';
import { ROOT } from '../helpers/kit.mjs';

// Logs of real runs of agent-roster, trimmed to the events readRun reads (tests/fixtures/workflow/runs/).
const log = (name) => readFileSync(join(ROOT, 'tests/fixtures/workflow/runs', `${name}.jsonl`), 'utf8').split('\n');

test('a finished run: its outcome, session, model, turns, time, tokens, cost and the calls a hook refused', () => {
  const run = readRun(log('reviewer-done'));
  assert.equal(run.outcome, 'done');
  assert.equal(run.session, '5d3434b0-44a4-45fa-a4e3-815d6eb35ddd');
  assert.equal(run.model, 'claude-opus-5-5');
  assert.deepEqual([run.turns, run.durationMs, run.costUsd], [26, 215795, 1.07985]);
  assert.deepEqual(run.tokens, { input: 40, output: 17529, cacheRead: 923949, cacheWrite: 68040 });
  assert.equal(run.denials.length, 1);
  assert.equal(run.denials[0].tool, 'Bash');
  assert.match(run.text, /^I reviewed PR #12 and posted the report/);
});

test('a run resumed in the same session counts only what it added: the log of --resume adds up the whole session', () => {
  const first = readRun(log('ba-first'));
  const resumed = readRun(log('ba-resume'), first);
  assert.deepEqual([first.costUsd, first.tokens.output], [1.824105, 40268]);
  assert.equal(resumed.session, first.session);
  assert.deepEqual([resumed.turns, resumed.durationMs], [4, 124119]);
  assert.equal(resumed.costUsd, 0.526284);
  assert.deepEqual(resumed.tokens, { input: 10, output: 15272, cacheRead: 433298, cacheWrite: 16768 });
  assert.deepEqual(resumed.cumulative, { costUsd: 2.350389, tokens: { input: 46, output: 55540, cacheRead: 1525705, cacheWrite: 116783 } });
  // A previous run of another session takes nothing off.
  assert.equal(readRun(log('ba-resume'), readRun(log('reviewer-done'))).costUsd, 2.350389);
});

test('a run that waited for a background command has two result events: turns and time add up, cost is the last', () => {
  const run = readRun(log('background-two-results'));
  assert.deepEqual([run.outcome, run.turns, run.durationMs, run.costUsd], ['done', 4, 14232, 0.004253]);
});

test('the usage limit, the turn limit, an error and a run cut off are told apart', () => {
  const limit = readRun(log('security-usage-limit'));
  assert.equal(limit.outcome, 'usage-limit');
  assert.match(limit.text, /^You've hit your 5-hour limit/);
  assert.equal(limit.denials.length, 2);

  // No real run hit max_turns; this is its shape, from the result event of a real run.
  const lines = log('reviewer-done').map((line) => line.replace('"subtype":"success","is_error":false,"terminal_reason":"completed"', '"subtype":"error_max_turns","is_error":true,"terminal_reason":"max_turns"'));
  assert.equal(readRun(lines).outcome, 'max-turns');
  const failed = log('reviewer-done').map((line) => line.replace('"subtype":"success","is_error":false', '"subtype":"error_during_execution","is_error":true'));
  assert.equal(readRun(failed).outcome, 'error');

  const cut = readRun(log('reviewer-done').filter((line) => !line.includes('"type":"result"')));
  assert.equal(cut.outcome, 'unfinished');
  assert.equal(cut.session, '5d3434b0-44a4-45fa-a4e3-815d6eb35ddd', 'the session is known from the init event, so the run can be resumed');
  assert.deepEqual([cut.turns, cut.costUsd], [0, 0]);
  assert.equal(readRun([]).outcome, 'unfinished');
  assert.equal(readRun(['not json', '{"type":"system","subtype":"init","session_id":"s1"}']).session, 's1');
});

// Open Questions sections as agents wrote them on DEMO-11 (ao-pilot, agent-roster T18).
const doc = (section) => `# SPEC\n\n## Scope\n\n- Áp mã\n\n## Open Questions\n\n${section}\n\n## Example\n\n- Có cần "Ghi nhớ đăng nhập" không?\n`;

test('the questions left in the Open Questions section: one per item of its top-level list', () => {
  const asked = doc(
    [
      'Phiên này không có ai trả lời, nên mỗi câu hỏi kèm câu trả lời tôi đề xuất.',
      '',
      '1. **Q1 — Danh sách mã.** Epic không nêu mã nào.',
      '   - Đề xuất: `GIAM10` giảm 10% tạm tính.',
      '2. **Q2 — Làm tròn và phí vận chuyển.**',
      '- Q8 của `sa`: server có cần trả 400 khi thiếu `Host` không?',
    ].join('\n'),
  );
  assert.deepEqual(openQuestions(asked), ['Q1 — Danh sách mã. Epic không nêu mã nào.', 'Q2 — Làm tròn và phí vận chuyển.', 'Q8 của `sa`: server có cần trả 400 khi thiếu `Host` không?']);
});

// As sa wrote them on DEMO-20 (dev-workflow T17): each question a bold Q paragraph, its details as top-level bullets and a
// table; ao-step counted 10 questions where there were 2.
test('when the section names its questions Q1, Q2…, only those count, not the bullets that explain them', () => {
  const asked = doc(
    [
      'Các câu Q1–Q3 của `ba` được trả lời ngày 2026-11-01.',
      '',
      'Câu Q4 và Q5 dưới đây là của `sa`, ngày 2026-11-01.',
      '',
      '**Q4. Ba test hiện có nữa của `src/page.test.ts` phải đổi theo design.**',
      '',
      'Tôi dựng một prototype của `renderCart` theo `design.md`:',
      '',
      '- mỗi nút "Xóa" có form riêng trong ô thứ năm;',
      '- `STYLE` có một media query dưới 30 rem.',
      '',
      '| Test | Điều nó kiểm |',
      '|---|---|',
      '| "a cart has a coupon form" | `<form` đầu tiên |',
      '',
      '**Q5. Thêm mã dòng vào dữ liệu của các test hiện có.**',
      '',
      '- (A) Thêm `id` vào các dòng dữ liệu đó.',
      '- (B) Không thêm `id`.',
    ].join('\n'),
  );
  assert.deepEqual(openQuestions(asked), ['Q4. Ba test hiện có nữa của `src/page.test.ts` phải đổi theo design.', 'Q5. Thêm mã dòng vào dữ liệu của các test hiện có.']);
  const listed = doc(['- **Q1. Có hỏi xác nhận trước khi xóa không?**', '  - Đề xuất: không.', '- **Q2. Có hiện thông báo sau khi xóa không?**'].join('\n'));
  assert.deepEqual(openQuestions(listed), ['Q1. Có hỏi xác nhận trước khi xóa không?', 'Q2. Có hiện thông báo sau khi xóa không?']);
});

test('no question: an empty section, the template comment only, "Không có", or "Không còn câu hỏi mở" with notes after it', () => {
  assert.deepEqual(openQuestions(doc('')), []);
  assert.deepEqual(openQuestions(doc('<!-- What still needs your decision before gate ① spec-approval. -->')), []);
  assert.deepEqual(openQuestions(doc('- Không có.')), []);
  assert.deepEqual(openQuestions(doc('None.')), []);
  assert.deepEqual(openQuestions(doc('Không còn câu hỏi mở.\n\n- Các câu Q1–Q7 của bản trước được trả lời ngày 2026-10-31.')), []);
  assert.deepEqual(openQuestions('# Plan\n\n## Task List\n\n- T1\n'), [], 'no section at all');
});

test('a question that begins like "Không có" or "None" is still a question; only a first line that says just that means none (SMP-2)', () => {
  const ux = doc('Các câu hỏi dưới đây chưa có người trả lời, nên mỗi câu có đề xuất của `ux`.\n\n- **Không có Figma.** Epic không có link khung Figma. Đề xuất: không cần.\n- **Đánh dấu ô bắt buộc.** Đề xuất: không thêm dấu sao.');
  assert.deepEqual(openQuestions(ux), ['Không có Figma. Epic không có link khung Figma. Đề xuất: không cần.', 'Đánh dấu ô bắt buộc. Đề xuất: không thêm dấu sao.']);
  assert.deepEqual(openQuestions(doc('None of the screens has a Figma frame: is one needed?')), ['None of the screens has a Figma frame: is one needed?']);
  assert.deepEqual(openQuestions(doc('- Q1: có cần nút xóa không?\n- Không có.')), ['Q1: có cần nút xóa không?']);
  assert.deepEqual(openQuestions(doc('Không có câu hỏi mở.')), []);
  assert.deepEqual(openQuestions(doc('Không có: Q1–Q4 đã được trả lời ở mục Rules.')), []);
  // Other ways an agent says there is none (review of SMP-3).
  for (const none of ['Không có, mọi câu đã được trả lời.', 'Không có — đã trả lời hết.', 'Không có (đã trả lời hết).', 'Không có câu hỏi mở nào cả.']) {
    assert.deepEqual(openQuestions(doc(none)), [], none);
  }
});

// The punctuation after "Không có" may begin a question rather than a note (review of ao-sample PR #5): a first line that
// asks something is a question.
test('a first line that begins "Không có," "Không có (" or "Không có -" and asks something is still a question', () => {
  for (const asked of ['Không có, hay chỉ một nút xóa từng dòng?', 'Không có (hay chưa có) mockup cho màn hình nhỏ: ux có cần vẽ không?', 'Không có - có cần trang lỗi riêng không?', 'None, unless the list needs paging?']) {
    assert.deepEqual(openQuestions(doc(asked)), [asked], asked);
  }
  assert.deepEqual(openQuestions(doc('- Không có, hay chỉ một nút xóa?\n- Có cần hỏi xác nhận không?')), ['Không có, hay chỉ một nút xóa?', 'Có cần hỏi xác nhận không?']);
});

test('text without a list is still a question, so a run never passes over it', () => {
  assert.deepEqual(openQuestions(doc('Có cần lưu giỏ hàng khi đăng xuất không?')), ['Có cần lưu giỏ hàng khi đăng xuất không?']);
});

test('the fixtures of this module hold no token, email address or path of a real machine', () => {
  const dir = join(ROOT, 'tests/fixtures/workflow');
  for (const file of readdirSync(dir, { recursive: true }).filter((name) => /\.(jsonl?|md|ya?ml)$/.test(name))) {
    const text = readFileSync(join(dir, file), 'utf8');
    for (const pattern of [/gh[pousr]_[A-Za-z0-9]{20,}/, /ATATT[A-Za-z0-9_-]{20,}/, /[\w.+-]+@(?!example\.com)[\w-]+\.[a-z]{2,}/i, /[A-Za-z]:[\\/]+Users[\\/]/i, /1Khoahoc/i]) {
      assert.doesNotMatch(text, pattern, `${file}: ${pattern}`);
    }
  }
});
