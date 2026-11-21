// C2 spec section 9: the heartbeat of a qa run on GitHub, and merge-gate waiting for it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BEAT_MS, QA_CONTEXT, SILENT_MS, STALE_MS, qaHolding, qaSignal, waitForQa } from '../../lib/workflow/qa-signal.mjs';

const SHA = 'c'.repeat(40);
// The first status is set before the run starts: let it go out.
const flush = () => new Promise((done) => setImmediate(done));
const RUN = { role: 'qa', key: 'DEMO-21', purpose: 'qa', qa: { environment: 'development', sha: SHA } };

// A clock, and timers that fire when the test moves the clock.
function clock() {
  let time = 0;
  const timers = new Map();
  let id = 0;
  return {
    now: () => time,
    every: (fn, ms) => {
      id += 1;
      timers.set(id, { fn, ms, next: time + ms });
      return id;
    },
    stop: (handle) => timers.delete(handle),
    async advance(ms) {
      const until = time + ms;
      for (;;) {
        const due = [...timers.entries()].filter(([, t]) => t.next <= until).sort(([, a], [, b]) => a.next - b.next)[0];
        if (!due) break;
        const [, timer] = due;
        time = timer.next;
        timer.next += timer.ms;
        await timer.fn();
      }
      time = until;
    },
  };
}

test('the numbers of the heartbeat: every 2 minutes, stale after 10, silent after 15', () => {
  assert.deepEqual([QA_CONTEXT, BEAT_MS, STALE_MS, SILENT_MS], ['ao/qa', 120000, 600000, 900000]);
});

test('a qa run sets ao/qa pending at its start, again every 2 minutes, and success at its end', async () => {
  const c = clock();
  const posted = [];
  const signal = qaSignal({ post: async (status) => posted.push({ ...status, at: c.now() }), every: c.every, stop: c.stop, now: c.now, log: () => {} });
  let size = 0;
  let finish;
  const running = signal(RUN, () => new Promise((done) => (finish = done)), () => (size += 100));
  await flush();
  await c.advance(5 * 60 * 1000);
  finish({ lines: [] });
  await running;
  assert.deepEqual(posted.map(({ state, at }) => [state, at]), [['pending', 0], ['pending', 120000], ['pending', 240000], ['success', 300000]]);
  assert.equal(posted[0].sha, SHA);
  assert.equal(posted[0].description, 'qa tests DEMO-21 on development');
  assert.match(posted.at(-1).description, /^qa tested DEMO-21: done$/);
});

test('a qa run whose log stays silent 15 minutes counts as stuck: success at once, and no more beats', async () => {
  const c = clock();
  const posted = [];
  const signal = qaSignal({ post: async (status) => posted.push({ ...status, at: c.now() }), every: c.every, stop: c.stop, now: c.now, log: () => {} });
  let finish;
  const running = signal(RUN, () => new Promise((done) => (finish = done)), () => 4096);
  await flush();
  await c.advance(20 * 60 * 1000);
  const stuck = posted.findIndex(({ state }) => state === 'success');
  assert.equal(posted[stuck].at, 16 * 60 * 1000, 'the first beat after 15 silent minutes');
  assert.match(posted[stuck].description, /log stayed silent for 15 minutes/);
  assert.equal(posted.length, stuck + 1, 'nothing after it');
  finish({ lines: [] });
  await running;
  assert.equal(posted.length, stuck + 1, 'no second success at the end');
});

test('a run that is not a qa run on an environment sets nothing; a status that cannot be set does not stop the run', async () => {
  const c = clock();
  const posted = [];
  const signal = qaSignal({ post: async (status) => posted.push(status), every: c.every, stop: c.stop, now: c.now, log: () => {} });
  assert.equal(await signal({ role: 'qa', key: 'DEMO-21', purpose: 'qa' }, async () => 'ran', () => 0), 'ran');
  assert.deepEqual(posted, []);
  const logged = [];
  const failing = qaSignal({ post: async () => Promise.reject(new Error('GitHub returned 403')), every: c.every, stop: c.stop, now: c.now, log: (line) => logged.push(line) });
  assert.equal(await failing(RUN, async () => 'ran', () => 0), 'ran');
  assert.match(logged[0], /the status ao\/qa was not set: GitHub returned 403/);
});

const status = (state, minutesAgo, login = 'owner', now = 60 * 60 * 1000) => ({ context: QA_CONTEXT, state, description: 'qa tests DEMO-21 on development', updated_at: new Date(now - minutesAgo * 60000).toISOString(), creator: { login } });

test('merge-gate holds for the newest ao/qa of your login while it is pending and fresh', () => {
  const now = () => 60 * 60 * 1000;
  const hold = (statuses) => qaHolding(statuses, { approvers: ['owner'], now })?.description ?? null;
  assert.equal(hold([status('pending', 1)]), 'qa tests DEMO-21 on development');
  assert.equal(hold([status('pending', 11)]), null, 'not set again for 10 minutes: its ao-step is gone');
  assert.equal(hold([status('success', 0), status('pending', 1)]), null, 'the newest counts');
  assert.equal(hold([status('pending', 1, 'someone-else')]), null, 'only your login');
  assert.equal(hold([{ ...status('pending', 1), context: 'ci/build' }]), null, 'only ao/qa');
  assert.equal(hold([]), null);
});

test('merge-gate waits, reading again every minute, until the QA ends, its heartbeat stops, or the time is up', async () => {
  let time = 0;
  const reads = [];
  const answers = [[status('pending', 0, 'owner', 0)], [status('pending', 0, 'owner', 60000)], [status('success', 0, 'owner', 120000)]];
  const wait = waitForQa({ readStatuses: async (sha) => (reads.push(sha), answers.shift() ?? []), approvers: ['owner'], now: () => time, sleep: async (ms) => (time += ms), log: () => {} });
  assert.equal(await wait(SHA), null, 'free once the QA ended');
  assert.deepEqual(reads, [SHA, SHA, SHA]);
  assert.equal(time, 120000);
  // Pending and set again for ever: it gives up after maxMs, and the PR waits for the next run.
  time = 0;
  const forever = waitForQa({ readStatuses: async () => [status('pending', 0, 'owner', time)], approvers: ['owner'], now: () => time, sleep: async (ms) => (time += ms), maxMs: 5 * 60000, log: () => {} });
  assert.equal(await forever(SHA), 'qa tests DEMO-21 on development, still after 5 minutes');
});

// Review of shop PR #80 (reviewer, Low): a beat still on its way when the run ended reached GitHub after success, and
// left ao/qa pending: merge-gate waited for a QA that had ended. Every status now goes out after the one before it.
test('a beat on its way when the run ends reaches GitHub before success, never after it', async () => {
  const c = clock();
  const arrived = [];
  const later = [];
  // A pending answers late, a success at once: without an order, success arrives first.
  const post = (status) => new Promise((done) => {
    const land = () => (arrived.push(status.state), done());
    if (status.state === 'pending') later.push(land);
    else land();
  });
  const signal = qaSignal({ post, every: c.every, stop: c.stop, now: c.now, log: () => {} });
  let finish;
  const running = signal(RUN, () => new Promise((done) => (finish = done)), () => 0);
  await flush();
  later.shift()();
  await flush();
  // The beat fires, and its status is on its way when the run ends.
  const beat = c.advance(BEAT_MS);
  await flush();
  finish({ lines: [] });
  await flush();
  await flush();
  assert.deepEqual(arrived, ['pending'], 'success waits for the beat on its way');
  later.shift()();
  await beat;
  await running;
  assert.deepEqual(arrived, ['pending', 'pending', 'success']);
});

// Review of shop PR #80 (reviewer, Low): each PR on the same base waited up to 100 minutes again, past the 120 minutes of
// the job. One run of merge-gate now waits 100 minutes at most in all.
test('one run of merge-gate waits for QA 100 minutes at most in all, not for each PR', async () => {
  let time = 0;
  const wait = waitForQa({ readStatuses: async () => [status('pending', 0, 'owner', time)], approvers: ['owner'], now: () => time, sleep: async (ms) => (time += ms), maxMs: 5 * 60000, log: () => {} });
  assert.equal(await wait(SHA), 'qa tests DEMO-21 on development, still after 5 minutes');
  const first = time;
  assert.equal(await wait(SHA), 'qa tests DEMO-21 on development, still after 5 minutes');
  assert.equal(time, first, 'the second PR gives up at once');
  let free = false;
  const ended = waitForQa({ readStatuses: async () => (free ? [] : [status('pending', 0, 'owner', time)]), approvers: ['owner'], now: () => time, sleep: async (ms) => (time += ms), maxMs: 5 * 60000, log: () => {} });
  time = 0;
  assert.notEqual(await ended(SHA), null);
  free = true;
  assert.equal(await ended(SHA), null, 'a QA that ended frees the next PR, past the time too');
});
