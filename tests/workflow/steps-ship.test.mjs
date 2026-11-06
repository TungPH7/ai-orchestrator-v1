import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readRoster } from '../../lib/agents/roster.mjs';
import { readContract } from '../../lib/contract.mjs';
import { readGates } from '../../lib/quality/gates.mjs';
import { decideStep } from '../../lib/workflow/steps.mjs';
import { CONTRACT_DIR, ROOT } from '../helpers/kit.mjs';

// release-workflow spec 2.7: /ao-ship vX.Y.0 for a release on Staging.
const roster = readRoster(join(ROOT, 'agents'));
const options = { roster, contract: readContract(CONTRACT_DIR), gates: readGates(join(ROOT, 'quality')) };
const HEAD = 'a'.repeat(40);
const OLD = 'b'.repeat(40);
const REPORT = 'c'.repeat(40);
const URL = 'https://pilot-staging.ao.t2g.io.vn';

function shipFacts(ship = {}) {
  return {
    command: 'ship',
    arg: 'v0.1.0',
    space: 'DEMO',
    item: null,
    runKey: 'v0.1.0',
    ship: {
      version: 'v0.1.0',
      branch: { name: 'release/v0.1.0', version: '0.1.0', sha: HEAD },
      staging: { sha: HEAD, deployment: 40, url: URL },
      bugs: [],
      regression: null,
      changedSinceRegression: null,
      notes: false,
      pr: null,
      ...ship,
    },
  };
}
const decide = (facts) => decideStep('ship', facts, options);
const first = (decision) => decision.runs[0];

test('/ao-ship runs the full regression first: qa on Staging, in a worktree at the head of the release branch', () => {
  const decision = decide(shipFacts());
  assert.equal(decision.go, true);
  const run = first(decision);
  assert.deepEqual({ role: run.role, key: run.key, purpose: run.purpose, effort: run.effort }, { role: 'qa', key: 'v0.1.0', purpose: 'regression', effort: roster.roles.qa.effort });
  assert.deepEqual(run.worktree, { kind: 'qa', name: 'v0.1.0-regression', sha: HEAD, install: true });
  assert.deepEqual(run.env, { E2E_BASE_URL: URL });
  assert.deepEqual(run.qa, { environment: 'staging', sha: HEAD, auth: true });
  assert.match(run.prompt, /^Run the full regression of v0\.1\.0 on Staging\. Staging runs aaaaaaaa at https:\/\/pilot-staging\.ao\.t2g\.io\.vn, the head of release\/v0\.1\.0\./);
  assert.match(run.prompt, /Write the report to \.ai\/runs\/v0\.1\.0\/regression-report\.md from templates\/regression-report\.md, and end its Regression Result section with the line Result: PASS or Result: FAIL\./);
  assert.deepEqual(decision.runs.map(({ role, purpose, action }) => action ?? `${role} ${purpose}`), ['qa regression', 'devops release-notes', 'release-pr']);
});

test('after a passed regression, devops writes the notes, then a script commits the report and opens the release PR', () => {
  const passed = { regression: { sha: HEAD, result: 'PASS' }, changedSinceRegression: [] };
  const notes = first(decide(shipFacts(passed)));
  assert.deepEqual({ role: notes.role, purpose: notes.purpose, key: notes.key }, { role: 'devops', purpose: 'release-notes', key: 'v0.1.0' });
  assert.match(notes.prompt, /changelog\.md, .*pr-description\.md, .*fix-version\.md/s);
  assert.deepEqual(first(decide(shipFacts({ ...passed, notes: true }))), { action: 'release-pr', key: 'v0.1.0', version: 'v0.1.0', branch: 'release/v0.1.0', regression: HEAD });
});

test('with the release PR open on the report commit, /ao-ship stops at gate ⑤: you approve, merge-gate merges', () => {
  const open = decide(shipFacts({ branch: { name: 'release/v0.1.0', version: '0.1.0', sha: REPORT }, staging: { sha: HEAD, deployment: 40, url: URL }, regression: { sha: HEAD, result: 'PASS' }, changedSinceRegression: ['CHANGELOG.md', 'docs/releases/v0.1.0.md'], notes: true, pr: { number: 30, headSha: REPORT } }));
  assert.equal(open.go, false);
  assert.equal(open.reason, 'gate ⑤: PR #30 of release/v0.1.0 waits for your approval on its head cccccccc');
  assert.equal(open.next, 'Approve PR #30 on GitHub, without merging it: merge-gate merges it with a merge commit, tags v0.1.0 and merges main back into develop');
});

test('a regression on an older commit no longer holds when the branch changed more than the report: it runs again on the new head', () => {
  const stale = decide(shipFacts({ regression: { sha: OLD, result: 'PASS' }, changedSinceRegression: ['apps/web/src/cart.tsx', 'CHANGELOG.md'], notes: true, pr: { number: 30, headSha: HEAD } }));
  assert.equal(stale.go, true);
  assert.equal(first(stale).purpose, 'regression');
  assert.match(stale.lines.join('\n'), /release\/v0\.1\.0 changed apps\/web\/src\/cart\.tsx after the regression on bbbbbbbb, so the regression runs again/);
});

test('after the regression ran again with the release PR open, devops writes the notes again and the script commits them before gate ⑤', () => {
  // T21: a Bug fixed on the release branch made the regression run again on its new head, which the PR already had.
  const again = { regression: { sha: HEAD, result: 'PASS' }, changedSinceRegression: [], pr: { number: 30, headSha: HEAD } };
  assert.deepEqual(decide(shipFacts({ ...again, notes: false })).runs.map(({ role, purpose, action }) => action ?? `${role} ${purpose}`), ['devops release-notes', 'release-pr']);
  assert.deepEqual(decide(shipFacts({ ...again, notes: true })).runs.map(({ role, purpose, action }) => action ?? `${role} ${purpose}`), ['release-pr']);
});

test('/ao-ship stops while Staging runs another commit, a Bug Critical or High is open, the branch is not open, or the regression failed', () => {
  assert.equal(decide(shipFacts({ staging: { sha: OLD, deployment: 39, url: URL } })).reason, 'Staging runs bbbbbbbb, not the head aaaaaaaa of release/v0.1.0: wait for the deployer');
  assert.equal(decide(shipFacts({ staging: null })).reason, 'Staging runs no release yet: wait for the deployer');
  const bugs = decide(shipFacts({ bugs: [{ key: 'DEMO-30', severity: 'High' }, { key: 'DEMO-31', severity: 'Critical' }] }));
  assert.equal(bugs.reason, '2 Bugs Critical or High are open with Fix Version v0.1.0: DEMO-30 (High), DEMO-31 (Critical)');
  assert.match(bugs.next, /bugfix\//);
  assert.deepEqual([decide(shipFacts({ branch: null })).reason, decide(shipFacts({ branch: null })).next], ['release/v0.1.0 is not open', '/ao-release']);
  const failed = decide(shipFacts({ regression: { sha: HEAD, result: 'FAIL' }, changedSinceRegression: [] }));
  assert.equal(failed.reason, 'the regression of v0.1.0 failed on aaaaaaaa');
  assert.match(failed.next, /draft Bugs in \.ai\/runs\/v0\.1\.0\/regression-report\.md/);
});

test('/ao-ship stops when the deployment Staging runs has no URL for the regression', () => {
  assert.equal(decide(shipFacts({ staging: { sha: HEAD, deployment: 40, url: null } })).reason, 'the deployment of aaaaaaaa on Staging has no URL: only the deployer of the kit deploys there with one (spec 2.3)');
});
