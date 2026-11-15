import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installLane, pullsOfBranch, qaWatcher, runPlacer, waitForRam } from '../../lib/workflow/lane-runs.mjs';

// How ao-step starts a run with lanes and parallel runs on (parallel-runs spec 4 and 5), out of ao-step.mjs since the
// review of shop PR #21, with the apps of shop.
const APPS = {
  user: { port: { env: 'PORT', default: 3000 } },
  admin: { port: { env: 'PORT', default: 5173 } },
  api: { port: { env: 'PORT', default: 3001 } },
};
const RUNS = { worktrees: true, lanesMax: 3, minFreeRamGb: 3, portStep: 100, copy: [], laneEnv: { ports: { DB_PORT: 5432 }, names: { COMPOSE_PROJECT_NAME: 'learn-postgresql-api' } } };
const keeperOf = (place) => ({
  placeOf: async () => place,
  note: (dir, key) => `You work in the lane of ${key} at ${dir}.`,
});

test('a run in a lane works there, with its ports and its own database moved by its slot, even alone', async () => {
  const waits = [];
  const logged = [];
  const place = runPlacer({ keeper: keeperOf({ key: 'SHOP-13', dir: 'D:/wt/SHOP-13', notes: ['Made the lane of SHOP-13.'] }), command: 'build', cap: 1, slot: 0, runs: RUNS, apps: APPS, waitForRam: async (gb) => waits.push(gb), log: (line) => logged.push(line) });
  const run = await place({ role: 'be-dev', prompt: 'Build SHOP-13.', env: { A: '1' } });
  assert.equal(run.cwd, 'D:/wt/SHOP-13');
  assert.deepEqual(run.env, { A: '1', AO_PORT_OFFSET: '100', DB_PORT: '5532', COMPOSE_PROJECT_NAME: 'learn-postgresql-api-s1' });
  assert.match(run.prompt, /^You work in the lane of SHOP-13 at D:\/wt\/SHOP-13\.\n\n.*user on 3100 \(PORT=3100\).*DB_PORT=5532, COMPOSE_PROJECT_NAME=learn-postgresql-api-s1.*\n\nBuild SHOP-13\.$/s);
  assert.deepEqual(waits, [], 'one run at a time waits for no RAM');
  assert.deepEqual(logged, ['Made the lane of SHOP-13.']);
});

test('with more than one run at once, a run waits for RAM and takes the ports of its slot, in a lane or not', async () => {
  const waits = [];
  const place = runPlacer({ keeper: keeperOf(null), command: 'review', cap: 3, slot: 2, runs: RUNS, apps: APPS, waitForRam: async (gb) => waits.push(gb), othersRunning: () => true });
  const run = await place({ role: 'reviewer', prompt: 'Review PR #21.' });
  assert.equal(run.cwd, undefined);
  assert.equal(run.env.AO_PORT_OFFSET, '300');
  assert.match(run.prompt, /admin on 5473 \(PORT=5473\)/);
  assert.deepEqual(waits, [3]);
  // Alone on the machine, a run waits for no RAM: no other agent would free it (review round 2 of shop PR #21).
  const alone = runPlacer({ keeper: keeperOf(null), command: 'review', cap: 3, slot: 0, runs: RUNS, apps: APPS, waitForRam: async () => assert.fail('no wait'), othersRunning: () => false });
  assert.equal((await alone({ role: 'reviewer', prompt: 'Review PR #21.' })).env.AO_PORT_OFFSET, '100');
});

test('alone and out of a lane, a run is as before: default ports, no variables, no note', async () => {
  const place = runPlacer({ keeper: keeperOf(null), command: 'review', cap: 1, slot: 0, runs: { ...RUNS, worktrees: false }, apps: APPS, waitForRam: async () => assert.fail('no wait') });
  const run = { role: 'reviewer', prompt: 'Review PR #21.' };
  assert.deepEqual(await place(run), run);
});

test('a qa run whose environment gets another deploy is stopped and marked superseded, twice per command at most', async () => {
  let tick = null;
  const killed = [];
  let running = 'bbbbbbbb2';
  const watch = qaWatcher({ readSha: async () => running, kill: (pid) => killed.push(pid), every: (fn) => (tick = fn), stop: () => (tick = null) });
  const run = { role: 'qa', qa: { sha: 'aaaaaaaa1', environment: 'development' } };
  const start = async (_, onStart) => {
    onStart?.(42);
    await tick();
    return { lines: [] };
  };
  const first = await watch(run, start);
  assert.deepEqual(killed, [42]);
  assert.match(first.superseded, /^development ran aaaaaaaa when qa started, and bbbbbbbb came during the run/);
  assert.equal(tick, null, 'the watch stops with the run');
  assert.ok((await watch(run, start)).superseded);
  // After two, the run ends as before, unwatched.
  assert.equal((await watch(run, async () => ({ lines: ['third'] }))).superseded, undefined);
  // The same version, or no answer from GitHub, goes on.
  running = 'aaaaaaaa1';
  const calm = qaWatcher({ readSha: async () => running, kill: () => assert.fail('no kill'), every: (fn) => (tick = fn), stop: () => {} });
  assert.equal((await calm(run, start)).superseded, undefined);
  const silent = qaWatcher({ readSha: async () => Promise.reject(new Error('502')), kill: () => assert.fail('no kill'), every: (fn) => (tick = fn), stop: () => {} });
  assert.equal((await silent(run, start)).superseded, undefined);
  // A run with no commit to watch is not watched.
  assert.deepEqual(await calm({ role: 'qa' }, async () => ({ lines: ['plain'] })), { lines: ['plain'] });
});

test('another agent waits for the free RAM of runs.min_free_ram_gb, and stops after the limit', async () => {
  const GB = 1024 ** 3;
  const free = [1 * GB, 2 * GB, 4 * GB];
  const logged = [];
  const slept = [];
  await waitForRam(3, { freeBytes: () => free[Math.min(slept.length, free.length - 1)], sleep: async (ms) => slept.push(ms), log: (line) => logged.push(line), step: 10 });
  assert.equal(slept.length, 2);
  assert.match(logged.join(' '), /^Waiting for RAM: 1\.0 GB free, 3 GB needed/);
  await assert.rejects(waitForRam(3, { freeBytes: () => GB, sleep: async () => {}, step: 10, limit: 30 }), /stayed under 3 GB of free RAM/);
  await waitForRam(0, { freeBytes: () => 0, sleep: async () => assert.fail('no wait') });
});

test('the PRs of a lane\'s branch, with merged told apart from closed', async () => {
  const asked = [];
  const github = { getAll: async (path, query) => (asked.push([path, query]), [{ number: 18, state: 'closed', merged_at: '2026-11-14T10:00:00Z' }, { number: 19, state: 'open' }, { number: 7, state: 'closed', merged_at: null }]) };
  assert.deepEqual(await pullsOfBranch(github, 'TungPH7/shop', 'feature/SHOP-8-tokens'), [{ number: 18, state: 'merged' }, { number: 19, state: 'open' }, { number: 7, state: 'closed' }]);
  assert.deepEqual(asked, [['/pulls', { state: 'all', head: 'TungPH7:feature/SHOP-8-tokens' }]]);
});

test('a lane gets the packages of the project by its lockfile and those of the kit copy with no scripts', () => {
  const ran = [];
  const files = new Set(['D:/wt/SHOP-13/pnpm-lock.yaml', 'D:/wt/SHOP-13/.ai-orchestrator/package-lock.json'].map((path) => path.replaceAll('/', '\\')));
  const exists = (path) => files.has(path.replaceAll('/', '\\'));
  const args = (manager, { ignoreScripts } = {}) => [manager === 'npm' ? 'ci' : 'install', ...(ignoreScripts ? ['--ignore-scripts'] : [])];
  const manager = (has) => (has('pnpm-lock.yaml') ? 'pnpm' : null);
  const env = { PATH: 'x' };
  const done = installLane('D:/wt/SHOP-13', { env, exists, manager, args, run: (m, a, options) => (ran.push([m, a, options.cwd, options.env]), { status: 0 }) });
  assert.deepEqual(done, { ok: true, notes: ['Installed the packages of the project with pnpm.', 'Installed the packages of the kit copy.'] });
  assert.deepEqual(ran.map(([m, a]) => [m, a]), [['pnpm', ['install']], ['npm', ['ci', '--ignore-scripts', '--prefix', '.ai-orchestrator']]]);
  assert.ok(ran.every(([, , cwd, e]) => cwd === 'D:/wt/SHOP-13' && e === env));
  const failed = installLane('D:/wt/SHOP-13', { env, exists, manager, args, run: () => ({ status: 1, stderr: 'ERR_PNPM_OUTDATED_LOCKFILE' }) });
  assert.deepEqual(failed, { ok: false, reason: 'pnpm install failed: ERR_PNPM_OUTDATED_LOCKFILE' });
});
