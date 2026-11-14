import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { changedLineCoverage, changedLines, parseJacoco, parseLcov, projectCoverageExcludes } from '../../lib/quality/coverage.mjs';
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

test('a changed source file missing from lcov fails; config files, migrations, type declarations and the kit copy do not count', () => {
  const kitCopy = ['.ai-orchestrator/lib/contract.mjs', '.claude/hooks/gh-guard.mjs'];
  const diff = ['src/new.ts', 'next.config.mjs', 'apps/api/src/migrations/1700-init.ts', 'src/types.d.ts', 'README.md', ...kitCopy]
    .map((file) => `diff --git a/${file} b/${file}\n--- /dev/null\n+++ b/${file}\n@@ -0,0 +1 @@\n+x\n`)
    .join('');
  const result = changedLineCoverage({ changed: changedLines(diff), lcov: new Map(), coverage: gates.coverage });
  assert.equal(result.ok, false);
  assert.deepEqual(result.problems, ['src/new.ts is not in any coverage report: the coverage of the tests must include every source file']);
});

test('NestJS end-to-end tests named *.e2e-spec.ts are tests, not source (Pilot 1, PR #4 of ao-sample)', () => {
  const diff = ['apps/api/test/app.e2e-spec.ts', 'apps/api/test/notes.e2e-spec.ts']
    .map((file) => `diff --git a/${file} b/${file}\n--- /dev/null\n+++ b/${file}\n@@ -0,0 +1 @@\n+x\n`)
    .join('');
  const result = changedLineCoverage({ changed: changedLines(diff), lcov: new Map(), coverage: gates.coverage });
  assert.deepEqual({ ok: result.ok, problems: result.problems }, { ok: true, problems: [] });
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

// project-scaffold part 3, spec 2.3: the coverage of a Java app comes from its JaCoCo report.
const JACOCO = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><!DOCTYPE report PUBLIC "-//JACOCO//DTD Report 1.1//EN" "report.dtd">'
  + '<report name=""><sessioninfo id="x" start="1" dump="2"/>'
  + '<package name="com/acme/health"><class name="com/acme/health/HealthService" sourcefilename="HealthService.java"><method name="up" desc="()Z" line="22"><counter type="LINE" missed="0" covered="1"/></method></class>'
  + '<sourcefile name="HealthService.java"><line nr="22" mi="0" ci="2" mb="0" cb="0"/><line nr="23" mi="3" ci="0" mb="1" cb="0"/><counter type="LINE" missed="1" covered="1"/></sourcefile></package>'
  + '<package name="com/acme"><sourcefile name="App.java"><line nr="5" mi="0" ci="4" mb="0" cb="0"/></sourcefile></package></report>';

test('a JaCoCo report gives the lines of each Java file, in src/main/java of its app', () => {
  const files = parseJacoco(JACOCO, { appDir: 'apps/api' });
  assert.deepEqual([...files.keys()], ['apps/api/src/main/java/com/acme/health/HealthService.java', 'apps/api/src/main/java/com/acme/App.java']);
  assert.deepEqual([...files.get('apps/api/src/main/java/com/acme/health/HealthService.java')], [[22, 2], [23, 0]]);
  assert.deepEqual(parseJacoco('<report name=""></report>', { appDir: 'apps/api' }).size, 0);
});

test('a changed Java file is counted from the report, and one the report lacks is named', () => {
  const file = 'apps/api/src/main/java/com/acme/health/HealthService.java';
  const missing = 'apps/api/src/main/java/com/acme/order/OrderService.java';
  const diff = [`diff --git a/${file} b/${file}\n--- a/${file}\n+++ b/${file}\n@@ -22,2 +22,2 @@\n-a\n-b\n+a\n+b\n`, `diff --git a/${missing} b/${missing}\n--- /dev/null\n+++ b/${missing}\n@@ -0,0 +1 @@\n+x\n`].join('');
  const result = changedLineCoverage({ changed: changedLines(diff), lcov: parseJacoco(JACOCO, { appDir: 'apps/api' }), coverage: gates.coverage });
  assert.deepEqual(result.files, [{ file, covered: 1, total: 2, uncovered: [23] }]);
  assert.deepEqual(result.problems.slice(0, 1), [`${missing} is not in any coverage report: the coverage of the tests must include every source file`]);
});

test('gates: Java sources count, Java tests do not, and the e2e/ and scripts/ of each app are left out', () => {
  const diff = ['apps/api/src/main/java/com/acme/App.java', 'apps/api/src/test/java/com/acme/AppTest.java', 'apps/user/e2e/home.spec.ts', 'apps/user/scripts/seed.ts', 'e2e/smoke.spec.ts', 'scripts/dev.mjs']
    .map((file) => `diff --git a/${file} b/${file}\n--- /dev/null\n+++ b/${file}\n@@ -0,0 +1 @@\n+x\n`)
    .join('');
  const result = changedLineCoverage({ changed: changedLines(diff), lcov: new Map(), coverage: gates.coverage });
  assert.deepEqual(result.problems, ['apps/api/src/main/java/com/acme/App.java is not in any coverage report: the coverage of the tests must include every source file']);
  assert.deepEqual(gates.coverage.jacoco, ['apps/*/target/site/jacoco/jacoco.xml']);
});

test('coverage_exclude of an app in project.yaml is read from the app folder, and leaves those files out', () => {
  const config = { apps: { api: { path: 'apps/api', coverage_exclude: ['src/main/java/**/dto/**', '**/*Properties.java'] }, user: { path: 'apps/user' } } };
  const excludes = projectCoverageExcludes(config);
  assert.deepEqual(excludes, ['apps/api/src/main/java/**/dto/**', 'apps/api/**/*Properties.java']);
  const dto = 'apps/api/src/main/java/com/acme/order/dto/OrderRequest.java';
  const diff = `diff --git a/${dto} b/${dto}\n--- /dev/null\n+++ b/${dto}\n@@ -0,0 +1 @@\n+x\n`;
  const coverage = { ...gates.coverage, exclude: [...gates.coverage.exclude, ...excludes] };
  assert.deepEqual(changedLineCoverage({ changed: changedLines(diff), lcov: new Map(), coverage }).problems, []);
  assert.deepEqual(projectCoverageExcludes(null), []);
});
