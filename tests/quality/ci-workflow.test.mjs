import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

test('the policy job runs the kit script', () => {
  assert.match(steps('policy'), /node \.ai-orchestrator\/scripts\/check-policy\.mjs/);
});
