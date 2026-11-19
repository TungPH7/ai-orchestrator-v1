import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT } from '../helpers/kit.mjs';

// Review of shop PR #78 (Low): an argument the wrapper cannot pass safely through cmd.exe, such as -Dtest=A#b, ended
// mvnw.mjs with a stack trace instead of its one line of reason.
test('mvnw.mjs refuses an argument it cannot pass with one line of reason, not a stack trace', (t) => {
  const app = mkdtempSync(join(tmpdir(), 'mvnw-'));
  t.after(() => rmSync(app, { recursive: true, force: true }));
  writeFileSync(join(app, 'pom.xml'), '<project><properties><java.version>21</java.version></properties></project>\n');
  const run = spawnSync(process.execPath, [join(ROOT, 'scripts', 'mvnw.mjs'), app, 'test', '-Dtest=ProductServiceTest#findsById'], { encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /^mvnw: /);
  assert.doesNotMatch(run.stderr, /^\s+at /m, 'no stack trace');
});
