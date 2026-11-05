import { test } from 'node:test';
import assert from 'node:assert/strict';
import { latestTag, nextPatch, nextRelease, parseVersion } from '../../lib/release/versions.mjs';

test('parseVersion reads v<major>.<minor>.<patch> and nothing else', () => {
  assert.deepEqual(parseVersion('v0.1.0'), { major: 0, minor: 1, patch: 0 });
  assert.deepEqual(parseVersion('v12.30.4'), { major: 12, minor: 30, patch: 4 });
  for (const tag of ['0.1.0', 'v0.1', 'v0.1.0.1', 'v0.1.0-rc.1', 'v01.1.0', 'v0.01.0', 'V0.1.0', 'release/v0.1.0', ' v0.1.0', '', null]) {
    assert.equal(parseVersion(tag), null, `${JSON.stringify(tag)} is not a version`);
  }
});

test('the first release is v0.1.0', () => {
  assert.equal(nextRelease([]), 'v0.1.0');
  assert.equal(latestTag([]), null);
});

test('the next release raises the minor of the newest tag and resets the patch', () => {
  assert.equal(nextRelease(['v0.1.0']), 'v0.2.0');
  assert.equal(nextRelease(['v0.1.0', 'v0.1.1', 'v0.2.0', 'v0.2.1']), 'v0.3.0');
  assert.equal(nextRelease(['v1.0.0']), 'v1.1.0', 'a major you chose stays');
});

test('the newest tag is the highest number, not the last in the list nor the highest string', () => {
  const tags = ['v0.10.0', 'v0.9.3', 'v0.2.0'];
  assert.equal(latestTag(tags), 'v0.10.0');
  assert.equal(nextRelease(tags), 'v0.11.0');
  // A patch of an older line, tagged after a rollback, is not the newest release.
  assert.equal(nextRelease(['v0.2.0', 'v0.1.1']), 'v0.3.0');
});

test('tags of another form are ignored', () => {
  const tags = ['v0.3', 'release-0.4.0', 'v0.5.0-rc.1', '0.6.0', 'v0.2.0', 'latest'];
  assert.equal(latestTag(tags), 'v0.2.0');
  assert.equal(nextRelease(tags), 'v0.3.0');
  assert.equal(nextRelease(['v0.3', 'nightly']), 'v0.1.0', 'no tag of the right form: still the first release');
});

test('a hotfix raises the patch of the release running on Production', () => {
  assert.equal(nextPatch(['v0.1.0'], 'v0.1.0'), 'v0.1.1');
  assert.equal(nextPatch(['v0.1.0', 'v0.1.1', 'v0.2.0'], 'v0.2.0'), 'v0.2.1');
});

test('a patch already tagged on the line of Production keeps its number', () => {
  // v0.1.1 went to Production and was rolled back to v0.1.0: the next hotfix is v0.1.2, so no tag is reused.
  assert.equal(nextPatch(['v0.1.0', 'v0.1.1'], 'v0.1.0'), 'v0.1.2');
  // Production runs an older line after a rollback: its patch, not one of the newest release.
  assert.equal(nextPatch(['v0.1.0', 'v0.2.0', 'v0.2.1'], 'v0.1.0'), 'v0.1.1');
  assert.equal(nextPatch(['v0.1.0', 'v0.1.1-rc.1', 'v0.1.x'], 'v0.1.0'), 'v0.1.1', 'tags of another form are ignored');
});

test('no hotfix number when Production runs no release', () => {
  assert.equal(nextPatch(['v0.1.0'], null), null);
  assert.equal(nextPatch(['v0.1.0'], '22327a5'), null);
});
