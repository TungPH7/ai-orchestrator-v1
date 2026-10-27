import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { ROOT } from './helpers/kit.mjs';

const WORKFLOW = join(ROOT, '.github', 'workflows', 'contract.yml');
const COMMANDS = ['npm run validate', 'npm test', 'npm run render:check', 'npm run jira:checklist:check'];

function readme() {
  return readFileSync(join(ROOT, 'README.md'), 'utf8');
}

test('CI runs on every PR and on every push to main', () => {
  assert.ok(existsSync(WORKFLOW), '.github/workflows/contract.yml exists');
  const { on } = parse(readFileSync(WORKFLOW, 'utf8'));

  assert.ok('pull_request' in on);
  assert.deepEqual(on.push.branches, ['main']);
});

test('CI installs from the lockfile on Node 24, then runs the same checks as locally', () => {
  const { jobs } = parse(readFileSync(WORKFLOW, 'utf8'));
  const steps = Object.values(jobs).flatMap((job) => job.steps);

  assert.equal(steps.find((step) => step.uses?.startsWith('actions/setup-node@'))?.with['node-version'], 24);
  assert.deepEqual(steps.filter((step) => step.run).map((step) => step.run), ['npm ci', ...COMMANDS]);
});

test('README lists the commands and points to the specs and the generated docs', () => {
  for (const text of ['npm install', 'npm run render', ...COMMANDS, '(SPEC.md)', '(SPEC-sdlc-contract.md)', '(docs/sdlc.md)']) {
    assert.ok(readme().includes(text), text);
  }
});

test('README shows the folder layout and says docs/sdlc.md is never edited by hand', () => {
  for (const folder of ['contract/', 'templates/', 'lib/', 'scripts/', 'docs/', 'tests/']) assert.ok(readme().includes(folder), folder);
  assert.match(readme(), /docs\/sdlc\.md.*không sửa tay/i);
});
