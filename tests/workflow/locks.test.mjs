import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { admit, admitAgent, claimRole, jiraWipStop, liveLocks, releaseAgent, takeLock } from '../../lib/workflow/locks.mjs';

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

// C2 spec section 8: a preview in a lane holds its item only; it runs no agent, and counts toward no cap.
test('a preview in a lane holds its item and nothing else', () => {
  const preview = lock({ command: 'preview', key: 'SHOP-21', slot: -1, pid: 300 });
  assert.equal(admit({ live: [preview], command: 'build', key: 'SHOP-13', role: 'be-dev', cap: 1 }).ok, true, 'not counted toward the cap');
  assert.equal(admit({ live: [preview], command: 'spec', key: 'SHOP-7', cap: 1 }).ok, true, 'not a run that holds the project');
  assert.match(admit({ live: [preview], command: 'fix', key: 'SHOP-21', role: 'fe-dev', cap: 3 }).reason, /^the preview of SHOP-21 runs \(process 300\): \/ao-preview SHOP-21 --stop first$/);
  // /ao-preview itself, with lanes on: next to the runs of other items, at any cap.
  const build = lock({ command: 'build', key: 'SHOP-13', role: 'be-dev' });
  assert.deepEqual(admit({ live: [build], command: 'preview', key: 'SHOP-21', cap: 1, lanes: true }), { ok: true, name: 'SHOP-21', slot: -1 });
  assert.match(admit({ live: [lock({ command: 'fix', key: 'SHOP-21', role: 'fe-dev' })], command: 'preview', key: 'SHOP-21', cap: 3, lanes: true }).reason, /already running fix on SHOP-21/);
  // With lanes off it runs alone, as before.
  assert.equal(admit({ live: [build], command: 'preview', key: 'SHOP-21', cap: 3 }).ok, false);
});

// C2 spec section 6: with runs.agents_per_role, N agents of a role build at once, each on its own item.
test('runs.agents_per_role lets several agents of one role build at once, one item each', () => {
  const live = [lock({ command: 'build', key: 'SHOP-10', role: 'fe-dev' })];
  const two = { 'fe-dev': 2 };
  assert.equal(admit({ live, command: 'build', key: 'SHOP-11', role: 'fe-dev', cap: 4, agentsPerRole: two }).ok, true);
  const more = [...live, lock({ command: 'fix', key: 'SHOP-11', role: 'fe-dev', slot: 1, pid: 101 })];
  assert.match(admit({ live: more, command: 'build', key: 'SHOP-12', role: 'fe-dev', cap: 4, agentsPerRole: two }).reason, /^fe-dev is at work on SHOP-10 \(process 100\), SHOP-11 \(process 101\): runs\.agents_per_role lets 2 fe-dev agents work at once$/);
  // Still one run per item.
  assert.match(admit({ live, command: 'fix', key: 'SHOP-10', role: 'fe-dev', cap: 4, agentsPerRole: two }).reason, /one run per item/);
});

test('spec, plan, release and the other commands run alone, and nothing starts next to them', () => {
  for (const command of ['spec', 'plan', 'request', 'intake', 'preview', 'release', 'ship', 'rollback']) {
    assert.deepEqual(admit({ live: [], command, key: 'SHOP-7', cap: 3 }), { ok: true, name: '_project', slot: 0 }, command);
    assert.match(admit({ live: [lock({ command: 'build', key: 'SHOP-13' })], command, key: 'SHOP-7', cap: 3 }).reason, new RegExp(`/ao-${command} runs alone`), command);
  }
  const alone = admit({ live: [lock({ name: '_project', command: 'ship', key: 'v0.3.0' })], command: 'build', key: 'SHOP-13', role: 'be-dev', cap: 3 });
  assert.match(alone.reason, /ao-step is running ship v0\.3\.0 \(process 100\), which runs alone/);
});

const fs = { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync };

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

// Review of shop PR #21: the lock named only the role of a command's first run, so the fe-dev run of a Story's build
// went next to another command's fe-dev. Each run of build or fix now puts its role on the lock first.
test('a build that moves on to another dev agent takes that role on its lock, and waits while another command holds it', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'locks-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const alive = () => true;
  const story = await takeLock(dir, { pid: 1, command: 'build', key: 'SHOP-13', role: 'be-dev' }, { fs, alive, cap: 3, sleep: async () => {} });
  const other = await takeLock(dir, { pid: 2, command: 'build', key: 'SHOP-11', role: 'fe-dev' }, { fs, alive, cap: 3, sleep: async () => {} });
  const waits = [];
  let polls = 0;
  // SHOP-11's fe-dev run ends after two polls of SHOP-13.
  const sleep = async () => {
    polls += 1;
    if (polls === 2) rmSync(other.file);
  };
  const claimed = await claimRole(dir, story.file, 'fe-dev', { fs, alive, sleep, onWait: (busy) => waits.push(busy.key) });
  assert.deepEqual(claimed, { ok: true, waited: true });
  assert.deepEqual(waits, ['SHOP-11']);
  assert.equal(JSON.parse(readFileSync(story.file, 'utf8')).role, 'fe-dev');
  // Meanwhile be-dev was free: a third build could start with it.
  assert.equal((await takeLock(dir, { pid: 3, command: 'build', key: 'SHOP-12', role: 'be-dev' }, { fs, alive, cap: 3, sleep: async () => {} })).ok, true);
  // The role it holds already, or a free one, is taken at once.
  assert.deepEqual(await claimRole(dir, story.file, 'fe-dev', { fs, alive, sleep }), { ok: true, waited: false });
  assert.equal(existsSync(join(dir, '.admit')), false, 'the mutex is released');
  // With two agents of fe-dev (runs.agents_per_role), a second one does not wait (C2 spec section 6).
  const another = await takeLock(dir, { pid: 4, command: 'build', key: 'SHOP-14' }, { fs, alive, cap: 4, sleep: async () => {} });
  assert.deepEqual(await claimRole(dir, another.file, 'fe-dev', { fs, alive, sleep: async () => assert.fail('it waited'), limit: 2 }), { ok: true, waited: false });
});

test('two builds that wait for each other\'s dev agent cannot both wait, and a wait ends', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'locks-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const alive = () => true;
  const a = await takeLock(dir, { pid: 1, command: 'build', key: 'SHOP-13', role: 'be-dev' }, { fs, alive, cap: 3, sleep: async () => {} });
  const b = await takeLock(dir, { pid: 2, command: 'build', key: 'SHOP-14', role: 'fe-dev' }, { fs, alive, cap: 3, sleep: async () => {} });
  // A waits for fe-dev and holds no role meanwhile, so B gets be-dev at once.
  const waiting = claimRole(dir, a.file, 'fe-dev', { fs, alive, sleep: (ms) => new Promise((done) => setTimeout(done, ms)), poll: 5, most: 4 });
  assert.deepEqual(await claimRole(dir, b.file, 'be-dev', { fs, alive, sleep: async () => {} }), { ok: true, waited: false });
  assert.deepEqual(await waiting, { ok: true, waited: true });
  // A role held the whole time ends the wait with the reason.
  const c = await takeLock(dir, { pid: 3, command: 'fix', key: 'SHOP-15', role: 'devops' }, { fs, alive, cap: 4, sleep: async () => {} });
  const stuck = await claimRole(dir, c.file, 'be-dev', { fs, alive, sleep: async () => {}, most: 3 });
  assert.equal(stuck.ok, false);
  assert.match(stuck.reason, /be-dev stayed at work on SHOP-14 \(process 2\)/);
  // A lock that is gone ends it too.
  rmSync(c.file);
  assert.match((await claimRole(dir, c.file, 'qa', { fs, alive, sleep: async () => {} })).reason, /the lock .* is gone/);
});

// Review round 2 of shop PR #21: a read outside the mutex, as /ao-status makes, removed a lock it could not parse, which
// a write cut short for an instant. Locks are now written whole (a file aside, then a rename), and only a read under
// the mutex removes one it cannot parse; a lock of a process that is gone goes either way.
test('a lock is written whole, and a read outside the mutex removes no lock it cannot parse', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'locks-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const alive = (pid) => pid !== 999;
  const written = [];
  const watched = { ...fs, renameSync: (from, to) => (written.push([from, to]), renameSync(from, to)) };
  const taken = await takeLock(dir, { pid: 1, command: 'build', key: 'SHOP-13', role: 'be-dev' }, { fs: watched, alive, cap: 2, sleep: async () => {} });
  assert.deepEqual(written.map(([, to]) => to), [taken.file]);
  await claimRole(dir, taken.file, 'fe-dev', { fs: watched, alive, sleep: async () => {} });
  assert.deepEqual(written.map(([, to]) => to), [taken.file, taken.file]);
  assert.deepEqual(readdirSync(dir).sort(), ['SHOP-13.json']);
  writeFileSync(join(dir, 'SHOP-14.json'), '');
  writeFileSync(join(dir, 'SHOP-1.json'), JSON.stringify({ pid: 999, command: 'build', key: 'SHOP-1', slot: 1 }));
  assert.deepEqual(liveLocks(dir, { fs, alive }).map(({ name }) => name), ['SHOP-13']);
  assert.equal(existsSync(join(dir, 'SHOP-14.json')), true, 'kept outside the mutex');
  assert.equal(existsSync(join(dir, 'SHOP-1.json')), false, 'its process is gone');
  liveLocks(dir, { fs, alive, clean: true });
  assert.equal(existsSync(join(dir, 'SHOP-14.json')), false, 'removed under the mutex');
});

// Review round 4 of shop PR #21: the mutex can go between the write that met it and the read of its owner; the take is
// tried again instead of failing with ENOENT.
test('a mutex released while it is read is taken on the next try', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'locks-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  let met = false;
  const racing = {
    ...fs,
    writeFileSync: (path, text, options) => {
      if (options?.flag === 'wx' && !met) {
        met = true;
        throw Object.assign(new Error('EEXIST'), { code: 'EEXIST' });
      }
      return writeFileSync(path, text, options);
    },
  };
  const taken = await takeLock(dir, { pid: 1, command: 'build', key: 'SHOP-13', role: 'be-dev' }, { fs: racing, alive: () => true, cap: 2, sleep: async () => {} });
  assert.equal(taken.ok, true);
});

// Live check of shop, 2026-11-16: three commands each waited for RAM because the others held locks, though none had an
// agent running yet, so none would ever start. An agent now waits for RAM only while another command has one running,
// and the check and the mark are one step under the mutex.
test('an agent starts at once when no other command has one running, and waits for RAM while one does', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'locks-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const alive = () => true;
  const GB = 1024 ** 3;
  const a = await takeLock(dir, { pid: 1, command: 'build', key: 'SHOP-13', role: 'be-dev' }, { fs, alive, cap: 3, sleep: async () => {} });
  const b = await takeLock(dir, { pid: 2, command: 'build', key: 'SHOP-11', role: 'fe-dev' }, { fs, alive, cap: 3, sleep: async () => {} });
  // Low RAM, but the other command only holds its lock: this agent starts.
  assert.deepEqual(await admitAgent(dir, a.file, { fs, alive, sleep: async () => assert.fail('no wait'), freeBytes: () => 0.4 * GB, minGb: 3 }), { ok: true, waited: false });
  assert.equal(JSON.parse(readFileSync(a.file, 'utf8')).agent, true);
  // Now SHOP-13 has an agent running: SHOP-11 waits until 3 GB are free.
  let free = 1 * GB;
  const waits = [];
  const started = await admitAgent(dir, b.file, { fs, alive, sleep: async () => (free = 4 * GB), freeBytes: () => free, minGb: 3, onWait: (gb) => waits.push(gb) });
  assert.deepEqual(started, { ok: true, waited: true });
  assert.deepEqual(waits, ['1.0']);
  // Once SHOP-13's agent ends, its lock holds no agent.
  await releaseAgent(dir, a.file, { fs, alive, sleep: async () => {} });
  assert.equal(JSON.parse(readFileSync(a.file, 'utf8')).agent, false);
  // A wait that lasts past the limit ends with the reason.
  const c = await takeLock(dir, { pid: 3, command: 'qa', key: 'SHOP-38', environment: 'development' }, { fs, alive, cap: 3, sleep: async () => {} });
  const stuck = await admitAgent(dir, c.file, { fs, alive, sleep: async () => {}, freeBytes: () => GB, minGb: 3, poll: 10, limit: 30 });
  assert.equal(stuck.ok, false);
  assert.match(stuck.reason, /the machine stayed under 3 GB of free RAM while another agent ran/);
  // 0 turns the check off.
  assert.deepEqual(await admitAgent(dir, c.file, { fs, alive, sleep: async () => assert.fail('no wait'), freeBytes: () => 0, minGb: 0 }), { ok: true, waited: false });
});

// Pilot 3, SHOP-31: the build waited for fe-dev to end its run on SHOP-58, then ran fe-dev on the Sub-task SHOP-33 while
// SHOP-58 was still In Progress on Jira; jira-guard refused the Start, and the run was lost (0.73 USD).
test('jiraWipStop stops a build run while another item of its role is In Progress on Jira, and not for the item itself', () => {
  const reason = jiraWipStop({ role: 'fe-dev', key: 'SHOP-33', story: 'SHOP-31', keys: ['SHOP-58'], limit: 1 });
  assert.equal(reason, 'fe-dev is at its WIP limit on Jira: SHOP-58 is In Progress, and SHOP-33 would be one more. Once SHOP-58 is In Review, /ao-build SHOP-31 again');
  assert.equal(jiraWipStop({ role: 'fe-dev', key: 'SHOP-33', story: 'SHOP-31', keys: ['SHOP-33'], limit: 1 }), null, 'a Sub-task that goes on holds its own WIP');
  assert.equal(jiraWipStop({ role: 'be-dev', key: 'SHOP-9', keys: [], limit: 1 }), null);
  assert.match(jiraWipStop({ role: 'be-dev', key: 'SHOP-9', keys: ['SHOP-4', 'SHOP-5'], limit: 2 }), /SHOP-4, SHOP-5 are In Progress, and SHOP-9 would be one more\. Once one of them is In Review, \/ao-build SHOP-9 again$/);
});
