import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse } from 'yaml';
import { readMapping } from '../../lib/tracker/mapping.mjs';
import { PR_RELAY } from '../../lib/tracker/sync.mjs';
import { ROOT } from '../helpers/kit.mjs';

const SCRIPT = join(ROOT, 'scripts', 'jira-sync.mjs');
const EVENT = join(ROOT, 'tests', 'fixtures', 'tracker', 'events', 'pull_request.json');
// Without the variables the script reads, so a test can never reach Jira or GitHub.
const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^(GITHUB_|JIRA_|AO_)/.test(name)));

// A project folder whose .claude/settings.json has the given env block.
function project(t, settingsEnv) {
  const dir = mkdtempSync(join(tmpdir(), 'project-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, '.claude'));
  writeFileSync(join(dir, '.claude', 'settings.json'), JSON.stringify({ env: settingsEnv }));
  return dir;
}
const run = (extraEnv) => spawnSync(process.execPath, [SCRIPT, '--dry-run'], { encoding: 'utf8', env: { ...env, ...extraEnv } });

test('jira-sync stops with a message when the event, the CI token or the project space is missing', (t) => {
  const dir = project(t, { AO_JIRA_SPACE: '<KEY>', AO_APPROVERS: '<github-login>' });
  const event = { GITHUB_WORKSPACE: dir, GITHUB_EVENT_NAME: 'pull_request', GITHUB_EVENT_PATH: EVENT };
  const cases = [
    [{ GITHUB_WORKSPACE: dir }, 'Set GITHUB_EVENT_NAME and GITHUB_EVENT_PATH, as GitHub Actions does'],
    [event, 'Set JIRA_CI_TOKEN to the token of the automation account'],
    [{ ...event, JIRA_CI_TOKEN: 'x' }, 'Set AO_JIRA_SPACE to the project space key in .claude/settings.json'],
  ];
  for (const [extraEnv, message] of cases) {
    const result = run(extraEnv);
    assert.equal(result.status, 1, message);
    assert.equal(result.stderr.trim(), message);
  }
});

test('the kit has the workflow that runs jira-sync on the events of spec section 2.7, with read-only GitHub rights', () => {
  const workflow = parse(readFileSync(join(ROOT, 'kit', '.github', 'workflows', 'jira-sync.yml'), 'utf8'));
  // Review of shop PR #21: the code of a PR never holds the CI token; the events of a PR and its reviews come through the
  // runs of the secretless workflows PR events and PR review. No pull_request_target, which GitHub blocks on public
  // repositories from 2026-12-02 (Pilot 3).
  assert.deepEqual(Object.keys(workflow.on), ['workflow_run', 'deployment_status', 'workflow_dispatch']);
  assert.deepEqual(workflow.on.workflow_run.workflows, ['CI', 'PR review', 'PR events']);
  assert.deepEqual(workflow.on.workflow_run.types, ['completed']);
  assert.equal(workflow.on.workflow_dispatch.inputs.item.required, true);
  assert.ok(Object.values(workflow.permissions).every((right) => right === 'read'));

  // The job id is the check run name that facts.mjs leaves out of CI.
  assert.deepEqual(Object.keys(workflow.jobs), ['jira-sync']);
  // The token lives in an environment only the protected branches may use; no deployment, so no deployment_status loop.
  assert.deepEqual(workflow.jobs['jira-sync'].environment, { name: 'jira-sync', deployment: false });
  const steps = workflow.jobs['jira-sync'].steps;
  // The checkout is the base branch's: no step picks another ref or repository.
  for (const { with: given = {} } of steps) assert.ok(!('ref' in given) && !('repository' in given), JSON.stringify(given));
  const sync = steps.find(({ run: command }) => command?.includes('jira-sync.mjs'));
  assert.equal(sync.run, 'node .ai-orchestrator/scripts/jira-sync.mjs');
  assert.equal(sync.env.JIRA_CI_TOKEN, '${{ secrets.JIRA_CI_TOKEN }}');
  assert.equal(sync.env.GITHUB_TOKEN, '${{ github.token }}');
});

test('the workflow PR review only relays a review to jira-sync: no secret, no right, no code', () => {
  const text = readFileSync(join(ROOT, 'kit', '.github', 'workflows', 'pr-review.yml'), 'utf8');
  const workflow = parse(text);
  assert.equal(workflow.name, 'PR review');
  assert.deepEqual(workflow.on, { pull_request_review: { types: ['submitted'] } });
  assert.deepEqual(workflow.permissions, {});
  assert.doesNotMatch(text, /secrets\.|\$\{\{/);
  // The job id is the check run name that facts.mjs leaves out of CI.
  assert.deepEqual(Object.keys(workflow.jobs), ['pr-review-relay']);
  const { steps } = workflow.jobs['pr-review-relay'];
  assert.deepEqual(steps.map((step) => Object.keys(step).sort()), [['run']]);
  assert.match(steps[0].run, /^echo /);
});

test('the workflow PR events only relays the events of a PR to jira-sync: no secret, no right, no code (Pilot 3)', () => {
  const text = readFileSync(join(ROOT, 'kit', '.github', 'workflows', 'pr-events.yml'), 'utf8');
  const workflow = parse(text);
  // The name jira-sync follows, and lib/tracker/sync.mjs tells a run of it by.
  assert.equal(workflow.name, PR_RELAY);
  // closed only clears the flag merge-gate raised (dev-workflow spec 2.7).
  assert.deepEqual(workflow.on, { pull_request: { types: ['opened', 'reopened', 'synchronize', 'ready_for_review', 'closed'] } });
  assert.deepEqual(workflow.permissions, {});
  assert.doesNotMatch(text, /secrets\.|\$\{\{/);
  // The job id is the check run name that facts.mjs leaves out of CI.
  assert.deepEqual(Object.keys(workflow.jobs), ['pr-events-relay']);
  const { steps } = workflow.jobs['pr-events-relay'];
  assert.deepEqual(steps.map((step) => Object.keys(step).sort()), [['run']]);
  assert.match(steps[0].run, /^echo /);
});

test('the kit settings leave the approvers to fill in, next to the project space', () => {
  const settings = JSON.parse(readFileSync(join(ROOT, 'kit', '.claude', 'settings.json'), 'utf8'));
  assert.equal(settings.env.AO_JIRA_SPACE, '<KEY>');
  assert.equal(settings.env.AO_APPROVERS, '<github-login>');
});

test('the kit maps every environment of tracker/jira.yaml for GitHub for Jira', () => {
  const mapping = readMapping(join(ROOT, 'tracker'));
  const config = parse(readFileSync(join(ROOT, 'kit', '.jira', 'config.yml'), 'utf8'));
  const expected = {};
  for (const { github_environment: name, jira_type: type } of Object.values(mapping.environments)) (expected[type] ??= []).push(name);
  assert.deepEqual(config.deployments.environmentMapping, expected);
});
