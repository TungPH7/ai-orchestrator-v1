import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContract, readContract } from '../lib/contract.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const CONTRACT_DIR = join(ROOT, 'contract');
const VALIDATE_SCRIPT = join(ROOT, 'scripts', 'validate-contract.mjs');

const INVALID_ROLES = 'roles:\n  - id: pm\n    responsibilities: "Bản tổng hợp mỗi sáng"\n';

// Writes { 'relative/path': text } into a fresh temp folder, removed when the test ends.
function makeKit(t, files) {
  const root = mkdtempSync(join(tmpdir(), 'kit-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

test('roles.yaml declares the 12 roles of spec section 2.1, in order', () => {
  const { roles } = readContract(CONTRACT_DIR);

  assert.deepEqual(
    roles.map((role) => role.id),
    ['human', 'pm', 'ba', 'ux', 'sa', 'fe-dev', 'be-dev', 'reviewer', 'security', 'qa', 'devops', 'automation'],
  );
});

test('readContract lists the files in the templates folder next to the contract folder', (t) => {
  const root = makeKit(t, { 'contract/roles.yaml': INVALID_ROLES, 'templates/spec.md': '', 'templates/adr.md': '' });

  assert.deepEqual(readContract(join(root, 'contract')).template_files, ['adr.md', 'spec.md']);
});

test('readContract returns no template files when the templates folder is missing', (t) => {
  const root = makeKit(t, { 'contract/roles.yaml': INVALID_ROLES });

  assert.deepEqual(readContract(join(root, 'contract')).template_files, []);
});

test('readContract names the contract file it cannot read', (t) => {
  const root = makeKit(t, { 'contract/.keep': '' });

  assert.throws(() => readContract(join(root, 'contract')), /roles\.yaml/);
});

test('loadContract returns a deeply frozen contract', () => {
  const contract = loadContract(CONTRACT_DIR);

  assert.throws(() => {
    contract.roles[0].name = 'changed';
  }, TypeError);
});

test('loadContract throws with every rule violation listed', (t) => {
  const root = makeKit(t, { 'contract/roles.yaml': INVALID_ROLES });

  assert.throws(() => loadContract(join(root, 'contract')), /R1 roles\[id=pm\]\.name/);
});

test('validate script exits 0 and reports OK for the real contract', () => {
  const result = spawnSync(process.execPath, [VALIDATE_SCRIPT, CONTRACT_DIR], { encoding: 'utf8' });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /OK/);
});

test('validate script prints rule, path and message, and exits non-zero, for an invalid contract', (t) => {
  const root = makeKit(t, { 'contract/roles.yaml': INVALID_ROLES });

  const result = spawnSync(process.execPath, [VALIDATE_SCRIPT, join(root, 'contract')], { encoding: 'utf8' });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /R1 roles\[id=pm\]\.name: \S/);
});
