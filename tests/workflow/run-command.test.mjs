// The effects of the dispatcher /ao-run on this machine (C2 spec 5.2, 5.6, 5.7), with fake processes and files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { join } from 'node:path';
import { decisionJson } from '../../scripts/ao-step.mjs';
import { dispatcherEffects, lastJson, spentSince } from '../../lib/workflow/run-command.mjs';

const PROJECT = join('D:', 'work', 'shop');

// Files in a Map; openSync gives a number, closeSync forgets it.
function fakeFs(files = new Map()) {
  return {
    files,
    existsSync: (path) => files.has(path),
    mkdirSync: () => {},
    openSync: () => 7,
    closeSync: () => {},
    readFileSync: (path) => {
      if (!files.has(path)) throw new Error(`ENOENT ${path}`);
      return files.get(path);
    },
    writeFileSync: (path, text) => files.set(path, text),
    appendFileSync: (path, text) => files.set(path, `${files.get(path) ?? ''}${text}`),
    rmSync: (path) => files.delete(path),
  };
}

// A spawn that answers each call with what `answer(args, options)` gives: { stdout, code } now, or a function run
// before the process closes.
function fakeSpawn(answer) {
  const calls = [];
  const spawn = (command, args, options) => {
    calls.push(args.slice(1));
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    setImmediate(() => {
      const { stdout = '', stderr = '', code = 0, before } = answer(args.slice(1), options) ?? {};
      before?.();
      if (stdout) child.stdout.emit('data', stdout);
      if (stderr) child.stderr.emit('data', stderr);
      child.emit('close', code);
    });
    return child;
  };
  return { spawn, calls };
}

const effects = (spawn, fs, more = {}) => dispatcherEffects({ kitDir: join('D:', 'kit'), projectDir: PROJECT, spawn, fs, alive: () => false, now: () => Date.parse('2026-11-20T08:30:00.000Z'), execPath: 'node', print: () => {}, ...more });

test('lastJson takes the last line of JSON a command printed', () => {
  assert.deepEqual(lastJson('Note: the kit differs\n{"go":false}\n'), { go: false });
  assert.equal(lastJson('STOP: no JSON here'), null);
  assert.equal(lastJson('{broken'), null);
});

test('decisionJson keeps what the dispatcher reads of a decision, and no prompt', () => {
  const decision = { go: true, runs: [{ role: 'qa', purpose: 'qa', prompt: 'Test DEMO-21 on https://user:pass@dev', qa: { environment: 'development', auth: true } }], lines: ['x'] };
  assert.equal(decisionJson(decision), '{"go":true,"reason":null,"next":null,"waits":null,"then":null,"runs":[{"role":"qa","purpose":"qa","action":null,"qa":{"environment":"development"}}]}');
  assert.equal(JSON.parse(decisionJson({ go: false, reason: 'r', next: '/ao-fix 15', waits: 'next', then: { command: 'fix', arg: 15 } })).then.command, 'fix');
});

test('the board, a decision and a dry run that gives none come from ao-step itself', async () => {
  const { spawn, calls } = fakeSpawn((args) => {
    if (args[0] === 'status') return { stdout: 'Note\n{"items":[{"key":"DEMO-21"}],"pulls":[]}\n' };
    if (args[1] === 'DEMO-21') return { stdout: '{"go":true,"runs":[{"role":"be-dev"}]}\n' };
    return { stderr: 'ao-step: ATLASSIAN_AGENT_TOKEN is not set', code: 1 };
  });
  const e = effects(spawn, fakeFs());
  assert.deepEqual(await e.readBoard(), { items: [{ key: 'DEMO-21' }], pulls: [], merged: [] });
  assert.equal((await e.decide('build', 'DEMO-21')).go, true);
  const none = await e.decide('build', 'DEMO-22');
  assert.equal(none.waits, 'fix');
  assert.match(none.reason, /gave no decision: ao-step: ATLASSIAN_AGENT_TOKEN is not set/);
  assert.deepEqual(calls.map((args) => args.join(' ')), ['status --json', 'build DEMO-21 --json', 'build DEMO-22 --json']);
});

// T14 of C2, finding 7: the board carries the PRs merged lately, so an item In Review waits for its deploy.
test('the board carries the PRs merged lately, and an older ao-step that names none gives an empty list', async () => {
  const merged = fakeSpawn(() => ({ stdout: '{"items":[],"pulls":[],"merged":[{"key":"DEMO-21","number":15}]}' }));
  assert.deepEqual(await effects(merged.spawn, fakeFs()).readBoard(), { items: [], pulls: [], merged: [{ key: 'DEMO-21', number: 15 }] });
  const older = fakeSpawn(() => ({ stdout: '{"items":[],"pulls":[]}' }));
  assert.deepEqual(await effects(older.spawn, fakeFs()).readBoard(), { items: [], pulls: [], merged: [] });
});

test('a run goes with --go and --result, and resolves the decision it wrote there, or null when it wrote none', async () => {
  const fs = fakeFs();
  const { spawn, calls } = fakeSpawn((args) => ({ before: () => args[1] === 'DEMO-21' && fs.writeFileSync(join(PROJECT, args[4]), '{"go":false,"waits":"you","reason":"gate ③"}\n') }));
  const e = effects(spawn, fs);
  assert.deepEqual(await e.start({ command: 'build', arg: 'DEMO-21', key: 'DEMO-21' }), { go: false, waits: 'you', reason: 'gate ③' });
  assert.equal(await e.start({ command: 'review', arg: 16, key: 'DEMO-22' }), null);
  assert.deepEqual(calls[0].slice(0, 4), ['build', 'DEMO-21', '--go', '--result']);
  assert.match(calls[0][4], /^\.ai[\\/]runs[\\/]_run[\\/]results[\\/]DEMO-21-build-2026-11-20T08-30-00-000Z\.json$/);
});

test('one dispatcher per project: the lock, --stop and the log', () => {
  const fs = fakeFs();
  let living = true;
  const e = effects(fakeSpawn(() => ({})).spawn, fs, { alive: () => living });
  assert.deepEqual(e.lock({ pid: 41, scope: 'DEMO-20', startedAt: '2026-11-20T08:30:00.000Z' }), { ok: true });
  assert.equal(e.running().pid, 41);
  assert.match(e.lock({ pid: 42, scope: 'DEMO-30' }).reason, /^\/ao-run DEMO-20 runs already \(process 41, since 2026-11-20T08:30:00\.000Z\): one dispatcher per project$/);
  assert.equal(e.stopAsked(), false);
  e.askStop();
  assert.equal(e.stopAsked(), true);
  e.unlock();
  assert.equal(e.running(), null);
  assert.equal(e.stopAsked(), false);
  // A lock whose process is gone does not count.
  e.lock({ pid: 43, scope: 'DEMO-20' });
  living = false;
  assert.equal(e.running(), null);
  assert.deepEqual(e.lock({ pid: 44, scope: 'DEMO-20' }), { ok: true });
  e.log('start /ao-build DEMO-21');
  const [log] = [...fs.files.entries()].filter(([path]) => path.endsWith('2026-11-20.log'));
  assert.match(log[1], /^\d\d:\d\d start \/ao-build DEMO-21\n$/);
});

test('what the runs cost since the dispatcher started, from state.json', () => {
  const states = {
    'DEMO-21': { runs: [{ startedAt: '2026-11-20T08:00:00.000Z', costUsd: 5 }, { startedAt: '2026-11-20T09:00:00.000Z', costUsd: 1.25 }, { startedAt: '2026-11-20T09:10:00.000Z', costUsd: null }] },
    'DEMO-22': { runs: [{ startedAt: '2026-11-20T10:00:00.000Z', costUsd: 2 }] },
  };
  assert.equal(spentSince(['DEMO-21', 'DEMO-22', 'DEMO-23'], Date.parse('2026-11-20T08:30:00.000Z'), (key) => states[key] ?? null), 3.25);
});
