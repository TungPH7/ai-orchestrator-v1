import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PLACEHOLDERS, PR_SECTIONS, checkPullRequest, checkReviewHeader, readReviewReport, SEVERITIES } from '../../lib/quality/pull-request.mjs';
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
