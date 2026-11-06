import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PLACEHOLDERS, PR_SECTIONS, checkPullRequest, checkReviewHeader, openCounts, openFindings, readReviewReport, SEVERITIES } from '../../lib/quality/pull-request.mjs';
import { ROOT } from '../helpers/kit.mjs';

const template = readFileSync(join(ROOT, 'templates', 'pull-request.md'), 'utf8');
// The Example of the template, filled in the way a dev agent would: title on the first line, body after it.
const example = template.match(/````markdown\n([\s\S]*?)````/)[1];
const [, exampleTitle, exampleBody] = example.match(/^# (.*)\n\n([\s\S]*)$/);

test('the sections and placeholders the check looks for are those of templates/pull-request.md', () => {
  const sections = [...template.split(/^## Example$/m)[0].matchAll(/^## (.+)$/gm)].map(([, name]) => name);
  assert.deepEqual(PR_SECTIONS, sections);
  const placeholders = [...template.replace(/<!--[\s\S]*?-->/g, '').matchAll(/<[^<>/!][^<>]*>/g)].map(([text]) => text).filter((text) => !['<details>', '<summary>'].includes(text));
  assert.deepEqual([...new Set(placeholders)].sort(), [...PLACEHOLDERS].sort());
});

test('the Example of the template passes', () => {
  assert.deepEqual(checkPullRequest({ title: exampleTitle, body: exampleBody }), { ok: true, problems: [] });
});

test('a bad title, a missing or empty section, a placeholder and a left-over Example are each reported', () => {
  const body = exampleBody.replace(/## Risks\n[^\n]*\n/, '## Risks\n\n').replace('## Jira\n', '## Ticket\n');
  const result = checkPullRequest({ title: 'add login', body: `${body}\n| <Given … When … Then …> | x |\n\n## Example\n\nleft over\n` });
  assert.equal(result.ok, false);
  assert.deepEqual(result.problems.map((p) => p.split(':')[0]).sort(), ['Example', 'Jira', 'Risks', 'placeholder', 'title'].sort());
});

test('guidance comments do not count as content', () => {
  const body = exampleBody.replace(/## Risks\n[^\n]*\n/, '## Risks\n\n<!-- What could break -->\n');
  assert.deepEqual(checkPullRequest({ title: exampleTitle, body }).problems, ['Risks: the section is empty']);
});

test('a review report starts with its title and the role that wrote it', () => {
  const roles = ['reviewer', 'security'];
  assert.deepEqual(checkReviewHeader('# Review: feat(auth): add login (DEMO-12)\n\nRole: security\n\n## Context\n', roles), { ok: true, role: 'security', problems: [] });
  assert.deepEqual(checkReviewHeader('Looks good to me', roles).problems, ['the report must start with "# Review: <PR title> (<KEY>)"', 'the report needs a line "Role: reviewer" or "Role: security"']);
  assert.match(checkReviewHeader('# Review: x (DEMO-1)\n\nRole: qa\n', roles).problems[0], /Role: reviewer.*security/);
});

const reviewTemplate = readFileSync(join(ROOT, 'templates', 'review-report.md'), 'utf8');
const reviewExample = reviewTemplate.match(/````markdown\n([\s\S]*?)````/)[1];
const ROLES = ['reviewer', 'security'];
const report = (findings) => `# Review: feat(auth): add login (DEMO-12)\n\nRole: security\n\n## Findings\n${findings}\n## Verdict\n- [x] **Approve**\n`;
const TABLE = '| Severity | Axis | Where | Finding | Suggested fix |\n|---|---|---|---|---|\n';

test('a review report gives its role, its findings, and the Critical and High ones that block the merge', () => {
  // The severities merge-gate reads are those of the template's Findings table.
  assert.deepEqual(reviewTemplate.match(/^\| (Critical[^|]*?) \|/m)[1].split(' / '), SEVERITIES);
  const read = readReviewReport(reviewExample, ROLES);
  assert.equal(read.ok, true);
  assert.equal(read.role, 'reviewer');
  assert.deepEqual(read.findings.map(({ severity, axis }) => `${severity} ${axis}`), ['High Correctness', 'Low Readability']);
  assert.deepEqual(read.blocking, [read.findings[0]]);
  assert.deepEqual(read.findings[0], {
    severity: 'High',
    axis: 'Correctness',
    where: '`apps/api/src/auth/auth.controller.ts:31`',
    finding: 'Body thiếu `email` thì API trả 500',
    fix: 'Validate body, trả 400',
  });
});

test('a report without findings has none, whether its table is empty or replaced by a sentence', () => {
  for (const findings of [TABLE, 'Không có finding.\n']) {
    assert.deepEqual(readReviewReport(report(findings), ROLES), { ok: true, role: 'security', findings: [], blocking: [], problems: [] });
  }
});

test('a severity is read through bold and case; any other severity makes the report unreadable', () => {
  const read = readReviewReport(report(`${TABLE}| **critical** | Security | a.ts:1 | x | y |\n`), ROLES);
  assert.deepEqual(read.blocking.map(({ severity }) => severity), ['Critical']);
  // The template's placeholder row left in place.
  const left = readReviewReport(report(`${TABLE}| Low | Readability | a.ts:2 | x | y |\n| Critical / High / Medium / Low | <axis> | <file:line> | <...> | <...> |\n`), ROLES);
  assert.equal(left.ok, false);
  assert.equal(left.role, 'security');
  assert.deepEqual(left.problems, ["finding 2: severity 'Critical / High / Medium / Low' is not Critical, High, Medium or Low"]);
});

test('a report needs its Findings section; text that is not a report has no role', () => {
  assert.deepEqual(readReviewReport(report('').replace('## Findings\n', ''), ROLES), { ok: false, role: 'security', problems: ['the report needs a "## Findings" section'] });
  const notReport = readReviewReport('Looks good to me', ROLES);
  assert.equal(notReport.ok, false);
  assert.equal(notReport.role, undefined);
});

test('a security report of the new part only gives the commit it starts from (dev-workflow spec 2.6)', () => {
  const delta = report('Không có finding.\n').replace('Role: security\n', 'Role: security\nScope: changes since 0f1e2d3\n');
  assert.deepEqual(readReviewReport(delta, ROLES), { ok: true, role: 'security', findings: [], blocking: [], problems: [], scope: { since: '0f1e2d3' } });
  assert.equal(readReviewReport(report('Không có finding.\n'), ROLES).scope, undefined, 'a full review has no Scope line');
  assert.equal(readReviewReport(delta.replace('0f1e2d3', 'HEAD~1'), ROLES).scope, undefined, 'only a commit SHA');
});

// Pilot 1, third review of ao-sample PR #13: a Scope line a little off was read as a full review, which judges anew and
// so cleared the High findings open before it. The report is unreadable now, and an unreadable report clears nothing.
test('a Scope line that does not read as the template says leaves the report unreadable', () => {
  const withLine = (line) => report('Không có finding.\n').replace('Role: security\n', `Role: security\n${line}\n`);
  for (const line of ['Scope: changes since HEAD~1', 'Scope: the new part since 0f1e2d3', '**Scope:** changes since 0f1e2d3', 'scope: changes since 0f1e2d3']) {
    const read = readReviewReport(withLine(line), ROLES);
    assert.equal(read.ok, false, line);
    assert.deepEqual(read.problems, ['Scope: the line must read "Scope: changes since <short SHA>"'], line);
  }
  assert.equal(readReviewReport(withLine('<!-- Scope: changes since <short SHA> -->'), ROLES).ok, true, 'the comment of the template left in place');
  assert.equal(readReviewReport(report('Không có finding.\n').replace('## Verdict', 'Scope: hai file của PR\n\n## Verdict'), ROLES).ok, true, 'the word in a section of a full report');
  // Low of reviewer on ao-pilot PR #23: a Scope line counts only under the Role line, where the template puts it.
  const below = report('Không có finding.\n').replace('## Verdict', 'Scope: changes since 0f1e2d3\n\n## Verdict');
  assert.equal(readReviewReport(below, ROLES).scope, undefined);
});

// Pilot 1, second review of ao-sample PR #13: a High no longer asks for a full review. A report of the new part lists
// the Critical and High findings left open before it, each Fixed or Open, and those not listed stay open.
const EARLIER = '| Severity | Where | Finding | Status |\n|---|---|---|---|\n';
const delta = (earlier, findings = 'Không có finding.\n') => report(findings).replace('Role: security\n', 'Role: security\nScope: changes since 0f1e2d3\n').replace('## Verdict', `## Earlier findings\n${earlier}\n## Verdict`);
test('a report of the new part carries the earlier Critical and High findings: an Open one blocks, a Fixed one does not', () => {
  const read = readReviewReport(delta(`${EARLIER}| High | review-tree.mjs:7 | AGENTS.md of the PR reaches the review | Fixed: agents.md is removed |\n| **critical** | guard.mjs:75 | the regex backtracks | Open |\n`), ROLES);
  assert.equal(read.ok, true);
  assert.deepEqual(read.earlier, [
    { severity: 'High', where: 'review-tree.mjs:7', finding: 'AGENTS.md of the PR reaches the review', status: 'Fixed: agents.md is removed' },
    { severity: 'Critical', where: 'guard.mjs:75', finding: 'the regex backtracks', status: 'Open' },
  ]);
  assert.deepEqual(read.blocking.map(({ severity, where }) => [severity, where]), [['Critical', 'guard.mjs:75']]);
  const newHigh = readReviewReport(delta(`${EARLIER}| High | a.ts:1 | x | fixed |\n`, `${TABLE}| High | Security | b.ts:2 | y | z |\n`), ROLES);
  assert.deepEqual(newHigh.blocking.map(({ where }) => where), ['b.ts:2'], 'a new finding blocks as before; "fixed" in any case clears');
  const full = readReviewReport(report('Không có finding.\n').replace('## Verdict', `## Earlier findings\n${EARLIER}| High | a.ts:1 | x | Open |\n\n## Verdict`), ROLES);
  assert.deepEqual([full.ok, full.problems], [false, ['Earlier findings: only a report of the new part has them, under its Scope line']], 'without its Scope line the report could pass for a full review');
  assert.equal(readReviewReport(delta(`${EARLIER}| Severe | a.ts:1 | x | Open |\n`), ROLES).ok, false, 'an unknown severity is unreadable there too');
});

test('a Status clears a finding when it is Fixed, alone or with a colon and how: anything else keeps it open', () => {
  const status = (text) => readReviewReport(delta(`${EARLIER}| High | a.ts:1 | x | ${text} |\n`), ROLES).blocking.length;
  for (const text of ['Fixed', 'fixed', 'FIXED', 'Fixed: the body is validated']) assert.equal(status(text), 0, text);
  for (const text of ['Fixed một phần', 'Fixed in part', 'Fixed (partly)', 'Partly fixed', 'Open', 'Won\'t fix', '']) assert.equal(status(text), 1, text);
});

test('the findings open after each report: a finding clears only by its own row', () => {
  const high = (name) => ({ severity: 'High', where: `${name}.ts:1`, finding: `${name} is wrong` });
  const full = (...names) => ({ ok: true, findings: [], blocking: names.map(high) });
  const row = (name, status = 'Fixed', severity = 'High') => ({ ...high(name), severity, status });
  const part = (names, rows) => ({ ...full(...names), scope: { since: '0f1e2d3' }, earlier: rows, blocking: [...names.map(high), ...rows.filter(({ status }) => status === 'Open')] });

  assert.deepEqual(openCounts([full('a'), part([], [row('a')])]), [1, 0], 'the High is listed as Fixed');
  assert.deepEqual(openCounts([full('a', 'b'), part([], [row('a')])]), [2, 1], 'one of the two is not listed');
  assert.deepEqual(openCounts([full('a'), part([], [])]), [1, 1], 'a report of the new part that lists nothing');
  assert.deepEqual(openCounts([full('a'), part(['b'], [row('a')]), part([], [row('b')])]), [1, 1, 0], 'a new High of the first part carries to the second');
  assert.deepEqual(openCounts([full('a'), part([], [row('a', 'Fixed', 'Medium')])]), [1, 1], 'a Medium row does not stand for a High');
  assert.deepEqual(openCounts([full('a'), full()]), [1, 0], 'a full report starts again from its own findings');
  assert.deepEqual(openCounts([full('a'), { ok: false }, part([], [])]), [1, 1, 1], 'an unreadable report clears nothing');

  assert.deepEqual(openCounts([full('a', 'b'), part([], [row('a'), row('a')])]), [2, 1], 'a finding listed twice does not clear another one');
  assert.deepEqual(openCounts([full('a'), part(['b'], [row('a')]), part([], [row('a')])]), [1, 1, 1], 'a row of a finding fixed before does not clear a new one');
  assert.deepEqual(openCounts([full('a'), part([], [row('c')])]), [1, 1], 'a row of a finding nobody reported clears nothing');
  assert.deepEqual(openCounts([full('a'), part([], [row('a', 'Open')])]), [1, 1], 'a finding listed as Open counts once');
  assert.deepEqual(openCounts([full('a'), part([], [{ ...row('a'), where: '`a.ts:1`', finding: 'A  is **wrong**' }])]), [1, 0], 'case, spaces and Markdown do not make it another finding');
  assert.deepEqual(openCounts([full('a'), part([], [{ ...row('a'), finding: 'a was wrong' }])]), [1, 1], 'reworded, it is another finding: one left out stays open');

  const open = openFindings([full('a', 'b'), part([], [row('a')]), part([], [])]);
  assert.deepEqual(open.map((list) => list.map(({ where }) => where)), [['a.ts:1', 'b.ts:1'], ['b.ts:1'], ['b.ts:1']], 'one left out keeps its name, for the next review to check');
});
