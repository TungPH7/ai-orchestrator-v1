import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT } from '../helpers/kit.mjs';

const SCRIPT = join(ROOT, 'scripts', 'ao-deploy.mjs');
const deploy = (args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });

function config(t, text) {
  const dir = mkdtempSync(join(tmpdir(), 'ao-deploy-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'deployer.yaml');
  writeFileSync(file, text);
  return file;
}
const FULL = ['state_dir: /var/lib/ao', 'secrets_dir: /etc/ao/secrets', 'app: { id: 1, key_file: /etc/ao/ao-deploy.pem }', 'apps: { dev: a, review: b }', 'approvers: [TungPH7]'];

test('ao-deploy.mjs names what it needs: a command, and every key of the configuration', (t) => {
  const file = config(t, `${FULL.join('\n')}\nprojects: [{ name: pilot, repo: TungPH7/ao-pilot }]\n`);
  const none = deploy(['--config', file]);
  assert.equal(none.status, 1);
  assert.match(none.stderr, /^usage: ao-deploy\.mjs tick/);
  const partial = deploy(['tick', '--config', config(t, `${FULL.slice(1).join('\n')}\n`)]);
  assert.equal(partial.status, 1);
  assert.match(partial.stderr, /has no state_dir/);
});

test('ao-deploy.mjs refuses a project whose name or repo could reach a path or a URL it should not', (t) => {
  for (const project of ['{ name: ../etc, repo: TungPH7/ao-pilot }', '{ name: pilot, repo: "TungPH7/ao-pilot/../x" }', '{ name: pilot, repo: "https://evil.example/x" }']) {
    const result = deploy(['tick', '--config', config(t, `${FULL.join('\n')}\nprojects: [${project}]\n`)]);
    assert.equal(result.status, 1, project);
    assert.match(result.stderr, /a project needs a name like pilot and a repo like owner\/name/, project);
  }
});
