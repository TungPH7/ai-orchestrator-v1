import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { ROOT } from '../helpers/kit.mjs';

const SCRIPT = join(ROOT, 'scripts', 'jira-check.mjs');
// The script's environment without the admin token, so these tests never reach Jira.
const { JIRA_ADMIN_EMAIL, JIRA_ADMIN_TOKEN, ...env } = process.env;
const run = (args, extraEnv = {}) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: ROOT, encoding: 'utf8', env: { ...env, ...extraEnv } });

test('needs --space with a key', () => {
  for (const args of [[], ['--space']]) {
    const result = run(args);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Usage: node scripts\/jira-check\.mjs --space <KEY>/);
  }
});

test('names the missing variables instead of calling Jira', () => {
  const result = run(['--space', 'DEMO'], { JIRA_ADMIN_EMAIL: 'me@example.com' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /JIRA_ADMIN_TOKEN/);
  assert.doesNotMatch(result.stderr, /JIRA_ADMIN_EMAIL/);
});
