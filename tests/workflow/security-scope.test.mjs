import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readGates } from '../../lib/quality/gates.mjs';
import { MAX_DELTA_LINES, securityScope } from '../../lib/workflow/security-scope.mjs';
import { ROOT } from '../helpers/kit.mjs';

const gates = readGates(join(ROOT, 'quality'));
const X = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';
const report = (more = {}) => ({ sha: X, at: '2026-11-04T08:00:00Z', ok: true, blocking: 0, onHead: false, ...more });
// The compare of X with the head: `lines` split over test files.
const compare = (lines, more = {}) => ({ status: 'ahead', files: [{ filename: 'apps/api/test/cart.e2e-spec.ts', additions: Math.ceil(lines / 2), deletions: Math.floor(lines / 2) }], ...more });
const scope = (r, c) => securityScope({ report: r, compare: c, gates });

test('only the new part, at high, when X is an ancestor of the head, the diff has at most 300 lines, and no protected path', () => {
  assert.equal(MAX_DELTA_LINES, 300);
  assert.deepEqual(scope(report(), compare(300)), { mode: 'delta', reason: '300 lines changed since a1b2c3d', since: X, at: '2026-11-04T08:00:00Z', lines: 300 });
});

test('the whole PR again at 301 lines, after a rebase, on a protected path, or without a readable report', () => {
  assert.deepEqual(scope(report(), compare(301)), { mode: 'full', reason: '301 lines changed since a1b2c3d, over 300' });
  for (const status of ['diverged', 'behind']) assert.match(scope(report(), compare(10, { status })).reason, /no longer an ancestor of the head \(rebase or force-push\)/, status);
  assert.equal(scope(report(), null).mode, 'full', 'GitHub no longer knows X');
  const workflow = compare(10, { files: [{ filename: '.github/workflows/ci.yml', additions: 2, deletions: 1 }] });
  assert.deepEqual(scope(report(), workflow), { mode: 'full', reason: 'the changes since a1b2c3d touch .github/workflows/ci.yml' });
  const renamed = compare(4, { files: [{ filename: 'docs/ci.yml', previous_filename: '.github/workflows/ci.yml', additions: 2, deletions: 2 }] });
  assert.equal(scope(report(), renamed).mode, 'full', 'a file moved out of a protected path');
  assert.deepEqual(scope(report({ ok: false }), compare(10)), { mode: 'full', reason: 'the security report on a1b2c3d cannot be read' });
  assert.deepEqual(scope(null, null), { mode: 'full', reason: 'no security report on this PR yet' });
});

test('a report already on the head needs no new review', () => {
  assert.equal(scope(report({ onHead: true }), null).mode, 'none');
});
