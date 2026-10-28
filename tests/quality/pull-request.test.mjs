import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PLACEHOLDERS, PR_SECTIONS, checkPullRequest, checkReviewHeader } from '../../lib/quality/pull-request.mjs';
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
