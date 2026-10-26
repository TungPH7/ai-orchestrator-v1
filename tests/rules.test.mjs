import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { readContract, validateContract } from '../lib/contract.mjs';
import { applyPatch } from './helpers/patch.mjs';

const CONTRACT_DIR = fileURLToPath(new URL('../contract/', import.meta.url));
const FIXTURE_DIR = new URL('./fixtures/invalid/', import.meta.url);

const contract = readContract(CONTRACT_DIR);

test('the real contract breaks no rule', () => {
  assert.deepEqual(validateContract(contract), []);
});

// Each fixture breaks exactly one rule: { description, rule, expect: [paths], patch: [ops] }
const fixtures = readdirSync(FIXTURE_DIR).filter((file) => file.endsWith('.yaml')).sort();

for (const file of fixtures) {
  const fixture = parse(readFileSync(new URL(file, FIXTURE_DIR), 'utf8'));

  test(`${file}: ${fixture.description}`, () => {
    const errors = validateContract(applyPatch(contract, fixture.patch));

    assert.deepEqual(
      errors.map(({ rule, path }) => ({ rule, path })),
      fixture.expect.map((path) => ({ rule: fixture.rule, path })),
    );
    for (const { message } of errors) assert.ok(message, 'every error has a message');
  });
}
