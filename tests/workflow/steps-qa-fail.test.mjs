import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readRoster } from '../../lib/agents/roster.mjs';
import { readContract } from '../../lib/contract.mjs';
import { readGates } from '../../lib/quality/gates.mjs';
import { PURPOSES } from '../../lib/workflow/prompts.mjs';
import { decideStep, noteKey } from '../../lib/workflow/steps.mjs';
import { CONTRACT_DIR, ROOT } from '../helpers/kit.mjs';

// /ao-qa <KEY> fail: … (human-loop spec 5.1).
const contract = readContract(CONTRACT_DIR);
const roster = readRoster(join(ROOT, 'agents'));
const options = { roster, contract, gates: readGates(join(ROOT, 'quality')) };
const MERGE = 'b'.repeat(40);
const RUNNING = 'c'.repeat(40);
const URL = 'https://pilot-dev.ao.t2g.io.vn';
const DEFECT = 'Xóa dòng cuối thì giỏ vẫn hiện tổng 120.000 đ. Bước: thêm 1 sản phẩm, xóa nó. Mong đợi: "Giỏ hàng trống".';

function qaFacts(state = 'in-qa', run = null) {
  const status = { 'ready-for-qa': 'Ready for QA', 'in-qa': 'In QA', 'in-progress': 'In Progress' }[state];
  return {
    command: 'qa',
    arg: 'DEMO-21',
    space: 'DEMO',
    item: { key: 'DEMO-21', type: 'Story', workType: 'story', state, status, summary: 'Xóa sản phẩm khỏi giỏ hàng', labels: [], role: null, roles: [], effort: null, agent: 'qa', rework: 0, flagged: false, flag: null, parent: { key: 'DEMO-20', type: 'Epic', status: 'In Progress' }, subtasks: [], blockedBy: [], requests: [] },
    epic: null,
    docs: null,
    pr: { number: 15, state: 'closed', merged: true, mergeCommit: MERGE, base: 'develop', headRef: 'feature/DEMO-21-remove-line', ci: { green: true, failed: false, pending: false } },
    qa: { environment: 'development', running: { sha: RUNNING, deployment: 7, url: URL }, contains: true },
    ledger: false,
    run,
  };
}
const decide = (facts, more = {}) => decideStep('qa', facts, { ...options, ...more });
const plan = (decision) => decision.runs.map(({ role, purpose }) => `${role} ${purpose}`);

test('in QA, your defect goes to qa, which reproduces it on the environment, in the worktree of the release, and fails the item', () => {
  const decision = decide(qaFacts('in-qa'), { note: DEFECT, change: 'none' });
  assert.equal(decision.go, true);
  assert.deepEqual(plan(decision), ['qa qa-defect']);
  const [run] = decision.runs;
  assert.deepEqual([run.worktree, run.env, run.qa, run.note], [{ kind: 'qa', name: 'DEMO-21-qa', sha: RUNNING, install: true }, { E2E_BASE_URL: URL }, { environment: 'development', sha: RUNNING, auth: true }, noteKey(DEFECT)]);
  assert.equal(run.prompt, PURPOSES['qa-defect']({ key: 'DEMO-21', type: 'Story', environment: 'Development', sha: RUNNING, url: URL, pr: 15, auth: true, note: DEFECT, picked: true }));
  assert.match(run.prompt, /The human reports:\n\nXóa dòng cuối/);
  assert.match(run.prompt, /If it reproduces, write your QA report on DEMO-21 with Result FAIL: each criterion the defect breaks is FAIL, with your evidence, and Notes say the defect came from the human; then make the QA fail transition/);
  assert.match(run.prompt, /If it does not reproduce, do not fail DEMO-21: comment what you tried, and flag it Needs you/);
  assert.doesNotMatch(run.prompt, /check every acceptance criterion too/, 'qa checked them already');
});

test('in Ready for QA, qa also does the whole QA of the item', () => {
  const [run] = decide(qaFacts('ready-for-qa'), { note: DEFECT }).runs;
  assert.equal(run.purpose, 'qa-defect');
  assert.match(run.prompt, /DEMO-21 is not picked up yet: check every acceptance criterion too, and run the E2E of the repo/);
});

test('a new expectation: ba adds the criterion on Jira first, from develop with no commit, then qa', () => {
  const decision = decide(qaFacts('in-qa'), { note: DEFECT, change: 'ac' });
  assert.deepEqual(plan(decision), ['ba ac-add', 'qa qa-defect']);
  const [ba] = decision.runs;
  assert.deepEqual(ba.checkout, { branch: 'develop', pull: true });
  assert.equal(ba.note, noteKey(DEFECT));
  assert.equal(ba.prompt, PURPOSES['ac-add']({ key: 'DEMO-21', epic: 'DEMO-20', note: DEFECT }));
  assert.match(ba.prompt, /commit nothing\. The SPEC follows on the next branch of DEMO-21, when its fix is built/);
  const after = qaFacts('in-qa', { key: 'DEMO-21', runs: [{ n: 1, command: 'qa', role: 'ba', purpose: 'ac-add', outcome: 'done', session: 's', note: noteKey(DEFECT) }] });
  assert.deepEqual(plan(decide(after, { note: DEFECT, change: 'ac' })), ['qa qa-defect']);
});

test('a defect needs the item in Ready for QA or In QA; without one, In QA waits for your Accept', () => {
  const back = decide(qaFacts('in-progress'), { note: DEFECT });
  assert.equal(back.go, false);
  assert.match(back.reason, /is In Progress, not Ready for QA/);
  const waiting = decide(qaFacts('in-qa'));
  assert.equal(waiting.go, false);
});
