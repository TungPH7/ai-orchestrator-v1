// Review of shop PR #79: the range dep-check writes on an approved library is read, so an install or a package.json
// asks only for versions inside it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rangeWithin, versionWithin } from '../../lib/quality/version-range.mjs';

test('a version inside a range: caret, tilde, x and the bare forms', () => {
  const inside = [
    ['4.6.6', '^4.6.6'], ['4.9.0', '^4.6.6'], ['0.44.1', '^0.44.0'], ['0.0.3', '^0.0.3'], ['4.0.0', '^4'], ['4.1.0', '4'],
    ['1.6.9', '1.6.x'], ['1.6.0', '1.6'], ['1.6.3', '1.6.3'], ['1.6.3', '=1.6.3'], ['1.6.4', '~1.6.3'], ['2.1.0', '>=2.0.0 <3.0.0'],
    ['3.0.0', '^2.0.0 || ^3.0.0'], ['9.9.9', '*'], ['v4.7.0', '^4.6.6'],
  ];
  for (const [version, range] of inside) assert.equal(versionWithin(version, range), true, `${version} in ${range}`);
  const outside = [
    ['5.0.0', '^4.6.6'], ['4.6.5', '^4.6.6'], ['0.45.0', '^0.44.0'], ['0.0.4', '^0.0.3'], ['1.7.0', '1.6.x'], ['1.6.4', '1.6.3'],
    ['1.7.0', '~1.6.3'], ['3.0.0', '>=2.0.0 <3.0.0'], ['4.0.0', '^2.0.0 || ^3.0.0'],
  ];
  for (const [version, range] of outside) assert.equal(versionWithin(version, range), false, `${version} not in ${range}`);
});

test('what cannot be checked is null, never true: a tag, a prerelease, a hyphen range, a Maven interval', () => {
  for (const [version, range] of [['latest', '^4'], ['5.0.0-beta.1', '^5.0.0-beta.0'], ['1.2.3', '1.0.0 - 2.0.0'], ['1.6.3', '[1.6,1.7)'], ['1.6.3.Final', '1.6.3.Final'], ['4.1.0', '']]) {
    assert.equal(versionWithin(version, range), null, `${version} in ${range}`);
  }
});

test('a range inside a range: what a package.json asks for, against what was approved', () => {
  assert.equal(rangeWithin('^4.7.0', '^4.6.6'), true);
  assert.equal(rangeWithin('4.7.0', '^4.6.6'), true);
  assert.equal(rangeWithin('~4.7.0', '^4.6.6'), true);
  assert.equal(rangeWithin('^5.0.0', '^4.6.6'), false);
  assert.equal(rangeWithin('>=4.7.0', '^4.6.6'), false, 'no upper bound reaches 5');
  assert.equal(rangeWithin('4.x', '^4.6.6'), false, 'from 4.0.0, below the approved 4.6.6');
  assert.equal(rangeWithin('*', '^4.6.6'), false);
  assert.equal(rangeWithin('latest', '^4.6.6'), null);
});
