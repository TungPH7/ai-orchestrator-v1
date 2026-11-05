import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT } from '../helpers/kit.mjs';

const SCRIPT = join(ROOT, 'scripts', 'ao-deploy.mjs');
const EXAMPLE = readFileSync(join(ROOT, 'vps', 'deployer.example.yaml'), 'utf8');
const deploy = (args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });

function config(t, text) {
  const dir = mkdtempSync(join(tmpdir(), 'ao-deploy-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'deployer.yaml');
  writeFileSync(file, text);
  return file;
}

test('ao-deploy.mjs needs a command before it reads anything', () => {
  for (const args of [[], ['baseline'], ['deploy']]) {
    const result = deploy([...args, '--config', '/no/such/file']);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /^usage: ao-deploy\.mjs tick/);
  }
});

test('ao-deploy.mjs refuses a configuration that breaks deployer.schema.json, and says where', (t) => {
  const partial = deploy(['tick', '--config', config(t, EXAMPLE.replace(/^state_dir: .*$/m, ''))]);
  assert.equal(partial.status, 1);
  assert.match(partial.stderr, /is not valid:\nV1 state_dir: is required/);
  for (const [from, to, path] of [
    ['name: pilot', 'name: ../etc', 'projects\\[0\\]\\.name'],
    ['repo: TungPH7/ao-pilot', 'repo: "https://evil.example/x"', 'projects\\[0\\]\\.repo'],
  ]) {
    const result = deploy(['tick', '--config', config(t, EXAMPLE.replace(from, to))]);
    assert.equal(result.status, 1, to);
    assert.match(result.stderr, new RegExp(`V1 ${path}:`), to);
  }
});
