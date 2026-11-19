import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, effectiveLevel, labelLevel } from '../../lib/workflow/levels.mjs';

test('three levels, from the lightest (C1 spec section 2)', () => {
  assert.deepEqual(LEVELS, ['light', 'standard', 'heavy']);
});

test('no label is standard, so an item from before C1 keeps its process', () => {
  assert.deepEqual(effectiveLevel(), { level: 'standard', label: null, reasons: [] });
  assert.deepEqual(effectiveLevel({ label: 'giant' }), { level: 'standard', label: null, reasons: [] }, 'a label of no level');
  assert.deepEqual(effectiveLevel({ label: 'light', tier: 'sensitive' }), { level: 'light', label: 'light', reasons: [] }, 'only a critical tier raises it');
});

test('a critical path makes it heavy; a Critical or High of a review raises it one step; a QA fail does not', () => {
  assert.deepEqual(effectiveLevel({ label: 'light', tier: 'critical' }), { level: 'heavy', label: 'light', reasons: ['the PR touches a critical path'] });
  assert.deepEqual(effectiveLevel({ label: 'light', blockingFound: true }), { level: 'standard', label: 'light', reasons: ['a review found a Critical or High'] });
  assert.deepEqual(effectiveLevel({ blockingFound: true }), { level: 'heavy', label: null, reasons: ['a review found a Critical or High'] });
  assert.deepEqual(effectiveLevel({ label: 'standard', qaFailed: true }), { level: 'standard', label: 'standard', reasons: [] }, 'a QA report has no severity, and QA again at standard needs standard items');
  assert.deepEqual(effectiveLevel({ label: 'heavy', blockingFound: true, tier: 'critical' }), { level: 'heavy', label: 'heavy', reasons: [] }, 'heavy is the top');
  assert.equal(effectiveLevel({ label: 'light', blockingFound: true, tier: 'sensitive' }).level, 'standard', 'one step');
});

test('the label of a level: the higher wins; other labels are left out', () => {
  assert.equal(labelLevel(['ao-level-light', 'ao-level-heavy', 'ao-fe-dev'], 'ao-level-'), 'heavy');
  assert.equal(labelLevel(['ao-level-huge', 'needs-you'], 'ao-level-'), null);
  assert.equal(labelLevel([], 'ao-level-'), null);
});
