import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scanStaged } from '../../lib/quality/pre-commit.mjs';
import { ROOT } from '../helpers/kit.mjs';

// A real-looking key made at run time, so no file of the repo holds one for a scanner to find.
const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

test('scanStaged lints the staged text of each file and skips binary content', async () => {
  const contents = { 'src/key.ts': `export const key = \`${privateKey}\`;\n`, 'src/ok.ts': 'export const a = 1;\n', 'logo.png': 'PNG\0\0data' };
  const linted = [];
  const lint = async ({ content, filePath }) => {
    linted.push(filePath);
    return content.includes('PRIVATE KEY') ? { ok: false, output: `${filePath}: [PrivateKey] found private key: ****` } : { ok: true, output: '' };
  };
  const result = await scanStaged({ files: Object.keys(contents), read: (file) => contents[file], lint });
  assert.deepEqual(linted, ['src/key.ts', 'src/ok.ts']);
  assert.equal(result.ok, false);
  assert.match(result.output, /src\/key\.ts: \[PrivateKey\]/);
  assert.deepEqual(await scanStaged({ files: [], read: () => '', lint }), { ok: true, output: '' });
});

function gitRepo(t, packageJson) {
  const dir = mkdtempSync(join(tmpdir(), 'pre-commit-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  spawnSync('git', ['init', '-q'], { cwd: dir });
  if (packageJson) writeFileSync(join(dir, 'package.json'), JSON.stringify(packageJson));
  return dir;
}

const stage = (dir, file, text) => {
  mkdirSync(join(dir, file, '..'), { recursive: true });
  writeFileSync(join(dir, file), text);
  spawnSync('git', ['add', file], { cwd: dir });
};
const preCommit = (dir) => spawnSync(process.execPath, [join(ROOT, 'scripts', 'pre-commit.mjs')], { cwd: dir, encoding: 'utf8' });

test('the pre-commit script blocks a staged private key and masks it in its output', (t) => {
  const dir = gitRepo(t);
  stage(dir, 'src/key.ts', `export const key = \`${privateKey}\`;\n`);
  const result = preCommit(dir);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /src[\\/]key\.ts/);
  assert.match(result.stderr, /found private key/);
  assert.ok(!result.stderr.includes(privateKey.split('\n')[1]), 'the key itself is not printed');
});

test('the pre-commit script scans the staged text, not the file on disk', (t) => {
  const dir = gitRepo(t);
  stage(dir, 'src/a.ts', 'export const a = 1;\n');
  writeFileSync(join(dir, 'src/a.ts'), `export const key = \`${privateKey}\`;\n`);
  assert.equal(preCommit(dir).status, 0);
});

test('the pre-commit script passes with nothing staged, and runs the project precommit script', (t) => {
  assert.equal(preCommit(gitRepo(t)).status, 0);

  const failing = gitRepo(t, { scripts: { precommit: 'node -e "process.exit(3)"' } });
  stage(failing, 'src/a.ts', 'export const a = 1;\n');
  const result = preCommit(failing);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /precommit/);

  const passing = gitRepo(t, { scripts: { precommit: 'node -e "process.exit(0)"' } });
  stage(passing, 'src/a.ts', 'export const a = 1;\n');
  assert.equal(preCommit(passing).status, 0);
});
