import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideTarget } from '../../lib/release/targets.mjs';

const YOU = 'TungPH7';
const BOT = 'tungph7-ao-dev[bot]';
const [A, B, C] = ['a', 'b', 'c'].map((ch) => ch.repeat(40));
const [TA, TB, TC] = ['1', '2', '3'].map((ch) => ch.repeat(40));

const pass = (sha) => ({ sha, ok: true, problems: [] });
const fail = (sha, problem) => ({ sha, ok: false, problems: [problem] });
// A new head on a branch: its audits cover every new first-parent commit up to it, oldest first.
const head = (branch, sha, tree, audits, pull = null) => ({ sha, tree, branch, audits, pull });
const release = (number = 30) => ({ number, head: 'release/v0.1.0' });
const hotfix = (number = 31) => ({ number, head: 'hotfix/DEMO-40-cart-total' });
// The deployer's own record: tree TA passed smoke on Staging and on Production.
const RECORD = { staging: [{ sha: A, tree: TA, ok: true }], production: [{ sha: A, tree: TA, ok: true }] };
const decide = (environment, facts) => decideTarget({ environment, record: RECORD, approvers: [YOU], ...facts });

const deploy = (sha, tree, via) => ({ action: 'deploy', sha, tree, via });
const assertSkip = (result, pattern) => {
  assert.equal(result.action, 'skip', JSON.stringify(result));
  assert.match(result.reason, pattern);
};
const assertRefuse = (result, pattern) => {
  assert.equal(result.action, 'refuse', JSON.stringify(result));
  assert.match(result.reason, pattern);
};

test('Development runs the head of develop when every new commit passed audit', () => {
  assert.deepEqual(decide('development', { candidate: head('develop', B, TB, [pass(A), pass(B)]) }), deploy(B, TB, 'branch'));
});

test('a commit that failed audit blocks every head after it, even a head that passed (spec 2.3 step 2)', () => {
  const result = decide('development', { candidate: head('develop', C, TC, [pass(A), fail(B, 'pushed without a PR'), pass(C)]) });
  assertRefuse(result, /bbbbbbb did not pass audit: pushed without a PR/);
  assert.match(result.reason, /\/ao-rollback development <sha>/, 'the reason says how you unblock it');
});

test('audits that stop short of the head are refused', () => {
  assertRefuse(decide('development', { candidate: head('develop', C, TC, [pass(A), pass(B)]) }), /audit does not reach ccccccc/);
  assertRefuse(decide('development', { candidate: head('develop', C, TC, []) }), /audit does not reach ccccccc/);
});

test('Staging runs the head of the open release branch when every new commit passed audit', () => {
  assert.deepEqual(decide('staging', { candidate: head('release/v0.1.0', B, TB, [pass(B)]) }), deploy(B, TB, 'branch'));
  assertRefuse(decide('staging', { candidate: head('release/v0.1.0', B, TB, [fail(B, 'merged without approval')]) }), /did not pass audit/);
});

test('Staging runs a hotfix merged into main until it is on Production (spec 2.8)', () => {
  assert.deepEqual(decide('staging', { candidate: head('main', B, TB, [pass(B)], hotfix()) }), deploy(B, TB, 'branch'));
  assertSkip(decide('staging', { candidate: head('main', A, TA, [pass(A)], hotfix()) }), /already on production/);
});

test('each commit of main goes to one environment: a hotfix to Staging, the merge of a release PR to Production', () => {
  assertSkip(decide('production', { candidate: head('main', B, TB, [pass(B)], hotfix()) }), /goes to staging/);
  assertSkip(decide('staging', { candidate: head('main', A, TA, [pass(A)], release()) }), /goes to production/);
  assertSkip(decide('development', { candidate: head('release/v0.1.0', B, TB, [pass(B)]) }), /goes to staging/);
});

test('Production runs the merge of a release PR you approved, once its tree passed Staging (spec 2.4)', () => {
  // A merge commit on main has the tree of the release head that ran on Staging.
  assert.deepEqual(decide('production', { candidate: head('main', B, TA, [pass(B)], release()) }), deploy(B, TA, 'branch'));
});

test('Production refuses a commit without gate ⑤', () => {
  // audit checks that one of AO_APPROVERS approved the head of the release PR.
  assertRefuse(decide('production', { candidate: head('main', B, TA, [fail(B, 'PR #30 was merged without: approval on head 1234567')], release()) }), /did not pass audit: PR #30 was merged without: approval/);
  // A commit pushed to main and tagged: a tag is no gate ⑤, since the token of ao-dev can make one too.
  assertRefuse(decide('production', { candidate: head('main', B, TA, [fail(B, 'pushed without a PR')], null) }), /did not pass audit/);
  // A commit of main that came through neither a release nor a hotfix PR.
  assertRefuse(decide('production', { candidate: head('main', B, TA, [pass(B)], { number: 32, head: 'develop' }) }), /main takes release and hotfix PRs only/);
});

test('Production refuses a tree that has not passed Staging', () => {
  assertRefuse(decide('production', { candidate: head('main', B, TB, [pass(B)], release()) }), /tree of bbbbbbb has not passed Staging/);
  const smokeFailed = { ...RECORD, staging: [{ sha: B, tree: TB, ok: false }] };
  assertRefuse(decideTarget({ environment: 'production', candidate: head('main', B, TB, [pass(B)], release()), record: smokeFailed, approvers: [YOU] }), /has not passed Staging/);
});

test('Production runs a deployment request you created, such as the hotfix of /ao-ship, once its tree passed Staging', () => {
  const record = { ...RECORD, staging: [...RECORD.staging, { sha: B, tree: TB, ok: true }] };
  assert.deepEqual(decideTarget({ environment: 'production', request: { sha: B, tree: TB, creator: YOU, rollback: false }, record, approvers: [YOU] }), deploy(B, TB, 'request'));
  assertRefuse(decide('production', { request: { sha: C, tree: TC, creator: YOU, rollback: false } }), /tree of ccccccc has not passed Staging/);
});

test('a deployment request from a login outside AO_APPROVERS is refused, whatever it asks', () => {
  for (const environment of ['development', 'staging', 'production']) {
    for (const creator of [BOT, 'someone', undefined]) {
      for (const rollback of [false, true]) {
        assertRefuse(decide(environment, { request: { sha: A, tree: TA, creator, rollback } }), /not in AO_APPROVERS/);
      }
    }
  }
});

test('a rollback goes back only to a release that ran with a green smoke test on that environment (spec 2.9)', () => {
  assert.deepEqual(decide('production', { request: { sha: A, tree: TA, creator: YOU, rollback: true } }), deploy(A, TA, 'rollback'));
  // TB passed Staging but never ran on Production; on Development nothing ran yet.
  const record = { ...RECORD, staging: [...RECORD.staging, { sha: B, tree: TB, ok: true }], production: [...RECORD.production, { sha: C, tree: TC, ok: false }] };
  const at = (environment, sha, tree) => decideTarget({ environment, request: { sha, tree, creator: YOU, rollback: true }, record, approvers: [YOU] });
  assertRefuse(at('production', B, TB), /bbbbbbb never ran with a green smoke test on production/);
  assertRefuse(at('production', C, TC), /never ran with a green smoke test on production/);
  assertRefuse(at('development', A, TA), /never ran with a green smoke test on development/);
});

test('your deployment request for a head after a commit that failed audit unblocks Development and Staging (plan decision 5)', () => {
  // Development is stuck behind B; you read B and ask for C, a later head of develop.
  assertRefuse(decide('development', { candidate: head('develop', C, TC, [fail(B, 'pushed without a PR'), pass(C)]) }), /did not pass audit/);
  assert.deepEqual(decide('development', { request: { sha: C, tree: TC, creator: YOU, rollback: false } }), deploy(C, TC, 'request'));
  assert.deepEqual(decide('staging', { request: { sha: C, tree: TC, creator: YOU, rollback: false } }), deploy(C, TC, 'request'));
  assertRefuse(decide('development', { request: { sha: C, tree: TC, creator: BOT, rollback: false } }), /tungph7-ao-dev\[bot\], who is not in AO_APPROVERS/);
});

test('a head of a branch no environment runs is refused', () => {
  assertRefuse(decide('development', { candidate: head('feature/DEMO-41-coupon', B, TB, [pass(B)]) }), /no environment runs feature\/DEMO-41-coupon/);
  assertRefuse(decide('staging', { candidate: head('release/0.1.0', B, TB, [pass(B)]) }), /no environment runs release\/0\.1\.0/);
});

test('an unknown environment, or nothing to decide, is a mistake of the caller', () => {
  assert.throws(() => decide('qa', { candidate: head('develop', A, TA, [pass(A)]) }), /unknown environment qa/);
  assert.throws(() => decide('development', {}), /a candidate or a request/);
});
