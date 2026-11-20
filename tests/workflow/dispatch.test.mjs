// The dispatcher /ao-run (C2 spec section 5): which commands start in a round, what waits, and the loop around it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_STARTS, planRound, runDispatcher, scopeOf } from '../../lib/workflow/dispatch.mjs';

const epic = (state, more = {}) => ({ key: 'DEMO-20', type: 'Epic', workType: 'epic', state, flagged: false, requests: [], parent: null, ...more });
const story = (key, state, more = {}) => ({ key, type: 'Story', workType: 'story', state, flagged: false, requests: [], parent: 'DEMO-20', ...more });
const GO = (role, more = {}) => ({ go: true, runs: [{ role, ...more }], lines: [] });
const STOP = (waits, reason, extra = {}) => ({ go: false, waits, reason, next: `next of ${reason}`, lines: [], ...extra });
// decide(command, arg) from a table "command arg" → decision; anything else is a STOP fix, as a wrong command is.
const decider = (table) => async (command, arg) => table[`${command} ${arg}`] ?? STOP('fix', `no ${command} ${arg}`);
const round = (more) => planRound({ scope: { epic: 'DEMO-20' }, pulls: [], live: [], cap: 3, ...more });

test('the scope of an Epic is the Epic and its Stories, Tasks and Bugs; a list of keys is those items', () => {
  const items = [epic('in-progress'), story('DEMO-21', 'ready'), { ...story('DEMO-22', 'to-do'), workType: 'sub-task', parent: 'DEMO-21' }, story('DEMO-30', 'ready', { parent: null })];
  assert.deepEqual(scopeOf(items, { epic: 'DEMO-20' }).map(({ key }) => key), ['DEMO-20', 'DEMO-21']);
  assert.deepEqual(scopeOf(items, { keys: ['DEMO-30'] }).map(({ key }) => key), ['DEMO-30']);
});

test('a round starts what is done first: QA, then review, then build, each kind in the order of the board', async () => {
  const items = [epic('in-progress'), story('DEMO-21', 'ready'), story('DEMO-22', 'ready-for-qa'), story('DEMO-23', 'in-review'), story('DEMO-24', 'ready')];
  const pulls = [{ key: 'DEMO-23', number: 15, draft: false }];
  const decide = decider({ 'build DEMO-21': GO('be-dev'), 'qa DEMO-22': GO('qa', { qa: { environment: 'development' } }), 'review 15': GO('reviewer'), 'build DEMO-24': GO('fe-dev') });
  const { start } = await round({ items, pulls, decide, cap: 3 });
  assert.deepEqual(start.map(({ command, arg }) => `${command} ${arg}`), ['qa DEMO-22', 'review 15', 'build DEMO-21']);
});

test('the cap, one dev agent of a role, one QA on an environment and an item that runs hold a command back', async () => {
  const items = [epic('in-progress'), story('DEMO-21', 'ready'), story('DEMO-24', 'ready'), story('DEMO-25', 'ready-for-qa'), story('DEMO-26', 'ready-for-qa'), story('DEMO-27', 'ready')];
  const decide = decider({ 'build DEMO-21': GO('be-dev'), 'build DEMO-24': GO('be-dev'), 'qa DEMO-25': GO('qa', { qa: { environment: 'development' } }), 'qa DEMO-26': GO('qa', { qa: { environment: 'development' } }), 'build DEMO-27': GO('fe-dev') });
  const live = [{ name: 'DEMO-27', command: 'build', key: 'DEMO-27', role: 'fe-dev', slot: 0, pid: 1 }];
  const { start, waiting } = await round({ items, decide, live, cap: 4 });
  assert.deepEqual(start.map(({ command, arg }) => `${command} ${arg}`), ['qa DEMO-25', 'build DEMO-21']);
  assert.deepEqual(waiting.filter(({ waits }) => waits === 'item').map(({ key }) => key), ['DEMO-24', 'DEMO-26']);
  const full = await round({ items, decide, live, cap: 2 });
  assert.deepEqual(full.start.map(({ arg }) => arg), ['DEMO-25']);
  // Two agents of be-dev (runs.agents_per_role, C2 spec section 6): both be-dev builds start.
  const two = await round({ items, decide, live, cap: 4, agentsPerRole: { 'be-dev': 2 } });
  assert.deepEqual(two.start.map(({ command, arg }) => `${command} ${arg}`), ['qa DEMO-25', 'build DEMO-21', 'build DEMO-24']);
});

test('a command that runs alone waits until nothing runs, and nothing new starts while it waits', async () => {
  const items = [epic('specifying'), story('DEMO-21', 'ready', { parent: 'DEMO-20' })];
  const decide = decider({ 'spec DEMO-20': GO('ba'), 'build DEMO-21': GO('be-dev') });
  const busy = await round({ items, decide, live: [{ name: 'DEMO-30', command: 'build', key: 'DEMO-30', role: 'fe-dev', slot: 0, pid: 1 }] });
  assert.deepEqual(busy.start, []);
  const free = await round({ items, decide });
  assert.deepEqual(free.start.map(({ command, arg }) => `${command} ${arg}`), ['spec DEMO-20']);
  // A command that runs alone holds the project: nothing starts next to it.
  const alone = await round({ items: [story('DEMO-21', 'ready')], decide, live: [{ name: '_project', command: 'plan', key: 'DEMO-20', pid: 1 }] });
  assert.deepEqual(alone.start, []);
});

test('a stop that waits for next is asked again as its then command; one that waits for you is listed', async () => {
  const items = [epic('in-progress'), story('DEMO-21', 'in-review'), story('DEMO-22', 'in-review'), story('DEMO-23', 'in-progress')];
  const pulls = [{ key: 'DEMO-21', number: 15, draft: false }, { key: 'DEMO-22', number: 16, draft: false }, { key: 'DEMO-23', number: 17, draft: true }];
  const decide = decider({
    'review 15': STOP('next', 'the reports ask for changes', { then: { command: 'fix', arg: 15 } }),
    'fix 15': GO('be-dev'),
    'review 16': STOP('you', 'it waits for you at gate ③'),
  });
  const { start, waiting } = await round({ items, pulls, decide });
  assert.deepEqual(start.map(({ command, arg, key }) => `${command} ${arg} ${key}`), ['fix 15 DEMO-21']);
  assert.deepEqual(waiting.filter(({ waits }) => waits === 'you').map(({ key, text }) => `${key}: ${text}`), ['DEMO-22: next of it waits for you at gate ③', 'DEMO-23: /ao-preview DEMO-23 or /ao-review 17']);
});

test('an open request to an adviser on an item runs /ao-request, which runs alone; on an Epic in spec, /ao-spec takes it', async () => {
  const request = [{ from: 'be-dev', to: 'sa', text: 'hợp đồng API', at: 1 }];
  const decide = decider({ 'request DEMO-21': GO('sa'), 'spec DEMO-20': GO('ba') });
  const { start } = await round({ items: [epic('in-progress'), story('DEMO-21', 'in-progress', { requests: request })], decide: decider({ 'request DEMO-21': GO('sa'), 'build DEMO-21': STOP('item', 'waits for the answer') }) });
  assert.deepEqual(start.map(({ command, arg }) => `${command} ${arg}`), ['request DEMO-21']);
  const spec = await round({ items: [epic('specifying', { requests: request })], decide });
  assert.deepEqual(spec.start.map(({ command }) => command), ['spec']);
});

test('a command that failed in this run, or started MAX_STARTS times, is not started again', async () => {
  const items = [epic('in-progress'), story('DEMO-21', 'ready'), story('DEMO-22', 'ready')];
  const decide = decider({ 'build DEMO-21': GO('be-dev'), 'build DEMO-22': GO('fe-dev') });
  const starts = new Map([['build DEMO-22', MAX_STARTS]]);
  const { start, waiting } = await round({ items, decide, failed: new Set(['build DEMO-21']), starts });
  assert.deepEqual(start, []);
  assert.deepEqual(waiting.map(({ key, waits }) => `${key} ${waits}`), ['DEMO-21 fix', 'DEMO-22 fix']);
});

test('the scope is done when every item is Done or Cancelled, or the Epic waits only for Complete', async () => {
  const decide = decider({});
  assert.equal((await round({ items: [], decide })).done, true);
  assert.equal((await round({ items: [epic('in-progress', { children: [{ state: 'done' }, { state: 'cancelled' }] })], decide })).done, true);
  assert.equal((await round({ items: [epic('in-progress'), story('DEMO-21', 'in-qa')], decide })).done, false);
  assert.equal((await planRound({ scope: { keys: ['DEMO-30'] }, items: [], pulls: [], live: [], cap: 1, decide })).done, true);
});

// The loop, with a board that moves as the commands run, and a clock that moves only when the loop sleeps.
function world(board, effects) {
  let clock = 0;
  const log = [];
  const started = [];
  return {
    log,
    started,
    now: () => clock,
    sleep: async (ms) => {
      clock += ms;
    },
    readBoard: async () => structuredClone(board),
    start: ({ command, arg }) => {
      started.push(`${command} ${arg}`);
      // An effect that returns null is a command that crashed.
      const id = `${command} ${arg}`;
      const result = id in effects ? effects[id](board) : { go: false, waits: 'you', reason: 'done' };
      return Promise.resolve(result);
    },
    logLine: (line) => log.push(line),
  };
}

const boardDecider = (board) => async (command, arg) => {
  const item = board.items.find(({ key }) => key === arg) ?? board.items.find(({ key }) => board.pulls.some((pull) => pull.number === arg && pull.key === key));
  if (!item) return STOP('fix', 'gone');
  if (command === 'review') return STOP('you', 'it waits for you at gate ③');
  return GO({ spec: 'ba', plan: 'sa', build: 'be-dev', qa: 'qa' }[command]);
};

test('the loop runs an Epic from spec to the stops that wait for you, then stops after idle_hours', async () => {
  const board = { items: [epic('specifying')], pulls: [] };
  const w = world(board, {
    'spec DEMO-20': (b) => {
      b.items[0].state = 'planning';
      return STOP('you', 'gate ①');
    },
    'plan DEMO-20': (b) => {
      b.items = [epic('in-progress'), story('DEMO-21', 'ready'), story('DEMO-22', 'ready')];
      return STOP('you', 'gate ②');
    },
    'build DEMO-21': (b) => {
      b.items[1].state = 'in-review';
      b.pulls.push({ key: 'DEMO-21', number: 15, draft: false });
      return STOP('next', 'PR open', { then: { command: 'review', arg: 15 } });
    },
    'build DEMO-22': (b) => {
      b.items[2].state = 'in-qa';
      return STOP('you', 'Accept');
    },
  });
  const end = await runDispatcher({ scope: { epic: 'DEMO-20' }, cap: 1, budgetUsd: 30, idleMs: 60 * 60000, pollMs: 120000, readBoard: w.readBoard, readLocks: () => [], decide: boardDecider(board), start: w.start, spent: () => 0, stopAsked: () => false, now: w.now, sleep: w.sleep, log: w.logLine });
  assert.deepEqual(w.started, ['spec DEMO-20', 'plan DEMO-20', 'build DEMO-21', 'build DEMO-22']);
  assert.equal(end.reason, 'idle');
  assert.ok(w.log.some((line) => /waiting for you: DEMO-21/.test(line)), w.log.join('\n'));
  assert.ok(w.now() >= 60 * 60000, 'it waited idle_hours before it stopped');
});

test('the budget, the usage limit and --stop start nothing new; a command that crashed is not started again', async () => {
  const ready = () => ({ items: [epic('in-progress'), story('DEMO-21', 'ready'), story('DEMO-22', 'ready')], pulls: [] });
  const base = (board, w, more) => ({ scope: { epic: 'DEMO-20' }, cap: 1, budgetUsd: 30, idleMs: 0, pollMs: 1000, readBoard: w.readBoard, readLocks: () => [], decide: boardDecider(board), start: w.start, spent: () => 0, stopAsked: () => false, now: w.now, sleep: w.sleep, log: w.logLine, ...more });

  const poor = ready();
  const w1 = world(poor, {});
  assert.equal((await runDispatcher(base(poor, w1, { spent: () => 30 }))).reason, 'budget');
  assert.deepEqual(w1.started, []);

  const tired = ready();
  const w2 = world(tired, { 'build DEMO-21': () => STOP('usage', 'be-dev hit the usage limit') });
  assert.equal((await runDispatcher(base(tired, w2))).reason, 'usage');
  assert.deepEqual(w2.started, ['build DEMO-21']);

  const asked = ready();
  const w3 = world(asked, {});
  assert.equal((await runDispatcher(base(asked, w3, { stopAsked: () => true }))).reason, 'stop');
  assert.deepEqual(w3.started, []);

  const broken = { items: [epic('in-progress'), story('DEMO-21', 'ready')], pulls: [] };
  const w4 = world(broken, { 'build DEMO-21': () => null });
  const end = await runDispatcher(base(broken, w4));
  assert.deepEqual(w4.started, ['build DEMO-21']);
  assert.equal(end.reason, 'idle');
  // What holds it is in the log, for the main session to act on.
  assert.ok(w4.log.includes('needs a fix: DEMO-21: build DEMO-21 failed in this run: /ao-status DEMO-21'), w4.log.join('\n'));
});
