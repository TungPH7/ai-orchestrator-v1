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
  assert.deepEqual(cutPoint({ commits, items }), { cut: commits[3], included: at(['DEMO-1', 'DEMO-2', 'DEMO-3']), after: [] });
});

test('an item in the middle of the history not Done: the cut point is the commit before it', () => {
  const items = { 'DEMO-1': 'done', 'DEMO-2': 'in-qa', 'DEMO-3': 'done' };
  const commits = [c('a1', 'DEMO-1'), c('b2', 'DEMO-2'), c('c3', 'DEMO-3')];
  const at = pairs(items);
  // DEMO-3 is Done, but the release branch cannot hold it without the commit of DEMO-2 under it.
  assert.deepEqual(cutPoint({ commits, items }), { cut: commits[0], included: at(['DEMO-1']), after: at(['DEMO-2', 'DEMO-3']) });
});

test('an item with commits before and after the cut point goes to the next release', () => {
  // DEMO-2 failed QA after its first merge; the fix came back on a second PR, after DEMO-3 was merged.
  const items = { 'DEMO-1': 'done', 'DEMO-2': 'done', 'DEMO-3': 'ready-for-qa' };
  const commits = [c('a1', 'DEMO-1'), c('b2', 'DEMO-2'), c('c3', 'DEMO-3'), c('d4', 'DEMO-2')];
  const at = pairs(items);
  assert.deepEqual(cutPoint({ commits, items }), { cut: commits[0], included: at(['DEMO-1']), after: at(['DEMO-2', 'DEMO-3']) });
});

test('no item Done: no cut point, and every item is after it', () => {
  const items = { 'DEMO-1': 'ready-for-qa', 'DEMO-2': 'in-qa' };
  const commits = [c('a1', 'DEMO-1'), c('b2', 'DEMO-2')];
  assert.deepEqual(cutPoint({ commits, items }), { cut: null, included: [], after: pairs(items)(['DEMO-1', 'DEMO-2']) });
});

test('a Done item after one not Done does not make a cut point', () => {
  const items = { 'DEMO-1': 'in-qa', 'DEMO-2': 'done' };
  const commits = [c('a1', 'DEMO-1'), c('b2', 'DEMO-2')];
  assert.deepEqual(cutPoint({ commits, items }), { cut: null, included: [], after: pairs(items)(['DEMO-1', 'DEMO-2']) });
});

test('no commit since the newest tag: no cut point', () => {
  assert.deepEqual(cutPoint({ commits: [], items: {} }), { cut: null, included: [], after: [] });
});

test('a commit without an item, such as a merge back from main, can be the cut point', () => {
  const items = { 'DEMO-1': 'done', 'DEMO-2': 'in-review' };
  const commits = [c('a1', 'DEMO-1'), c('m2'), c('b3', 'DEMO-2'), c('m4')];
  const at = pairs(items);
  assert.deepEqual(cutPoint({ commits, items }), { cut: commits[1], included: at(['DEMO-1']), after: at(['DEMO-2']) });
});

test('commits without any item hold nothing to release', () => {
  assert.deepEqual(cutPoint({ commits: [c('m1'), c('m2')], items: {} }), { cut: null, included: [], after: [] });
});

test('a commit that names two items needs both Done', () => {
  const items = { 'DEMO-1': 'done', 'DEMO-2': 'in-qa', 'DEMO-3': 'done' };
  const commits = [c('a1', 'DEMO-3'), c('b2', 'DEMO-1', 'DEMO-2')];
  const at = pairs(items);
  assert.deepEqual(cutPoint({ commits, items }), { cut: commits[0], included: at(['DEMO-3']), after: at(['DEMO-1', 'DEMO-2']) });
});

test('only Done counts: a Cancelled item, or one whose state is unknown, holds the cut point back', () => {
  for (const items of [{ 'DEMO-1': 'done', 'DEMO-2': 'cancelled' }, { 'DEMO-1': 'done' }]) {
    const commits = [c('a1', 'DEMO-1'), c('b2', 'DEMO-2')];
    const at = pairs(items);
    assert.deepEqual(cutPoint({ commits, items }), { cut: commits[0], included: at(['DEMO-1']), after: at(['DEMO-2']) });
  }
});
