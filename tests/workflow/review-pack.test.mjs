import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adfText, buildReviewPack, contractSections, criteriaLines, namedCodes, planEntry, section } from '../../lib/workflow/review-pack.mjs';

// Cut down from docs/specs/SMP-2/ of ao-sample (Pilot 1).
const PLAN = `# Implementation Plan: Ghi chú

## API Contract

### Kiểu dùng chung: \`apps/api/src/notes/notes.shared.ts\`

Một file, không import gì.

### Dạng lỗi chung: \`apps/api/src/common/api-error.ts\`

| Lỗi | Mã |
|---|---|
| JSON hỏng | \`INVALID_BODY\` |

## Task List

### Phase 1: Nền

- [ ] Task 1: Dạng lỗi chung của API · be-dev · effort xhigh: bảo mật (ADR-0003).
  - Phạm vi: \`apps/api/src/common/api-error.ts\`.
  - Không đổi giao diện.
- [ ] Task 2: Quy tắc ghi chú dùng chung cho form và API · be-dev
  - Mục tiêu: nền của AC3, AC4, AC5 và AC9.

### Phase 3: Lỗi nhập

- [ ] Story 5: Báo lỗi nhập ngay cạnh ô (AC3–AC6) · fe-dev
  - Bảng:

    | Lúc | Ô |
    |---|---|

  - Design: S1.4, S1.5, S1.9. Phụ thuộc: Story 4.
- [ ] Story 6: Xem danh sách ghi chú (AC10, AC11) · fe-dev

## Risks
`;
const SPEC = `# Spec

### Rules

- Tiêu đề bắt buộc.

### User Stories

- AC3: Given ô Tiêu đề trống, Then thấy "Vui lòng nhập tiêu đề".
- AC4: Given tiêu đề dài 101 ký tự, Then thấy lỗi.
- AC5: Given nội dung dài 1001 ký tự, Then thấy lỗi.
- AC6: Given ô có lỗi, Then lỗi gắn với ô.
- AC10: Given chưa có ghi chú, Then thấy "Chưa có ghi chú nào."

### Non-functional requirements

- Lỗi 500 được ghi stack.

## Boundaries

- Không lưu vào đĩa.

## Open Questions
`;
const DESIGN = '# Design\n\n## Screen Details\n\n### S1 · Ghi chú\n\n[4] Tiêu đề\n\n### S2 · Khác\n\n[1] x\n\n## Open Questions\n';

test('section: from a heading to the next heading of the same or a higher level', () => {
  assert.equal(section(SPEC, /^#+ Non-functional requirements/), '### Non-functional requirements\n\n- Lỗi 500 được ghi stack.');
  assert.equal(section(SPEC, /^#+ Boundaries/), '## Boundaries\n\n- Không lưu vào đĩa.');
  assert.equal(section(SPEC, /^#+ Nope/), null);
});

test('the plan entry of an item is the Task List item with its summary as title, with its indented lines', () => {
  assert.equal(planEntry(PLAN, 'Dạng lỗi chung của API'), '- [ ] Task 1: Dạng lỗi chung của API · be-dev · effort xhigh: bảo mật (ADR-0003).\n  - Phạm vi: `apps/api/src/common/api-error.ts`.\n  - Không đổi giao diện.');
  const story = planEntry(PLAN, 'Báo lỗi nhập ngay cạnh ô');
  assert.match(story, /^- \[ \] Story 5: Báo lỗi nhập ngay cạnh ô/);
  assert.match(story, /\| Lúc \| Ô \|/, 'a blank line inside the entry does not end it');
  assert.match(story, /Design: S1\.4, S1\.5, S1\.9\. Phụ thuộc: Story 4\.$/);
  assert.equal(planEntry(PLAN, 'Không có trong plan'), null);
});

test('the codes an entry names: every criterion of a range, ADR numbers, screens', () => {
  assert.deepEqual(namedCodes('Story 5 (AC3–AC6), như AC10; ADR-0003 và ADR-0001; Design: S1.4, S1.10, S2.'), {
    criteria: ['AC3', 'AC4', 'AC5', 'AC6', 'AC10'],
    adrs: ['0001', '0003'],
    screens: ['S1', 'S2'],
  });
  assert.deepEqual(criteriaLines(SPEC, ['AC4', 'AC10']), ['- AC4: Given tiêu đề dài 101 ký tự, Then thấy lỗi.', '- AC10: Given chưa có ghi chú, Then thấy "Chưa có ghi chú nào."']);
});

test('only the API Contract sections whose heading names a changed file', () => {
  const parts = contractSections(PLAN, ['apps/api/src/common/api-error.ts', 'apps/api/src/app.module.ts']);
  assert.equal(parts.length, 1);
  assert.match(parts[0], /^### Dạng lỗi chung: `apps\/api\/src\/common\/api-error\.ts`\n\n\| Lỗi \| Mã \|/);
});

test('a Jira description becomes plain text', () => {
  const doc = { type: 'doc', content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Goal' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Một dạng lỗi.' }] },
    { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'không lộ stack' }] }] }] },
  ] };
  assert.equal(adfText(doc).trim(), '## Goal\nMột dạng lỗi.\n- không lộ stack');
});

const pack = (more = {}) => buildReviewPack({
  pr: { number: 7, title: 'feat(web): field errors (SMP-10)', body: 'Body of the PR.', headRef: 'feature/SMP-10-field-errors', base: 'develop', headSha: 'b'.repeat(40), baseSha: 'a'.repeat(40) },
  checks: ['build-test: success', 'policy: success'],
  item: { key: 'SMP-10', type: 'Story', summary: 'Báo lỗi nhập ngay cạnh ô', status: 'In Review', labels: ['ao-fe-dev'], parent: 'SMP-2', links: ['is blocked by SMP-7'], description: '## Goal\nBáo lỗi cạnh ô.' },
  docs: { epic: 'SMP-2', plan: PLAN, spec: SPEC, design: DESIGN, adrs: [{ name: '0003-one-json-error-shape.md', text: '# ADR 3' }] },
  template: '# Review: <title>',
  files: [{ status: 'M', path: 'apps/web/src/app/notes/note-form.tsx' }, { status: 'A', path: 'e2e/notes/note-form-errors.spec.ts' }],
  modified: [{ path: 'apps/web/src/app/notes/note-form.tsx', text: 'export function NoteForm() {}\n' }],
  diff: 'diff --git a/x b/x\n+line\n',
  stat: ' x | 1 +\n',
  ...more,
});

test('the pack holds the PR, the item, the parts of the plan, SPEC and design the entry names, the template and the diff', () => {
  const text = pack();
  for (const part of [
    '# Context pack: PR #7',
    `- #7 feat(web): field errors (SMP-10); feature/SMP-10-field-errors → develop; base ${'a'.repeat(40)}, head ${'b'.repeat(40)}`,
    '- Files: M apps/web/src/app/notes/note-form.tsx, A e2e/notes/note-form-errors.spec.ts',
    '- Check runs on the head: build-test: success; policy: success',
    'Body of the PR.',
    '- Story "Báo lỗi nhập ngay cạnh ô", status In Review, labels ao-fe-dev, parent SMP-2, links: is blocked by SMP-7',
    '### Plan entry (`docs/specs/SMP-2/plan.md`)',
    '- AC3: Given ô Tiêu đề trống, Then thấy "Vui lòng nhập tiêu đề".',
    '- AC6: Given ô có lỗi, Then lỗi gắn với ô.',
    '### SPEC: Rules',
    '### SPEC: Non-functional requirements',
    '### SPEC: Boundaries',
    '### Design: S1 · Ghi chú',
    '# Review: <title>',
    '### `apps/web/src/app/notes/note-form.tsx` at bbbbbbb',
    '```diff\ndiff --git a/x b/x\n+line\n```',
  ]) assert.ok(text.includes(part), part);
  assert.ok(!text.includes('AC10:'), 'a criterion the entry does not name stays out');
  assert.ok(!text.includes('S2 · Khác'), 'a screen the entry does not name stays out');
  assert.ok(!text.includes('# ADR 3'), 'an ADR the entry does not name stays out');
});

test('an item under no Epic, an item missing from the plan, and a diff too long for the pack', () => {
  assert.match(pack({ docs: null }), /SMP-10 is under no Epic, so there is no SPEC or plan to quote\./);
  const missing = pack({ item: { ...pack.item, key: 'SMP-12', type: 'Task', summary: 'Chép bản sửa kit', status: 'In Review', labels: [], parent: 'SMP-2', links: [], description: '' } });
  assert.match(missing, /No Task List entry of `docs\/specs\/SMP-2\/plan\.md` has the title "Chép bản sửa kit": read the plan for this item\./);
  const long = pack({ diff: 'x'.repeat(200), maxDiffChars: 100 });
  assert.match(long, /The diff has 200 characters, over 100, so only its stat is here\. Read it file by file with `MSYS_NO_PATHCONV=1 git diff aaaaaaa\.\.\.bbbbbbb -- <path>`\./);
  assert.ok(long.includes(' x | 1 +'));
  assert.ok(!long.includes('x'.repeat(200)));
});

test('the ADRs the entry names come whole', () => {
  const text = pack({ item: { key: 'SMP-4', type: 'Task', summary: 'Dạng lỗi chung của API', status: 'In Review', labels: [], parent: 'SMP-2', links: [], description: '' }, files: [{ status: 'A', path: 'apps/api/src/common/api-error.ts' }], modified: [] });
  assert.ok(text.includes('### ADR `docs/adr/0003-one-json-error-shape.md`\n\n# ADR 3'));
  assert.ok(text.includes('### API Contract sections of the changed files\n\n### Dạng lỗi chung'));
});
