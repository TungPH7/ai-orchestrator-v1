import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { validateDeployerConfig } from '../../lib/release/deployer-config.mjs';
import { CONTRACT_DIR, ROOT } from '../helpers/kit.mjs';
import { applyPatch } from '../helpers/patch.mjs';

const FIXTURE_DIR = new URL('../fixtures/release/deployer-invalid/', import.meta.url);
const example = parse(readFileSync(join(ROOT, 'vps/deployer.example.yaml'), 'utf8'));

test('vps/deployer.example.yaml is valid', () => {
  assert.deepEqual(validateDeployerConfig(example), []);
});

// Each fixture breaks exactly one rule: { description, rule, expect: [paths], patch: [ops] }
for (const file of readdirSync(FIXTURE_DIR).filter((name) => name.endsWith('.yaml')).sort()) {
  const fixture = parse(readFileSync(new URL(file, FIXTURE_DIR), 'utf8'));
  test(`${file}: ${fixture.description}`, () => {
    const errors = validateDeployerConfig(applyPatch(example, fixture.patch));
    assert.deepEqual(errors.map(({ rule, path }) => `${rule} ${path}`).sort(), fixture.expect.map((path) => `${fixture.rule} ${path}`).sort());
    for (const { message } of errors) assert.ok(message, 'every error has a message');
  });
}

test('validate script checks vps/deployer.example.yaml in the kit', () => {
  const result = spawnSync(process.execPath, [join(ROOT, 'scripts', 'validate-contract.mjs'), CONTRACT_DIR], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Deployer config OK: .*deployer\.example\.yaml/);
});
