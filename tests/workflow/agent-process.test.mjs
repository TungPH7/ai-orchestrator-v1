import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { isResult, killTree, startAgentProcess } from '../../lib/workflow/agent-process.mjs';

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
