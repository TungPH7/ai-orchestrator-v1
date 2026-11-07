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

test('the whole PR again at 301 lines, after a rebase, or without a readable report', () => {
  assert.deepEqual(scope(report(), compare(301)), { mode: 'full', reason: '301 lines changed since a1b2c3d, over 300' });
  for (const status of ['diverged', 'behind']) assert.match(scope(report(), compare(10, { status })).reason, /no longer an ancestor of the head \(rebase or force-push\)/, status);
  assert.equal(scope(report(), null).mode, 'full', 'GitHub no longer knows X');
  assert.deepEqual(scope(report({ ok: false }), compare(10)), { mode: 'full', reason: 'the security report on a1b2c3d cannot be read' });
  assert.deepEqual(scope(null, null), { mode: 'full', reason: 'no security report on this PR yet' });
});

// Pilot 1, second review of ao-sample PR #13 (option b): a protected path no longer asks for the whole PR, only for the
// new part at the roster's effort, which steps sets from `protected`.
test('changes on a protected path are reviewed as the new part, with the protected paths named', () => {
  const workflow = compare(3, { files: [{ filename: '.github/workflows/ci.yml', additions: 2, deletions: 1 }] });
  assert.deepEqual(scope(report(), workflow), { mode: 'delta', reason: '3 lines changed since a1b2c3d, on the protected path .github/workflows/ci.yml', since: X, at: '2026-11-04T08:00:00Z', lines: 3, protected: ['.github/workflows/ci.yml'] });
  const renamed = compare(4, { files: [{ filename: 'docs/ci.yml', previous_filename: '.github/workflows/ci.yml', additions: 2, deletions: 2 }] });
  assert.deepEqual(scope(report(), renamed).protected, ['.github/workflows/ci.yml'], 'a file moved out of a protected path');
});

test('a report already on the head needs no new review', () => {
  assert.equal(scope(report({ onHead: true }), null).mode, 'none');
});

// Pilot 1, second review of ao-sample PR #13: a full review of the whole PR at max cost 7.92 USD to check one fixed High.
// The report of the new part lists the open findings (merge-gate counts those it leaves out), so they are passed on.
test('open Critical or High findings ask for the new part with the findings to check, not for the whole PR', () => {
  const high = { severity: 'High', where: 'review-tree.mjs:7', finding: 'AGENTS.md reaches the review' };
  assert.deepEqual(scope(report({ blocking: 1, open: [high] }), compare(10)), { mode: 'delta', reason: '10 lines changed since a1b2c3d, with 1 Critical or High finding open to check', since: X, at: '2026-11-04T08:00:00Z', lines: 10, earlier: [high] });
  const Y = 'b1b2c3d4e5f60718293a4b5c6d7e8f9012345678';
  const low = { severity: 'Critical', where: 'guard.mjs:75', finding: 'the regex backtracks' };
  // open of the newest report is all that is open after it, what it left out too (openFindings).
  const newest = report({ sha: Y, at: '2026-11-05T08:00:00Z', blocking: 2, open: [low, high] });
  const both = securityScope({ report: newest, full: report({ blocking: 1, open: [high] }), compare: compare(10), gates });
  assert.deepEqual([both.mode, both.earlier, both.reason], ['delta', [low, high], '10 lines changed since a1b2c3d, with 2 Critical or High findings open to check']);
  // The newest report lists the High of the full one as Fixed: it is not asked about again.
  const fixed = securityScope({ report: report({ sha: Y, blocking: 0, open: [] }), full: report({ blocking: 1, open: [high] }), compare: compare(10), gates });
  assert.deepEqual([fixed.earlier, fixed.reason], [undefined, '10 lines changed since a1b2c3d']);
  assert.deepEqual(securityScope({ report: newest, full: null, compare: null, gates }), { mode: 'full', reason: 'no full security report on this PR yet' });
});

test('after a report of the new part, the next one still counts from the last full report (spec 2.6)', () => {
  const Y = 'b1b2c3d4e5f60718293a4b5c6d7e8f9012345678';
  const newest = report({ sha: Y, at: '2026-11-05T08:00:00Z' });
  assert.deepEqual(securityScope({ report: newest, full: report(), compare: compare(40), gates }), { mode: 'delta', reason: '40 lines changed since a1b2c3d', since: X, at: '2026-11-04T08:00:00Z', lines: 40 });
});

// Pilot 1, review cost (option 3): security at max thought for 8–10 minutes on every PR, a 16-line kit copy included.
test('a full review keeps the roster effort on a protected path, a path of security_review or an item with an effort label; high otherwise', async () => {
  const { fullReviewEffort } = await import('../../lib/workflow/security-scope.mjs');
  const effort = (files, more = {}) => fullReviewEffort({ files, protectedPaths: [], item: { key: 'SMP-5', effort: null, subtasks: [] }, gates, rosterEffort: 'max', ...more });
  assert.deepEqual(effort(['apps/api/src/notes/notes.shared.ts', 'apps/api/src/notes/notes.shared.spec.ts']), { effort: 'high', reason: 'no protected path, no path of security_review, no effort label' });
  assert.deepEqual(effort(['apps/api/src/notes/notes.controller.ts', 'README.md']), { effort: 'max', reason: 'the PR touches apps/api/src/notes/notes.controller.ts' });
  // The data layer too (review of ao-sample PR #6); a service is not, or most backend PRs would be at max.
  for (const file of ['package-lock.json', 'apps/web/next.config.ts', 'apps/web/src/middleware.ts', 'apps/api/src/auth/jwt.strategy.ts', 'apps/api/src/main.ts', 'apps/web/.env.local', 'Dockerfile', 'apps/api/src/notes/notes.repository.ts', 'apps/api/src/notes/note.entity.ts', 'apps/api/prisma/schema.prisma', 'apps/api/src/migrations/1700000000000-init.ts', 'db/seed.sql']) {
    assert.equal(effort([file]).effort, 'max', file);
  }
  // Whatever the case of the name, and the other names of the same files (review test of 2026-11-07, head d049513).
  for (const file of ['apps/web/src/AuthProvider.tsx', 'apps/web/src/hooks/useAuth.ts', 'apps/web/src/lib/OAuth.ts', 'apps/web/src/hooks/useSession.ts', 'docker-compose.yaml', 'compose.yml', 'apps/api/compose.dev.yaml', '.npmrc', 'apps/web/src/proxy.ts', 'pnpm-lock.yaml', 'yarn.lock']) {
    assert.equal(effort([file]).effort, 'max', file);
  }
  assert.deepEqual(effort(['.ai-orchestrator/lib/x.mjs'], { protectedPaths: ['.ai-orchestrator/lib/x.mjs'] }), { effort: 'max', reason: 'the PR touches the protected path .ai-orchestrator/lib/x.mjs' });
  const labelled = { key: 'SMP-7', effort: null, subtasks: [{ key: 'SMP-8', effort: 'xhigh' }] };
  assert.deepEqual(effort(['apps/web/src/app/notes/note-list.tsx'], { item: labelled }), { effort: 'max', reason: 'SMP-8 has the effort label xhigh' });
});
