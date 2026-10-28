import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkCommitMessage, checkPush } from '../../lib/quality/git-hooks.mjs';
import { ROOT } from '../helpers/kit.mjs';

const ZERO = '0'.repeat(40);
const SHA = 'a'.repeat(40);
const OLD = 'b'.repeat(40);
const PROTECTED = ['develop', 'main', 'release/*'];
const push = (localRef, localSha, remoteRef, remoteSha) => `${localRef} ${localSha} ${remoteRef} ${remoteSha}`;

test('commit-msg accepts a header with the Jira key and refuses one without, with the reason', () => {
  assert.equal(checkCommitMessage('feat(api): add login endpoint (DEMO-12, DEMO-13)\n\nBody text.\n').ok, true);
  const result = checkCommitMessage('add login endpoint\n');
  assert.equal(result.ok, false);
  assert.match(result.reason, /type\(scope\): subject \(<KEY>\)/);
});

test('commit-msg lets through the merge and revert messages git writes itself', () => {
  for (const message of [
    "Merge branch 'develop' into feature/DEMO-12-email-login\n",
    "Merge remote-tracking branch 'origin/develop' into feature/DEMO-12-email-login\n",
    'Revert "feat(api): add login endpoint (DEMO-12)"\n\nThis reverts commit abc.\n',
  ]) {
    assert.equal(checkCommitMessage(message).ok, true, message);
  }
});

test('commit-msg reads the header after the comment lines git may leave', () => {
  assert.equal(checkCommitMessage('# Please enter the commit message\n\nfix(web): show the error (DEMO-14)\n').ok, true);
});

test('pre-push refuses to update develop, main or an existing release branch', () => {
  for (const branch of ['develop', 'main', 'release/v1.0.0']) {
    const result = checkPush([push(`refs/heads/${branch}`, SHA, `refs/heads/${branch}`, OLD)], PROTECTED);
    assert.equal(result.ok, false, branch);
    assert.match(result.reasons[0], new RegExp(`${branch}.*pull request`), branch);
  }
  // Pushing a local branch under another name counts by the remote name.
  assert.equal(checkPush([push('refs/heads/feature/DEMO-12-x', SHA, 'refs/heads/develop', OLD)], PROTECTED).ok, false);
});

test('pre-push lets through a new release branch, work branches, tags and deleting a work branch', () => {
  const lines = [
    push('refs/heads/release/v1.1.0', SHA, 'refs/heads/release/v1.1.0', ZERO),
    push('refs/heads/feature/DEMO-12-email-login', SHA, 'refs/heads/feature/DEMO-12-email-login', OLD),
    push('refs/tags/v1.0.0', SHA, 'refs/tags/v1.0.0', ZERO),
    push('(delete)', ZERO, 'refs/heads/feature/DEMO-9-old', OLD),
  ];
  assert.deepEqual(checkPush(lines, PROTECTED), { ok: true, reasons: [] });
});

test('pre-push refuses to delete a protected branch', () => {
  const result = checkPush([push('(delete)', ZERO, 'refs/heads/release/v1.0.0', OLD)], PROTECTED);
  assert.equal(result.ok, false);
  assert.match(result.reasons[0], /delete/);
});

function gitRepo(t) {
  const dir = mkdtempSync(join(tmpdir(), 'hooks-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  spawnSync('git', ['init', '-q'], { cwd: dir });
  return dir;
}

const run = (script, args, options) => spawnSync(process.execPath, [join(ROOT, 'scripts', script), ...args], { encoding: 'utf8', ...options });

test('install-hooks points core.hooksPath at .githooks, and a second run changes nothing', (t) => {
  const dir = gitRepo(t);
  const first = run('install-hooks.mjs', [], { cwd: dir });
  assert.equal(first.status, 0, first.stderr);
  assert.equal(spawnSync('git', ['config', '--get', 'core.hooksPath'], { cwd: dir, encoding: 'utf8' }).stdout.trim(), '.githooks');
  const second = run('install-hooks.mjs', [], { cwd: dir });
  assert.equal(second.status, 0, second.stderr);
  assert.match(second.stdout, /already/);
});

test('install-hooks does nothing outside a git repository', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'no-git-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const result = run('install-hooks.mjs', [], { cwd: dir, env: { ...process.env, GIT_CEILING_DIRECTORIES: tmpdir() } });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /not a git repository/);
});

test('the commit-msg script exits non-zero on a bad header and names the convention', (t) => {
  const dir = gitRepo(t);
  const file = join(dir, 'COMMIT_EDITMSG');
  writeFileSync(file, 'wip\n');
  const bad = run('commit-msg.mjs', [file]);
  assert.notEqual(bad.status, 0);
  assert.match(bad.stderr, /type\(scope\): subject \(<KEY>\)/);
  writeFileSync(file, 'feat(api): add login endpoint (DEMO-12)\n');
  assert.equal(run('commit-msg.mjs', [file]).status, 0);
});

test('the pre-push script reads the refs on stdin and the protected branches of quality/gates.yaml', () => {
  const blocked = run('pre-push.mjs', ['origin', 'git@github.com:x/y.git'], { input: `${push('refs/heads/develop', SHA, 'refs/heads/develop', OLD)}\n` });
  assert.notEqual(blocked.status, 0);
  assert.match(blocked.stderr, /develop/);
  const allowed = run('pre-push.mjs', ['origin', 'git@github.com:x/y.git'], { input: `${push('refs/heads/feature/DEMO-1-a', SHA, 'refs/heads/feature/DEMO-1-a', ZERO)}\n` });
  assert.equal(allowed.status, 0, allowed.stderr);
});

test('the kit hooks are sh scripts that hand over to the kit scripts', () => {
  for (const [hook, script] of [['commit-msg', 'commit-msg.mjs'], ['pre-push', 'pre-push.mjs']]) {
    const text = readFileSync(join(ROOT, 'kit', '.githooks', hook), 'utf8');
    assert.match(text, /^#!\/bin\/sh\n/, hook);
    assert.match(text, new RegExp(`exec node \\.ai-orchestrator/scripts/${script.replace('.', '\\.')} "\\$@"`), hook);
  }
});
