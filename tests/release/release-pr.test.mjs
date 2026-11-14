import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkConventions } from '../../lib/quality/policy.mjs';
import { notesPaths, notesVersion } from '../../lib/quality/merge-gate.mjs';
import { changelogWith, notesPullRequest, onReleaseHead, regressionResult, waitForMerge } from '../../lib/release/release-pr.mjs';

const SECTION = '## v0.1.0 — 2026-11-06\n\n### Added\n\n- Xóa một dòng khỏi giỏ hàng (DEMO-21)\n';

test('the section of a release goes under the title of CHANGELOG.md, newest first', () => {
  assert.equal(changelogWith('# Changelog\n\n## v0.0.9\n\n- cũ\n', SECTION, 'v0.1.0'), `# Changelog\n\n${SECTION}\n## v0.0.9\n\n- cũ\n`);
  assert.equal(changelogWith(null, SECTION, 'v0.1.0'), `# Changelog\n\n${SECTION}`);
  assert.equal(changelogWith('## v0.0.9\n', SECTION, 'v0.1.0'), `${SECTION}\n## v0.0.9\n`, 'no title: the section goes first');
});

test('a changelog that has the section already gets the new one in its place, so a step run again adds nothing', () => {
  const once = changelogWith('# Changelog\n', SECTION, 'v0.1.0');
  assert.equal(changelogWith(once, SECTION, 'v0.1.0'), once);
  // devops wrote the notes again after the regression ran again (T21): the older section of the release goes, and a
  // heading without the v, as devops writes it, is the same release.
  const older = '# Changelog\n\n## [0.1.0] - 2026-11-05\n\n### Fixed\n\nKhông có\n\n## [0.0.9] - 2026-10-01\n\n- cũ\n';
  assert.equal(changelogWith(older, SECTION, 'v0.1.0'), `# Changelog\n\n${SECTION}\n## [0.0.9] - 2026-10-01\n\n- cũ\n`);
  assert.equal(changelogWith('# Changelog\n\n## [v0.1.0] - 2026-11-06\n', SECTION, 'v0.1.0'), `# Changelog\n\n${SECTION}`);
  // Low of reviewer on ao-pilot PR #23: the old section ends at the next heading of a release, not at any level-two
  // heading, such as the ## Added of templates/release-notes.md.
  const levelTwo = '# Changelog\n\n## [0.1.0] - 2026-11-05\n\n## Added\n\n- cũ\n\n## [0.0.9] - 2026-10-01\n\n- cũ hơn\n';
  assert.equal(changelogWith(levelTwo, SECTION, 'v0.1.0'), `# Changelog\n\n${SECTION}\n## [0.0.9] - 2026-10-01\n\n- cũ hơn\n`);
  // v0.1.0 is not 0.1.01.
  assert.equal(changelogWith('# Changelog\n\n## [0.1.01]\n', SECTION, 'v0.1.0'), `# Changelog\n\n${SECTION}\n## [0.1.01]\n`);
});

test('the result of a regression report is its line Result: PASS or Result: FAIL, else none', () => {
  assert.equal(regressionResult('## Regression Result\n\n24 passed, 0 failed.\n\nResult: PASS\n'), 'PASS');
  assert.equal(regressionResult('Result: FAIL — 2 failed\n'), 'FAIL');
  assert.equal(regressionResult('## Regression Result\n\nAll green.\n'), null);
  assert.equal(regressionResult(null), null);
});

// Pilot 3, review of shop PR #13 (spec 2.9): the report of /ao-ship comes as a PR from a branch of its own into the
// release branch, which merge-gate merges; the rulesets let no App push to release/* any more.
test('the PR of the release report: release-notes/vX.Y.Z into the release branch, named as the policy job and merge-gate expect', () => {
  const notes = notesPullRequest('v0.2.0');
  assert.equal(notes.head, 'release-notes/v0.2.0');
  assert.equal(notes.title, 'release notes: v0.2.0');
  assert.match(notes.body, /merge-gate merges this PR once CI is green/);
  const pr = { head: { ref: notes.head, repo: { full_name: 'acme/shop' } }, base: { ref: 'release/v0.2.0', repo: { full_name: 'acme/shop' } } };
  assert.equal(notesVersion(pr), '0.2.0');
  assert.deepEqual(notesPaths('0.2.0'), ['docs/releases/v0.2.0.md', 'CHANGELOG.md']);
  assert.deepEqual(checkConventions({ branch: notes.head, base: 'release/v0.2.0', commits: [], title: notes.title }), []);
});

// A clock and a wait that only move time on, and the answers of GET /pulls/{n} in turn.
function poll(answers) {
  let time = 0;
  const waits = [];
  const read = async () => answers[Math.min(waits.length, answers.length - 1)];
  return { read, waits, options: { every: 20_000, limit: 60_000, now: () => time, wait: async (ms) => { waits.push(ms); time += ms; } } };
}

test('waiting for the merge of the report: merged, closed without a merge, or still open when the time is up', async () => {
  const merged = poll([{ state: 'open', merged: false }, { state: 'open', merged: false }, { state: 'closed', merged: true }]);
  assert.equal(await waitForMerge(merged.read, merged.options), 'merged');
  assert.deepEqual(merged.waits, [20_000, 20_000]);
  const closed = poll([{ state: 'closed', merged: false }]);
  assert.equal(await waitForMerge(closed.read, closed.options), 'closed');
  assert.deepEqual(closed.waits, []);
  const open = poll([{ state: 'open', merged: false }]);
  assert.equal(await waitForMerge(open.read, open.options), 'waiting');
  assert.deepEqual(open.waits, [20_000, 20_000, 20_000]);
});

// Review round 3 of shop PR #13: merge-gate merges the report only as one commit on the head of the release branch, so
// /ao-ship makes the branch of the report again when the release branch moved on under it.
test('the branch of the report is one commit on the head of the release branch, or it is made again', () => {
  const HEAD = 'c'.repeat(40);
  assert.equal(onReleaseHead({ parents: [{ sha: HEAD }] }, HEAD), true);
  assert.equal(onReleaseHead({ parents: [{ sha: 'd'.repeat(40) }] }, HEAD), false, 'the release branch moved on');
  assert.equal(onReleaseHead({ parents: [{ sha: HEAD }, { sha: 'd'.repeat(40) }] }, HEAD), false, 'a merge commit');
  assert.equal(onReleaseHead({ parents: [] }, HEAD), false);
  assert.equal(onReleaseHead(undefined, HEAD), false);
});
