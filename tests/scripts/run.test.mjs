import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT } from '../helpers/kit.mjs';

// scripts/run.mjs on a real folder (kit followups before C1, batch 2). The CI job on Windows runs this file too, so the
// way it starts npm there, without the shell shims that failed in agent sessions, is checked (SHOP-21 of shop, Pilot 3).
function project(t, scripts) {
  const dir = mkdtempSync(join(tmpdir(), 'ao-run-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, 'apps', 'web'), { recursive: true });
  writeFileSync(join(dir, 'apps', 'web', 'package.json'), JSON.stringify({ name: 'web', private: true, scripts }));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'demo', private: true, workspaces: ['apps/*'] }));
  return dir;
}
const run = (dir, ...args) => spawnSync(process.execPath, [join(ROOT, 'scripts', 'run.mjs'), ...args], { cwd: dir, encoding: 'utf8', env: { ...process.env, MSYS_NO_PATHCONV: '1' } });

test('run.mjs runs a script of an app, prints the counts and its exit, and keeps the whole output in .ai/tmp/', (t) => {
  const dir = project(t, { test: 'node -e "console.log(\'noise\'); console.log(\'      Tests  3 passed (3)\'); console.log(process.argv.slice(1).join(\' \'))" --' });
  const done = run(dir, 'web', 'test', '--', 'product-card');
  assert.equal(done.status, 0, done.stdout + done.stderr);
  assert.match(done.stdout, /^ {6}Tests {2}3 passed \(3\)$/m);
  assert.doesNotMatch(done.stdout, /noise/, 'only the summary, not the whole output');
  assert.match(done.stdout, /run: web test exited with 0\. The whole output is in .*\.ai\/tmp\/run-web-test\.log/);
  const log = readFileSync(join(dir, '.ai', 'tmp', 'run-web-test.log'), 'utf8');
  assert.match(log, /noise/);
  assert.match(log, /product-card/, 'what follows -- reaches the script');
});

test('run.mjs exits with the code of a failing script and shows its first failure', (t) => {
  const dir = project(t, { lint: 'node -e "console.error(\'FAIL  src/a.test.ts > shows the price\'); process.exit(3)"' });
  const done = run(dir, 'web', 'lint');
  assert.equal(done.status, 3);
  assert.match(done.stdout, /First failure:\nFAIL {2}src\/a\.test\.ts > shows the price/);
  assert.match(done.stdout, /run: web lint exited with 3/);
});

test('run.mjs refuses an app that is not there, and a name that is not plain, before it runs anything', (t) => {
  const dir = project(t, { test: 'node -e ""' });
  const missing = run(dir, 'api', 'test');
  assert.equal(missing.status, 2);
  assert.match(missing.stderr, /apps\/api has no package\.json or pom\.xml/);
  const odd = run(dir, 'web', 'test;x');
  assert.equal(odd.status, 2);
  assert.match(odd.stderr, /script "test;x" is not the name of a script/);
  assert.equal(existsSync(join(dir, '.ai')), false);
});
