import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { npmCli, runNpm } from '../../lib/quality/npm.mjs';
import { ROOT } from '../helpers/kit.mjs';

test('npm is found next to node and runs without a shell', () => {
  assert.match(npmCli() ?? '', /npm-cli\.js$/);
  const result = runNpm(['--version'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout.trim(), /^\d+\.\d+\.\d+$/);
});

test('no kit script starts a process through a shell', () => {
  for (const script of ['pre-commit.mjs', 'check-policy.mjs']) {
    const text = readFileSync(join(ROOT, 'scripts', script), 'utf8');
    assert.doesNotMatch(text, /shell:/, script);
  }
});
