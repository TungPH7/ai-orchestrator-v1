import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse } from 'yaml';
import { ROOT } from '../helpers/kit.mjs';

const text = readFileSync(join(ROOT, 'kit', '.github', 'workflows', 'merge-gate.yml'), 'utf8');
const workflow = parse(text);
const job = workflow.jobs['merge-gate'];

test('merge-gate runs after jira-sync and by hand, never on a PR or review event, whose workflow a PR could change', () => {
  assert.equal(workflow.name, 'merge-gate');
  assert.deepEqual(Object.keys(workflow.on), ['workflow_run', 'workflow_dispatch']);
  assert.deepEqual(workflow.on.workflow_run, { workflows: ['jira-sync'], types: ['completed'] });
  assert.doesNotMatch(text, /^\s*pull_request/m);
});

test('the job only runs from the default branch, takes the key from the merge-gate environment, and makes no deployment', () => {
  assert.equal(job.if, 'github.ref_name == github.event.repository.default_branch');
  assert.deepEqual(job.environment, { name: 'merge-gate', deployment: false });
  const step = job.steps.at(-1);
  assert.equal(step.run, 'node .ai-orchestrator/scripts/merge-gate.mjs');
  // JIRA_CI_TOKEN reads the Epic of a docs PR (dev-workflow spec 2.4). The key of ao-merge merges (Pilot 3, spec 2.9);
  // that of ao-dev only in a project that has no ao-merge yet.
  assert.deepEqual(step.env, { AO_MERGE_APP_KEY: '${{ secrets.AO_MERGE_APP_KEY }}', AO_DEV_APP_KEY: '${{ secrets.AO_DEV_APP_KEY }}', JIRA_CI_TOKEN: '${{ secrets.JIRA_CI_TOKEN }}', GITHUB_TOKEN: '${{ github.token }}' });
});

test('the workflow token only reads, one run at a time, and every action is pinned to a commit', () => {
  // actions: read dates the CI run of a docs PR's head (dev-workflow spec 2.4).
  assert.deepEqual(workflow.permissions, { contents: 'read', 'pull-requests': 'read', checks: 'read', statuses: 'read', actions: 'read' });
  assert.deepEqual(workflow.concurrency, { group: 'merge-gate', 'cancel-in-progress': false });
  // \b keeps `statuses: read` out.
  for (const [, uses] of text.matchAll(/\buses: (\S+)/g)) assert.match(uses, /@[0-9a-f]{40}$/, uses);
});

const SCRIPT = join(ROOT, 'scripts', 'merge-gate.mjs');
// Without the variables the script reads, so a test can never reach GitHub.
const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^(GITHUB_|AO_)/.test(name)));

test('the script stops with a message when it cannot tell the repository or the Apps', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'project-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, '.claude'));
  writeFileSync(join(dir, '.claude', 'settings.json'), JSON.stringify({ env: { AO_DEV_APP: '<dev-app-slug>', AO_REVIEW_APP: '<review-app-slug>' } }));
  const run = (extraEnv) => spawnSync(process.execPath, [SCRIPT, '--dry-run'], { cwd: dir, encoding: 'utf8', env: { ...env, GITHUB_WORKSPACE: dir, ...extraEnv } });
  const cases = [
    [{}, 'Set GITHUB_REPOSITORY, pass --repo <owner>/<name>, or run merge-gate in a clone whose origin is on GitHub'],
    [{ GITHUB_REPOSITORY: 'TungPH7/ao-pilot' }, 'Set AO_DEV_APP and AO_REVIEW_APP, the slugs of the two GitHub Apps, in .claude/settings.json'],
  ];
  for (const [extraEnv, message] of cases) {
    const result = run(extraEnv);
    assert.equal(result.status, 1, message);
    assert.equal(result.stderr.trim(), message);
  }
});
