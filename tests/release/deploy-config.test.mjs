import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { readDeployConfig, validateDeployConfig } from '../../lib/release/deploy-config.mjs';
import { CONTRACT_DIR, ROOT, makeKit } from '../helpers/kit.mjs';
import { applyPatch } from '../helpers/patch.mjs';

const FIXTURE_DIR = new URL('../fixtures/release/invalid/', import.meta.url);
const VALIDATE_SCRIPT = join(ROOT, 'scripts', 'validate-contract.mjs');
// The deploy.yaml of ao-pilot in release-workflow spec 2.3.
const TEXT = readFileSync(join(ROOT, 'tests/fixtures/release/deploy.yaml'), 'utf8');
const config = parse(TEXT);

test('the deploy.yaml of spec 2.3 is valid', () => {
  assert.deepEqual(readDeployConfig(TEXT), {
    config: {
      apps: { web: { dockerfile: 'Dockerfile', port: 3000, health: '/', public: true, env: ['HOST', 'PORT'] } },
      smoke: [{ app: 'web', path: '/', expect_status: 200, expect_text: 'Giỏ hàng' }],
    },
    errors: [],
  });
});

test('a project with two apps: the API is internal, the web is public, both have smoke checks', () => {
  const text = [
    'apps:',
    '  api: { dockerfile: apps/api/Dockerfile, port: 4000, health: /api/health, env: [DATABASE_URL] }',
    '  web: { dockerfile: apps/web/Dockerfile, port: 3000, health: /, public: true, env: [API_URL] }',
    'smoke:',
    '  - { app: api, path: /api/health, expect_status: 200, expect_text: ok }',
    '  - { app: web, path: /notes, expect_status: 200, expect_text: Ghi chú }',
    '',
  ].join('\n');
  assert.deepEqual(readDeployConfig(text).errors, []);
});

test('a file that is not YAML, or is empty, is a D1 error', () => {
  for (const text of ['apps: [', '']) {
    const { config: read, errors } = readDeployConfig(text);
    assert.equal(read, null, JSON.stringify(text));
    assert.deepEqual(errors.map(({ rule }) => rule), ['D1'], JSON.stringify(text));
    assert.match(errors[0].message, /deploy\.yaml/);
  }
});

test('schema errors come alone: the other rules only read a file of the right shape', () => {
  const broken = applyPatch(config, [
    { op: 'set', path: 'apps.web.public', value: 'yes' },
    { op: 'set', path: 'smoke.0.app', value: 'api' },
  ]);
  assert.deepEqual(validateDeployConfig(broken).map(({ rule, path }) => `${rule} ${path}`), ['D1 apps.web.public']);
});

// project-scaffold part 2, spec 2.4: D2 asks for one public app at least; two are fine, each on its own host.
test('two public apps make a valid deploy.yaml', () => {
  const two = applyPatch(config, [{ op: 'set', path: 'apps.admin', value: { dockerfile: 'apps/admin/Dockerfile', port: 5173, health: '/', public: true } }]);
  assert.deepEqual(validateDeployConfig(two), []);
});

// Each fixture breaks exactly one rule: { description, rule, expect: [paths], patch: [ops] }
const fixtures = readdirSync(FIXTURE_DIR).filter((file) => file.endsWith('.yaml')).sort();

test('the fixtures cover what the schema must refuse (spec 2.3, 7)', () => {
  for (const name of ['d1-volume', 'd1-privileged', 'd1-host-port', 'd1-host-network', 'd2-no-public-app', 'd3-smoke-unknown-app']) {
    assert.ok(fixtures.includes(`${name}.yaml`), name);
  }
});

for (const file of fixtures) {
  const fixture = parse(readFileSync(new URL(file, FIXTURE_DIR), 'utf8'));

  test(`${file}: ${fixture.description}`, () => {
    const errors = validateDeployConfig(applyPatch(config, fixture.patch));

    assert.deepEqual(
      errors.map(({ rule, path }) => `${rule} ${path}`).sort(),
      fixture.expect.map((path) => `${fixture.rule} ${path}`).sort(),
    );
    for (const { message } of errors) assert.ok(message, 'every error has a message');
  });
}

test('validate script checks the deploy.yaml next to the contract folder, as a project copy has it', (t) => {
  const root = makeKit(t, { 'deploy.yaml': TEXT });
  const result = spawnSync(process.execPath, [VALIDATE_SCRIPT, join(root, 'contract')], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Deploy config OK: .*deploy\.yaml/);
});

test('validate script prints deploy.yaml errors and exits non-zero', (t) => {
  const root = makeKit(t, { 'deploy.yaml': TEXT.replace('public: true', 'public: false') });
  const result = spawnSync(process.execPath, [VALIDATE_SCRIPT, join(root, 'contract')], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /D2 apps: \S/);
});

test('the kit itself has no deploy.yaml, so validate skips the check there', () => {
  const result = spawnSync(process.execPath, [VALIDATE_SCRIPT, CONTRACT_DIR], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /Deploy config/);
});
