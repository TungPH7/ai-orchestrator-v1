import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readRoster } from '../../lib/agents/roster.mjs';
import { readContract } from '../../lib/contract.mjs';
import { readGates } from '../../lib/quality/gates.mjs';
import { decideStep } from '../../lib/workflow/steps.mjs';
import { CONTRACT_DIR, ROOT } from '../helpers/kit.mjs';

// release-workflow spec 2.2, 2.6, 6: /ao-release and /ao-release <vX.Y.0> <sha>.
const options = { roster: readRoster(join(ROOT, 'agents')), contract: readContract(CONTRACT_DIR), gates: readGates(join(ROOT, 'quality')) };
const CUT = '22327a5b9bfd4d7169b9ca451dbcfc9dc6ddbca7';
const done = (key) => ({ key, state: 'done', status: 'Done', fixVersions: [] });

// develop since the newest tag: DEMO-12, DEMO-16 and DEMO-21 are Done up to the cut point; DEMO-24 is still in review.
function releaseFacts({ arg, extra, release = {} } = {}) {
  return {
    command: 'release',
    arg,
    extra,
    space: 'DEMO',
    item: null,
    runKey: arg ?? 'release',
    release: {
      latestTag: null,
      version: 'v0.1.0',
      commits: 14,
      cut: { sha: CUT, subject: 'feat(cart): remove a line from the cart (DEMO-21)' },
      included: [done('DEMO-12'), done('DEMO-16'), done('DEMO-21')],
      after: [{ key: 'DEMO-24', state: 'in-review', status: 'In Review', fixVersions: ['v0.1.0'] }],
      versions: [{ name: 'v0.1.0', released: false }, { name: 'v0.2.0', released: false }],
      releaseBranches: [],
      ...release,
    },
  };
}
const decide = (facts) => decideStep('release', facts, options);
const LINES = [
  'develop: 14 commits since its start; cut point 22327a5 "feat(cart): remove a line from the cart (DEMO-21)"',
  'In v0.1.0: DEMO-12, DEMO-16, DEMO-21 (Done)',
  'After the cut point, for v0.2.0 or later: DEMO-24 (In Review)',
  'Moves from v0.1.0 to v0.2.0 on Jira: DEMO-24',
  'Fix Versions on Jira: v0.1.0 (unreleased), v0.2.0 (unreleased)',
];

test('/ao-release prints the cut point, the items, the release and its Fix Versions, then stops at gate ④', () => {
  const decision = decide(releaseFacts());
  assert.equal(decision.go, false);
  assert.deepEqual(decision.lines, LINES);
  assert.equal(decision.reason, 'gate ④. Read the list, then run /ao-release v0.1.0 22327a5');
  assert.equal(decision.next, '/ao-release v0.1.0 22327a5');
});

test('/ao-release <version> <sha> of that list cuts the release branch with a script, no agent', () => {
  const decision = decide(releaseFacts({ arg: 'v0.1.0', extra: '22327a5' }));
  assert.equal(decision.go, true);
  assert.deepEqual(decision.runs, [
    { action: 'release-cut', key: 'v0.1.0', version: 'v0.1.0', nextVersion: 'v0.2.0', sha: CUT, included: releaseFacts().release.included, after: releaseFacts().release.after },
  ]);
  assert.deepEqual(decision.lines, LINES);
  // You decide when to raise the major (spec 2.6): v1.0.0 instead of v0.1.0 is your call, with its own Fix Versions.
  const major = decide(releaseFacts({ arg: 'v1.0.0', extra: CUT, release: { versions: [{ name: 'v1.0.0', released: false }, { name: 'v1.1.0', released: false }] } }));
  assert.equal(major.go, true);
  assert.equal(major.runs[0].nextVersion, 'v1.1.0');
});

test('/ao-release stops while a release branch is open; once its own branch is open, it says Staging takes it', () => {
  const open = decide(releaseFacts({ release: { releaseBranches: [{ name: 'release/v0.1.0', version: '0.1.0', sha: CUT }] } }));
  assert.deepEqual([open.go, open.reason, open.next], [false, 'release/v0.1.0 is open: ship it before you cut the next release', '/ao-ship v0.1.0']);
  const cut = decide(releaseFacts({ arg: 'v0.1.0', extra: '22327a5', release: { releaseBranches: [{ name: 'release/v0.1.0', version: '0.1.0', sha: CUT }] } }));
  assert.equal(cut.reason, 'release/v0.1.0 is open at 22327a5b: the deployer puts it on Staging within a minute or two');
});

test('/ao-release stops without an item Done to release, and names what holds the cut point back', () => {
  const none = decide(releaseFacts({ release: { cut: null, included: [], after: [{ key: 'DEMO-21', state: 'in-qa', status: 'In QA', fixVersions: [] }, done('DEMO-24')] } }));
  assert.equal(none.reason, 'no cut point on develop since its start: DEMO-21 (In QA) is not Done, and the items after it wait for it');
  const empty = decide(releaseFacts({ release: { latestTag: 'v0.1.0', commits: 0, cut: null, included: [], after: [] } }));
  assert.equal(empty.reason, 'no commit on develop since v0.1.0');
});

test('/ao-release stops when the Fix Versions are not on Jira yet, the version is not the next one, or the sha is not the cut point', () => {
  const missing = decide(releaseFacts({ release: { versions: [{ name: 'v0.1.0', released: false }] } }));
  assert.equal(missing.reason, 'gate ④ waits for the Fix Version v0.2.0 on Jira');
  assert.match(missing.next, /^Create v0\.2\.0 in Jira/);
  assert.equal(decide(releaseFacts({ arg: 'v0.1.0', extra: '22327a5', release: { versions: [{ name: 'v0.1.0', released: true }, { name: 'v0.2.0', released: false }] } })).reason, 'gate ④ waits for the Fix Version v0.1.0 on Jira, unreleased');
  assert.equal(decide(releaseFacts({ arg: 'v0.3.0', extra: '22327a5' })).reason, 'v0.3.0 is not the next release: that is v0.1.0, or a new major');
  assert.equal(decide(releaseFacts({ arg: 'v0.1.0', extra: '1234567' })).reason, '1234567 is not the cut point 22327a5: read the list again');
  assert.equal(decide(releaseFacts({ arg: 'v0.1.0', extra: '2232' })).reason, '2232 is not the cut point 22327a5: read the list again');
});
