import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse } from 'yaml';
import { readMapping } from '../../lib/tracker/mapping.mjs';
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
  assert.deepEqual(Object.keys(workflow.on), ['pull_request', 'pull_request_review', 'workflow_run', 'deployment_status', 'workflow_dispatch']);
  assert.deepEqual(workflow.on.pull_request.types, ['opened', 'reopened', 'synchronize', 'ready_for_review']);
  assert.deepEqual(workflow.on.workflow_run.types, ['completed']);
  assert.equal(workflow.on.workflow_dispatch.inputs.item.required, true);
  assert.ok(Object.values(workflow.permissions).every((right) => right === 'read'));

  // The job id is the check run name that facts.mjs leaves out of CI.
  assert.deepEqual(Object.keys(workflow.jobs), ['jira-sync']);
  const steps = workflow.jobs['jira-sync'].steps;
  const sync = steps.find(({ run: command }) => command?.includes('jira-sync.mjs'));
  assert.equal(sync.run, 'node .ai-orchestrator/scripts/jira-sync.mjs');
  assert.equal(sync.env.JIRA_CI_TOKEN, '${{ secrets.JIRA_CI_TOKEN }}');
  assert.equal(sync.env.GITHUB_TOKEN, '${{ github.token }}');
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
