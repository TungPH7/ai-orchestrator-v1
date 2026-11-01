import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { readContract } from '../../lib/contract.mjs';
import { docsRule, epicOfDocsBranch, readCiJobs, readGates, validateGates } from '../../lib/quality/gates.mjs';
import { CONTRACT_DIR, ROOT, makeKit } from '../helpers/kit.mjs';
import { applyPatch } from '../helpers/patch.mjs';

const FIXTURE_DIR = new URL('../fixtures/quality/invalid/', import.meta.url);
const VALIDATE_SCRIPT = join(ROOT, 'scripts', 'validate-contract.mjs');

const contract = readContract(CONTRACT_DIR);
const gates = readGates(join(ROOT, 'quality'));
const ciJobs = readCiJobs(join(ROOT, 'kit', '.github', 'workflows', 'ci.yml'));

test('the real gates break no rule', () => {
  assert.deepEqual(validateGates(gates, contract, { ciJobs }), []);
});

test('the gates hold the values of the spec: four checks, 80% of changed lines, high audit level (spec 2.4, 6)', () => {
  assert.deepEqual(gates.checks, ['policy', 'build-test', 'secrets', 'sast']);
  assert.equal(gates.coverage.changed_lines_min, 80);
  assert.equal(gates.dependencies.audit_level, 'high');
  assert.deepEqual(gates.suppressions.never, ['.only(']);
  for (const left of ['**/*.config.*', '**/migrations/**']) assert.ok(gates.coverage.exclude.includes(left), left);
  assert.deepEqual(gates.protected_branches, ['develop', 'main', 'release/*']);
});

test('dev roles open PRs with ao-dev and review roles post reports with ao-review (spec 2.2)', () => {
  assert.deepEqual(gates.github_apps.dev, { env: 'AO_DEV_APP', roles: ['ba', 'sa', 'fe-dev', 'be-dev', 'devops'], commands: ['create', 'edit', 'comment'] });
  assert.deepEqual(gates.github_apps.review, { env: 'AO_REVIEW_APP', roles: ['reviewer', 'security'], commands: ['review'] });
});

test('only devops may edit workflows; no agent may edit the hooks, the Claude settings, the kit copy or the MCP servers (spec 2.7)', () => {
  assert.deepEqual(
    gates.protected_paths.map(({ path, editors = [] }) => `${path} ${editors.join(',')}`.trim()),
    ['.github/workflows/** devops', '.githooks/**', '.claude/**', '.ai-orchestrator/**', '.mcp.json'],
  );
});

test('the docs PR of an Epic changes only its specs and the ADRs, from its spec branch, past the plan gate (dev-workflow spec 2.4)', () => {
  assert.deepEqual(gates.docs_pull_requests, { paths: ['docs/specs/<EPIC>/**', 'docs/adr/**'], branch: 'feature/<EPIC>-spec', gate: 'plan-approval' });
  assert.deepEqual(docsRule(gates, 'DEMO-20'), { branch: 'feature/DEMO-20-spec', paths: ['docs/specs/DEMO-20/**', 'docs/adr/**'], gate: 'plan-approval' });
});

test('the Epic of a docs branch, and no Epic for any other branch', () => {
  assert.equal(epicOfDocsBranch(gates, 'feature/DEMO-20-spec'), 'DEMO-20');
  assert.equal(epicOfDocsBranch(gates, 'feature/AB2-7-spec'), 'AB2-7');
  for (const branch of ['feature/DEMO-20-coupon', 'feature/DEMO-20-spec-r2', 'feature/demo-20-spec', 'bugfix/DEMO-20-spec', 'feature/DEMO-spec', 'xfeature/DEMO-20-spec']) {
    assert.equal(epicOfDocsBranch(gates, branch), null, branch);
  }
});

test('readGates names the file it cannot read', () => {
  assert.throws(() => readGates(join(ROOT, 'no-such-dir')), /Cannot read .*gates\.yaml/);
});

test('validate script also checks the gates next to the contract folder', () => {
  const result = spawnSync(process.execPath, [VALIDATE_SCRIPT, CONTRACT_DIR], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Gates OK/);
});

test('validate script prints gate errors and exits non-zero', (t) => {
  const text = readFileSync(join(ROOT, 'quality', 'gates.yaml'), 'utf8').replace('roles: [reviewer, security]', 'roles: [reviewer, security, qa-lead]');
  const root = makeKit(t, { 'quality/gates.yaml': text });

  const result = spawnSync(process.execPath, [VALIDATE_SCRIPT, join(root, 'contract')], { encoding: 'utf8' });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Q3 github_apps\.review\.roles: \S/);
});

// Each fixture breaks exactly one rule: { description, rule, expect: [paths], patch: [ops] }
const fixtures = readdirSync(FIXTURE_DIR).filter((file) => file.endsWith('.yaml')).sort();

for (const file of fixtures) {
  const fixture = parse(readFileSync(new URL(file, FIXTURE_DIR), 'utf8'));

  test(`${file}: ${fixture.description}`, () => {
    const errors = validateGates(applyPatch(gates, fixture.patch), contract, { ciJobs });

    assert.deepEqual(
      errors.map(({ rule, path }) => `${rule} ${path}`).sort(),
      fixture.expect.map((path) => `${fixture.rule} ${path}`).sort(),
    );
    for (const { message } of errors) assert.ok(message, 'every error has a message');
  });
}
