import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { ROOT } from '../helpers/kit.mjs';

const DIR = join(ROOT, 'kit', '.github', 'workflows');
const workflows = readdirSync(DIR)
  .filter((name) => name.endsWith('.yml'))
  .map((name) => {
    const text = readFileSync(join(DIR, name), 'utf8');
    return { name, text, workflow: parse(text) };
  });

// The events whose workflow GitHub takes from the PR itself, with the repository's secrets for a branch of the repo:
// an agent's branch could change the code they run (review of shop PR #21).
const PR_RUN = ['pull_request', 'pull_request_review', 'pull_request_review_comment'];
const SECRET = /\bsecrets\.\w+/;

test('the kit has the workflows this test reads', () => {
  assert.deepEqual(workflows.map(({ name }) => name).sort(), ['audit.yml', 'ci.yml', 'jira-sync.yml', 'merge-gate.yml', 'pr-events.yml', 'pr-review.yml']);
});

test('a workflow that names a secret never runs on an event whose workflow comes from the PR', () => {
  const named = workflows.filter(({ text }) => SECRET.test(text));
  assert.deepEqual(named.map(({ name }) => name).sort(), ['audit.yml', 'jira-sync.yml', 'merge-gate.yml']);
  for (const { name, workflow } of named) {
    const events = Object.keys(workflow.on);
    assert.deepEqual(events.filter((event) => PR_RUN.includes(event)), [], `${name}: ${events.join(', ')}`);
  }
});

test('every job that names a secret takes it from an environment, which only protected branches may use', () => {
  for (const { name, workflow } of workflows) {
    for (const [id, job] of Object.entries(workflow.jobs)) {
      if (!SECRET.test(JSON.stringify(job))) continue;
      assert.ok(job.environment?.name, `${name}: job ${id} names a secret without an environment`);
      // No deployment: its deployment_status event would start jira-sync again.
      assert.equal(job.environment.deployment, false, `${name}: job ${id}`);
    }
  }
});

test('pull_request_target never checks out the code of the PR', () => {
  for (const { name, workflow } of workflows.filter(({ workflow }) => 'pull_request_target' in workflow.on)) {
    for (const job of Object.values(workflow.jobs)) {
      for (const { with: given = {} } of job.steps ?? []) assert.ok(!('ref' in given) && !('repository' in given), `${name}: ${JSON.stringify(given)}`);
    }
  }
});
