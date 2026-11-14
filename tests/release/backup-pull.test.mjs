import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { LIST_BATCH, copyAges, getBatch, localPath, parseListing, taskScript, toPull } from '../../lib/release/backup-pull.mjs';

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
