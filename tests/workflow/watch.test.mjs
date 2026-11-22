// ao-step watch (Phiên 35 · Lượt 39–41): a watcher of the kit with no model, which tells only what is new and wrong.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, existsSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WATCH, boardDue, eventToTell, look, nextWatchState, nowLines, readWatchState, watchEffects } from '../../lib/workflow/watch.mjs';
import { ROOT } from '../helpers/kit.mjs';

const NOW = Date.parse('2026-11-22T15:00:00Z');
const MIN = 60_000;
const lock = (over = {}) => ({ name: 'DEMO-12', command: 'build', key: 'DEMO-12', role: 'fe-dev', pid: 11, startedAt: new Date(NOW - 30 * MIN).toISOString(), agent: true, changedAt: NOW - 30 * MIN, alive: true, ...over });

test('a command whose agent writes its log is well, and so is one waiting a while with no agent', () => {
  const r = look({ now: NOW, locks: [lock()], logAt: () => NOW - 2 * MIN });
  assert.deepEqual(r, { tell: [], marks: [], running: true });
  assert.deepEqual(look({ now: NOW, locks: [lock({ agent: false })], logAt: () => NOW - 40 * MIN }).tell, [], 'no agent: 60 minutes before it says so');
});

test('an agent silent for 20 minutes is told once, and again only after a new log and a new silence', () => {
  const first = look({ now: NOW, locks: [lock()], logAt: () => NOW - 25 * MIN });
  assert.deepEqual(first.tell, ['/ao-build DEMO-12 (fe-dev): its fe-dev agent has written no log for 25 min. It may be stuck, or in a long test run: read the newest .ai/runs/DEMO-12/*.jsonl']);
  const told = new Set(first.marks);
  assert.deepEqual(look({ now: NOW + 2 * MIN, locks: [lock()], logAt: () => NOW - 25 * MIN }, told).tell, [], 'the same silence is told once');
  assert.equal(look({ now: NOW + 30 * MIN, locks: [lock()], logAt: () => NOW + 5 * MIN }, told).tell.length, 1, 'a new silence after a new log');
  // The log of the role on the lock counts, so a busy reviewer does not hide a stuck security.
  const asked = [];
  look({ now: NOW, locks: [lock({ name: 'DEMO-12+security', command: 'review', role: 'security' })], logAt: (key, role) => (asked.push([key, role]), NOW) });
  assert.deepEqual(asked, [['DEMO-12', 'security']]);
});

test('a command with no agent for an hour is told, with what it may wait for', () => {
  const r = look({ now: NOW, locks: [lock({ agent: false, startedAt: new Date(NOW - 70 * MIN).toISOString(), changedAt: NOW - 65 * MIN })], logAt: () => null });
  assert.deepEqual(r.tell, ['/ao-build DEMO-12 (fe-dev): no agent and no log for 65 min. It may wait for RAM, its role or CI, or be stuck: /ao-status DEMO-12']);
});

test('a lock whose process is gone is told once; a preview is never quiet', () => {
  const gone = look({ now: NOW, locks: [lock({ alive: false, pid: 4242 })] });
  assert.deepEqual(gone.tell, ['/ao-build DEMO-12 (fe-dev): its process 4242 is gone and its lock is still there, so it ended without cleaning up: /ao-status DEMO-12']);
  assert.equal(gone.running, false);
  assert.deepEqual(look({ now: NOW, locks: [lock({ alive: false, pid: 4242 })] }, new Set(gone.marks)).tell, []);
  const preview = lock({ name: 'DEMO-12+preview', command: 'preview', role: undefined, agent: false, startedAt: new Date(NOW - 300 * MIN).toISOString(), changedAt: 0 });
  assert.deepEqual(look({ now: NOW, locks: [preview] }).tell, []);
  assert.deepEqual(look({ now: NOW, locks: [{ ...preview, alive: false, pid: 7 }] }).tell, ['the preview of DEMO-12: its process 7 is gone and its lock is still there, so it ended without cleaning up: /ao-status DEMO-12']);
});

test('the event log of /ao-run: what waits for the human, needs a fix or stops is told, a waiting line once', () => {
  assert.deepEqual(eventToTell('12:03 waiting for you: DEMO-12: /ao-preview DEMO-12 or /ao-review 40'), { text: 'waiting for you: DEMO-12: /ao-preview DEMO-12 or /ao-review 40', mark: 'said:waiting for you: DEMO-12: /ao-preview DEMO-12 or /ao-review 40' });
  assert.equal(eventToTell('12:03 start /ao-build DEMO-12'), null);
  assert.equal(eventToTell('12:40 end /ao-build DEMO-12: done'), null);
  assert.equal(eventToTell('12:00 /ao-run DEMO-10: 3 at once, budget 30 USD, ends after 8 hours with nothing to start'), null);
  const events = ['12:03 waiting for you: DEMO-12: /ao-review 40', '12:04 needs a fix: DEMO-13: Docker is not running', '12:40 end /ao-qa DEMO-14: STOP an agent hit the usage limit', '12:41 end /ao-fix 41: it stopped with no decision', '13:00 /ao-run DEMO-10 ends: an agent hit the usage limit: run /ao-run again after it resets. Spent 12.00 USD'];
  const first = look({ now: NOW, events });
  assert.deepEqual(first.tell, events.map((line) => line.slice(6)));
  assert.deepEqual(look({ now: NOW, events: [events[0]] }, new Set(first.marks)).tell, [], 'the list logged again');
});

test('a dispatcher gone without its end, an item flagged, and a board that cannot be read are told once', () => {
  const dispatcher = { pid: 99, scope: 'DEMO-10', alive: false };
  assert.deepEqual(look({ now: NOW, dispatcher }).tell, ['/ao-run DEMO-10: its process 99 is gone, but it did not end: its commands may still run, with nobody to start the next ones']);
  assert.equal(look({ now: NOW, dispatcher: { ...dispatcher, alive: true } }).running, true);
  const flagged = look({ now: NOW, flagged: [{ key: 'DEMO-14', flag: 'rework' }] });
  assert.deepEqual(flagged.tell, ['DEMO-14 is flagged Needs you (rework): read its newest flag comment, /ao-status DEMO-14']);
  assert.deepEqual(look({ now: NOW, flagged: [{ key: 'DEMO-14', flag: 'rework' }] }, new Set(flagged.marks)).tell, []);
  assert.deepEqual(look({ now: NOW, boardFailed: { count: 2, reason: 'x', since: 1 } }).tell, []);
  assert.deepEqual(look({ now: NOW, boardFailed: { count: WATCH.boardFailures, reason: 'GitHub 502', since: 1 } }).tell, ['the board could not be read 3 times in a row: GitHub 502']);
  assert.deepEqual(look({ now: NOW, boardFailed: { count: 1, reason: 'GitHub 502', since: 1 } }, new Set(), { boardFailures: 1 }).tell, ['the board could not be read: GitHub 502'], '--once reads it once');
});

// SHOP-85 of shop: an agent flags its item as its command ends, and two flags taken off within minutes were never
// read, since the board was read every 10 minutes. The board is read again as soon as a command ends.
test('the board is read every 10 minutes, and as soon as a command ends', () => {
  const at = { now: NOW, lastBoard: NOW - 3 * MIN };
  assert.equal(boardDue({ ...at, before: ['DEMO-12'], after: ['DEMO-12'] }), false);
  assert.equal(boardDue({ ...at, before: ['DEMO-12', 'DEMO-13'], after: ['DEMO-13'] }), true, 'DEMO-12 ended');
  assert.equal(boardDue({ ...at, before: [], after: ['DEMO-12'] }), false, 'a command that starts');
  assert.equal(boardDue({ now: NOW, lastBoard: NOW - 10 * MIN, before: [], after: [] }), true);
  assert.equal(boardDue({ now: NOW, lastBoard: 0, before: [], after: [] }), true, 'the first look');
});

test('what runs now, for --once', () => {
  assert.deepEqual(nowLines({ now: NOW, locks: [], dispatcher: null }), ['nothing of the kit runs']);
  assert.deepEqual(nowLines({ now: NOW, locks: [lock()], logAt: () => NOW - 3 * MIN, dispatcher: { pid: 5, scope: 'DEMO-10', alive: true } }), ['/ao-build DEMO-12 (fe-dev), 30 min, agent running, last log 3 min ago', '/ao-run DEMO-10: runs (process 5)']);
  assert.deepEqual(nowLines({ now: NOW, locks: [lock({ agent: false })], logAt: () => NOW - 40 * MIN }), ['/ao-build DEMO-12 (fe-dev), 30 min, no agent now, no log yet'], 'a log from before the command is not its own');
});

test('the state starts at the end of each event log and keeps the newest marks', () => {
  assert.deepEqual(readWatchState('', { '2026-11-22.log': 7 }), { told: [], offsets: { '2026-11-22.log': 7 } });
  assert.deepEqual(readWatchState('{"told":["a"],"offsets":{"x.log":2}}', {}), { told: ['a'], offsets: { 'x.log': 2 } });
  assert.deepEqual(nextWatchState({ told: ['a', 'b'], offsets: {} }, { marks: ['c'], offsets: { 'x.log': 3 } }, 2), { told: ['b', 'c'], offsets: { 'x.log': 3 } });
});

// The human sees no log of a command the main session runs in the background, so every skill that runs agents so
// starts the watcher next to it (Phiên 35 · Lượt 41), and /ao-run uses it in place of reading each line of its log.
test('every skill that runs agents in the background starts ao-step watch', () => {
  const skills = join(ROOT, 'kit', '.claude', 'skills');
  for (const name of ['ao-spec', 'ao-plan', 'ao-request', 'ao-build', 'ao-fix', 'ao-review', 'ao-qa', 'ao-release', 'ao-ship', 'ao-run']) {
    const text = readFileSync(join(skills, name, 'SKILL.md'), 'utf8');
    assert.match(text, /`node \.ai-orchestrator\/scripts\/ao-step\.mjs watch` with the Bash tool in the background/, name);
  }
  assert.doesNotMatch(readFileSync(join(skills, 'ao-run', 'SKILL.md'), 'utf8'), /Monitor tool/);
});

test('the files: locks as they are, logs by role, new lines of the event log', (t) => {
  const project = mkdtempSync(join(tmpdir(), 'ao-watch-'));
  t.after(() => rmSync(project, { recursive: true, force: true }));
  const runs = join(project, '.ai', 'runs');
  mkdirSync(join(runs, 'active'), { recursive: true });
  mkdirSync(join(runs, '_run'), { recursive: true });
  mkdirSync(join(runs, 'DEMO-12'), { recursive: true });
  writeFileSync(join(runs, 'active', 'DEMO-12.json'), JSON.stringify({ pid: 11, command: 'build', key: 'DEMO-12', role: 'be-dev', startedAt: '2026-11-22T14:00:00Z', agent: true }));
  writeFileSync(join(runs, 'active', 'broken.json'), '{');
  writeFileSync(join(runs, 'DEMO-12', '1-be-dev.jsonl'), '{}\n');
  writeFileSync(join(runs, 'DEMO-12', '2-fe-dev.jsonl'), '{}\n');
  utimesSync(join(runs, 'DEMO-12', '1-be-dev.jsonl'), NOW / 1000 - 600, NOW / 1000 - 600);
  utimesSync(join(runs, 'DEMO-12', '2-fe-dev.jsonl'), NOW / 1000, NOW / 1000);
  writeFileSync(join(runs, 'dispatcher.json'), JSON.stringify({ pid: 99, scope: 'DEMO-10' }));
  writeFileSync(join(runs, '_run', '2026-11-22.log'), '12:00 start /ao-build DEMO-12\n');
  const effects = watchEffects({ projectDir: project, fs: { existsSync, readdirSync, readFileSync, statSync }, alive: (pid) => pid === 11 });
  const [found] = effects.locks();
  assert.equal(effects.locks().length, 1, 'an unreadable lock is left out');
  assert.equal(found.name, 'DEMO-12');
  assert.equal(found.alive, true);
  assert.ok(found.changedAt > 0);
  assert.equal(effects.logAt('DEMO-12', 'be-dev'), NOW - 600_000);
  assert.equal(effects.logAt('DEMO-12', null), NOW);
  assert.equal(effects.logAt('DEMO-99', null), null);
  assert.deepEqual(effects.dispatcher(), { pid: 99, scope: 'DEMO-10', alive: false });
  assert.deepEqual(effects.logLines(), { '2026-11-22.log': 1 });
  writeFileSync(join(runs, '_run', '2026-11-22.log'), '12:00 start /ao-build DEMO-12\n12:05 waiting for you: DEMO-12: x\n');
  assert.deepEqual(effects.newEvents({ '2026-11-22.log': 1 }), { events: ['12:05 waiting for you: DEMO-12: x'], offsets: { '2026-11-22.log': 2 } });
  assert.equal(existsSync(join(runs, 'active', 'DEMO-12.json')), true, 'the watcher removes no lock');
});
