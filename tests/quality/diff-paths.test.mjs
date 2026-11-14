import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { changedLines } from '../../lib/quality/coverage.mjs';
import { headerPath, touchedPaths, unquotePath } from '../../lib/quality/diff-paths.mjs';
import { addedLines, deletedTests } from '../../lib/quality/suppressions.mjs';

test('unquotePath reads the octal bytes and C escapes of a path git quotes, and leaves a plain path as it is', () => {
  assert.equal(unquotePath('"ghi-ch\\303\\272.ts"'), 'ghi-chú.ts');
  assert.equal(unquotePath('"src/m\\303\\240n h\\303\\254nh/a.ts"'), 'src/màn hình/a.ts');
  assert.equal(unquotePath('"a\\tb\\\\c\\"d.ts"'), 'a\tb\\c"d.ts');
  assert.equal(unquotePath('src/a.ts'), 'src/a.ts');
  assert.equal(unquotePath('"'), '"');
});

test('headerPath reads both sides of a diff header, quoted, with the tab after a path that has a space, or /dev/null', () => {
  assert.deepEqual(headerPath('+++ "b/src/ghi-ch\\303\\272.ts"'), { side: '+++', path: 'src/ghi-chú.ts' });
  assert.deepEqual(headerPath('--- a/src/a b.ts\t'), { side: '---', path: 'src/a b.ts' });
  assert.deepEqual(headerPath('+++ b/src/a.ts'), { side: '+++', path: 'src/a.ts' });
  assert.deepEqual(headerPath('+++ /dev/null'), { side: '+++', path: null });
  assert.equal(headerPath('+const x = 1;'), null);
  assert.equal(headerPath('@@ -1 +1 @@'), null);
});

// Low of security on ao-sample PR #13: an added line "++ b/README.md" shows as "+++ b/README.md" in the diff, and the
// parsers took it for the header of a Markdown file, which policy does not check.
test('a line of a hunk that looks like a file header is a line of its file', () => {
  const diff = [
    'diff --git a/src/a.ts b/src/a.ts',
    '--- a/src/a.ts',
    '+++ b/src/a.ts',
    '@@ -1,1 +2,4 @@',
    '--- a/src/old.test.ts',
    '+++ b/README.md',
    '+++ "b/README.md"',
    '+++ /dev/null',
    '+// eslint-disable-line',
    '',
  ].join('\n');
  assert.deepEqual(addedLines(diff), [
    { file: 'src/a.ts', line: 2, text: '++ b/README.md' },
    { file: 'src/a.ts', line: 3, text: '++ "b/README.md"' },
    { file: 'src/a.ts', line: 4, text: '++ /dev/null' },
    { file: 'src/a.ts', line: 5, text: '// eslint-disable-line' },
  ]);
  assert.deepEqual([...changedLines(diff)], [['src/a.ts', [2, 3, 4, 5]]]);
  assert.deepEqual(deletedTests(diff), []);
});

// What git writes, with core.quotePath on as by default: the parsers of the policy and coverage jobs read the paths as
// they are on disk, so a suppression in a file with a Vietnamese name is checked (review of ao-sample PR #5).
test('on a real git diff, a file with a name outside ASCII or with a space keeps its lines, and its deletion is seen', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'diff-paths-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const git = (...args) => spawnSync('git', ['-c', 'user.email=t@example.com', '-c', 'user.name=t', '-c', 'core.quotePath=true', ...args], { cwd: dir, encoding: 'utf8' });
  git('init', '-q', '-b', 'develop');
  mkdirSync(join(dir, 'src'));
  writeFileSync(join(dir, 'src', 'cũ.test.ts'), 'x\n');
  writeFileSync(join(dir, 'src', 'a b.ts'), 'a\n');
  git('add', '.');
  git('commit', '-q', '-m', 'chore(repo): start');
  writeFileSync(join(dir, 'src', 'ghi-chú.ts'), 'const y = z as any; // @ts-ignore\n');
  writeFileSync(join(dir, 'src', 'a b.ts'), 'a\n// eslint-disable-line\n');
  git('rm', '-q', join('src', 'cũ.test.ts'));
  git('add', '.');
  const diff = git('diff', '--cached', '-U0', '--no-color', '--no-ext-diff').stdout;
  assert.match(diff, /"b\/src\/ghi-ch\\303\\272\.ts"/, 'git quoted the path');
  assert.deepEqual(addedLines(diff), [
    { file: 'src/a b.ts', line: 2, text: '// eslint-disable-line' },
    { file: 'src/ghi-chú.ts', line: 1, text: 'const y = z as any; // @ts-ignore' },
  ]);
  assert.deepEqual(deletedTests(diff), ['src/cũ.test.ts']);
  assert.deepEqual([...changedLines(diff)], [['src/a b.ts', [2]], ['src/ghi-chú.ts', [1]]]);
});

// Review round 2 of shop PR #13 (Pilot 3, spec 2.9): one helper for the paths a GitHub file list touches, used by
// merge-gate, audit, the docs PR rule and /ao-ship.
test('the paths a list of changed files touches: each name, and the old name of a renamed file, once each', () => {
  assert.deepEqual(touchedPaths([
    { filename: 'CHANGELOG.md', status: 'modified' },
    { filename: 'docs/releases/v0.2.0.md', previous_filename: 'apps/api/src/main.ts', status: 'renamed' },
    { filename: 'CHANGELOG.md', status: 'modified' },
  ]), ['CHANGELOG.md', 'apps/api/src/main.ts', 'docs/releases/v0.2.0.md']);
  assert.deepEqual(touchedPaths([]), []);
  assert.deepEqual(touchedPaths(), []);
});
