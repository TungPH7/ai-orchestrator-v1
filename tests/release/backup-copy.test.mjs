import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { COPY_SUFFIX, RECIPIENT, copyChanges, decryptFile, encryptFile, newKeyPair, syncCopies } from '../../lib/release/backup-copy.mjs';

// The encrypted copies of the dumps, which your machine pulls (Pilot 3, spec 2.4; plan, decision 3).

test('a dump kept gets one copy, <dump>.age; a copy whose dump is gone, or a half one, goes', () => {
  const dumps = ['shop-production-20261114T193005Z.dump', 'shop-production-20261113T193004Z.dump'];
  const copies = ['shop-production-20261113T193004Z.dump.age', 'shop-production-20261101T193001Z.dump.age', 'shop-production-20261114T193005Z.dump.age.part', 'notes.txt'];
  assert.equal(COPY_SUFFIX, '.age');
  assert.deepEqual(copyChanges({ dumps, copies }), {
    encrypt: ['shop-production-20261114T193005Z.dump'],
    remove: ['notes.txt', 'shop-production-20261101T193001Z.dump.age', 'shop-production-20261114T193005Z.dump.age.part'],
  });
  assert.deepEqual(copyChanges({ dumps: [], copies: [] }), { encrypt: [], remove: [] });
});

test('a key pair: the secret identity for your machine, the age1 recipient for the VPS, which any age tool reads', async () => {
  const { identity, recipient } = await newKeyPair();
  assert.match(identity, /^AGE-SECRET-KEY-1[0-9A-Z]+$/);
  assert.match(recipient, RECIPIENT);
  assert.doesNotMatch('age1pq1abc', RECIPIENT, 'post-quantum recipients are not for the age 1.1 of Ubuntu');
  assert.doesNotMatch(`age1${'b'.repeat(58)}`, RECIPIENT, 'b is not a bech32 letter');
});

test('a dump encrypted with the recipient comes back byte for byte with the identity, and only with it', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ao-copy-'));
  try {
    const dump = join(dir, 'shop-production-20261114T193005Z.dump');
    const bytes = Buffer.concat([Buffer.from('PGDMP'), Buffer.alloc(300_000, 7), Buffer.from([0, 255, 1])]);
    writeFileSync(dump, bytes);
    const { identity, recipient } = await newKeyPair();
    await encryptFile(dump, `${dump}.age`, recipient);
    assert.notDeepEqual(readFileSync(`${dump}.age`).subarray(0, 5), bytes.subarray(0, 5));
    await decryptFile(`${dump}.age`, join(dir, 'back.dump'), identity);
    assert.deepEqual(readFileSync(join(dir, 'back.dump')), bytes);
    const other = await newKeyPair();
    await assert.rejects(decryptFile(`${dump}.age`, join(dir, 'wrong.dump'), other.identity));
    await assert.rejects(encryptFile(dump, join(dir, 'x.age'), 'not-a-recipient'), /age1/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('syncCopies: one copy per dump kept, readable by the group of aobackup; stale and half copies go; a second run does nothing', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ao-sync-'));
  try {
    const dumps = join(dir, 'ao');
    const copies = join(dir, 'ao-offsite');
    mkdirSync(join(dumps, 'shop', 'production'), { recursive: true });
    mkdirSync(join(copies, 'shop', 'production'), { recursive: true });
    writeFileSync(join(dumps, 'shop', 'production', 'shop-production-20261114T193005Z.dump'), 'PGDMP one');
    writeFileSync(join(dumps, 'shop', 'production', 'shop-production-20261114T193005Z.dump.part'), 'half');
    writeFileSync(join(copies, 'shop', 'production', 'shop-production-20261101T193001Z.dump.age'), 'old');
    writeFileSync(join(copies, 'shop', 'production', 'shop-production-20261114T193005Z.dump.age.part'), 'half');
    const { identity, recipient } = await newKeyPair();
    const owned = [];
    const lines = [];
    const failed = await syncCopies({ dumpsRoot: dumps, copiesRoot: copies, recipient, gid: 990, chown: (path, uid, gid) => owned.push([path, uid, gid]), log: (line) => lines.push(line) });
    assert.equal(failed, 0);
    assert.deepEqual(readdirSync(join(copies, 'shop', 'production')), ['shop-production-20261114T193005Z.dump.age']);
    await decryptFile(join(copies, 'shop', 'production', 'shop-production-20261114T193005Z.dump.age'), join(dir, 'back'), identity);
    assert.equal(readFileSync(join(dir, 'back'), 'utf8'), 'PGDMP one');
    // The folders and the copy belong to root and the group; the copy is renamed only once it is whole.
    assert.ok(owned.some(([path, uid, gid]) => path === join(copies, 'shop') && uid === 0 && gid === 990));
    assert.ok(owned.some(([path, , gid]) => path.endsWith('.dump.age.part') && gid === 990));
    assert.ok(lines.some((line) => line.includes('removed') && line.includes('20261101T193001Z')));
    lines.length = 0;
    assert.equal(await syncCopies({ dumpsRoot: dumps, copiesRoot: copies, recipient, gid: 990, chown: () => {}, log: (line) => lines.push(line) }), 0);
    assert.deepEqual(lines, []);
    // A recipient that is wrong counts as failed, and leaves no half copy.
    writeFileSync(join(dumps, 'shop', 'production', 'shop-production-20261115T193005Z.dump'), 'PGDMP two');
    assert.equal(await syncCopies({ dumpsRoot: dumps, copiesRoot: copies, recipient: 'age1nope', gid: 990, chown: () => {}, log: () => {} }), 1);
    assert.equal(existsSync(join(copies, 'shop', 'production', 'shop-production-20261115T193005Z.dump.age.part')), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
