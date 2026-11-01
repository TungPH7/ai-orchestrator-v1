import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse } from 'yaml';
import { ROOT } from '../helpers/kit.mjs';

const text = readFileSync(join(ROOT, 'kit', '.github', 'workflows', 'audit.yml'), 'utf8');
const workflow = parse(text);
const job = workflow.jobs.audit;

test('audit is a reusable workflow: the commit and branch default to those of the calling run', () => {
  assert.equal(workflow.name, 'audit');
  assert.deepEqual(Object.keys(workflow.on), ['workflow_call']);
  assert.deepEqual(Object.keys(workflow.on.workflow_call.inputs), ['sha', 'branch']);
  assert.deepEqual(workflow.on.workflow_call.secrets, { JIRA_CI_TOKEN: { required: false } });
  const step = job.steps.at(-1);
  assert.equal(step.run, 'node .ai-orchestrator/scripts/audit.mjs --sha "$AUDIT_SHA" --branch "$AUDIT_BRANCH"');
  assert.deepEqual(step.env, {
    AUDIT_SHA: '${{ inputs.sha || github.sha }}',
    AUDIT_BRANCH: '${{ inputs.branch || github.ref_name }}',
    JIRA_CI_TOKEN: '${{ secrets.JIRA_CI_TOKEN }}',
    GITHUB_TOKEN: '${{ github.token }}',
  });
});

test('no expression reaches a shell line, the token only reads, and every action is pinned to a commit', () => {
  for (const { run } of job.steps.filter((step) => step.run)) assert.doesNotMatch(run, /\$\{\{/, run);
  assert.deepEqual(job.permissions, { contents: 'read', 'pull-requests': 'read', checks: 'read', statuses: 'read', actions: 'read' });
  // The caller grants the same: a called workflow cannot raise the permissions of the caller's token.
  assert.match(text, /^#   permissions: { contents: read, pull-requests: read, checks: read, statuses: read, actions: read }$/m);
  // The steps only: the header comment shows how a deploy workflow calls this one.
  for (const { uses } of job.steps.filter((step) => step.uses)) assert.match(uses, /@[0-9a-f]{40}$/, uses);
});

const SCRIPT = join(ROOT, 'scripts', 'audit.mjs');
// Without the variables the script reads, so a test can never reach GitHub or Jira.
const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^(GITHUB_|JIRA_|AO_)/.test(name)));

test('the script stops with a message without the commit, the branch, the repository or the Apps', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'project-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const run = (args, extraEnv = {}) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: dir, encoding: 'utf8', env: { ...env, GITHUB_WORKSPACE: dir, ...extraEnv } });
  const cases = [
    [[], {}, 'usage: audit.mjs --sha <commit> --branch <branch> [--dry-run] [--repo <owner>/<name>]'],
    [['--sha', 'abc', '--branch', 'develop'], {}, 'Set GITHUB_REPOSITORY, pass --repo <owner>/<name>, or run audit in a clone whose origin is on GitHub'],
    [['--sha', 'abc', '--branch', 'develop'], { GITHUB_REPOSITORY: 'TungPH7/ao-pilot' }, 'Set AO_DEV_APP and AO_REVIEW_APP, the slugs of the two GitHub Apps, in .claude/settings.json'],
  ];
  for (const [args, extraEnv, message] of cases) {
    const result = run(args, extraEnv);
    assert.equal(result.status, 1, message);
    assert.equal(result.stderr.trim(), message);
  }
});
