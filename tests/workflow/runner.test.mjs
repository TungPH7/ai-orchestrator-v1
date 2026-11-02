import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readRoster } from '../../lib/agents/roster.mjs';
import { readContract } from '../../lib/contract.mjs';
import { readGates } from '../../lib/quality/gates.mjs';
import { answersPrompt, packNote, resumePrompt } from '../../lib/workflow/prompts.mjs';
import { agentCommand, formatDecision, lastReport, runGo } from '../../lib/workflow/runner.mjs';
import { decideStep } from '../../lib/workflow/steps.mjs';
import { CONTRACT_DIR, ROOT } from '../helpers/kit.mjs';
import { checkArgument, runsFile, takeLock } from '../../scripts/ao-step.mjs';
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
function harness(world, effects, { outcomes = [], texts = [] } = {}) {
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
    await new Promise((done) => setImmediate(done));
    const outcome = outcomes.shift() ?? 'success';
    if (outcome === 'success') effects[run.purpose]?.(world, run);
    active -= 1;
    return { lines: runLines({ session: `s-${run.role}-${calls.length}`, outcome, cost: 0.25 * calls.length, text: texts.shift() ?? 'Done.' }) };
  };
  const checkouts = [];
  return {
    calls,
    states,
    last,
    checkouts,
    run: (more = {}) =>
      runGo({ command: 'spec', arg: 'DEMO-20', options: { ...options, ...more.options }, gather: more.gather, decide: more.decide, pack: more.pack, agent, git: async (c) => (checkouts.push(c), { ok: true }), dispatch: async () => {}, store, sleep: async (ms) => (clock += ms), now: () => clock, limits: { maxRuns: 8, ciWaitMs: 120000, syncWaitMs: 60000, pollMs: 30000, ...more.limits } }),
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
test('a review run starts from the context pack the runner asks for; a build run does not', async () => {
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
  const third = specWorld();
  const none = harness(third.world, {});
  await none.run({ gather: third.gather, decide: one(review), pack: async () => null });
  assert.equal(none.calls[0].prompt, 'Review PR #15.', 'without a pack the prompt is the plain one');
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

test('an answer longer than state.json keeps says where it was cut and where the whole of it is', async () => {
  const { world, gather } = specWorld({ spec: NFR, design: DESIGN });
  const h = harness(world, { 'docs-pr': (w) => (w.pr = { number: 14, state: 'open', merged: false }) }, { texts: ['x'.repeat(2500)] });
  await h.run({ gather });
  const [record] = world.run.runs;
  assert.match(record.text, /^x{2000} … \[cut at 2000 characters; the whole answer is in 1-ba\.jsonl\]$/);
  assert.match(h.last['DEMO-20'], /cut at 2000 characters/);
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
  const { decision, made } = await runGo({ command: 'plan', arg: 'DEMO-20', options, gather: async () => epic(), agent: () => assert.fail('no agent'), git: async () => ({ ok: true }), dispatch: async () => (syncs += 1), store, sleep: async () => {}, now: () => 0 });
  assert.deepEqual(made, [{ action: 'jira-sync', key: 'DEMO-20' }]);
  assert.deepEqual([decision.go, decision.next], [false, '/ao-build DEMO-21']);
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
