import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { isResult, killTree, processesUnder, startAgentProcess, stopProcessesUnder } from '../../lib/workflow/agent-process.mjs';

// Pilot 1, T9: after the agent had its result, `claude -p` stayed alive for as long as a command the agent had left in
// the background (npm run dev), and the run was held 1 to 12 minutes (SMP-6, SMP-7, SMP-10, SMP-11 of ao-sample).

const RESULT = JSON.stringify({ type: 'result', subtype: 'success', is_error: false });
const INIT = JSON.stringify({ type: 'system', subtype: 'init', session_id: 's1' });

// A child process that does what the test says, and timers the test fires by hand.
function world() {
  const child = Object.assign(new EventEmitter(), { pid: 4242, stdout: new EventEmitter(), stderr: new EventEmitter() });
  const timers = [];
  const log = [];
  const kills = [];
  const spawned = [];
  const options = {
    spawn: (command, args, spawnOptions) => (spawned.push({ command, args, spawnOptions }), child),
    command: 'node',
    args: ['ao-agent.mjs'],
    env: { A: '1' },
    cwd: '/project',
    append: (stream, chunk) => log.push([stream, chunk.toString()]),
    graceMs: 60000,
    setTimer: (fn, ms) => (timers.push({ fn, ms, cleared: false }), timers.length - 1),
    clearTimer: (id) => id !== null && id !== undefined && (timers[id].cleared = true),
    kill: (pid) => kills.push(pid),
  };
  return { child, timers, log, kills, spawned, options };
}

test('a result line is told from the other lines of the stream', () => {
  assert.equal(isResult(RESULT), true);
  assert.equal(isResult(INIT), false);
  assert.equal(isResult('not json'), false);
  assert.equal(isResult(JSON.stringify({ type: 'assistant', message: 'the word result' })), false);
});

test('an agent that exits on its own is left alone: no timer survives, nothing is killed', async () => {
  const w = world();
  const run = startAgentProcess(w.options);
  w.child.stdout.emit('data', Buffer.from(`${INIT}\n${RESULT}\n`));
  assert.equal(w.timers.length, 1, 'the result starts the wait');
  w.child.emit('close', 0);
  const { lines, stopped } = await run;
  assert.deepEqual(lines, [INIT, RESULT]);
  assert.equal(stopped, false);
  assert.equal(w.timers[0].cleared, true, 'the wait is cancelled when the process exits');
  assert.deepEqual(w.kills, []);
});

test('an agent still alive a minute after its result is stopped with everything it started', async () => {
  const w = world();
  const run = startAgentProcess(w.options);
  w.child.stdout.emit('data', Buffer.from(`${INIT}\n`));
  assert.equal(w.timers.length, 0, 'no wait before the result');
  w.child.stdout.emit('data', Buffer.from(`${RESULT}\n`));
  assert.equal(w.timers[0].ms, 60000);
  w.timers[0].fn();
  assert.deepEqual(w.kills, [4242]);
  w.child.emit('close', 1);
  const { lines, stopped } = await run;
  assert.deepEqual(lines, [INIT, RESULT]);
  assert.equal(stopped, true, 'the runner can tell and log it');
});

test('a result split between two chunks counts once it is complete; a second result starts no second wait', async () => {
  const w = world();
  const run = startAgentProcess(w.options);
  w.child.stdout.emit('data', Buffer.from(RESULT.slice(0, 20)));
  assert.equal(w.timers.length, 0);
  w.child.stdout.emit('data', Buffer.from(`${RESULT.slice(20)}\n${RESULT}\n`));
  assert.equal(w.timers.length, 1);
  w.child.emit('close', 0);
  await run;
});

// The first result of `claude -p --resume` after the usage limit cut a session that had a command in the background
// (Pilot 3, QA SHOP-63 of shop, 2026-11-17): it answers the task notification, has no turn, and comes before the prompt.
const NOTICE = JSON.stringify({ type: 'result', subtype: 'success', is_error: false, num_turns: 0, duration_api_ms: 0, origin: { kind: 'task-notification' } });

test('the result of a task notification is not the result of the run: the agent works on, and its own result starts the wait', async () => {
  assert.equal(isResult(NOTICE), false);
  const w = world();
  const run = startAgentProcess(w.options);
  w.child.stdout.emit('data', Buffer.from(`${INIT}\n${NOTICE}\n`));
  assert.equal(w.timers.length, 0, 'no wait: the agent has not read its prompt yet');
  w.child.stdout.emit('data', Buffer.from(`${RESULT}\n`));
  assert.equal(w.timers.length, 1);
  w.child.emit('close', 0);
  const { lines, stopped } = await run;
  assert.deepEqual(lines, [INIT, NOTICE, RESULT]);
  assert.equal(stopped, false);
});

test('the stream and the errors go to the log; a command that cannot start ends the run', async () => {
  const w = world();
  const run = startAgentProcess(w.options);
  w.child.stderr.emit('data', Buffer.from('warning'));
  w.child.stdout.emit('data', Buffer.from(`${INIT}\n`));
  w.child.emit('error', new Error('spawn ENOENT'));
  const { lines, stopped } = await run;
  assert.deepEqual(lines, [INIT]);
  assert.equal(stopped, false);
  assert.deepEqual(w.log, [['stderr', 'warning'], ['stdout', `${INIT}\n`], ['stderr', 'cannot start the agent: spawn ENOENT\n']]);
  assert.deepEqual(w.spawned[0].spawnOptions, { cwd: '/project', env: { A: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
});

test('killTree: taskkill /T on Windows, which takes the whole tree; the process alone elsewhere', () => {
  const calls = [];
  killTree(4242, { platform: 'win32', spawnSync: (...call) => calls.push(call), kill: () => assert.fail('taskkill does it') });
  assert.deepEqual(calls, [['taskkill', ['/PID', '4242', '/T', '/F'], { stdio: 'ignore' }]]);
  const signals = [];
  killTree(4242, { platform: 'linux', spawnSync: () => assert.fail('no taskkill'), kill: (pid, signal) => signals.push([pid, signal]) });
  assert.deepEqual(signals, [[4242, 'SIGKILL']]);
  // A process that is gone already is not an error.
  assert.doesNotThrow(() => killTree(4242, { platform: 'linux', spawnSync: () => {}, kill: () => { throw Object.assign(new Error('no such process'), { code: 'ESRCH' }); } }));
});

// Phiên 33 of shop, QA SHOP-28: a deploy stopped qa, but the apps it had started in its worktree (next dev, vite,
// mvnw spring-boot:run, Playwright) went on and held the files, so the worktree could not go and the next QA stopped
// with "already exists". Before a worktree goes, what still runs from it stops.
const TREE = String.raw`C:\Users\u\AppData\Local\Temp\ao-reviews\shop-SHOP-28-qa`;
const windowsList = [
  { ProcessId: 101, CommandLine: String.raw`"C:\Program Files\nodejs\node.exe" ${TREE}\node_modules\.pnpm\next@16\node_modules\next\dist\bin\next dev -p 3100` },
  { ProcessId: 102, CommandLine: 'java -classpath c:/users/u/appdata/local/temp/ao-reviews/shop-SHOP-28-qa/apps/api/target/classes com.shop.Api' },
  { ProcessId: 103, CommandLine: String.raw`C:\Windows\explorer.exe` },
  { ProcessId: 104, CommandLine: null },
  { ProcessId: 105, CommandLine: String.raw`node ${TREE}-other\x.js` },
  { ProcessId: 7, CommandLine: `node ao-step.mjs ${TREE}` },
];
test('processesUnder lists what runs from a folder, in any case and with either slash, and not this process', () => {
  const calls = [];
  const spawnSync = (command, args) => (calls.push([command, ...args].join(' ')), { status: 0, stdout: JSON.stringify(windowsList) });
  assert.deepEqual(processesUnder(TREE, { platform: 'win32', spawnSync, self: 7 }).map(({ pid }) => pid), [101, 102]);
  assert.match(calls[0], /^powershell -NoProfile -NonInteractive -Command Get-CimInstance Win32_Process/);
  const one = (row) => () => ({ status: 0, stdout: JSON.stringify(row) });
  assert.deepEqual(processesUnder(TREE, { platform: 'win32', spawnSync: one(windowsList[0]), self: 7 }).map(({ pid }) => pid), [101], 'PowerShell prints one process as an object');
  assert.deepEqual(processesUnder(TREE, { platform: 'win32', spawnSync: () => ({ status: 1, stdout: '' }), self: 7 }), [], 'no list, nothing to stop');
  const ps = () => ({ status: 0, stdout: '  201 node /tmp/ao-reviews/shop-SHOP-28-qa/node_modules/vite/bin/vite.js\n  202 bash\n' });
  assert.deepEqual(processesUnder('/tmp/ao-reviews/shop-SHOP-28-qa', { platform: 'linux', spawnSync: ps, self: 7 }).map(({ pid }) => pid), [201]);
});

test('stopProcessesUnder stops the tree of each process that runs from the folder', () => {
  const stopped = [];
  const spawnSync = (command, args) => {
    if (command === 'taskkill') return (stopped.push(args[1]), { status: 0 });
    return { status: 0, stdout: JSON.stringify(windowsList) };
  };
  assert.deepEqual(stopProcessesUnder(TREE, { platform: 'win32', spawnSync, kill: () => {}, self: 7 }), [101, 102]);
  assert.deepEqual(stopped, ['101', '102']);
});

test('processesUnder gives nothing when PowerShell prints something that is not JSON (review of shop PR #78)', () => {
  assert.deepEqual(processesUnder(TREE, { platform: 'win32', spawnSync: () => ({ status: 0, stdout: 'WARNING: something\n' }), self: 7 }), []);
});
