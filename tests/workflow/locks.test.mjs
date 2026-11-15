import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { admit, liveLocks, takeLock } from '../../lib/workflow/locks.mjs';

// Who may run now (parallel-runs spec, part 2).
const lock = (more) => ({ name: more.key ?? '_project', pid: 100, slot: 0, ...more });

test('with one run at a time, nothing starts next to a live run, as before', () => {
  assert.deepEqual(admit({ live: [], command: 'build', key: 'SHOP-13', role: 'be-dev', cap: 1 }), { ok: true, name: 'SHOP-13', slot: 0 });
  const busy = admit({ live: [lock({ command: 'review', key: 'SHOP-19' })], command: 'build', key: 'SHOP-13', role: 'be-dev', cap: 1 });
  assert.equal(busy.ok, false);
  assert.match(busy.reason, /ao-step is already running review SHOP-19 \(process 100\); agents run one at a time/);
});

test('build, fix, review and QA of different items run side by side, each in the smallest free slot', () => {
  const live = [lock({ command: 'build', key: 'SHOP-13', role: 'be-dev', slot: 0 }), lock({ command: 'qa', key: 'SHOP-8', environment: 'development', slot: 2, pid: 101 })];
  assert.deepEqual(admit({ live, command: 'build', key: 'SHOP-11', role: 'fe-dev', cap: 3 }), { ok: true, name: 'SHOP-11', slot: 1 });
  assert.deepEqual(admit({ live: live.slice(0, 1), command: 'review', key: 'SHOP-10', cap: 2 }), { ok: true, name: 'SHOP-10', slot: 1 });
});

test('the cap of runs.lanes_max holds', () => {
  const live = [lock({ command: 'build', key: 'SHOP-13', role: 'be-dev' }), lock({ command: 'review', key: 'SHOP-10', slot: 1, pid: 101 })];
  const full = admit({ live, command: 'qa', key: 'SHOP-8', environment: 'development', cap: 2 });
  assert.equal(full.ok, false);
  assert.match(full.reason, /2 runs are going already, the most runs\.lanes_max allows: build SHOP-13 \(process 100\), review SHOP-10 \(process 101\)/);
});

test('one run per item, one QA per environment, one build or fix per dev agent', () => {
  const live = [lock({ command: 'fix', key: 'SHOP-10', role: 'fe-dev' }), lock({ command: 'qa', key: 'SHOP-8', environment: 'development', slot: 1, pid: 101 })];
  assert.match(admit({ live, command: 'review', key: 'SHOP-10', cap: 4 }).reason, /already running fix on SHOP-10 \(process 100\): one run per item/);
  assert.match(admit({ live, command: 'qa', key: 'SHOP-9', environment: 'development', cap: 4 }).reason, /qa is testing SHOP-8 on development \(process 101\): one QA at a time on an environment/);
  assert.equal(admit({ live, command: 'qa', key: 'SHOP-9', environment: 'staging', cap: 4 }).ok, true);
  assert.match(admit({ live, command: 'build', key: 'SHOP-11', role: 'fe-dev', cap: 4 }).reason, /fe-dev is at work on SHOP-10 \(process 100\): a dev agent builds one item at a time/);
  assert.equal(admit({ live, command: 'build', key: 'SHOP-13', role: 'be-dev', cap: 4 }).ok, true);
});

test('spec, plan, release and the other commands run alone, and nothing starts next to them', () => {
  for (const command of ['spec', 'plan', 'request', 'intake', 'preview', 'release', 'ship', 'rollback']) {
    assert.deepEqual(admit({ live: [], command, key: 'SHOP-7', cap: 3 }), { ok: true, name: '_project', slot: 0 }, command);
    assert.match(admit({ live: [lock({ command: 'build', key: 'SHOP-13' })], command, key: 'SHOP-7', cap: 3 }).reason, new RegExp(`/ao-${command} runs alone`), command);
  }
  const alone = admit({ live: [lock({ name: '_project', command: 'ship', key: 'v0.3.0' })], command: 'build', key: 'SHOP-13', role: 'be-dev', cap: 3 });
  assert.match(alone.reason, /ao-step is running ship v0\.3\.0 \(process 100\), which runs alone/);
});

const fs = { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync };

test('a lock is written with its slot, and the lock of a process that is gone is removed', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'locks-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const alive = (pid) => pid !== 999;
  writeFileSync(join(dir, 'SHOP-1.json'), JSON.stringify({ pid: 999, command: 'build', key: 'SHOP-1', slot: 0 }));
  const first = await takeLock(dir, { pid: 1, command: 'build', key: 'SHOP-13', role: 'be-dev' }, { fs, alive, cap: 2, sleep: async () => {} });
  assert.deepEqual({ ok: first.ok, slot: first.slot }, { ok: true, slot: 0 });
  assert.equal(existsSync(join(dir, 'SHOP-1.json')), false, 'the dead lock is gone');
  assert.deepEqual(JSON.parse(readFileSync(join(dir, 'SHOP-13.json'), 'utf8')), { pid: 1, command: 'build', key: 'SHOP-13', role: 'be-dev', slot: 0 });
  const second = await takeLock(dir, { pid: 2, command: 'review', key: 'SHOP-10' }, { fs, alive, cap: 2, sleep: async () => {} });
  assert.equal(second.slot, 1);
  const third = await takeLock(dir, { pid: 3, command: 'qa', key: 'SHOP-8', environment: 'development' }, { fs, alive, cap: 2, sleep: async () => {} });
  assert.equal(third.ok, false);
  assert.equal(existsSync(join(dir, '.admit')), false, 'the mutex is released');
  assert.deepEqual(liveLocks(dir, { fs, alive }).map(({ name, slot }) => `${name} ${slot}`).sort(), ['SHOP-10 1', 'SHOP-13 0']);
});

test('two commands started at the same moment cannot both pass the cap', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'locks-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const alive = () => true;
  const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
  const results = await Promise.all([
    takeLock(dir, { pid: 1, command: 'build', key: 'SHOP-13', role: 'be-dev' }, { fs, alive, cap: 1, sleep }),
    takeLock(dir, { pid: 2, command: 'build', key: 'SHOP-11', role: 'fe-dev' }, { fs, alive, cap: 1, sleep }),
  ]);
  assert.equal(results.filter(({ ok }) => ok).length, 1);
});

test('a mutex left by a process that died is taken over', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'locks-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(join(dir, '.admit'), '999');
  const taken = await takeLock(dir, { pid: 1, command: 'fix', key: 'SHOP-10', role: 'fe-dev' }, { fs, alive: (pid) => pid !== 999, cap: 2, sleep: async () => {} });
  assert.equal(taken.ok, true);
});
