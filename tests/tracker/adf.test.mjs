import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markdownToAdf } from '../../lib/tracker/adf.mjs';
import { adfText, failedCriteria, qaReportResult } from '../../lib/tracker/facts.mjs';

const REPORT = [
  '# QA report: DEMO-30 Hướng dẫn xóa sản phẩm',
  '',
  '<!-- a comment of the template -->',
  '## Result',
  '',
  'FAIL',
  '',
  '## Acceptance Criteria',
  '',
  '| Acceptance criterion | Result | Evidence |',
  '|---|---|---|',
  '| Chữ trên nút khớp file i18n | PASS | so với vi.json |',
  '| **Ảnh S1** khớp màn hình | FAIL | ảnh cũ |',
].join('\n');

test('a Markdown report becomes a document: headings, then one paragraph a line, without blank lines, comments and table rules', () => {
  const doc = markdownToAdf(REPORT);
  assert.equal(doc.type, 'doc');
  assert.deepEqual(doc.content.map(({ type }) => type), ['heading', 'heading', 'paragraph', 'heading', 'paragraph', 'paragraph', 'paragraph']);
  assert.deepEqual(doc.content[0], { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'QA report: DEMO-30 Hướng dẫn xóa sản phẩm' }] });
});

test('the kit reads back the result and the failed criteria of the report it posted (C1 spec section 2)', () => {
  const doc = markdownToAdf(REPORT);
  assert.equal(qaReportResult(doc), 'FAIL');
  assert.deepEqual(failedCriteria(doc), ['Ảnh S1 khớp màn hình']);
  assert.deepEqual(failedCriteria(REPORT), ['Ảnh S1 khớp màn hình'], 'from Markdown too');
  assert.match(adfText(doc), /^QA report: DEMO-30/);
});

test('the failed criteria of a report written as a Jira table: adfText joins its cells', () => {
  const cell = (text) => ({ type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });
  const row = (...texts) => ({ type: 'tableRow', content: texts.map(cell) });
  const table = { type: 'doc', content: [{ type: 'table', content: [row('Acceptance criterion', 'Result', 'Evidence'), row('AC1: a', 'PASS', 'x'), row('AC2: b', 'FAIL', 'y')] }] };
  assert.deepEqual(failedCriteria(table), ['AC2: b']);
});
