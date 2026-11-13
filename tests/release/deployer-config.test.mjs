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

// project-scaffold part 2, spec 2.4: a project with two public apps names the hosts of each.
const BY_APP = {
  user: { development: 'shop-dev.ao.t2g.io.vn', staging: 'shop-staging.ao.t2g.io.vn', production: 'shop.ao.t2g.io.vn' },
  admin: { development: 'shop-admin-dev.ao.t2g.io.vn', staging: 'shop-admin-staging.ao.t2g.io.vn', production: 'shop-admin.ao.t2g.io.vn' },
};
const withShop = (hosts) => applyPatch(example, [{ op: 'set', path: 'projects.2', value: { name: 'shop', repo: 'TungPH7/shop', space: 'SHOP', hosts } }]);
const rules = (config) => validateDeployerConfig(config).map(({ rule, path }) => `${rule} ${path}`);

test('hosts app by app: valid, each host once on the VPS, each app with its three environments', () => {
  assert.deepEqual(rules(withShop(BY_APP)), []);
  // An app may be named staging: the values tell the shapes apart, not the keys.
  assert.deepEqual(rules(withShop({ staging: BY_APP.user, admin: BY_APP.admin })), []);
  assert.deepEqual(rules(withShop({ ...BY_APP, admin: { ...BY_APP.admin, production: 'sample.ao.t2g.io.vn' } })), ['V2 projects[2].hosts.admin.production']);
  assert.deepEqual(rules(withShop({ ...BY_APP, admin: { development: 'a.ao.t2g.io.vn', production: 'b.ao.t2g.io.vn' } })), ['V1 projects[2].hosts.admin.staging']);
  assert.deepEqual(rules(withShop({ ...BY_APP, Admin: BY_APP.admin })).filter((line) => line.startsWith('V1')).length > 0, true);
  assert.deepEqual(rules(withShop({})), ['V1 projects[2].hosts']);
});
