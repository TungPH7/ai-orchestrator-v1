import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readGates } from '../../lib/quality/gates.mjs';
import { auditProblems, checkConventions } from '../../lib/quality/policy.mjs';
import { addedLines, deletedTests, findSuppressions, loweredThresholds } from '../../lib/quality/suppressions.mjs';
import { ROOT } from '../helpers/kit.mjs';

const gates = readGates(join(ROOT, 'quality'));

const DIFF = `diff --git a/src/a.ts b/src/a.ts
--- a/src/a.ts
+++ b/src/a.ts
@@ -3,0 +4,5 @@
+// eslint-disable-next-line no-console -- reason: the CLI prints its result
+console.log(x); // eslint-disable-line
+const y = z as any; // @ts-ignore
+it.only('runs alone', () => {}); // reason: debugging
+it.skip('later', () => {});
diff --git a/README.md b/README.md
--- a/README.md
+++ b/README.md
@@ -1,0 +2 @@
+Never commit eslint-disable without a reason.
diff --git a/src/old.test.ts b/src/old.test.ts
--- a/src/old.test.ts
+++ /dev/null
@@ -1 +0,0 @@
-test('old', () => {});
`;

test('addedLines gives the file, the line number and the text of each added line', () => {
  assert.deepEqual(addedLines(DIFF).slice(0, 2), [
    { file: 'src/a.ts', line: 4, text: '// eslint-disable-next-line no-console -- reason: the CLI prints its result' },
    { file: 'src/a.ts', line: 5, text: 'console.log(x); // eslint-disable-line' },
  ]);
});

test('a suppression needs a reason on its line, .only( never passes, and Markdown is left out', () => {
  assert.deepEqual(findSuppressions(addedLines(DIFF), gates.suppressions), [
    'src/a.ts:5 eslint-disable needs "reason: <why>" on the same line',
    'src/a.ts:6 @ts-ignore needs "reason: <why>" on the same line',
    'src/a.ts:7 .only( is never allowed',
    'src/a.ts:8 .skip( needs "reason: <why>" on the same line',
  ]);
});

test('deleted test files are listed for the reviewer', () => {
  assert.deepEqual(deletedTests(DIFF), ['src/old.test.ts']);
});

test('lowering a threshold of quality/gates.yaml is caught; raising one or adding a pattern is not', () => {
  const lower = structuredClone(gates);
  lower.coverage.changed_lines_min = 60;
  lower.dependencies.audit_level = 'critical';
  lower.suppressions.patterns = lower.suppressions.patterns.filter((p) => p !== 'nosemgrep');
  lower.suppressions.never = [];
  lower.checks = lower.checks.filter((c) => c !== 'sast');
  lower.protected_branches = ['main'];
  lower.protected_paths = lower.protected_paths.filter(({ path }) => path !== '.claude/**');
  assert.deepEqual(loweredThresholds(gates, lower), [
    'coverage.changed_lines_min went down from 80 to 60',
    'dependencies.audit_level went down from high to critical',
    'suppressions.patterns lost nosemgrep',
    'suppressions.never lost .only(',
    'checks lost sast',
    'protected_branches lost develop, release/*',
    'protected_paths lost .claude/**',
  ]);
  const higher = structuredClone(gates);
  higher.coverage.changed_lines_min = 90;
  higher.dependencies.audit_level = 'moderate';
  higher.suppressions.patterns.push('noqa');
  assert.deepEqual(loweredThresholds(gates, higher), []);
});

test('the conventions of a PR: its branch for its base, its commits and its title', () => {
  const commits = [
    { sha: 'a1', parents: 1, subject: 'feat(api): add login endpoint (DEMO-12, DEMO-13)' },
    { sha: 'b2', parents: 2, subject: "Merge branch 'develop' into feature/DEMO-12-email-login" },
    { sha: 'c3', parents: 1, subject: 'wip' },
  ];
  assert.deepEqual(checkConventions({ branch: 'feature/DEMO-12-email-login', base: 'main', commits, title: 'feat(auth): add email login (DEMO-12)' }), [
    'branch feature/DEMO-12-email-login: a feature/ branch is cut from develop, not main',
    'commit c3 "wip": the header must be type(scope): subject (<KEY>)',
  ]);
  assert.deepEqual(checkConventions({ branch: 'release/v1.0.0', base: 'main', commits: [], title: 'chore(release): v1.0.0 (DEMO-30)' }), []);
  assert.match(checkConventions({ branch: 'feature/DEMO-12-email-login', base: 'develop', commits: [], title: 'Add login' })[0], /^title "Add login": /);
});

const advisory = (id, severity, name = 'lodash') => ({ source: 1, name, title: `${severity} issue`, url: `https://github.com/advisories/${id}`, severity });
const REPORT = {
  vulnerabilities: {
    lodash: { severity: 'critical', via: [advisory('GHSA-35jh-r3h4-6jhm', 'high'), advisory('GHSA-jf85-cpcp-j695', 'critical')] },
    'some-tool': { severity: 'critical', via: ['lodash'] },
    minimist: { severity: 'moderate', via: [advisory('GHSA-xvch-5gv4-984h', 'moderate', 'minimist')] },
  },
};

test('npm audit fails on advisories at the level and above, counting each advisory once', () => {
  assert.deepEqual(auditProblems(REPORT, gates.dependencies, '2026-10-29'), [
    'lodash high: high issue (GHSA-35jh-r3h4-6jhm)',
    'lodash critical: critical issue (GHSA-jf85-cpcp-j695)',
  ]);
});

test('an exception hides its advisory until it expires', () => {
  const dependencies = {
    audit_level: 'high',
    exceptions: [
      { advisory: 'GHSA-35jh-r3h4-6jhm', reason: 'only in a dev tool', expires: '2026-12-31' },
      { advisory: 'GHSA-jf85-cpcp-j695', reason: 'waiting for a fix', expires: '2026-10-01' },
    ],
  };
  assert.deepEqual(auditProblems(REPORT, dependencies, '2026-10-29'), [
    'lodash critical: critical issue (GHSA-jf85-cpcp-j695); its exception expired on 2026-10-01',
  ]);
});

test('the check-policy script reports each step of a PR and fails on any problem', async (t) => {
  const { spawnSync } = await import('node:child_process');
  const { mkdirSync, mkdtempSync, rmSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const dir = mkdtempSync(join(tmpdir(), 'policy-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const git = (...args) => spawnSync('git', ['-c', 'user.email=t@example.com', '-c', 'user.name=t', ...args], { cwd: dir, encoding: 'utf8' });
  git('init', '-q', '-b', 'develop');
  mkdirSync(join(dir, 'src'));
  writeFileSync(join(dir, 'src', 'a.ts'), 'export const a = 1;\n');
  git('add', '.');
  git('commit', '-q', '-m', 'chore(repo): start (DEMO-1)');
  git('checkout', '-q', '-b', 'feature/DEMO-2-add');
  writeFileSync(join(dir, 'src', 'a.ts'), 'export const a = 1;\n// eslint-disable-next-line\nexport const b = 2;\n');
  git('commit', '-q', '-am', 'wip');
  const policy = (title) => spawnSync(process.execPath, [join(ROOT, 'scripts', 'check-policy.mjs'), '--base', 'develop', '--title', title], { cwd: dir, encoding: 'utf8', env: { ...process.env, GITHUB_STEP_SUMMARY: '' } });

  const bad = policy('feat(a): add b (DEMO-2)');
  assert.equal(bad.status, 1, bad.stderr);
  assert.match(bad.stdout, /^ok {2}Thresholds$/m);
  assert.match(bad.stdout, /^FAIL {2}Conventions\n {6}commit \w+ "wip": /m);
  assert.match(bad.stdout, /^FAIL {2}Suppressions\n {6}src\/a\.ts:2 eslint-disable needs "reason: <why>"/m);
  assert.match(bad.stdout, /^note {2}no package-lock\.json: npm audit skipped$/m);

  git('commit', '-q', '--amend', '-m', 'feat(a): add b (DEMO-2)');
  writeFileSync(join(dir, 'src', 'a.ts'), 'export const a = 1;\n// eslint-disable-next-line -- reason: generated name\nexport const b = 2;\n');
  git('commit', '-q', '-am', 'fix(a): give the reason (DEMO-2)');
  const good = policy('feat(a): add b (DEMO-2)');
  assert.equal(good.status, 0, good.stdout + good.stderr);
});
