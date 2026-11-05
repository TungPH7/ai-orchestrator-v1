import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readRoster } from '../../lib/agents/roster.mjs';
import { readContract } from '../../lib/contract.mjs';
import { readGates } from '../../lib/quality/gates.mjs';
import { decideStep } from '../../lib/workflow/steps.mjs';
import { CONTRACT_DIR, ROOT } from '../helpers/kit.mjs';

// release-workflow spec 2.8, 2.9: /ao-ship of a hotfix, and /ao-rollback.
const options = { roster: readRoster(join(ROOT, 'agents')), contract: readContract(CONTRACT_DIR), gates: readGates(join(ROOT, 'quality')) };
const HOTFIX = 'a'.repeat(40);
const PROD = 'b'.repeat(40);
const OLDER = 'c'.repeat(40);
const decide = (command, facts) => decideStep(command, facts, options);

// Production runs v0.1.0; the hotfix of DEMO-40 was merged into main as HOTFIX, runs on Staging, and DEMO-40 is Done.
function hotfixFacts(hotfix = {}) {
  return {
    command: 'ship',
    arg: 'v0.1.1',
    space: 'DEMO',
    item: null,
    runKey: 'v0.1.1',
    hotfix: {
      version: 'v0.1.1',
      production: { sha: PROD, version: 'v0.1.0' },
      expected: 'v0.1.1',
      main: { sha: HOTFIX, pull: { number: 31, head: 'hotfix/DEMO-40-cart-total', key: 'DEMO-40' } },
      bug: { key: 'DEMO-40', state: 'done', status: 'Done', fixVersions: ['v0.1.1'] },
      staging: { sha: HOTFIX },
      tag: null,
      request: null,
      releaseBranches: [{ name: 'release/v0.2.0', version: '0.2.0', sha: OLDER }],
      ...hotfix,
    },
  };
}

test('/ao-ship of a hotfix tags it, asks for Production with your gh login, and opens the merges back, with a script', () => {
  const decision = decide('ship', hotfixFacts());
  assert.equal(decision.go, true);
  assert.deepEqual(decision.runs, [{ action: 'hotfix-ship', key: 'v0.1.1', version: 'v0.1.1', sha: HOTFIX, backMerges: ['develop', 'release/v0.2.0'] }]);
  assert.deepEqual(decision.lines, ['Production runs v0.1.0; v0.1.1 is the hotfix of DEMO-40, merged as aaaaaaaa by PR #31, which Staging runs']);
});

test('once its tag and its deployment request are there, /ao-ship of a hotfix says so and stops', () => {
  const done = decide('ship', hotfixFacts({ tag: { name: 'v0.1.1', sha: HOTFIX }, request: { id: 77, sha: HOTFIX } }));
  assert.deepEqual([done.go, done.reason], [false, 'v0.1.1 is tagged and deployment request #77 asks for it on Production: the deployer takes it within a minute or two']);
  const elsewhere = decide('ship', hotfixFacts({ tag: { name: 'v0.1.1', sha: OLDER } }));
  assert.equal(elsewhere.reason, 'the tag v0.1.1 is at cccccccc, not at the hotfix aaaaaaaa');
});

test('/ao-ship of a hotfix stops while its Bug is not Done, Staging runs another commit, or it is not the next patch of Production', () => {
  assert.equal(decide('ship', hotfixFacts({ bug: { key: 'DEMO-40', state: 'in-qa', status: 'In QA', fixVersions: ['v0.1.1'] } })).reason, 'DEMO-40 is In QA, not Done: QA it on Staging with /ao-qa DEMO-40, then Accept it');
  assert.equal(decide('ship', hotfixFacts({ bug: { key: 'DEMO-40', state: 'done', status: 'Done', fixVersions: ['v0.2.0'] } })).reason, 'DEMO-40 does not carry the Fix Version v0.1.1');
  assert.equal(decide('ship', hotfixFacts({ staging: { sha: OLDER } })).reason, 'Staging runs cccccccc, not the hotfix aaaaaaaa: wait for the deployer');
  assert.equal(decide('ship', hotfixFacts({ expected: 'v0.1.2', version: 'v0.1.1' })).reason, 'v0.1.1 is not the next patch of v0.1.0 on Production: that is v0.1.2');
  assert.equal(decide('ship', hotfixFacts({ production: null })).reason, 'Production runs no tagged release, so there is nothing to patch');
  assert.equal(decide('ship', hotfixFacts({ main: { sha: HOTFIX, pull: { number: 32, head: 'release/v0.1.0', key: null } } })).reason, 'main ends with aaaaaaaa, the merge of PR #32 from release/v0.1.0, not of a hotfix');
});

function rollbackFacts({ arg = 'production', extra, rollback = {} } = {}) {
  return {
    command: 'rollback',
    arg,
    extra,
    space: 'DEMO',
    item: null,
    runKey: `rollback-${arg}`,
    rollback: { environment: arg, running: { sha: HOTFIX }, earlier: [{ sha: PROD, deployment: 70 }, { sha: OLDER, deployment: 60 }], target: null, requested: null, ...rollback },
  };
}

test('/ao-rollback asks for the release that ran before on that environment, with your gh login', () => {
  const decision = decide('rollback', rollbackFacts());
  assert.equal(decision.go, true);
  assert.deepEqual(decision.runs, [{ action: 'deploy-request', key: 'rollback-production', environment: 'production', sha: PROD, rollback: true }]);
  assert.deepEqual(decision.lines, ['Production runs aaaaaaaa; the request asks for bbbbbbbb, the release that ran there before']);
});

test('/ao-rollback <env> <sha> asks for that commit: it unblocks a stuck environment, or brings a release back (plan decision 5)', () => {
  const decision = decide('rollback', rollbackFacts({ arg: 'development', extra: 'cccccc', rollback: { target: { sha: OLDER } } }));
  assert.deepEqual(decision.runs, [{ action: 'deploy-request', key: 'rollback-development', environment: 'development', sha: OLDER, rollback: false }]);
  assert.deepEqual(decision.lines, ['Development runs aaaaaaaa; the request asks for cccccccc, the commit you named. The deployer takes the history up to it as read by you']);
});

test('/ao-rollback stops without an earlier release, on a commit already running, or once its request is made', () => {
  assert.equal(decide('rollback', rollbackFacts({ rollback: { earlier: [] } })).reason, 'Production has no earlier release that ran there');
  assert.equal(decide('rollback', rollbackFacts({ extra: 'zzz', rollback: { target: null } })).reason, 'zzz is not a commit of the repository');
  assert.equal(decide('rollback', rollbackFacts({ extra: 'aaaaaaa', rollback: { target: { sha: HOTFIX } } })).reason, 'Production runs aaaaaaaa already');
  const made = decide('rollback', rollbackFacts({ rollback: { requested: { id: 78, sha: PROD } } }));
  assert.deepEqual([made.go, made.reason, made.next], [false, 'deployment request #78 asks for bbbbbbbb on Production: the deployer takes it within a minute or two', '/ao-status']);
});

test('/ao-status of the space also says what runs where, the open release branch, what is Done but not released, and the Release click left on Jira', () => {
  const status = decide('status', {
    command: 'status',
    space: 'DEMO',
    items: [],
    pulls: [],
    runs: [],
    release: {
      running: { development: { sha: HOTFIX }, staging: null, production: { sha: PROD } },
      productionVersion: { name: 'v0.1.0', released: false },
      releaseBranches: [{ name: 'release/v0.2.0', version: '0.2.0', sha: OLDER }],
      doneUnreleased: ['DEMO-12', 'DEMO-16'],
    },
  });
  assert.deepEqual(status.lines, [
    'Waiting for you:',
    '  v0.1.0: click Release on it in Jira: it runs on Production',
    '',
    'Running: Development aaaaaaaa, Staging nothing, Production v0.1.0 (bbbbbbbb)',
    'Open release branch: release/v0.2.0',
    'Done, not released yet: DEMO-12, DEMO-16',
  ]);
  assert.equal(status.next, 'v0.1.0: click Release on it in Jira: it runs on Production');
});
