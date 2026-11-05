import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { readRoster } from '../../lib/agents/roster.mjs';
import { readContract } from '../../lib/contract.mjs';
import { readGates } from '../../lib/quality/gates.mjs';
import { answersPrompt, packNote, qaWorktreeNote, resumePrompt, worktreeNote } from '../../lib/workflow/prompts.mjs';
import { agentCommand, formatDecision, lastReport, runGo } from '../../lib/workflow/runner.mjs';
import { decideStep } from '../../lib/workflow/steps.mjs';
import { CONTRACT_DIR, ROOT } from '../helpers/kit.mjs';
import { checkArgument, checkoutStop, homeBranch, reviewTreePath, runsFile, takeLock } from '../../scripts/ao-step.mjs';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const contract = readContract(CONTRACT_DIR);
const roster = readRoster(join(ROOT, 'agents'));
const gates = readGates(join(ROOT, 'quality'));
const options = { roster, contract, gates };
const BRANCH = 'feature/DEMO-20-spec';
const SPEC = '# Spec\n\nMàn hình ở design.md.\n\n## Open Questions\n\nKhông có.\n';
const NFR = SPEC.replace('## Open Questions', '### Non-functional requirements\n\n- nhanh\n\n## Open Questions');
const ASKING = SPEC.replace('Không có.', '- Q1: có cần nút xóa tất cả không?');
const DESIGN = '# Design\n\n## Open Questions\n\nKhông có.\n';

// The stream-json lines of one run: its init and result events.
const runLines = ({ session = 's1', outcome = 'success', cost = 0.5, turns = 5, text = 'Done.' } = {}) => {
  const result = {
    success: { subtype: 'success', is_error: false },
    error: { subtype: 'error_during_execution', is_error: true },
    limit: { subtype: 'success', is_error: true, api_error_status: 429 },
  }[outcome];
  return [
    JSON.stringify({ type: 'system', subtype: 'init', session_id: session, model: 'claude-opus-5-5' }),
    ...(outcome === 'cut' ? [] : [JSON.stringify({ type: 'result', ...result, num_turns: turns, duration_ms: 60000, total_cost_usd: cost, modelUsage: { 'claude-opus-5-5': { inputTokens: 1, outputTokens: 100, cacheReadInputTokens: 0, cacheCreationInputTokens: 0 } }, permission_denials: [], session_id: session, result: outcome === 'limit' ? "You've hit your 5-hour limit · resets 1:40am" : text })]),
  ];
};

// An Epic in Specifying whose artifacts appear as the fake agents "write" them: `world` is changed by each run.
function specWorld(start = {}) {
  const world = { spec: null, design: null, nfr: false, pr: null, flagged: false, ciPendingFor: 0, run: null, ...start };
  const facts = () => ({
    command: 'spec',
    space: 'DEMO',
    item: { key: 'DEMO-20', type: 'Epic', workType: 'epic', state: 'specifying', status: 'Specifying', summary: 'Xóa sản phẩm', labels: [], flagged: world.flagged, flag: world.flagged ? 'other' : null, children: [], requests: [], subtasks: [] },
    docs: { branch: BRANCH, exists: Boolean(world.spec), pr: world.pr && { ...world.pr, ci: { pending: world.ciPendingFor > 0, green: world.ciPendingFor === 0, failed: false, started: world.ciStarted ?? true } }, spec: world.spec, design: world.design, plan: null },
    pr: null,
    wip: { epicShaping: { used: 1, limit: 1 }, devAgent: {} },
    ledger: false,
    run: world.run,
  });
  return { world, gather: async () => {
    if (world.ciPendingFor > 0) world.ciPendingFor -= 1;
    return facts();
  } };
}

// A harness: fake agents that do what `effects` says per purpose, a store in memory, git and time that do nothing.
function harness(world, effects, { outcomes = [], texts = [], throws = false, stopped = false } = {}) {
  const calls = [];
  const states = [];
  const last = {};
  let active = 0;
  let clock = 0;
  const store = {
    readState: () => world.run,
    writeState: (key, state) => {
      world.run = structuredClone(state);
      states.push(structuredClone(state));
    },
    writeLast: (key, text) => (last[key] = text),
  };
  const agent = async (run, { log }) => {
    active += 1;
    assert.equal(active, 1, 'two agents never run at once');
    calls.push({ role: run.role, purpose: run.purpose, resume: run.resume, prompt: run.prompt, log });
    if (throws) throw new Error('claude could not start');
    await new Promise((done) => setImmediate(done));
    const outcome = outcomes.shift() ?? 'success';
    if (outcome === 'success') effects[run.purpose]?.(world, run);
    active -= 1;
    return { stopped, lines: runLines({ session: `s-${run.role}-${calls.length}`, outcome, cost: 0.25 * calls.length, text: texts.shift() ?? 'Done.' }) };
  };
  const checkouts = [];
  return {
    calls,
    states,
    last,
    checkouts,
    run: (more = {}) =>
      runGo({ command: 'spec', arg: 'DEMO-20', options: { ...options, ...more.options }, gather: more.gather, decide: more.decide, pack: more.pack, worktree: more.worktree, after: more.after, log: more.log, agent, git: async (c) => (checkouts.push(c), { ok: true }), dispatch: async () => {}, store, sleep: async (ms) => (clock += ms), now: () => clock, limits: { maxRuns: 8, ciWaitMs: 120000, syncWaitMs: 60000, pollMs: 30000, ...more.limits } }),
  };
}
const SPEC_EFFECTS = {
  'spec-write': (w) => (w.spec = SPEC),
  design: (w) => (w.design = DESIGN),
  'spec-nfr': (w) => (w.spec = NFR),
  'docs-pr': (w) => {
    w.pr = { number: 14, state: 'open', merged: false };
    w.ciPendingFor = 2;
  },
};

test('--go makes the runs one after another, deciding again after each, until the docs PR is open with CI done', async () => {
  const { world, gather } = specWorld();
  const h = harness(world, SPEC_EFFECTS);
  const { decision, made } = await h.run({ gather });
  assert.deepEqual(h.calls.map(({ role, purpose }) => `${role} ${purpose}`), ['ba spec-write', 'ux design', 'sa spec-nfr', 'ba docs-pr']);
  assert.deepEqual(made.map(({ n, log }) => `${n} ${log}`), ['1 1-ba.jsonl', '2 2-ux.jsonl', '3 3-sa.jsonl', '4 4-ba.jsonl']);
  assert.equal(decision.go, false);
  assert.match(decision.reason, /docs PR #14 of DEMO-20 is open: stage spec is done/);
  assert.deepEqual(h.checkouts, Array(4).fill({ branch: BRANCH, from: 'develop' }));
});

test('state.json is written after every run, before the next one starts', async () => {
  const { world, gather } = specWorld();
  const h = harness(world, SPEC_EFFECTS);
  await h.run({ gather });
  assert.deepEqual(h.states.map(({ runs }) => runs.length), [1, 2, 3, 4]);
  const first = h.states[0].runs[0];
  assert.deepEqual(
    { n: first.n, command: first.command, role: first.role, key: first.key, purpose: first.purpose, effort: first.effort, session: first.session, outcome: first.outcome, turns: first.turns, costUsd: first.costUsd, log: first.log },
    { n: 1, command: 'spec', role: 'ba', key: 'DEMO-20', purpose: 'spec-write', effort: roster.roles.ba.effort, session: 's-ba-1', outcome: 'done', turns: 5, costUsd: 0.25, log: '1-ba.jsonl' },
  );
  assert.deepEqual(first.checkout, { branch: BRANCH, from: 'develop' });
});

test('a fix run keeps in state.json the head it started from and which note it was for', async () => {
  const { world, gather } = specWorld();
  const h = harness(world, {});
  let decided = 0;
  const fix = { role: 'fe-dev', key: 'DEMO-20', effort: 'high', purpose: 'fix', prompt: 'Fix PR #15.', head: 'd1d2d3d', note: '0123456789ab' };
  const decide = () => (decided++ === 0 ? { go: true, runs: [fix], lines: [] } : { go: false, reason: 'nothing left', next: '/ao-status DEMO-20', lines: [] });
  await h.run({ gather, decide });
  const [run] = h.states[0].runs;
  assert.deepEqual({ purpose: run.purpose, head: run.head, note: run.note }, { purpose: 'fix', head: 'd1d2d3d', note: '0123456789ab' });
});

// Pilot 1, review cost (option 2): the review agents start from a pack the runner writes, not from many fetches.
test('a full review run starts from the context pack the runner asks for; a build run and a review of the new part do not', async () => {
  const one = (run) => { let decided = 0; return () => (decided++ === 0 ? { go: true, runs: [run], lines: [] } : { go: false, reason: 'nothing left', next: '-', lines: [] }); };
  const review = { role: 'reviewer', key: 'DEMO-20', effort: 'xhigh', purpose: 'review', prompt: 'Review PR #15.' };
  const packed = [];
  const pack = async (run, facts) => (packed.push([run.purpose, Boolean(facts)]), '.ai/reviews/15-context.md');
  const first = specWorld();
  const h = harness(first.world, {});
  await h.run({ gather: first.gather, decide: one(review), pack });
  assert.deepEqual(packed, [['review', true]]);
  assert.equal(h.calls[0].prompt, `Review PR #15.\n\n${packNote('.ai/reviews/15-context.md')}`);
  assert.match(packNote('.ai/reviews/15-context.md'), /^The orchestrator wrote a context pack for this review: \.ai\/reviews\/15-context\.md\. .*list in your report what you read beyond it and why\.$/);
  const second = specWorld();
  const built = harness(second.world, {});
  await built.run({ gather: second.gather, decide: one({ ...review, role: 'fe-dev', purpose: 'build', prompt: 'Build DEMO-23.' }), pack });
  assert.equal(built.calls[0].prompt, 'Build DEMO-23.');
  assert.equal(packed.length, 1, 'no pack for a build');
  // The pack holds the diff of the whole PR, and a review of the new part reads the diff since its last report.
  const delta = specWorld();
  const newPart = harness(delta.world, {});
  await newPart.run({ gather: delta.gather, decide: one({ ...review, role: 'security', effort: 'high', purpose: 'review-delta', prompt: 'Review the new part of PR #15.' }), pack });
  assert.equal(newPart.calls[0].prompt, 'Review the new part of PR #15.');
  assert.equal(packed.length, 1, 'no pack for a review of the new part');
  const third = specWorld();
  const none = harness(third.world, {});
  await none.run({ gather: third.gather, decide: one(review), pack: async () => null });
  assert.equal(none.calls[0].prompt, 'Review PR #15.', 'without a pack the prompt is the plain one');
});

// Pilot 1, T10: a review starts on the base branch of the PR, so the instructions of its agent come from the approved
// branch and a PR cannot change them; the code of the PR is in a worktree the runner adds before the run and removes after.
test('a review run gets the worktree of its PR before it starts and loses it when it ends, also when the agent fails', async () => {
  const one = (run) => { let decided = 0; return () => (decided++ === 0 ? { go: true, runs: [run], lines: [] } : { go: false, reason: 'nothing left', next: '-', lines: [] }); };
  const review = { role: 'reviewer', key: 'DEMO-20', effort: 'xhigh', purpose: 'review', prompt: 'Review PR #15.', worktree: { name: 'pr-15', sha: 'abc1234def5678' } };
  const events = [];
  const worktree = { add: async (spec) => (events.push(['add', spec.name]), { ok: true, path: '.ai/reviews/pr-15' }), remove: async (spec) => (events.push(['remove', spec.name]), { ok: true }) };
  const first = specWorld();
  const h = harness(first.world, {});
  await h.run({ gather: first.gather, decide: one(review), worktree, pack: async () => '.ai/reviews/15-context.md' });
  assert.deepEqual(events, [['add', 'pr-15'], ['remove', 'pr-15']]);
  assert.equal(h.calls[0].prompt, ['Review PR #15.', packNote('.ai/reviews/15-context.md'), worktreeNote('.ai/reviews/pr-15', 'abc1234def5678')].join('\n\n'));
  const tree = 'C:/Temp/ao-reviews/shop-pr-15';
  assert.match(worktreeNote(tree, 'abc1234def5678'), /^The code of the PR at its head abc1234 is in the folder C:\/Temp\/ao-reviews\/shop-pr-15, a worktree outside the project\. /);
  assert.match(worktreeNote(tree, 'abc1234def5678'), /the folder has no node_modules, and CI ran the tests of the head/);
  // Second review of ao-sample PR #13: in the temp folder, not under the project, whose instruction files load.
  assert.equal(reviewTreePath('D:/work/shop', 'pr-15', 'C:/Temp'), join('C:/Temp', 'ao-reviews', 'shop-pr-15'));
  assert.equal(reviewTreePath('D:/work/shop/', 'pr-15', 'C:/Temp'), join('C:/Temp', 'ao-reviews', 'shop-pr-15'), 'a trailing slash');
  const project = resolve('D:/work/shop');
  const outside = relative(project, reviewTreePath(project, 'pr-15', tmpdir()));
  assert.ok(outside.startsWith('..') || isAbsolute(outside), 'never under the project, on its drive or another');
  assert.ok(worktreeNote('.ai/reviews/pr-15', 'abc1234def5678').includes('instruction files (CLAUDE.md, CLAUDE.local.md, AGENTS.md, .claude/) were removed from the worktree'));
  // The agent cannot start: the worktree goes all the same.
  events.length = 0;
  const failing = specWorld();
  const f = harness(failing.world, {}, { throws: true });
  await assert.rejects(f.run({ gather: failing.gather, decide: one(review), worktree }), /could not start/);
  assert.deepEqual(events, [['add', 'pr-15'], ['remove', 'pr-15']]);
  // No worktree, no run: the reason is the human's to read.
  const refused = specWorld();
  const r = harness(refused.world, {});
  const { decision } = await r.run({ gather: refused.gather, decide: one(review), worktree: { add: async () => ({ ok: false, reason: 'git could not add the worktree of PR #15: no such commit' }), remove: async () => assert.fail('nothing to remove') } });
  assert.equal(r.calls.length, 0);
  assert.equal(decision.go, false);
  assert.equal(decision.reason, 'git could not add the worktree of PR #15: no such commit');
  // A run without a worktree (a build) is left alone, and so is a runner without the effect.
  const plain = specWorld();
  const p = harness(plain.world, {});
  await p.run({ gather: plain.gather, decide: one({ ...review, worktree: undefined, prompt: 'Build DEMO-23.', purpose: 'build', role: 'fe-dev' }), worktree });
  assert.equal(p.calls[0].prompt, 'Build DEMO-23.');
  const without = specWorld();
  const w = harness(without.world, {});
  await w.run({ gather: without.gather, decide: one(review) });
  assert.equal(w.calls[0].prompt, 'Review PR #15.');
});

// Pilot 1, T10: an agent that stays alive after its result (a dev server it left running) is stopped by ao-step; the
// run keeps its answer, and state.json and the report of the command say what happened.
test('a run whose agent was stopped after its result is recorded as that; one that exited by itself is not', async () => {
  const one = (run) => { let decided = 0; return () => (decided++ === 0 ? { go: true, runs: [run], lines: [] } : { go: false, reason: 'nothing left', next: '-', lines: [] }); };
  const build = { role: 'fe-dev', key: 'DEMO-20', effort: 'high', purpose: 'build', prompt: 'Build DEMO-20.' };
  const said = [];
  const held = specWorld();
  const a = harness(held.world, {}, { stopped: true });
  await a.run({ gather: held.gather, decide: one(build), log: (line) => said.push(line) });
  assert.equal(a.states.at(-1).runs[0].stoppedAfterResult, true);
  assert.equal(a.states.at(-1).runs[0].outcome, 'done', 'its answer counts');
  assert.ok(said.some((line) => line === 'fe-dev stayed alive after its result and was stopped with what it left running'), said.join(' | '));
  const free = specWorld();
  const b = harness(free.world, {});
  await b.run({ gather: free.gather, decide: one(build) });
  assert.equal('stoppedAfterResult' in b.states.at(-1).runs[0], false);
});

test('an open question stops the runs; --answers resumes the session that asked, once', async () => {
  const { world, gather } = specWorld();
  const h = harness(world, { ...SPEC_EFFECTS, 'spec-write': (w) => (w.spec = ASKING) });
  const asked = await h.run({ gather });
  assert.deepEqual(h.calls.map(({ role }) => role), ['ba']);
  assert.deepEqual(asked.decision.questions, ['Q1: có cần nút xóa tất cả không?']);
  assert.match(h.last['DEMO-20'], /## Questions\n\n- Q1: có cần nút xóa tất cả không\?/);

  const answered = harness(world, { ...SPEC_EFFECTS, 'spec-write': (w) => (w.spec = SPEC) });
  await answered.run({ gather, options: { answers: 'Q1: không cần.' } });
  assert.deepEqual(answered.calls[0], { role: 'ba', purpose: 'spec-write', resume: 's-ba-1', prompt: answersPrompt('DEMO-20', 'Q1: không cần.'), log: '2-ba.jsonl' });
  assert.deepEqual(answered.calls.slice(1).map(({ role, resume }) => `${role} ${resume ?? 'new'}`), ['ux new', 'sa new', 'ba new'], 'the answers go to the first run only');
});

test('the usage limit and a run without a result stop the runner; the next command goes on in the same session', async () => {
  const { world, gather } = specWorld();
  const h = harness(world, SPEC_EFFECTS, { outcomes: ['success', 'limit'] });
  const stopped = await h.run({ gather });
  assert.deepEqual(h.calls.map(({ role }) => role), ['ba', 'ux']);
  assert.match(stopped.decision.reason, /^ux hit the usage limit: You've hit your 5-hour limit · resets 1:40am\. Run the same command again after it resets/);
  assert.equal(stopped.decision.next, '/ao-spec DEMO-20');

  const again = harness(world, SPEC_EFFECTS);
  await again.run({ gather });
  assert.deepEqual(again.calls[0], { role: 'ux', purpose: 'design', resume: 's-ux-2', prompt: resumePrompt('DEMO-20'), log: '3-ux.jsonl' });

  const cut = specWorld();
  const h2 = harness(cut.world, SPEC_EFFECTS, { outcomes: ['cut'] });
  assert.match((await h2.run({ gather: cut.gather })).decision.reason, /^ba stopped without a result/);
});

test('an agent that fails twice in a row stops the command; a flag raised by an agent stops it too', async () => {
  const { world, gather } = specWorld({ spec: SPEC, design: DESIGN });
  const h = harness(world, SPEC_EFFECTS, { outcomes: ['error', 'error'] });
  const failed = await h.run({ gather });
  assert.deepEqual(h.calls.map(({ role }) => role), ['sa', 'sa']);
  assert.match(failed.decision.reason, /^sa failed 2 times in a row on DEMO-20/);

  const flagging = specWorld();
  const h2 = harness(flagging.world, { 'spec-write': (w) => (w.flagged = true) });
  const flagged = await h2.run({ gather: flagging.gather });
  assert.match(flagged.decision.reason, /flagged Needs you/);
  assert.equal(h2.calls.length, 1);
});

test('a run that ends well but leaves nothing for the facts is not made again in a loop', async () => {
  const { world, gather } = specWorld();
  const h = harness(world, {});
  const { decision } = await h.run({ gather });
  assert.equal(h.calls.length, 1);
  assert.match(decision.reason, /^ba ran spec-write on DEMO-20 and it still has to run/);
});

test('CI that does not finish in time stops the runner; so does the most runs per command', async () => {
  const { world, gather } = specWorld({ spec: NFR, design: DESIGN });
  const h = harness(world, { 'docs-pr': (w) => ((w.pr = { number: 14, state: 'open', merged: false }), (w.ciPendingFor = 99)) });
  const late = await h.run({ gather });
  assert.match(late.decision.reason, /^CI is still running after 2 minutes/);
  const many = specWorld();
  const h2 = harness(many.world, SPEC_EFFECTS);
  assert.match((await h2.run({ gather: many.gather, limits: { maxRuns: 2 } })).decision.reason, /^2 runs in one command/);
});

test('a PR whose CI has not started stops the runner after the start limit, not the whole CI wait (SMP-2)', async () => {
  const { world, gather } = specWorld({ spec: NFR, design: DESIGN });
  const h = harness(world, { 'docs-pr': (w) => ((w.pr = { number: 14, state: 'open', merged: false }), (w.ciPendingFor = 999), (w.ciStarted = false)) });
  const idle = await h.run({ gather, limits: { ciWaitMs: 30 * 60000, ciStartMs: 5 * 60000 } });
  assert.match(idle.decision.reason, /^no CI run started on PR #14 after 5 minutes/);
  assert.ok(world.ciPendingFor > 999 - 30, 'it stopped long before the 30 minutes of the CI wait');
  assert.ok(world.ciPendingFor <= 999 - 10, 'it waited the 5 minutes, 10 polls of 30 s, before it stopped');
});

// The limits a command gives are merged with LIMITS one by one, so a limit it leaves out keeps its default (T7b).
test('a limit the command leaves out keeps its default: CI that never starts stops the runner after the 5 minutes of LIMITS', async () => {
  const { world, gather } = specWorld({ spec: NFR, design: DESIGN });
  const h = harness(world, { 'docs-pr': (w) => ((w.pr = { number: 14, state: 'open', merged: false }), (w.ciPendingFor = 999), (w.ciStarted = false)) });
  const idle = await h.run({ gather, limits: { ciWaitMs: 30 * 60000 } });
  assert.match(idle.decision.reason, /^no CI run started on PR #14 after 5 minutes/);
  assert.ok(world.ciPendingFor > 999 - 30, 'it stopped long before the 30 minutes of the CI wait');
});

// The start limit is no longer than the whole CI wait, so the reason names the minutes the runner waited (T7b).
test('a CI wait shorter than the start limit: the runner stops when the CI wait ends and says how long it waited', async () => {
  const { world, gather } = specWorld({ spec: NFR, design: DESIGN });
  const h = harness(world, { 'docs-pr': (w) => ((w.pr = { number: 14, state: 'open', merged: false }), (w.ciPendingFor = 999), (w.ciStarted = false)) });
  const idle = await h.run({ gather, limits: { ciWaitMs: 2 * 60000, ciStartMs: 5 * 60000 } });
  assert.match(idle.decision.reason, /^no CI run started on PR #14 after 2 minutes/);
});

test('CI that starts a few polls after the PR opens does not stop the runner: it waits and goes on to gate ① (review of SMP-3)', async () => {
  const { world, gather } = specWorld({ spec: NFR, design: DESIGN });
  let polls = 0;
  const late = async () => {
    polls += 1;
    if (polls > 3) world.ciStarted = true;
    return gather();
  };
  const h = harness(world, { 'docs-pr': (w) => ((w.pr = { number: 14, state: 'open', merged: false }), (w.ciPendingFor = 6), (w.ciStarted = false)) });
  const { decision } = await h.run({ gather: late, limits: { ciWaitMs: 30 * 60000, ciStartMs: 5 * 60000 } });
  assert.match(decision.reason, /docs PR #14 of DEMO-20 is open: stage spec is done/);
});

test('an answer longer than state.json keeps says there where it was cut and where the whole of it is; last.md has all of it (SMP-2)', async () => {
  const { world, gather } = specWorld({ spec: NFR, design: DESIGN });
  const answer = `${'x'.repeat(2500)} would redirect to /notes.`;
  const h = harness(world, { 'docs-pr': (w) => (w.pr = { number: 14, state: 'open', merged: false }) }, { texts: [answer] });
  const { made } = await h.run({ gather });
  const [record] = world.run.runs;
  assert.match(record.text, /^x{2000} … \[cut at 2000 characters; the whole answer is in 1-ba\.jsonl\]$/);
  assert.ok(h.last['DEMO-20'].includes(`## 1. ba: its answer\n\n${answer}\n`), 'last.md holds the answer up to its last word');
  assert.doesNotMatch(h.last['DEMO-20'], /cut at 2000 characters/);
  assert.equal(made[0].text, answer);
});

test('the second /ao-plan asks for jira-sync and waits for the docs PR to be merged; no agent runs', async () => {
  let syncs = 0;
  const epic = () => ({
    command: 'plan',
    item: { key: 'DEMO-20', type: 'Epic', workType: 'epic', state: 'in-progress', status: 'In Progress', summary: 'Xóa', flagged: false, children: [{ key: 'DEMO-21', state: syncs > 0 ? 'ready' : 'new' }], requests: [], subtasks: [] },
    docs: { branch: BRANCH, exists: true, pr: { number: 14, state: syncs > 0 ? 'closed' : 'open', merged: syncs > 0, ci: { green: true, failed: false, pending: false } }, spec: NFR, plan: '# Plan' },
    pr: null,
    run: null,
  });
  const store = { readState: () => null, writeState: () => assert.fail('no run'), writeLast: () => {} };
  const { decision, made, facts } = await runGo({ command: 'plan', arg: 'DEMO-20', options, gather: async () => epic(), agent: () => assert.fail('no agent'), git: async () => ({ ok: true }), dispatch: async () => (syncs += 1), store, sleep: async () => {}, now: () => 0 });
  assert.deepEqual(made, [{ action: 'jira-sync', key: 'DEMO-20' }]);
  assert.deepEqual([decision.go, decision.next], [false, '/ao-build DEMO-21']);
  assert.equal(facts.docs.pr.state, 'closed', 'the facts the last decision was made on, for ao-step to put the checkout back');
});

test('last.md: a row per run with its measurements, the cost so far, why it stopped and what comes next', () => {
  const made = [{ n: 1, role: 'ba', key: 'DEMO-20', purpose: 'spec-write', effort: 'xhigh', outcome: 'done', turns: 19, durationMs: 443742, costUsd: 1.824105, text: 'I wrote the SPEC.' }];
  const text = lastReport({ command: 'spec', key: 'DEMO-20', made, decision: { go: false, reason: 'ba left 1 open question in docs/specs/DEMO-20/spec.md', next: 'Answer them in the chat', questions: ['Q1: ?'] }, state: { runs: [...made, { costUsd: 0.5 }] } });
  assert.match(text, /^# spec DEMO-20\n/);
  assert.match(text, /\| 1 \| ba \| DEMO-20 \| spec-write \| xhigh \| done \| 19 turns, 7\.4 min \| 1\.82 USD \|/);
  assert.match(text, /Cost of every run on DEMO-20 so far: 2\.32 USD\./);
  assert.match(text, /## 1\. ba: its answer\n\nI wrote the SPEC\./);
  assert.match(text, /## Stopped\n\nba left 1 open question in docs\/specs\/DEMO-20\/spec\.md\./);
  assert.match(text, /## Questions\n\n- Q1: \?\n\nNext: Answer them in the chat\n$/);
});

test('the printout: the facts, then GO and the runs, or STOP with the reason and the next command', () => {
  const go = formatDecision({ go: true, lines: ['DEMO-21 Story "Xóa": Ready'], runs: [{ role: 'be-dev', key: 'DEMO-22', purpose: 'build', effort: 'high' }, { role: 'fe-dev', key: 'DEMO-23', purpose: 'build', effort: 'xhigh', when: 'BE is done' }] });
  assert.equal(go, 'DEMO-21 Story "Xóa": Ready\nGO\n1. be-dev DEMO-22, build, effort high\n2. fe-dev DEMO-23, build, effort xhigh (when BE is done)');
  assert.equal(formatDecision({ go: false, reason: 'DEMO-21 is New, not Ready', next: '/ao-status DEMO-21', lines: [] }), 'STOP: DEMO-21 is New, not Ready\nNext: /ao-status DEMO-21');
  assert.equal(formatDecision({ go: true, lines: [], runs: [{ action: 'jira-sync', key: 'DEMO-20', then: { mergeGate: 14 } }] }), 'GO\n1. jira-sync for DEMO-20, with your gh login; then merge-gate merges the docs PR #14');
});

test('the command of a run: ao-agent.mjs, stream-json, the effort as flag and variable, the five-minute cache, and never a token', () => {
  const run = { role: 'fe-dev', key: 'DEMO-23', effort: 'xhigh', prompt: 'Build Sub-task DEMO-23.', resume: 's-fe' };
  const { command, args, env } = agentCommand(run, 'D:\\work\\shop\\.ai-orchestrator');
  assert.equal(command, process.execPath);
  assert.deepEqual(args, ['D:/work/shop/.ai-orchestrator/scripts/ao-agent.mjs', 'fe-dev', '-p', 'Build Sub-task DEMO-23.', '--output-format', 'stream-json', '--verbose', '--effort', 'xhigh', '--resume', 's-fe']);
  // A run sends its requests seconds apart, so the five-minute cache is enough and its writes cost 5 USD per million
  // tokens on Opus 5.5 instead of 8 for the one-hour cache that claude -p on a subscription asks for (Pilot 1, PR #4).
  assert.deepEqual(env, { CLAUDE_CODE_EFFORT_LEVEL: 'xhigh', CLAUDE_CODE_PROMPT_CACHE_TTL: '5m' });
  assert.ok(![...args, ...Object.values(env)].some((word) => /gh[sopu]_|ATATT|token/i.test(word)));
});

test('the argument is a key of the space or a PR number; anything else stops before a request is made', () => {
  assert.equal(checkArgument('build', 'DEMO-21', 'DEMO'), null);
  assert.equal(checkArgument('review', '15', 'DEMO'), null);
  assert.equal(checkArgument('status', undefined, 'DEMO'), null);
  assert.match(checkArgument('build', 'SCRUM-1', 'DEMO'), /not in the space DEMO/);
  assert.match(checkArgument('fix', '15; rm -rf .', 'DEMO'), /takes a PR number/);
  assert.match(checkArgument('spec', 'DEMO-20 && echo', 'DEMO'), /takes a Jira key/);
  assert.match(checkArgument('deploy', 'DEMO-1', 'DEMO'), /unknown command deploy/);
});

// Medium of security on the second review of ao-sample PR #13: ao-step, the kit and the agents' instructions come from
// the checkout, which after /ao-build was the branch of the PR, so the first review of a PR ran that PR's code.
test('/ao-review and /ao-fix start only on a protected branch; a command that ends with an open PR goes back to its base', () => {
  const branches = ['develop', 'main', 'release/*'];
  assert.equal(checkoutStop('review', 'develop', branches), null);
  assert.equal(checkoutStop('fix', 'release/v1.2.0', branches), null);
  assert.equal(checkoutStop('build', 'feature/DEMO-21-remove-line', branches), null, 'a build goes on on its branch');
  assert.equal(checkoutStop('review', 'feature/DEMO-21-remove-line', branches), 'the checkout is on feature/DEMO-21-remove-line, not a protected branch (develop, main, release/*): ao-step, the kit and the instructions of the agents would come from it. Switch it to the base of the PR (git switch develop), then run /ao-review again');
  assert.match(checkoutStop('fix', '', branches), /^the checkout is on a detached HEAD, not a protected branch/);
  const open = { pr: { state: 'open', base: 'develop' } };
  for (const command of ['build', 'review', 'fix']) assert.equal(homeBranch(command, open, branches), 'develop', command);
  assert.equal(homeBranch('fix', { pr: { state: 'open', base: 'release/v1.2.0' } }, branches), 'release/v1.2.0');
  assert.equal(homeBranch('build', { pr: null }, branches), null, 'a build without its PR stays on its branch, where the next run goes on');
  assert.equal(homeBranch('fix', { pr: { state: 'closed', base: 'develop' } }, branches), null);
  assert.equal(homeBranch('review', { pr: { state: 'open', base: 'feature/DEMO-20-x' } }, branches), null);
  assert.equal(homeBranch('plan', open, branches), null);
  assert.equal(homeBranch('build', undefined, branches), null);
});

// Reviews of ao-pilot PR #14 (dev-workflow T15b).
test('--note and --answers read only a file in .ai/runs/ of the project', () => {
  const project = join(tmpdir(), 'ao-step-note');
  assert.equal(runsFile(project, '.ai/runs/DEMO-21/note.md'), join(project, '.ai', 'runs', 'DEMO-21', 'note.md'));
  assert.equal(runsFile(project, join(project, '.ai', 'runs', 'DEMO-21', 'answers.md')), join(project, '.ai', 'runs', 'DEMO-21', 'answers.md'));
  for (const file of ['.ai/runs/../../.env', '../secrets.txt', 'C:/Users/me/.ssh/id_ed25519', '.ai/ledger/DEMO-21.md', '.ai/runs']) {
    assert.throws(() => runsFile(project, file), /only a file in \.ai\/runs\//, file);
  }
});

test('the lock of ao-step is taken atomically: a second run sees the first, a stale one is replaced', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ao-step-lock-'));
  const lock = join(dir, 'active.json');
  const first = { pid: 101, command: 'build', arg: 'DEMO-21' };
  assert.equal(takeLock(lock, first, () => true), null, 'free');
  assert.deepEqual(takeLock(lock, { pid: 102, command: 'review', arg: '15' }, (pid) => pid === 101), first, 'held by a live process');
  assert.equal(takeLock(lock, { pid: 103, command: 'fix', arg: '15' }, () => false), null, 'the holder is gone');
  assert.equal(JSON.parse(readFileSync(lock, 'utf8')).pid, 103);
  rmSync(dir, { recursive: true, force: true });
});

// release-workflow T13: a qa run.
test('a qa run gets its worktree with the qa note; its follow-up runs before the worktree goes, and its notes reach state.json and last.md', async () => {
  const one = (run) => { let decided = 0; return () => (decided++ === 0 ? { go: true, runs: [run], lines: [] } : { go: false, reason: 'nothing left', next: '-', lines: [] }); };
  const qa = { role: 'qa', key: 'DEMO-20', effort: 'high', purpose: 'qa', prompt: 'QA Story DEMO-20.', worktree: { kind: 'qa', name: 'DEMO-20-qa', sha: 'abc1234def5678', install: true }, env: { E2E_BASE_URL: 'https://pilot-dev.ao.t2g.io.vn' } };
  const events = [];
  const worktree = { add: async (spec) => (events.push(['add', spec.name, spec.install]), { ok: true, path: 'C:/Temp/ao-reviews/shop-DEMO-20-qa' }), remove: async (spec) => (events.push(['remove', spec.name]), { ok: true }) };
  const after = async (run, { tree }) => (events.push(['after', run.purpose, tree.path]), ['Attached to DEMO-20: cart.png.']);
  const world = specWorld();
  const h = harness(world.world, {});
  await h.run({ gather: world.gather, decide: one(qa), worktree, after });
  assert.deepEqual(events, [['add', 'DEMO-20-qa', true], ['after', 'qa', 'C:/Temp/ao-reviews/shop-DEMO-20-qa'], ['remove', 'DEMO-20-qa']]);
  assert.equal(h.calls[0].prompt, ['QA Story DEMO-20.', qaWorktreeNote('C:/Temp/ao-reviews/shop-DEMO-20-qa', 'abc1234def5678')].join('\n\n'));
  assert.match(qaWorktreeNote('C:/Temp/x', 'abc1234def5678'), /^The code of abc1234, the release the environment runs, is in the folder C:\/Temp\/x, a worktree outside the project, with its packages installed\. /);
  assert.deepEqual(h.states.at(-1).runs.at(-1).notes, ['Attached to DEMO-20: cart.png.']);
  assert.match(h.last['DEMO-20'], /## 1\. qa: notes of the orchestrator\n\n- Attached to DEMO-20: cart\.png\./);
});

test('the variables of a run reach ao-agent.mjs through its environment; a password never reaches its arguments', () => {
  const run = { role: 'qa', key: 'DEMO-21', effort: 'high', purpose: 'qa', prompt: 'QA Story DEMO-21.', env: { E2E_BASE_URL: 'https://pilot-dev.ao.t2g.io.vn', E2E_HTTP_USER: 'ao', E2E_HTTP_PASSWORD: 's3cr3t-pass' } };
  const { args, env } = agentCommand(run, 'D:/work/shop/.ai-orchestrator');
  assert.deepEqual(env, { CLAUDE_CODE_EFFORT_LEVEL: 'high', CLAUDE_CODE_PROMPT_CACHE_TTL: '5m', E2E_BASE_URL: 'https://pilot-dev.ao.t2g.io.vn', E2E_HTTP_USER: 'ao', E2E_HTTP_PASSWORD: 's3cr3t-pass' });
  assert.ok(!args.some((arg) => arg.includes('s3cr3t-pass')));
  assert.ok(!('JIRA_CI_TOKEN' in env));
});
