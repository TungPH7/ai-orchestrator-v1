import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { readContract } from '../../lib/contract.mjs';
import { readMapping, validateMapping } from '../../lib/tracker/mapping.mjs';
import { CONTRACT_DIR, ROOT, makeKit } from '../helpers/kit.mjs';
import { applyPatch } from '../helpers/patch.mjs';

const FIXTURE_DIR = new URL('../fixtures/tracker/invalid/', import.meta.url);
const VALIDATE_SCRIPT = join(ROOT, 'scripts', 'validate-contract.mjs');

const contract = readContract(CONTRACT_DIR);
const mapping = readMapping(join(ROOT, 'tracker'));

test('the real mapping breaks no rule', () => {
  assert.deepEqual(validateMapping(mapping, contract), []);
});

test('the mapping names the site and its cloud id (spec 2.2)', () => {
  assert.equal(mapping.site, 'phunghuutung12b4.atlassian.net');
  assert.equal(mapping.cloud_id, '58b36210-6e4d-421a-adf4-e74a4e23b069');
});

test('three identities: you, the agents service account and the CI service account (spec 2.2)', () => {
  assert.deepEqual(
    mapping.identities.map(({ id, account, group }) => `${id}: ${account} in ${group}`),
    ['human: site-admin in ao-humans', 'agents: orchestratoragent in ao-agents', 'automation: orchestratorci in ao-automation'],
  );
});

test('both service account tokens expire on 2027-10-27 and are read from their env vars', () => {
  assert.deepEqual(
    mapping.identities.filter(({ kind }) => kind === 'service-account').map(({ token_env: env, token_expires_on: date }) => `${env} ${date}`),
    ['ATLASSIAN_AGENT_TOKEN 2027-10-27', 'JIRA_CI_TOKEN 2027-10-27'],
  );
});

test('readMapping names the file it cannot read', () => {
  assert.throws(() => readMapping(join(ROOT, 'no-such-dir')), /Cannot read .*jira\.yaml/);
});

test('validate script also checks the mapping next to the contract folder', () => {
  const result = spawnSync(process.execPath, [VALIDATE_SCRIPT, CONTRACT_DIR], { encoding: 'utf8' });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Mapping OK/);
});

test('validate script prints mapping errors and exits non-zero', (t) => {
  const text = readFileSync(join(ROOT, 'tracker', 'jira.yaml'), 'utf8').replace('roles: [automation]', 'roles: [automation, qa]');
  const root = makeKit(t, { 'tracker/jira.yaml': text });

  const result = spawnSync(process.execPath, [VALIDATE_SCRIPT, join(root, 'contract')], { encoding: 'utf8' });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /J4 identities\[id=automation\]\.roles: \S/);
});

// Each fixture breaks exactly one rule: { description, rule, expect: [paths], patch: [ops] }
const fixtures = readdirSync(FIXTURE_DIR).filter((file) => file.endsWith('.yaml')).sort();

for (const file of fixtures) {
  const fixture = parse(readFileSync(new URL(file, FIXTURE_DIR), 'utf8'));

  test(`${file}: ${fixture.description}`, () => {
    const errors = validateMapping(applyPatch(mapping, fixture.patch), contract);

    assert.deepEqual(
      errors.map(({ rule, path }) => `${rule} ${path}`).sort(),
      fixture.expect.map((path) => `${fixture.rule} ${path}`).sort(),
    );
    for (const { message } of errors) assert.ok(message, 'every error has a message');
  });
}
