import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readGates } from '../../lib/quality/gates.mjs';
import { auditProblems, checkConventions, designFilesToCheck, osvProblems } from '../../lib/quality/policy.mjs';
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

test('an oxlint-disable comment needs a reason, as eslint-disable does (oxlint honours both)', () => {
  const lines = [
    { file: 'apps/api/src/a.ts', line: 2, text: '// oxlint-disable-next-line no-debugger' },
    { file: 'apps/api/src/a.ts', line: 7, text: '/* oxlint-disable */' },
    { file: 'apps/api/src/b.ts', line: 3, text: '// oxlint-disable-next-line no-console -- reason: the CLI prints its result' },
  ];
  assert.deepEqual(findSuppressions(lines, gates.suppressions), [
    'apps/api/src/a.ts:2 oxlint-disable needs "reason: <why>" on the same line',
    'apps/api/src/a.ts:7 oxlint-disable needs "reason: <why>" on the same line',
  ]);
});

test('xit( and xdescribe( count only as whole names: process.exit( and a method named fixdescribe( are not suppressions', () => {
  const lines = [
    { file: 'src/server.ts', line: 166, text: '  exit(code: number): void;' },
    { file: 'src/server.ts', line: 177, text: '    server.close(() => target.exit(0));' },
    { file: 'src/a.ts', line: 3, text: 'fixdescribe(list);' },
    { file: 'src/a.test.ts', line: 9, text: "xit('AC1 is skipped', () => {});" },
    { file: 'src/a.test.ts', line: 12, text: "  xdescribe('cart', () => {});" },
    { file: 'src/a.test.ts', line: 15, text: "describe.skip('cart', () => {});" },
  ];
  assert.deepEqual(findSuppressions(lines, gates.suppressions), [
    'src/a.test.ts:9 xit( needs "reason: <why>" on the same line',
    'src/a.test.ts:12 xdescribe( needs "reason: <why>" on the same line',
    'src/a.test.ts:15 .skip( needs "reason: <why>" on the same line',
  ]);
});

test('only the call patterns need a whole name: a comment marker with something glued in front of it still counts', () => {
  const lines = [
    { file: 'src/a.ts', line: 1, text: 'const key = 1; // xgitleaks:allow' },
    { file: 'src/a.ts', line: 2, text: '//_nosemgrep' },
    { file: 'src/a.ts', line: 3, text: '//$nosemgrep' },
    { file: 'src/a.ts', line: 4, text: '/*xeslint-disable*/' },
  ];
  assert.deepEqual(findSuppressions(lines, gates.suppressions), [
    'src/a.ts:1 gitleaks:allow needs "reason: <why>" on the same line',
    'src/a.ts:2 nosemgrep needs "reason: <why>" on the same line',
    'src/a.ts:3 nosemgrep needs "reason: <why>" on the same line',
    'src/a.ts:4 eslint-disable needs "reason: <why>" on the same line',
  ]);
});

test('deleted test files are listed for the reviewer', () => {
  assert.deepEqual(deletedTests(DIFF), ['src/old.test.ts']);
});

test('a deleted NestJS end-to-end test (*.e2e-spec.ts) is listed too', () => {
  const diff = 'diff --git a/apps/api/test/app.e2e-spec.ts b/apps/api/test/app.e2e-spec.ts\n--- a/apps/api/test/app.e2e-spec.ts\n+++ /dev/null\n@@ -1 +0,0 @@\n-x\n';
  assert.deepEqual(deletedTests(diff), ['apps/api/test/app.e2e-spec.ts']);
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
  assert.deepEqual(checkConventions({ branch: 'release/v1.0.0', base: 'main', commits: [], title: 'release: v1.0.0' }), []);
  assert.match(checkConventions({ branch: 'feature/DEMO-12-email-login', base: 'develop', commits: [], title: 'Add login' })[0], /^title "Add login": /);
});

test('a release PR and a merge back are named by the release: their commits passed their own PRs already', () => {
  // As ao-step and merge-gate open them (release-workflow spec 2.7): the squash merges of develop end with (#N), and the
  // report commit of the bot names the release, not an item. ao-pilot PR #18, T21.
  const commits = [
    { sha: '0e02f6e', parents: 1, subject: 'docs(release): add the regression report and the changelog of v0.2.0' },
    { sha: 'fb71de5', parents: 1, subject: 'build(deploy): package ao-pilot for the kit deployer (DEMO-26) (#17)' },
  ];
  assert.deepEqual(checkConventions({ branch: 'release/v0.2.0', base: 'main', commits, title: 'release: v0.2.0' }), []);
  assert.deepEqual(checkConventions({ branch: 'release/v0.2.0', base: 'main', commits, title: 'release: v0.3.0' }), [
    'title "release: v0.3.0": the PR of release/v0.2.0 into main is titled "release: v0.2.0"',
  ]);
  for (const base of ['develop', 'release/v0.3.0']) {
    assert.deepEqual(checkConventions({ branch: 'main', base, commits, title: `Merge main into ${base} after v0.2.1` }), [], base);
  }
  assert.deepEqual(checkConventions({ branch: 'main', base: 'develop', commits, title: 'merge stuff' }), [
    'title "merge stuff": the merge back of main into develop is titled "Merge main into develop after v<major>.<minor>.<patch>"',
  ]);
  // Any other PR from main is no merge back: its branch name fails as before.
  assert.match(checkConventions({ branch: 'main', base: 'feature/DEMO-1-x', commits: [], title: 'Merge main into feature/DEMO-1-x after v0.2.0' })[0], /^branch main: /);
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

// pnpm audit --json lists advisories by id, as npm did before version 7 (pnpm 11.8.0, run on a template in Lượt 201).
test('pnpm audit: advisories by id, each counted once, at the level and above', () => {
  const pnpmAdvisory = (id, ghsa, severity, name) => ({ id, title: `${severity} issue`, module_name: name, severity, url: `https://github.com/advisories/${ghsa}`, github_advisory_id: ghsa, findings: [] });
  const report = {
    advisories: {
      1123897: pnpmAdvisory(1123897, 'GHSA-3jxr-9vmj-r5cp', 'high', 'brace-expansion'),
      1100001: pnpmAdvisory(1100001, 'GHSA-xvch-5gv4-984h', 'moderate', 'minimist'),
      1100002: pnpmAdvisory(1100002, 'GHSA-jf85-cpcp-j695', 'critical', 'lodash'),
    },
    metadata: { vulnerabilities: { high: 1, moderate: 1, critical: 1 } },
  };
  // In the order of their ids, as JavaScript keeps keys that are numbers.
  assert.deepEqual(auditProblems(report, gates.dependencies, '2026-11-13'), [
    'lodash critical: critical issue (GHSA-jf85-cpcp-j695)',
    'brace-expansion high: high issue (GHSA-3jxr-9vmj-r5cp)',
  ]);
  const excepted = { audit_level: 'high', exceptions: [{ advisory: 'GHSA-3jxr-9vmj-r5cp', reason: 'only in a dev tool', expires: '2026-12-31' }] };
  assert.deepEqual(auditProblems(report, excepted, '2026-11-13'), ['lodash critical: critical issue (GHSA-jf85-cpcp-j695)']);
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

// agent-roster spec 2.8: the design.md files a PR changes, and those next to a design/ folder whose images it changes.
test('the policy job checks the design.md a PR changes, and the design.md next to the images it changes', () => {
  const atHead = ['docs/specs/DEMO-20/design.md', 'docs/specs/DEMO-30/design.md'];
  const pick = (...changes) => designFilesToCheck(changes.map((c) => ({ status: c[0], path: c.slice(2) })), (path) => atHead.includes(path));

  assert.deepEqual(pick('M docs/specs/DEMO-20/design.md'), ['docs/specs/DEMO-20/design.md']);
  assert.deepEqual(pick('A docs/specs/DEMO-30/design/S1-desktop.png', 'D docs/specs/DEMO-30/design/S1-old.png'), ['docs/specs/DEMO-30/design.md']);
  assert.deepEqual(pick('M docs/specs/DEMO-20/design.md', 'A docs/specs/DEMO-20/design/S2-desktop.png'), ['docs/specs/DEMO-20/design.md']);
  assert.deepEqual(pick('D docs/specs/DEMO-40/design.md', 'D docs/specs/DEMO-40/design/S1-desktop.png'), []);
  assert.deepEqual(pick('M docs/design.md', 'A src/components/design/button.png', 'M README.md', 'M docs/specs/DEMO-20/spec.md'), []);
});

test('the check-policy script reports each step of a PR and fails on any problem', async (t) => {
  const { spawnSync } = await import('node:child_process');
  const { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = await import('node:fs');
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
  const fixture = (name) => readFileSync(join(ROOT, 'tests', 'fixtures', 'design', name), 'utf8');
  mkdirSync(join(dir, 'docs', 'specs', 'DEMO-2'), { recursive: true });
  writeFileSync(join(dir, 'docs', 'specs', 'DEMO-2', 'design.md'), fixture('invalid/d2-block-without-yaml.md'));
  git('add', '.');
  git('commit', '-q', '-am', 'wip');
  const policy = (title) => spawnSync(process.execPath, [join(ROOT, 'scripts', 'check-policy.mjs'), '--base', 'develop', '--title', title], { cwd: dir, encoding: 'utf8', env: { ...process.env, GITHUB_STEP_SUMMARY: '' } });

  const bad = policy('feat(a): add b (DEMO-2)');
  assert.equal(bad.status, 1, bad.stderr);
  assert.match(bad.stdout, /^ok {2}Thresholds$/m);
  assert.match(bad.stdout, /^FAIL {2}Conventions\n {6}commit \w+ "wip": /m);
  assert.match(bad.stdout, /^FAIL {2}Suppressions\n {6}src\/a\.ts:2 eslint-disable needs "reason: <why>"/m);
  assert.match(bad.stdout, /^note {2}no package-lock\.json or pnpm-lock\.yaml: the audit is skipped$/m);
  assert.match(bad.stdout, /^FAIL {2}Design\n {6}docs\/specs\/DEMO-2\/design\.md:31 D2 \[5\] of S1 has no entry under blocks in its YAML$/m);

  git('commit', '-q', '--amend', '-m', 'feat(a): add b (DEMO-2)');
  writeFileSync(join(dir, 'src', 'a.ts'), 'export const a = 1;\n// eslint-disable-next-line -- reason: generated name\nexport const b = 2;\n');
  writeFileSync(join(dir, 'docs', 'specs', 'DEMO-2', 'design.md'), fixture('valid.md'));
  git('commit', '-q', '-am', 'fix(a): give the reason (DEMO-2)');
  const good = policy('feat(a): add b (DEMO-2)');
  assert.equal(good.status, 0, good.stdout + good.stderr);
});

// project-scaffold part 3, spec 2.3: osv-scanner reads the pom.xml of a Java app, with its transitive dependencies.
const OSV = {
  results: [{
    source: { path: 'apps/api/pom.xml', type: 'unknown' },
    packages: [
      {
        package: { name: 'org.postgresql:postgresql', version: '42.7.10', ecosystem: 'Maven' },
        groups: [
          { ids: ['GHSA-98qh-xjc8-98pq'], aliases: ['CVE-2026-42198', 'GHSA-98qh-xjc8-98pq'], max_severity: '7.5' },
          { ids: ['GHSA-low0-0000-0000'], aliases: ['GHSA-low0-0000-0000'], max_severity: '3.7' },
        ],
        vulnerabilities: [
          { id: 'GHSA-98qh-xjc8-98pq', summary: 'pgjdbc: Unbounded PBKDF2 iterations allows CPU exhaustion DoS' },
          { id: 'GHSA-low0-0000-0000', summary: 'a low one' },
        ],
      },
      {
        package: { name: 'org.apache.tomcat.embed:tomcat-embed-core', version: '11.0.21', ecosystem: 'Maven' },
        groups: [{ ids: ['GHSA-9xv2-5v5q-p794'], aliases: ['CVE-2026-1111', 'GHSA-9xv2-5v5q-p794'], max_severity: '9.8' }],
        vulnerabilities: [{ id: 'GHSA-9xv2-5v5q-p794', summary: 'Tomcat request smuggling' }],
      },
      {
        package: { name: 'com.acme:unscored', version: '1.0.0', ecosystem: 'Maven' },
        groups: [{ ids: ['GHSA-none-0000-0000'], aliases: [], max_severity: '' }],
        vulnerabilities: [{ id: 'GHSA-none-0000-0000', summary: 'no score yet' }],
      },
    ],
  }],
};

test('osv-scanner advisories at the audit level and above fail, each with its package, score and ids', () => {
  const problems = osvProblems(OSV, { audit_level: 'high', exceptions: [] }, '2026-11-14');
  assert.deepEqual(problems, [
    'org.postgresql:postgresql@42.7.10 high 7.5: pgjdbc: Unbounded PBKDF2 iterations allows CPU exhaustion DoS (GHSA-98qh-xjc8-98pq)',
    'org.apache.tomcat.embed:tomcat-embed-core@11.0.21 critical 9.8: Tomcat request smuggling (GHSA-9xv2-5v5q-p794)',
    'com.acme:unscored@1.0.0 high, not scored: no score yet (GHSA-none-0000-0000)',
  ]);
  assert.deepEqual(osvProblems({ results: [] }, { audit_level: 'high', exceptions: [] }, '2026-11-14'), []);
});

test('an exception holds by the GHSA id or a CVE alias of the group, until it expires', () => {
  const exceptions = [
    { advisory: 'GHSA-9xv2-5v5q-p794', reason: 'no fix yet', expires: '2026-12-01' },
    { advisory: 'CVE-2026-42198', reason: 'not reachable', expires: '2026-11-01' },
  ];
  const problems = osvProblems(OSV, { audit_level: 'critical', exceptions }, '2026-11-14');
  // At critical, the excepted Tomcat advisory is the only one left, and it holds: an unscored one counts as high.
  assert.deepEqual(problems, []);
  const high = osvProblems(OSV, { audit_level: 'high', exceptions }, '2026-11-14');
  assert.match(high[0], /postgresql@42\.7\.10 high 7\.5: .*; its exception expired on 2026-11-01/);
  assert.ok(!high.some((line) => /tomcat/.test(line)));
});
