import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { changedLineCoverage, changedLines, parseLcov } from '../../lib/quality/coverage.mjs';
import { readGates } from '../../lib/quality/gates.mjs';
import { ROOT } from '../helpers/kit.mjs';

const gates = readGates(join(ROOT, 'quality'));

// What node --test writes on Windows: paths relative to where it ran, with backslashes.
const LCOV = `TN:
SF:src\\math.ts
DA:1,1
DA:2,1
DA:3,1
DA:5,0
DA:6,0
end_of_record
SF:/work/shop/apps/api/src/auth.ts
DA:10,3
DA:11,0
end_of_record
`;

const DIFF = `diff --git a/src/math.ts b/src/math.ts
--- a/src/math.ts
+++ b/src/math.ts
@@ -1,0 +2,2 @@ export function add(a, b) {
+  return a + b;
+}
@@ -8 +5,3 @@
+export function unused() {
+  return 1;
+}
diff --git a/src/math.test.ts b/src/math.test.ts
--- a/src/math.test.ts
+++ b/src/math.test.ts
@@ -0,0 +1,2 @@
+import { add } from './math';
+test('add', () => expect(add(1, 2)).toBe(3));
diff --git a/src/old.ts b/src/old.ts
--- a/src/old.ts
+++ /dev/null
@@ -1,2 +0,0 @@
-export const old = 1;
-export const older = 2;
`;

test('parseLcov reads the hits of each line, with paths relative to the repository and forward slashes', () => {
  const lcov = parseLcov(LCOV, { lcovDir: '/work/shop', root: '/work/shop' });
  assert.deepEqual([...lcov.keys()], ['src/math.ts', 'apps/api/src/auth.ts']);
  assert.deepEqual([...lcov.get('src/math.ts')], [[1, 1], [2, 1], [3, 1], [5, 0], [6, 0]]);
  // A relative SF of a package's lcov is relative to that package.
  assert.deepEqual([...parseLcov('SF:src/a.ts\nDA:1,1\nend_of_record\n', { lcovDir: '/work/shop/apps/web', root: '/work/shop' }).keys()], ['apps/web/src/a.ts']);
});

test('changedLines reads the added and changed lines of a zero-context diff, and skips deleted files', () => {
  const changed = changedLines(DIFF);
  assert.deepEqual([...changed.get('src/math.ts')], [2, 3, 5, 6, 7]);
  assert.deepEqual([...changed.get('src/math.test.ts')], [1, 2]);
  assert.ok(!changed.has('src/old.ts'));
});

test('only executable changed lines of source files count, and the result says which lines lack a test', () => {
  const lcov = parseLcov(LCOV, { lcovDir: '/work/shop', root: '/work/shop' });
  const result = changedLineCoverage({ changed: changedLines(DIFF), lcov, coverage: gates.coverage });
  // Lines 2, 3, 5, 6 are in lcov (7 is a closing brace it skipped); 2 and 3 ran, 5 and 6 did not. The test file is left out.
  assert.deepEqual(result.files, [{ file: 'src/math.ts', covered: 2, total: 4, uncovered: [5, 6] }]);
  assert.equal(result.percent, 50);
  assert.equal(result.ok, false);
  assert.deepEqual(result.problems, ['changed lines covered: 50% (2 of 4), below 80%']);
});

test('a changed source file missing from lcov fails, and config files, migrations and type declarations do not count', () => {
  const diff = ['src/new.ts', 'next.config.mjs', 'apps/api/src/migrations/1700-init.ts', 'src/types.d.ts', 'README.md']
    .map((file) => `diff --git a/${file} b/${file}\n--- /dev/null\n+++ b/${file}\n@@ -0,0 +1 @@\n+x\n`)
    .join('');
  const result = changedLineCoverage({ changed: changedLines(diff), lcov: new Map(), coverage: gates.coverage });
  assert.equal(result.ok, false);
  assert.deepEqual(result.problems, ['src/new.ts is not in any lcov file: the coverage of the tests must include every source file']);
});

test('a PR that changes no executable line passes', () => {
  const result = changedLineCoverage({ changed: changedLines('diff --git a/README.md b/README.md\n+++ b/README.md\n@@ -1 +1 @@\n+text\n'), lcov: new Map(), coverage: gates.coverage });
  assert.deepEqual({ ok: result.ok, percent: result.percent, problems: result.problems }, { ok: true, percent: 100, problems: [] });
});

test('the coverage-diff script compares HEAD with the merge base and exits non-zero below the threshold', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'coverage-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const git = (...args) => spawnSync('git', ['-c', 'user.email=t@example.com', '-c', 'user.name=t', ...args], { cwd: dir, encoding: 'utf8' });
  git('init', '-q', '-b', 'develop');
  mkdirSync(join(dir, 'src'));
  writeFileSync(join(dir, 'src', 'math.ts'), 'export const a = 1;\n');
  git('add', '.');
  git('commit', '-q', '-m', 'chore(repo): start (DEMO-1)');
  git('checkout', '-q', '-b', 'feature/DEMO-2-add');
  writeFileSync(join(dir, 'src', 'math.ts'), 'export const a = 1;\nexport function add(a, b) {\n  return a + b;\n}\n');
  git('commit', '-q', '-am', 'feat(math): add (DEMO-2)');
  mkdirSync(join(dir, 'coverage'));
  const run = (hits) => {
    writeFileSync(join(dir, 'coverage', 'lcov.info'), `SF:src/math.ts\nDA:1,1\nDA:2,1\nDA:3,${hits}\nend_of_record\n`);
    return spawnSync(process.execPath, [join(ROOT, 'scripts', 'coverage-diff.mjs'), '--base', 'develop'], { cwd: dir, encoding: 'utf8' });
  };
  const low = run(0);
  assert.notEqual(low.status, 0);
  assert.match(low.stdout, /src\/math\.ts .*1 of 2/);
  assert.match(low.stderr, /50% \(1 of 2\), below 80%/);
  const high = run(4);
  assert.equal(high.status, 0, high.stderr);
});
