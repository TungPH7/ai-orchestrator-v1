import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changelogWith, regressionResult } from '../../lib/release/release-pr.mjs';

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
  // v0.1.0 is not 0.1.01.
  assert.equal(changelogWith('# Changelog\n\n## [0.1.01]\n', SECTION, 'v0.1.0'), `# Changelog\n\n${SECTION}\n## [0.1.01]\n`);
});

test('the result of a regression report is its line Result: PASS or Result: FAIL, else none', () => {
  assert.equal(regressionResult('## Regression Result\n\n24 passed, 0 failed.\n\nResult: PASS\n'), 'PASS');
  assert.equal(regressionResult('Result: FAIL — 2 failed\n'), 'FAIL');
  assert.equal(regressionResult('## Regression Result\n\nAll green.\n'), null);
  assert.equal(regressionResult(null), null);
});
