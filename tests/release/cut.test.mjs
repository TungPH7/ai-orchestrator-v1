import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cutPoint } from '../../lib/release/cut.mjs';

// A first-parent commit of develop: c('a1', 'DEMO-1') is a squash merge whose PR title names DEMO-1.
const c = (sha, ...keys) => ({ sha, subject: `subject of ${sha}`, keys });
const pairs = (items) => (keys) => keys.map((key) => ({ key, state: items[key] ?? null }));

test('every item Done: the cut point is the newest commit and every item is in the release', () => {
  const items = { 'DEMO-1': 'done', 'DEMO-2': 'done', 'DEMO-3': 'done' };
  const commits = [c('a1', 'DEMO-1'), c('b2', 'DEMO-2'), c('c3', 'DEMO-3'), c('d4', 'DEMO-1')];
  const at = pairs(items);
  assert.deepEqual(cutPoint({ commits, items }), { cut: commits[3], included: at(['DEMO-1', 'DEMO-2', 'DEMO-3']), after: [], cancelled: [] });
});

test('an item in the middle of the history not Done: the cut point is the commit before it', () => {
  const items = { 'DEMO-1': 'done', 'DEMO-2': 'in-qa', 'DEMO-3': 'done' };
  const commits = [c('a1', 'DEMO-1'), c('b2', 'DEMO-2'), c('c3', 'DEMO-3')];
  const at = pairs(items);
  // DEMO-3 is Done, but the release branch cannot hold it without the commit of DEMO-2 under it.
  assert.deepEqual(cutPoint({ commits, items }), { cut: commits[0], included: at(['DEMO-1']), after: at(['DEMO-2', 'DEMO-3']), cancelled: [] });
});

test('an item with commits before and after the cut point goes to the next release', () => {
  // DEMO-2 failed QA after its first merge; the fix came back on a second PR, after DEMO-3 was merged.
  const items = { 'DEMO-1': 'done', 'DEMO-2': 'done', 'DEMO-3': 'ready-for-qa' };
  const commits = [c('a1', 'DEMO-1'), c('b2', 'DEMO-2'), c('c3', 'DEMO-3'), c('d4', 'DEMO-2')];
  const at = pairs(items);
  assert.deepEqual(cutPoint({ commits, items }), { cut: commits[0], included: at(['DEMO-1']), after: at(['DEMO-2', 'DEMO-3']), cancelled: [] });
});

test('no item Done: no cut point, and every item is after it', () => {
  const items = { 'DEMO-1': 'ready-for-qa', 'DEMO-2': 'in-qa' };
  const commits = [c('a1', 'DEMO-1'), c('b2', 'DEMO-2')];
  assert.deepEqual(cutPoint({ commits, items }), { cut: null, included: [], after: pairs(items)(['DEMO-1', 'DEMO-2']), cancelled: [] });
});

test('a Done item after one not Done does not make a cut point', () => {
  const items = { 'DEMO-1': 'in-qa', 'DEMO-2': 'done' };
  const commits = [c('a1', 'DEMO-1'), c('b2', 'DEMO-2')];
  assert.deepEqual(cutPoint({ commits, items }), { cut: null, included: [], after: pairs(items)(['DEMO-1', 'DEMO-2']), cancelled: [] });
});

test('no commit since the newest tag: no cut point', () => {
  assert.deepEqual(cutPoint({ commits: [], items: {} }), { cut: null, included: [], after: [], cancelled: [] });
});

test('a commit without an item, such as a merge back from main, can be the cut point', () => {
  const items = { 'DEMO-1': 'done', 'DEMO-2': 'in-review' };
  const commits = [c('a1', 'DEMO-1'), c('m2'), c('b3', 'DEMO-2'), c('m4')];
  const at = pairs(items);
  assert.deepEqual(cutPoint({ commits, items }), { cut: commits[1], included: at(['DEMO-1']), after: at(['DEMO-2']), cancelled: [] });
});

test('commits without any item hold nothing to release', () => {
  assert.deepEqual(cutPoint({ commits: [c('m1'), c('m2')], items: {} }), { cut: null, included: [], after: [], cancelled: [] });
});

test('a commit that names two items needs both Done', () => {
  const items = { 'DEMO-1': 'done', 'DEMO-2': 'in-qa', 'DEMO-3': 'done' };
  const commits = [c('a1', 'DEMO-3'), c('b2', 'DEMO-1', 'DEMO-2')];
  const at = pairs(items);
  assert.deepEqual(cutPoint({ commits, items }), { cut: commits[0], included: at(['DEMO-3']), after: at(['DEMO-1', 'DEMO-2']), cancelled: [] });
});

test('an item whose state is unknown, such as one moved to another space, holds the cut point back', () => {
  const items = { 'DEMO-1': 'done' };
  const commits = [c('a1', 'DEMO-1'), c('b2', 'DEMO-2')];
  const at = pairs(items);
  assert.deepEqual(cutPoint({ commits, items }), { cut: commits[0], included: at(['DEMO-1']), after: at(['DEMO-2']), cancelled: [] });
});

test('a Cancelled item does not hold the cut point: its code goes out with the release, listed apart for gate ④', () => {
  // Cancelled is a final state: an item cancelled after its merge would hold every later cut point back for good.
  const items = { 'DEMO-1': 'cancelled', 'DEMO-2': 'done', 'DEMO-3': 'cancelled', 'DEMO-4': 'done' };
  const commits = [c('a1', 'DEMO-1'), c('b2', 'DEMO-2'), c('c3', 'DEMO-3'), c('d4', 'DEMO-4'), c('e5', 'DEMO-1')];
  const at = pairs(items);
  assert.deepEqual(cutPoint({ commits, items }), { cut: commits[4], included: at(['DEMO-2', 'DEMO-4']), after: [], cancelled: at(['DEMO-1', 'DEMO-3']) });
});

test('a Cancelled item after the cut point waits for the release that holds its commits', () => {
  const items = { 'DEMO-1': 'done', 'DEMO-2': 'in-qa', 'DEMO-3': 'cancelled' };
  const commits = [c('a1', 'DEMO-1'), c('b2', 'DEMO-2'), c('c3', 'DEMO-3')];
  const at = pairs(items);
  assert.deepEqual(cutPoint({ commits, items }), { cut: commits[0], included: at(['DEMO-1']), after: at(['DEMO-2']), cancelled: [] });
});

test('Cancelled items alone release nothing', () => {
  const items = { 'DEMO-1': 'cancelled', 'DEMO-2': 'in-qa' };
  assert.deepEqual(cutPoint({ commits: [c('a1', 'DEMO-1')], items }), { cut: null, included: [], after: [], cancelled: [] });
  assert.deepEqual(cutPoint({ commits: [c('a1', 'DEMO-1'), c('b2', 'DEMO-2')], items }), { cut: null, included: [], after: pairs(items)(['DEMO-2']), cancelled: [] });
});

test('an Epic does not hold the cut point: only its children are released, so its spec goes with the cut point that covers it', () => {
  const items = { 'DEMO-1': 'done', 'DEMO-2': 'in-progress', 'DEMO-3': 'done' };
  const commits = [c('a1', 'DEMO-1'), c('b2', 'DEMO-2'), c('c3', 'DEMO-3')];
  const at = pairs(items);
  assert.deepEqual(cutPoint({ commits, items, epics: ['DEMO-2'] }), { cut: commits[2], included: at(['DEMO-1', 'DEMO-3']), after: [], cancelled: [] });
});

test('a commit that names only an Epic releases nothing by itself', () => {
  const commits = [c('a1', 'DEMO-2')];
  assert.deepEqual(cutPoint({ commits, items: { 'DEMO-2': 'in-progress' }, epics: ['DEMO-2'] }), { cut: null, included: [], after: [], cancelled: [] });
});

test('a commit that names an Epic and an item still waits for the item', () => {
  const items = { 'DEMO-1': 'in-qa', 'DEMO-2': 'in-progress' };
  const commits = [c('a1', 'DEMO-1', 'DEMO-2')];
  assert.deepEqual(cutPoint({ commits, items, epics: ['DEMO-2'] }), { cut: null, included: [], after: pairs(items)(['DEMO-1']), cancelled: [] });
});
