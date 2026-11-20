// C2 spec section 7: reviewer and security run at once when a second agent may start, and one after another when not.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runGo } from '../../lib/workflow/runner.mjs';

const HEAD = 'abc1234def5678';
const runLines = (session, cost) => [
  JSON.stringify({ type: 'system', subtype: 'init', session_id: session, model: 'claude-opus-5-5' }),
  JSON.stringify({ type: 'result', subtype: 'success', is_error: false, num_turns: 3, duration_ms: 60000, total_cost_usd: cost, modelUsage: {}, permission_denials: [], session_id: session, result: 'Report posted.' }),
];

// The reviews still owed by the state: both together, or the one left.
function world() {
  const store = {
    state: null,
    writes: 0,
    readState: () => store.state && structuredClone(store.state),
    writeState: (key, state) => {
      store.state = structuredClone(state);
      store.writes += 1;
    },
    writeLast: () => {},
  };
  const decide = () => {
    const done = new Set((store.state?.runs ?? []).filter(({ outcome }) => outcome === 'done').map(({ role }) => role));
    const owed = ['reviewer', 'security'].filter((role) => !done.has(role));
    if (owed.length === 0) return { go: false, waits: 'you', reason: 'both reports are on the head: gate ③', next: '-', lines: [] };
    const runs = owed.map((role) => ({ role, key: 'DEMO-21', effort: 'high', purpose: 'review', prompt: `Review PR #15 as ${role}.`, checkout: { branch: 'develop', pull: true }, worktree: { name: `pr-15-${role}`, sha: HEAD }, head: HEAD, ...(owed.length === 2 && { together: true }) }));
    return { go: true, runs, lines: [] };
  };
  return { store, decide };
}

function effects({ paired }) {
  const events = [];
  let running = 0;
  let most = 0;
  let second;
  const secondStarted = new Promise((done) => (second = done));
  let started = 0;
  const agent = async (run) => {
    running += 1;
    most = Math.max(most, running);
    started += 1;
    events.push(`start ${run.role}${run.agentLock ? ` on ${run.agentLock}` : ''}`);
    if (started === 2) second();
    // Run at once: the first agent ends only after the second started, or after 2 seconds, when they do not.
    if (paired && started === 1) await Promise.race([secondStarted, new Promise((done) => setTimeout(done, 2000).unref())]);
    await new Promise((done) => setImmediate(done));
    running -= 1;
    events.push(`end ${run.role}`);
    return { lines: runLines(`s-${run.role}`, run.role === 'security' ? 2 : 1) };
  };
  const checkouts = [];
  const trees = [];
  const unpaired = [];
  return {
    events,
    most: () => most,
    checkouts,
    trees,
    unpaired,
    agent,
    git: async (checkout) => (checkouts.push(checkout), { ok: true }),
    worktree: { add: async (spec) => (trees.push(`add ${spec.name}`), { ok: true, path: `C:/Temp/ao-reviews/shop-${spec.name}` }), remove: async (spec) => (trees.push(`remove ${spec.name}`), { ok: true }) },
    pair: async () => (paired ? 'active/DEMO-21+security.json' : null),
    unpair: async (lock) => unpaired.push(lock),
  };
}

const go = (w, e) =>
  runGo({ command: 'review', arg: '15', options: {}, gather: async () => ({ item: { key: 'DEMO-21' }, pr: null }), decide: w.decide, agent: e.agent, git: e.git, worktree: e.worktree, pair: e.pair, unpair: e.unpair, store: w.store, sleep: async () => {}, now: () => 0, dispatch: async () => {} });

test('with a second agent admitted, reviewer and security run at once, each in its own worktree, with one checkout', async () => {
  const w = world();
  const e = effects({ paired: true });
  const { decision, made } = await go(w, e);
  assert.equal(e.most(), 2, 'both agents ran at once');
  assert.deepEqual(e.events.slice(0, 2), ['start reviewer', 'start security on active/DEMO-21+security.json']);
  assert.deepEqual(e.checkouts, [{ branch: 'develop', pull: true }], 'one checkout for the pair');
  assert.deepEqual(e.trees.filter((line) => line.startsWith('add')).sort(), ['add pr-15-reviewer', 'add pr-15-security']);
  assert.deepEqual(e.unpaired, ['active/DEMO-21+security.json'], 'the second lock goes when its run ends');
  // Both runs on record, with their own numbers: neither write lost the other.
  assert.deepEqual(w.store.state.runs.map(({ n, role, outcome, costUsd }) => [n, role, outcome, costUsd]), [[1, 'reviewer', 'done', 1], [2, 'security', 'done', 2]]);
  assert.deepEqual(made.map(({ role }) => role), ['reviewer', 'security']);
  assert.equal(decision.waits, 'you');
});

test('with no second agent, the reviews run one after another, as before', async () => {
  const w = world();
  const e = effects({ paired: false });
  const { decision } = await go(w, e);
  assert.equal(e.most(), 1);
  assert.deepEqual(e.events, ['start reviewer', 'end reviewer', 'start security', 'end security']);
  assert.deepEqual(e.unpaired, []);
  assert.deepEqual(w.store.state.runs.map(({ n, role }) => [n, role]), [[1, 'reviewer'], [2, 'security']]);
  assert.equal(decision.waits, 'you');
});
