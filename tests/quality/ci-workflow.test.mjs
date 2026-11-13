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

test('build-test runs the four npm scripts of the project, and the coverage of changed lines on a PR', () => {
  const run = steps('build-test');
  for (const script of ['npm run lint', 'npm run typecheck', 'npm run test:coverage', 'npm run build']) assert.match(run, new RegExp(script.replace(':', '\\:')), script);
  const coverage = workflow.jobs['build-test'].steps.find((step) => step.run?.includes('coverage-diff.mjs'));
  assert.equal(coverage.if, "github.event_name == 'pull_request'");
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

test('the policy job runs the kit script', () => {
  assert.match(steps('policy'), /node \.ai-orchestrator\/scripts\/check-policy\.mjs/);
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
