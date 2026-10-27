import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readContract } from '../../lib/contract.mjs';
import { readMapping } from '../../lib/tracker/mapping.mjs';
import { countRework, reworkStatus } from '../../lib/tracker/rework.mjs';
import { CONTRACT_DIR, ROOT } from '../helpers/kit.mjs';

const contract = readContract(CONTRACT_DIR);
const mapping = readMapping(join(ROOT, 'tracker'));
const histories = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/tracker/api/changelog-rework.json'), 'utf8')).values;
const story = { contract, mapping, workType: 'story' };

const move = (from, to) => ({ items: [{ field: 'status', fromString: from, toString: to }] });

test('counts request-changes and qa-fail, and skips forward moves and changes that are not status', () => {
  assert.equal(countRework(histories, story), 2);
});

test('an item that never went back has no rework', () => {
  assert.equal(countRework(histories.slice(0, 3), story), 0);
  assert.equal(countRework([], story), 0);
});

test('a status change that matches no transition of the workflow is not rework', () => {
  assert.equal(countRework([move('In QA', 'Ready')], story), 0);
});

test('the third rework reaches the limit of policies.yaml and adds flag-needs-you', () => {
  const third = [...histories, move('In Progress', 'In Review'), move('In Review', 'In Progress')];

  assert.deepEqual(reworkStatus(histories, story), { count: 2, limit: 3, limitReached: false, effects: [] });
  assert.deepEqual(reworkStatus(third, story), { count: 3, limit: 3, limitReached: true, effects: ['flag-needs-you'] });
});

test('Sub-tasks have no rework transition, so their count stays 0', () => {
  assert.equal(countRework([move('In Progress', 'To Do')], { contract, mapping, workType: 'sub-task' }), 0);
});
