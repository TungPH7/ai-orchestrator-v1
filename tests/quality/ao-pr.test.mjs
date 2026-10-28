import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runAoPr } from '../../lib/quality/ao-pr.mjs';
import { readGates } from '../../lib/quality/gates.mjs';
import { ROOT } from '../helpers/kit.mjs';

const gates = readGates(join(ROOT, 'quality'));
const template = readFileSync(join(ROOT, 'templates', 'pull-request.md'), 'utf8');
const [, TITLE, BODY] = template.match(/````markdown\n# (.*)\n\n([\s\S]*?)````/);
const REVIEW = '# Review: feat(auth): add email and password login (DEMO-12)\n\nRole: reviewer\n\n## Findings\n\nNone.\n';

// A fake App client per kind, recording what each App sends.
function setup({ files = {}, branch = 'feature/DEMO-12-email-login' } = {}) {
  const sent = [];
  const clientFor = async (kind) => ({
    request: async (method, path, query, body) => {
      sent.push({ kind, method, path, body });
      return { number: 7, html_url: 'https://github.com/TungPH7/ao-pilot/pull/7' };
    },
    get: async (path) => {
      sent.push({ kind, method: 'GET', path });
      return { head: { sha: 'c0ffee1234567890' } };
    },
  });
  const deps = { gates, clientFor, readFile: (file) => files[file] ?? assert.fail(`no file ${file}`), currentBranch: () => branch };
  return { sent, run: (...args) => runAoPr(args, deps) };
}

test('create opens the PR with the ao-dev App from the current branch', async () => {
  const { sent, run } = setup({ files: { 'pr.md': BODY } });
  assert.equal(await run('create', '--base', 'develop', '--title', TITLE, '--body-file', 'pr.md'), 'opened #7 https://github.com/TungPH7/ao-pilot/pull/7');
  assert.deepEqual(sent, [{ kind: 'dev', method: 'POST', path: '/pulls', body: { title: TITLE, head: 'feature/DEMO-12-email-login', base: 'develop', body: BODY } }]);
});

test('create sends nothing when the branch, the title or the description is wrong, and says what', async () => {
  const { sent, run } = setup({ files: { 'pr.md': BODY.replace('## Risks', '## Risk') }, branch: 'feature/DEMO-12-email-login' });
  await assert.rejects(run('create', '--base', 'main', '--title', 'add login', '--body-file', 'pr.md'), (error) => {
    assert.match(error.message, /^not sent:/);
    assert.match(error.message, /branch: a feature\/ branch is cut from develop/);
    assert.match(error.message, /title: /);
    assert.match(error.message, /Risks: the section is missing/);
    return true;
  });
  assert.deepEqual(sent, []);
});

test('edit changes only the title and the description, checking what it changes', async () => {
  const { sent, run } = setup({ files: { 'pr.md': BODY } });
  assert.equal(await run('edit', '7', '--body-file', 'pr.md'), 'edited #7');
  assert.deepEqual(sent, [{ kind: 'dev', method: 'PATCH', path: '/pulls/7', body: { body: BODY } }]);
  await assert.rejects(run('edit', '7', '--title', 'wip'), /title: /);
  await assert.rejects(run('edit', '7'), /usage/);
});

test('comment posts with the ao-dev App', async () => {
  const { sent, run } = setup({ files: { 'note.md': 'Rebased on develop.' } });
  assert.equal(await run('comment', '7', '--body-file', 'note.md'), 'commented on #7');
  assert.deepEqual(sent, [{ kind: 'dev', method: 'POST', path: '/issues/7/comments', body: { body: 'Rebased on develop.' } }]);
});

test('review posts the report with the ao-review App on the newest commit of the PR', async () => {
  const { sent, run } = setup({ files: { 'r.md': REVIEW } });
  assert.equal(await run('review', '7', '--event', 'REQUEST_CHANGES', '--body-file', 'r.md'), 'posted the reviewer report (REQUEST_CHANGES) on #7 at c0ffee1');
  assert.deepEqual(sent, [
    { kind: 'review', method: 'GET', path: '/pulls/7' },
    { kind: 'review', method: 'POST', path: '/pulls/7/reviews', body: { commit_id: 'c0ffee1234567890', event: 'REQUEST_CHANGES', body: REVIEW } },
  ]);
});

test('review never approves, and refuses a report without its role', async () => {
  const { sent, run } = setup({ files: { 'r.md': REVIEW, 'bad.md': 'LGTM' } });
  await assert.rejects(run('review', '7', '--event', 'APPROVE', '--body-file', 'r.md'), /approving is for the human/);
  await assert.rejects(run('review', '7', '--event', 'COMMENT', '--body-file', 'bad.md'), /Role: reviewer/);
  assert.deepEqual(sent, []);
});

test('an unknown command or a PR number that is not a number shows the usage', async () => {
  const { run } = setup();
  await assert.rejects(run('merge', '7'), /usage/);
  await assert.rejects(run('comment', 'seven', '--body-file', 'x'), /usage/);
});

test('the kit settings name both Apps for the project to fill in', () => {
  const { env } = JSON.parse(readFileSync(join(ROOT, 'kit', '.claude', 'settings.json'), 'utf8'));
  assert.deepEqual(
    Object.keys(env).filter((name) => /^AO_\w+_APP(?:_ID)?$/.test(name)).sort(),
    ['AO_DEV_APP', 'AO_DEV_APP_ID', 'AO_REVIEW_APP', 'AO_REVIEW_APP_ID'],
  );
});

test('the ao-pr script prints the usage and exits non-zero without a command', async () => {
  const { spawnSync } = await import('node:child_process');
  const result = spawnSync(process.execPath, [join(ROOT, 'scripts', 'ao-pr.mjs')], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /^ao-pr: usage:/);
});
