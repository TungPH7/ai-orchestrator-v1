import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { LIST_BATCH, copyAges, getBatch, isFuture, localPath, parseListing, pulledCopyAges, taskScript, toPrune, toPull } from '../../lib/release/backup-pull.mjs';
import { backupsToKeep } from '../../lib/release/backup.mjs';

// Your machine pulls the encrypted copies over SFTP as aobackup, read only, inside the copies folder (Pilot 3,
// spec 2.4; plan, decision 3).

const LISTING = [
  'sftp> ls -1 /*/*/*.dump.age',
  '/shop/development/shop-development-20261114T193005Z.dump.age',
  '/shop/production/shop-production-20261113T193004Z.dump.age',
  '/shop/production/shop-production-20261114T193006Z.dump.age',
  '/sample/staging/other-staging-20261114T193006Z.dump.age',
  '/shop/production/../../etc/passwd.dump.age',
  '/shop/qa/shop-qa-20261114T193006Z.dump.age',
  'Can\'t ls: "/x" not found',
  '',
].join('\n');

test('the listing: one line per copy, project and environment from the path, and nothing else', () => {
  assert.equal(LIST_BATCH, '-ls -1 /*/*/*.dump.age\n');
  assert.deepEqual(parseListing(LISTING), [
    { project: 'shop', env: 'development', name: 'shop-development-20261114T193005Z.dump.age', path: '/shop/development/shop-development-20261114T193005Z.dump.age' },
    { project: 'shop', env: 'production', name: 'shop-production-20261113T193004Z.dump.age', path: '/shop/production/shop-production-20261113T193004Z.dump.age' },
    { project: 'shop', env: 'production', name: 'shop-production-20261114T193006Z.dump.age', path: '/shop/production/shop-production-20261114T193006Z.dump.age' },
  ]);
});

test('only copies not on your machine are pulled, into <dest>/<project>/<environment>/, through a .part file', () => {
  const remote = parseListing(LISTING);
  const dest = 'D:/Backups/ao';
  const have = new Set([localPath(dest, remote[1])]);
  const missing = toPull(remote, dest, (path) => have.has(path));
  assert.deepEqual(missing.map(({ name }) => name), ['shop-development-20261114T193005Z.dump.age', 'shop-production-20261114T193006Z.dump.age']);
  assert.equal(localPath(dest, remote[0]), join(dest, 'shop', 'development', 'shop-development-20261114T193005Z.dump.age'));
  assert.equal(getBatch(missing, dest), [
    `get "/shop/development/shop-development-20261114T193005Z.dump.age" "${join(dest, 'shop', 'development', 'shop-development-20261114T193005Z.dump.age').replaceAll('\\', '/')}.part"`,
    `get "/shop/production/shop-production-20261114T193006Z.dump.age" "${join(dest, 'shop', 'production', 'shop-production-20261114T193006Z.dump.age').replaceAll('\\', '/')}.part"`,
    '',
  ].join('\n'));
  assert.throws(() => getBatch(missing, 'D:/a"b'), /double quote/);
});

test('the age of the newest copy of each project and environment, for the 36-hour warning', () => {
  const files = parseListing(LISTING);
  const now = new Date('2026-11-16T07:30:06Z');
  assert.deepEqual(copyAges(files, now), [
    { project: 'shop', env: 'development', name: 'shop-development-20261114T193005Z.dump.age', hours: 36 },
    { project: 'shop', env: 'production', name: 'shop-production-20261114T193006Z.dump.age', hours: 36 },
  ]);
  assert.deepEqual(copyAges([], now), []);
});

test('the task of Windows pulls every day and at each sign-in, and runs late when the machine was off', () => {
  const script = taskScript({ node: 'C:\\Program Files\\nodejs\\node.exe', script: "D:\\kit's\\scripts\\ao-backup-pull.mjs", host: 'ao-backup', dest: 'D:\\Backups\\ao' });
  assert.match(script, /New-ScheduledTaskTrigger -Daily -At '09:00'/);
  assert.match(script, /New-ScheduledTaskTrigger -AtLogOn/);
  assert.match(script, /-StartWhenAvailable/);
  assert.match(script, /Register-ScheduledTask -TaskName 'ao-backup-pull'/);
  assert.match(script, /-Execute 'C:\\Program Files\\nodejs\\node\.exe'/);
  // A single quote inside a single-quoted PowerShell string is doubled.
  assert.match(script, /-Argument '"D:\\kit''s\\scripts\\ao-backup-pull\.mjs" pull --host ao-backup --dest "D:\\Backups\\ao"'/);
  assert.throws(() => taskScript({ node: 'node', script: 'x.mjs', host: 'ao backup', dest: 'D:\\b' }), /host/);
  assert.throws(() => taskScript({ node: 'node', script: 'x.mjs', host: 'ao-backup', dest: 'D:\\"b' }), /double quote/);
});

test('ao-backup-pull.mjs: usage on a wrong command line; keygen writes the identity once and prints the recipient; status reads the copies there', async () => {
  const { spawnSync } = await import('node:child_process');
  const { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { ROOT } = await import('../helpers/kit.mjs');
  const run = (...args) => spawnSync(process.execPath, [join(ROOT, 'scripts/ao-backup-pull.mjs'), ...args], { encoding: 'utf8' });
  for (const args of [[], ['pull', '--host', 'ao-backup'], ['delete']]) {
    const done = run(...args);
    assert.equal(done.status, 2, args.join(' '));
    assert.match(done.stderr, /usage: node ao-backup-pull\.mjs keygen/);
  }
  const dir = mkdtempSync(join(tmpdir(), 'ao-pull-'));
  try {
    const identity = join(dir, 'ao-backup.key');
    const made = run('keygen', '--identity', identity);
    assert.equal(made.status, 0, made.stderr);
    assert.match(made.stdout.trim().split('\n').at(-1), /^age1[02-9ac-hj-np-z]{58}$/);
    assert.match(readFileSync(identity, 'utf8'), /^AGE-SECRET-KEY-1/);
    assert.doesNotMatch(made.stdout, /AGE-SECRET-KEY/, 'the identity is never printed');
    const again = run('keygen', '--identity', identity);
    assert.equal(again.status, 1);
    assert.match(again.stderr, /exists/);
    const dest = join(dir, 'copies');
    assert.equal(run('status', '--dest', dest).status, 1, 'no copy yet');
    mkdirSync(join(dest, 'shop', 'production'), { recursive: true });
    const name = `shop-production-${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}.dump.age`;
    writeFileSync(join(dest, 'shop', 'production', name), 'x');
    const status = run('status', '--dest', dest);
    assert.equal(status.status, 0, status.stdout + status.stderr);
    assert.match(status.stdout, /shop\/production: newest copy shop-production-\d{8}T\d{6}Z\.dump\.age, 0 h old/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Pilot 3, review of shop PR #13 (spec 2.9): the identity that opens the copies does not stay on the machine agents run
// on. keygen says to move it into your password manager; decrypt reads it from stdin.
test('ao-backup-pull.mjs: keygen says to move the identity off this machine, and decrypt reads it from stdin with --identity -', async () => {
  const { spawnSync } = await import('node:child_process');
  const { mkdtempSync, readFileSync, rmSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { ROOT } = await import('../helpers/kit.mjs');
  const { encryptFile } = await import('../../lib/release/backup-copy.mjs');
  const run = (args, input) => spawnSync(process.execPath, [join(ROOT, 'scripts/ao-backup-pull.mjs'), ...args], { encoding: 'utf8', input });
  const dir = mkdtempSync(join(tmpdir(), 'ao-pull-'));
  try {
    const key = join(dir, 'ao-backup.agekey');
    const made = run(['keygen', '--identity', key]);
    assert.equal(made.status, 0, made.stderr);
    assert.match(made.stdout, /move it into your password manager, then delete .*ao-backup\.agekey/);
    const recipient = made.stdout.trim().split('\n').at(-1);
    const dump = join(dir, 'shop-production-20261114T193006Z.dump');
    writeFileSync(dump, 'PGDMP the dump');
    await encryptFile(dump, `${dump}.age`, recipient);
    const out = join(dir, 'restored.dump');
    const done = run(['decrypt', `${dump}.age`, '--identity', '-', '--out', out], readFileSync(key, 'utf8'));
    assert.equal(done.status, 0, done.stderr);
    assert.equal(readFileSync(out, 'utf8'), 'PGDMP the dump');
    assert.doesNotMatch(done.stdout + done.stderr, /AGE-SECRET-KEY/, 'the identity is never printed');
    const empty = run(['decrypt', `${dump}.age`, '--identity', '-', '--out', join(dir, 'x.dump')], '');
    assert.equal(empty.status, 1);
    assert.match(empty.stderr, /no identity on stdin/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a copy dated in the future is neither pulled nor the newest: a VPS taken over cannot keep the 36-hour row green', () => {
  const now = new Date('2026-11-14T10:00:00Z');
  const files = parseListing([
    '/shop/production/shop-production-20261114T090000Z.dump.age',
    '/shop/production/shop-production-20261114T100400Z.dump.age',
    '/shop/production/shop-production-20991231T000000Z.dump.age',
  ].join('\n'));
  // Four minutes ahead is clock drift, not the future.
  assert.deepEqual(files.filter((file) => isFuture(file, now)).map(({ name }) => name), ['shop-production-20991231T000000Z.dump.age']);
  assert.deepEqual(copyAges(files, now), [{ project: 'shop', env: 'production', name: 'shop-production-20261114T100400Z.dump.age', hours: 0 }]);
});

test('this machine keeps the copies the VPS keeps, each project and environment on its own, and lets the others go', () => {
  const stamp = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const lines = [];
  for (let day = 0; day < 45; day++) lines.push(`/shop/production/shop-production-${stamp(new Date(Date.UTC(2026, 9, 1 + day, 19, 30)))}.dump.age`);
  lines.push('/shop/production/shop-production-20261114T080000Z.dump.age', '/shop/staging/shop-staging-20261001T193000Z.dump.age');
  const files = parseListing(lines.join('\n'));
  const prune = toPrune(files).map(({ name }) => name);
  const production = files.filter(({ env }) => env === 'production').map(({ name }) => name);
  const keep = backupsToKeep(production.map((name) => name.slice(0, -'.age'.length)));
  assert.deepEqual(prune, production.filter((name) => !keep.has(name.slice(0, -'.age'.length))));
  assert.ok(prune.includes('shop-production-20261024T193000Z.dump.age'));
  assert.ok(!prune.includes('shop-production-20261025T193000Z.dump.age'), 'the newest of its week stays');
  assert.ok(!prune.includes('shop-production-20261112T193000Z.dump.age'), 'exactly 48 hours before the newest stays');
  assert.ok(!prune.some((name) => name.startsWith('shop-staging-')), 'the one copy of staging stays');
  assert.deepEqual(toPrune([]), []);
});

test('the record of the pull: none means no doctor row; one that cannot be read is said, not thrown (review of shop PR #13)', async () => {
  const { mkdtempSync, rmSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const dir = mkdtempSync(join(tmpdir(), 'ao-pull-'));
  try {
    assert.equal(pulledCopyAges(new Date(), join(dir, 'none.json')), null);
    writeFileSync(join(dir, 'broken.json'), '{ "dest": ');
    const broken = pulledCopyAges(new Date(), join(dir, 'broken.json'));
    assert.match(broken.broken, /broken\.json is not JSON/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
