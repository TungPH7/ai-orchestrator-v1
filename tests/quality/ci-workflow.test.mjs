import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse } from 'yaml';
import { ROOT } from '../helpers/kit.mjs';

const text = readFileSync(join(ROOT, 'kit', '.github', 'workflows', 'ci.yml'), 'utf8');
const workflow = parse(text);
const steps = (job) => workflow.jobs[job].steps.map((step) => step.run ?? step.uses).join('\n');

test('the workflow is named CI, which jira-sync watches, and runs on PRs, on pushes to the protected branches and by hand', () => {
  assert.equal(workflow.name, 'CI');
  assert.deepEqual(Object.keys(workflow.on), ['pull_request', 'push', 'workflow_dispatch']);
  assert.deepEqual(workflow.on.push.branches, ['develop', 'main', 'release/**']);
  // By hand: a branch pushed while Actions was off has no run (project-scaffold T16); gh workflow run CI --ref <branch>.
  assert.equal(workflow.on.workflow_dispatch, null);
  assert.deepEqual(workflow.permissions, { contents: 'read' });
});

test('every action is pinned to a commit, and gitleaks and Semgrep to a version', () => {
  for (const [, uses] of text.matchAll(/uses: (\S+)/g)) assert.match(uses, /@[0-9a-f]{40}$/, uses);
  assert.match(workflow.jobs.secrets.env.GITLEAKS_VERSION, /^\d+\.\d+\.\d+$/);
  assert.match(workflow.jobs.secrets.env.GITLEAKS_SHA256, /^[0-9a-f]{64}$/);
  assert.match(steps('secrets'), /sha256sum --check/);
  assert.match(workflow.jobs.sast.env.SEMGREP_VERSION, /^\d+\.\d+\.\d+$/);
  assert.match(steps('sast'), /uvx "semgrep==\$\{SEMGREP_VERSION\}" scan --config p\/default --config p\/owasp-top-ten --severity ERROR --error/);
});

test('build-test installs and runs the four scripts of the project with its package manager, and the coverage of changed lines on a PR', () => {
  const runs = workflow.jobs['build-test'].steps.map((step) => step.run).filter(Boolean);
  const at = (run) => runs.indexOf(run);
  assert.ok(at('node .ai-orchestrator/scripts/ci-package-manager.mjs') > at('npm ci --prefix .ai-orchestrator'));
  assert.ok(at('$PM_INSTALL') > at('node .ai-orchestrator/scripts/ci-package-manager.mjs'));
  for (const script of ['lint', 'typecheck', 'test:coverage', 'build']) assert.ok(at(`$PM run ${script}`) > at('$PM_INSTALL'), script);
  // npm still installs the packages of the kit itself.
  assert.doesNotMatch(runs.filter((run) => run !== 'npm ci --prefix .ai-orchestrator').join('\n'), /^npm (ci|run)\b/m);
  const coverage = workflow.jobs['build-test'].steps.find((step) => step.run?.includes('coverage-diff.mjs'));
  assert.equal(coverage.if, "github.event_name == 'pull_request'");
});

// project-scaffold part 2, spec 2.1: setup-node caches npm packages only when the repo has no pnpm-lock.yaml, since it
// would ask a pnpm that is not installed yet where its store is.
test('build-test sets up node with the npm cache for an npm project, and without a cache for a pnpm project', () => {
  const nodes = workflow.jobs['build-test'].steps.filter((step) => step.uses?.startsWith('actions/setup-node@'));
  assert.deepEqual(nodes.map((step) => [step.if, step.with]), [
    ["hashFiles('pnpm-lock.yaml') == ''", { 'node-version': 24, cache: 'npm' }],
    ["hashFiles('pnpm-lock.yaml') != ''", { 'node-version': 24 }],
  ]);
});

test('ci-package-manager.mjs writes PM and PM_INSTALL of an npm project to $GITHUB_ENV, and fails a pnpm project with no packageManager', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'ao-ci-pm-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const script = join(ROOT, 'scripts', 'ci-package-manager.mjs');
  const envFile = join(dir, 'github-env');
  writeFileSync(join(dir, 'package.json'), '{}');
  writeFileSync(join(dir, 'package-lock.json'), '{}');
  const npm = spawnSync(process.execPath, [script], { cwd: dir, encoding: 'utf8', env: { ...process.env, GITHUB_ENV: envFile } });
  assert.equal(npm.status, 0, npm.stderr);
  assert.equal(readFileSync(envFile, 'utf8'), 'PM=npm\nPM_INSTALL=npm ci --no-audit --no-fund\n');

  rmSync(join(dir, 'package-lock.json'));
  writeFileSync(join(dir, 'pnpm-lock.yaml'), "lockfileVersion: '9.0'\n");
  const pnpm = spawnSync(process.execPath, [script], { cwd: dir, encoding: 'utf8', env: { ...process.env, GITHUB_ENV: envFile } });
  assert.equal(pnpm.status, 1);
  assert.match(pnpm.stderr, /^::error::the repo has pnpm-lock\.yaml, but package\.json names no pnpm version in packageManager/m);
});

test('every job checks out the commit under test with its history, for the merge base', () => {
  for (const [name, job] of Object.entries(workflow.jobs)) {
    const checkout = job.steps.find((step) => step.uses?.startsWith('actions/checkout@'));
    assert.deepEqual(checkout.with, { ref: '${{ env.HEAD_SHA }}', 'fetch-depth': 0 }, name);
  }
});

// A run by hand writes checks of the same four names on the commit, but skips what runs only on a PR: conventions,
// suppressions, lowered thresholds, the coverage of changed lines, gitleaks on the earlier commits (review of ao-sample
// PR #30). So every job fails first when it is started by hand on a branch that is not protected. It fails rather than
// skips: a skipped job counts as passing, for the kit's check reader and for the required checks of GitHub.
test('a run by hand fails every job on a branch that is not develop, main or release/*', () => {
  const guard = workflow.jobs.policy.steps[0];
  for (const [name, job] of Object.entries(workflow.jobs)) {
    assert.deepEqual(job.steps[0], guard, `${name}: the guard is its first step`);
  }
  assert.equal(guard.if, "github.event_name == 'workflow_dispatch'");
  const status = (ref) => spawnSync('bash', ['-c', guard.run], { encoding: 'utf8', env: { ...process.env, GITHUB_REF: ref, GITHUB_REF_NAME: ref.replace(/^refs\/\w+\//, '') } }).status;
  for (const ref of ['refs/heads/develop', 'refs/heads/main', 'refs/heads/release/1.2.0']) assert.equal(status(ref), 0, ref);
  for (const ref of ['refs/heads/feature/SMP-1-x', 'refs/heads/developer', 'refs/heads/main2', 'refs/heads/x/release/1.0', 'refs/tags/v1.0.0', '']) {
    assert.equal(status(ref), 1, ref);
  }
});

test('the policy job runs the kit script, after it knows npm or pnpm for the audit', () => {
  const runs = workflow.jobs.policy.steps.map((step) => step.run).filter(Boolean);
  const policy = runs.indexOf('node .ai-orchestrator/scripts/check-policy.mjs');
  assert.ok(policy > runs.indexOf('node .ai-orchestrator/scripts/ci-package-manager.mjs'));
  assert.ok(runs.indexOf('node .ai-orchestrator/scripts/ci-package-manager.mjs') > runs.indexOf('npm ci --prefix .ai-orchestrator'));
});

// Semgrep counts only the findings the changes bring. A new branch has no commit before its push, so it gets its head
// commit alone, as gitleaks does: a full scan blocked the first push of develop on a repo that has code, and a new
// release branch, on a finding older than the kit (project-scaffold T17, approved on turn 177). The root commit of a
// repository, and a run by hand, still get every file. The step runs in bash with a uvx that prints what it gets.
test('Semgrep scans the changes of a PR or a push, the head commit of a new branch, and every file of a root commit or a run by hand', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'sast-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const git = (...args) => spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd: dir, encoding: 'utf8' }).stdout.trim();
  git('init', '-q');
  git('commit', '-q', '--allow-empty', '-m', 'root');
  const root = git('rev-parse', 'HEAD');
  git('commit', '-q', '--allow-empty', '-m', 'next');
  const head = git('rev-parse', 'HEAD');
  mkdirSync(join(dir, 'bin'));
  writeFileSync(join(dir, 'bin', 'uvx'), '#!/bin/sh\necho "$@"\n', { mode: 0o755 });
  const script = workflow.jobs.sast.steps.find((step) => step.name === 'Semgrep on the changes').run;
  const scan = (event, base, sha) => {
    // $PWD, not the path Node knows: a Windows path holds a colon, which splits PATH.
    const result = spawnSync('bash', ['-c', `PATH="$PWD/bin:$PATH"\n${script}`], { cwd: dir, encoding: 'utf8', env: { ...process.env, GITHUB_EVENT_NAME: event, BASE_SHA: base, HEAD_SHA: sha, SEMGREP_VERSION: '1.0.0' } });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.match(/--baseline-commit (\w+)/)?.[1] ?? 'every file';
  };
  const ZERO = '0'.repeat(40);
  assert.equal(scan('pull_request', root, head), root, 'a PR: from the merge base');
  assert.equal(scan('push', root, head), root, 'a push: from the commit before');
  assert.equal(scan('push', ZERO, head), root, 'a new branch: its head commit alone');
  assert.equal(scan('push', ZERO, root), 'every file', 'the root commit of a repository');
  assert.equal(scan('workflow_dispatch', '', head), 'every file', 'a run by hand');
});

// project-scaffold part 3, spec 2.2: a repo with a Java app gets the JDKs its pom.xml files ask for, and the Maven
// cache; any other repo runs the same steps as before.
test('build-test installs the JDKs of apps/*/pom.xml, pinned, only when the repo has a Java app', () => {
  const list = workflow.jobs['build-test'].steps;
  const at = (find) => list.findIndex(find);
  const java = list[at((step) => step.id === 'java')];
  const setup = list[at((step) => step.uses?.startsWith('actions/setup-java@'))];
  assert.equal(java.run, 'node .ai-orchestrator/scripts/ci-java.mjs');
  assert.equal(java.if, "hashFiles('apps/*/pom.xml') != ''");
  assert.match(setup.uses, /^actions\/setup-java@[0-9a-f]{40}$/);
  assert.equal(setup.if, "hashFiles('apps/*/pom.xml') != ''");
  assert.deepEqual(setup.with, { distribution: 'temurin', 'java-version': '${{ steps.java.outputs.versions }}', cache: 'maven', 'cache-dependency-path': 'apps/*/pom.xml' });
  const kit = at((step) => step.run === 'npm ci --prefix .ai-orchestrator');
  const install = at((step) => step.run === '$PM_INSTALL');
  assert.ok(kit < at((step) => step.id === 'java') && at((step) => step.id === 'java') < at((step) => step === setup) && at((step) => step === setup) < install);
});

test('ci-java prints the Java versions of apps/*/pom.xml, and stops on a pom that names none', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'ci-java-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const pom = (app, body) => {
    mkdirSync(join(dir, 'apps', app), { recursive: true });
    writeFileSync(join(dir, 'apps', app, 'pom.xml'), body);
  };
  pom('api', '<properties><java.version>21</java.version></properties>');
  mkdirSync(join(dir, 'apps', 'web'));
  const env = { ...process.env, GITHUB_OUTPUT: '' };
  const run = () => spawnSync(process.execPath, [join(ROOT, 'scripts', 'ci-java.mjs')], { cwd: dir, env, encoding: 'utf8' });
  assert.equal(run().stdout, '21\n');
  pom('jobs', '<project/>');
  const failed = run();
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /::error::apps\/jobs\/pom\.xml names no <java\.version>/);
});

// project-scaffold part 3, spec 2.3: osv-scanner checks the Maven dependencies of a Java app, pinned and checked.
test('policy installs osv-scanner, pinned and checked against its checksum, only when the repo has a Java app', () => {
  const job = workflow.jobs.policy;
  assert.equal(job.env.OSV_SCANNER_VERSION, '2.7.0');
  assert.match(job.env.OSV_SCANNER_SHA256, /^[0-9a-f]{64}$/);
  const install = job.steps.find((step) => step.name === 'Install osv-scanner');
  assert.equal(install.if, "hashFiles('apps/*/pom.xml') != ''");
  assert.match(install.run, /releases\/download\/v\$\{OSV_SCANNER_VERSION\}\/osv-scanner_linux_amd64/);
  assert.match(install.run, /sha256sum --check --strict/);
  assert.match(install.run, /OSV_SCANNER=\$RUNNER_TEMP\/osv-scanner" >> "\$GITHUB_ENV"/);
  const order = job.steps.map((step) => step.name ?? step.run);
  assert.ok(order.indexOf('Install osv-scanner') < order.indexOf('node .ai-orchestrator/scripts/check-policy.mjs'));
});
