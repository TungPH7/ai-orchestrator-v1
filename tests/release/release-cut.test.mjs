import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextMinor, parseHistory, releaseCutChanges } from '../../lib/release/release-cut.mjs';

const sha = (ch) => ch.repeat(40);

test('parseHistory reads git log --first-parent --format=%H%x09%s, with the keys of the space each subject names', () => {
  const text = [`${sha('a')}\tfeat(cart): add a line (DEMO-12)`, `${sha('b')}\tMerge pull request #30 from TungPH7/main`, `${sha('c')}\tfix(cart): keep the total (DEMO-16, SCRUM-3)`, ''].join('\n');
  assert.deepEqual(parseHistory(text, 'DEMO'), [
    { sha: sha('a'), subject: 'feat(cart): add a line (DEMO-12)', keys: ['DEMO-12'] },
    { sha: sha('b'), subject: 'Merge pull request #30 from TungPH7/main', keys: [] },
    { sha: sha('c'), subject: 'fix(cart): keep the total (DEMO-16, SCRUM-3)', keys: ['DEMO-16'] },
  ]);
  assert.deepEqual(parseHistory('', 'DEMO'), []);
});

test('the release after vX.Y.Z is vX.(Y+1).0', () => {
  assert.equal(nextMinor('v0.1.0'), 'v0.2.0');
  assert.equal(nextMinor('v1.0.0'), 'v1.1.0');
});

test('a cut sets the release on every item in it, moves to the next release the items after it that carried it, and comments on each (spec 2.6)', () => {
  const changes = releaseCutChanges({
    version: 'v0.1.0',
    nextVersion: 'v0.2.0',
    sha: sha('2'),
    approvedAt: '2026-11-06T03:30:00Z',
    included: [{ key: 'DEMO-12', fixVersions: [] }, { key: 'DEMO-21', fixVersions: ['v0.2.0'] }],
    after: [{ key: 'DEMO-24', fixVersions: ['v0.1.0'] }, { key: 'DEMO-25', fixVersions: [] }, { key: 'DEMO-26', fixVersions: ['v0.1.0', 'v0.2.0'] }],
  });
  assert.deepEqual(changes.fixVersions, [
    { key: 'DEMO-12', names: ['v0.1.0'] },
    { key: 'DEMO-21', names: ['v0.1.0'] },
    { key: 'DEMO-24', names: ['v0.2.0'] },
    { key: 'DEMO-26', names: ['v0.2.0'] },
  ]);
  assert.deepEqual(changes.comments, [
    { key: 'DEMO-12', text: 'ao-step: DEMO-12 is in v0.1.0, cut at 22222222 on develop. You approved the list at gate ④ on 2026-11-06T03:30:00Z.' },
    { key: 'DEMO-21', text: 'ao-step: DEMO-21 is in v0.1.0, cut at 22222222 on develop. You approved the list at gate ④ on 2026-11-06T03:30:00Z.' },
    { key: 'DEMO-24', text: 'ao-step: DEMO-24 is after the cut point of v0.1.0, so its Fix Version moved to v0.2.0.' },
    { key: 'DEMO-26', text: 'ao-step: DEMO-26 is after the cut point of v0.1.0, so its Fix Version moved to v0.2.0.' },
  ]);
});

test('a cut comments on each Cancelled item whose code goes out with it, and gives it no Fix Version', () => {
  const changes = releaseCutChanges({
    version: 'v0.1.0',
    nextVersion: 'v0.2.0',
    sha: sha('2'),
    approvedAt: '2026-11-10T03:30:00Z',
    included: [{ key: 'DEMO-4', fixVersions: [] }],
    after: [],
    cancelled: [{ key: 'DEMO-1', fixVersions: [] }],
  });
  assert.deepEqual(changes.fixVersions, [{ key: 'DEMO-4', names: ['v0.1.0'] }]);
  assert.deepEqual(changes.comments.at(-1), {
    key: 'DEMO-1',
    text: 'ao-step: DEMO-1 is Cancelled, but its commits are on develop up to 22222222, so its code goes out with v0.1.0, without a Fix Version. You approved the list at gate ④ on 2026-11-10T03:30:00Z.',
  });
});
