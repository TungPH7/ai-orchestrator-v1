import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkBranch, checkCommit, checkPrTitle, extractKeys, parseBranch } from '../../lib/tracker/conventions.mjs';

test('extractKeys finds every Jira key once, in order of appearance', () => {
  assert.deepEqual(extractKeys('feat(api): add login endpoint (DEMO-12, DEMO-13)'), ['DEMO-12', 'DEMO-13']);
  assert.deepEqual(extractKeys('feature/DEMO-12-email-login and DEMO-12 again, AB2-7'), ['DEMO-12', 'AB2-7']);
  assert.deepEqual(extractKeys('no key here, demo-12 is lower case'), []);
});

test('parseBranch reads the kind, key, slug and rework round of a work item branch', () => {
  assert.deepEqual(parseBranch('feature/DEMO-12-email-login'), { kind: 'feature', key: 'DEMO-12', slug: 'email-login', round: 1 });
  assert.deepEqual(parseBranch('feature/DEMO-12-email-login-r2'), { kind: 'feature', key: 'DEMO-12', slug: 'email-login', round: 2 });
  assert.deepEqual(parseBranch('hotfix/DEMO-40-empty-cart'), { kind: 'hotfix', key: 'DEMO-40', slug: 'empty-cart', round: 1 });
  assert.deepEqual(parseBranch('release/v1.5.0'), { kind: 'release', version: '1.5.0' });
  assert.equal(parseBranch('develop'), null);
});

test('checkBranch accepts the branch names of spec 2.5', () => {
  for (const name of ['feature/DEMO-12-email-login', 'bugfix/DEMO-31-wrong-total', 'hotfix/DEMO-40-empty-cart', 'feature/DEMO-12-email-login-r3', 'release/v1.5.0']) {
    assert.deepEqual(checkBranch(name), { ok: true }, name);
  }
});

test('checkBranch rejects other names, with the reason', () => {
  const cases = {
    'feature/email-login': /Jira key/,
    'feature/DEMO-12-Email-Login': /slug/,
    'feature/DEMO-12-email_login': /slug/,
    [`feature/DEMO-12-${'a'.repeat(41)}`]: /40/,
    'feature/DEMO-12-email-login-r1': /-r2/,
    'feat/DEMO-12-email-login': /feature\/, bugfix\/, hotfix\/ or release\//,
    'release/1.5': /release\/v<major>.<minor>.<patch>/,
    develop: /feature\/, bugfix\/, hotfix\/ or release\//,
  };
  for (const [name, reason] of Object.entries(cases)) {
    const result = checkBranch(name);
    assert.equal(result.ok, false, name);
    assert.match(result.reason, reason, name);
  }
});

test('checkBranch checks the prefix against the work type and the base branch', () => {
  assert.equal(checkBranch('feature/DEMO-12-email-login', { workType: 'story', base: 'develop' }).ok, true);
  assert.equal(checkBranch('bugfix/DEMO-31-wrong-total', { workType: 'bug', base: 'release/v1.5.0' }).ok, true);
  assert.equal(checkBranch('hotfix/DEMO-40-empty-cart', { workType: 'bug', base: 'main' }).ok, true);
  assert.match(checkBranch('feature/DEMO-31-wrong-total', { workType: 'bug' }).reason, /bug.*bugfix\/ or hotfix\//);
  assert.match(checkBranch('bugfix/DEMO-12-email-login', { workType: 'task' }).reason, /task.*feature\//);
  assert.match(checkBranch('hotfix/DEMO-40-empty-cart', { base: 'develop' }).reason, /hotfix\/.*main/);
  assert.match(checkBranch('bugfix/DEMO-31-wrong-total', { base: 'main' }).reason, /bugfix\/.*develop or release/);
  assert.match(checkBranch('feature/DEMO-12-email-login', { base: 'release/v1.5.0' }).reason, /feature\/.*develop/);
});

test('checkCommit accepts type(scope): subject (KEY), with Sub-task keys after the item key', () => {
  assert.deepEqual(checkCommit('feat(api): add login endpoint (DEMO-12)'), { ok: true, keys: ['DEMO-12'] });
  assert.deepEqual(checkCommit('feat(api): add login endpoint (DEMO-12, DEMO-13)\n\nbody'), { ok: true, keys: ['DEMO-12', 'DEMO-13'] });
});

test('checkCommit rejects a header without type, scope, subject or keys', () => {
  const cases = {
    'add login endpoint (DEMO-12)': /type\(scope\): subject/,
    'feat: add login endpoint (DEMO-12)': /type\(scope\): subject/,
    'feature(api): add login endpoint (DEMO-12)': /unknown type 'feature'/,
    'feat(api): add login endpoint': /Jira key/,
    'feat(api): (DEMO-12)': /subject/,
    'feat(api): add login endpoint DEMO-12': /Jira key/,
  };
  for (const [message, reason] of Object.entries(cases)) {
    const result = checkCommit(message);
    assert.equal(result.ok, false, message);
    assert.match(result.reason, reason, message);
  }
});

test('checkCommit can allow a commit without a key, for release branches', () => {
  assert.deepEqual(checkCommit('chore(release): bump version to 1.5.0', { requireKey: false }), { ok: true, keys: [] });
});

test('checkPrTitle needs exactly one key, the key of the item (spec 2.5)', () => {
  assert.deepEqual(checkPrTitle('feat(auth): add email login (DEMO-12)'), { ok: true, keys: ['DEMO-12'] });
  assert.match(checkPrTitle('feat(auth): add email login (DEMO-12, DEMO-13)').reason, /one Jira key/);
  assert.match(checkPrTitle('feat(auth): add email login').reason, /Jira key/);
});
