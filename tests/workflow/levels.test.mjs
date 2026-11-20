import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, effectiveLevel, itemLevel, labelLevel, trustedLabels } from '../../lib/workflow/levels.mjs';

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

// Review of shop PR #79 (SHOP-78), Medium: an agent with the Jira permission edit writes the whole label list when it
// flags an item, so it could write a lower level too. Only the human lowers a level: a change of a level label by the
// agents' account, after it created the item, does not count.
const AGENTS = '712020:agents';
const HUMAN = '557058:human';
const change = (accountId, fromString, toString, created) => ({ author: { accountId }, created, items: [{ field: 'labels', fromString, toString }] });

test('trustedLabels undoes the level labels the agents account changed after the item was made', () => {
  const opts = { agentAccount: AGENTS, prefix: 'ao-level-' };
  // An agent wrote light over heavy, then flagged the item without a level.
  const lowered = [change(AGENTS, 'ao-fe-dev ao-level-heavy', 'ao-fe-dev ao-level-light', '2026-11-20T01:00:00.000+0700')];
  assert.equal(labelLevel(trustedLabels(['ao-fe-dev', 'ao-level-light'], lowered, opts), 'ao-level-'), 'heavy');
  const dropped = [change(AGENTS, 'ao-fe-dev ao-level-heavy', 'ao-fe-dev needs-you', '2026-11-20T01:00:00.000+0700')];
  assert.equal(labelLevel(trustedLabels(['ao-fe-dev', 'needs-you'], dropped, opts), 'ao-level-'), 'heavy');
  // Flagging that keeps the level, and the labels that are no level, stay as they are.
  const flagged = [change(AGENTS, 'ao-fe-dev ao-level-standard', 'ao-fe-dev ao-level-standard needs-you', '2026-11-20T01:00:00.000+0700')];
  assert.deepEqual(trustedLabels(['ao-fe-dev', 'ao-level-standard', 'needs-you'], flagged, opts), ['ao-fe-dev', 'ao-level-standard', 'needs-you']);
  // The human lowers it: that counts.
  const human = [change(HUMAN, 'ao-be-dev ao-level-heavy', 'ao-be-dev ao-level-light', '2026-11-20T01:00:00.000+0700')];
  assert.equal(labelLevel(trustedLabels(['ao-be-dev', 'ao-level-light'], human, opts), 'ao-level-'), 'light');
  // An agent that added a level to an item with none: no level, so standard.
  const added = [change(AGENTS, 'ao-fe-dev', 'ao-fe-dev ao-level-light', '2026-11-20T01:00:00.000+0700')];
  assert.equal(labelLevel(trustedLabels(['ao-fe-dev', 'ao-level-light'], added, opts), 'ao-level-'), null);
  // Without the account of the agents, nothing can be told apart: the labels as they are.
  assert.deepEqual(trustedLabels(['ao-level-light'], lowered, { prefix: 'ao-level-' }), ['ao-level-light']);
});

test('itemLevel reads the labels and the changelog of the item, for merge-gate and audit', async () => {
  const mapping = { work_labels: { level_prefix: 'ao-level-' }, identities: [{ id: 'agents', account_id: AGENTS }] };
  const asked = [];
  const jira = {
    get: async (path) => (asked.push(path), { fields: { labels: ['ao-fe-dev', 'ao-level-light'] } }),
    getAll: async (path) => (asked.push(path), [change(AGENTS, 'ao-fe-dev ao-level-standard', 'ao-fe-dev ao-level-light', '2026-11-20T01:00:00.000+0700')]),
  };
  assert.equal(await itemLevel(jira, mapping)('SHOP-9'), 'standard');
  assert.deepEqual(asked, ['/rest/api/3/issue/SHOP-9', '/rest/api/3/issue/SHOP-9/changelog']);
});
