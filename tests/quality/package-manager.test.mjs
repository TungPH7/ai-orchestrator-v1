import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  auditArgs,
  devCommand,
  installArgs,
  lockfileOf,
  managerFromLockfile,
  managerOf,
  pnpmCli,
  pnpmVersion,
  runArgs,
  runManager,
} from '../../lib/quality/package-manager.mjs';

test('the package manager of project.yaml is npm unless the file says pnpm', () => {
  assert.equal(managerOf({}), 'npm');
  assert.equal(managerOf(null), 'npm');
  assert.equal(managerOf({ package_manager: 'pnpm' }), 'pnpm');
  assert.throws(() => managerOf({ package_manager: 'yarn' }), /yarn.*npm, pnpm/);
});

test('each package manager has its lockfile, and the one at the root names it', () => {
  assert.equal(lockfileOf('npm'), 'package-lock.json');
  assert.equal(lockfileOf('pnpm'), 'pnpm-lock.yaml');
  assert.equal(managerFromLockfile((path) => path === 'pnpm-lock.yaml'), 'pnpm');
  assert.equal(managerFromLockfile((path) => path === 'package-lock.json'), 'npm');
  assert.equal(managerFromLockfile(() => false), null);
});

test('the pnpm version of packageManager, without its hash', () => {
  assert.equal(pnpmVersion({ packageManager: 'pnpm@11.8.0' }), '11.8.0');
  assert.equal(pnpmVersion({ packageManager: 'pnpm@11.8.0+sha512.abc123' }), '11.8.0');
  assert.equal(pnpmVersion({ packageManager: 'pnpm@10.0.0-rc.1' }), '10.0.0-rc.1');
  assert.equal(pnpmVersion({ packageManager: 'npm@11.0.0' }), null);
  assert.equal(pnpmVersion({ packageManager: 'pnpm@latest' }), null);
  assert.equal(pnpmVersion({}), null);
  assert.equal(pnpmVersion(null), null);
});

test('install, run, dev and audit commands of npm and pnpm', () => {
  assert.deepEqual(installArgs('npm'), ['ci', '--no-audit', '--no-fund']);
  assert.deepEqual(installArgs('npm', { ignoreScripts: true }), ['ci', '--ignore-scripts', '--no-audit', '--no-fund']);
  assert.deepEqual(installArgs('pnpm'), ['install', '--frozen-lockfile']);
  assert.deepEqual(installArgs('pnpm', { ignoreScripts: true }), ['install', '--frozen-lockfile', '--ignore-scripts']);
  assert.deepEqual(runArgs('pnpm', 'lint'), ['run', 'lint']);
  assert.equal(devCommand('npm', 'apps/web'), 'npm run dev -w apps/web');
  assert.equal(devCommand('npm', 'apps/api', 'start:dev'), 'npm run start:dev -w apps/api');
  assert.equal(devCommand('pnpm', 'apps/user'), 'pnpm --filter ./apps/user run dev');
  assert.deepEqual(auditArgs('pnpm'), ['audit', '--json']);
  assert.throws(() => installArgs('yarn'), /yarn/);
});

test('pnpm is found as a JavaScript file next to node: a global npm install first, then corepack', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ao-pnpm-'));
  try {
    const node = join(dir, 'node.exe');
    const put = (...parts) => {
      mkdirSync(join(dir, ...parts.slice(0, -1)), { recursive: true });
      writeFileSync(join(dir, ...parts), '');
      return join(dir, ...parts);
    };
    assert.equal(pnpmCli(node, {}), undefined);
    const corepack = put('node_modules', 'corepack', 'dist', 'pnpm.js');
    assert.equal(pnpmCli(node, {}), corepack);
    const global = put('node_modules', 'pnpm', 'bin', 'pnpm.cjs');
    assert.equal(pnpmCli(node, {}), global);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('pnpm in %APPDATA%\\npm and under ../lib/node_modules is found too', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ao-pnpm-'));
  try {
    const bin = join(dir, 'bin');
    mkdirSync(join(dir, 'lib', 'node_modules', 'pnpm', 'bin'), { recursive: true });
    writeFileSync(join(dir, 'lib', 'node_modules', 'pnpm', 'bin', 'pnpm.cjs'), '');
    assert.equal(pnpmCli(join(bin, 'node'), {}), join(bin, '..', 'lib', 'node_modules', 'pnpm', 'bin', 'pnpm.cjs'));
    const appData = join(dir, 'roaming');
    mkdirSync(join(appData, 'npm', 'node_modules', 'pnpm', 'bin'), { recursive: true });
    writeFileSync(join(appData, 'npm', 'node_modules', 'pnpm', 'bin', 'pnpm.cjs'), '');
    assert.equal(pnpmCli(join(dir, 'nodejs', 'bin', 'node'), { APPDATA: appData }), join(appData, 'npm', 'node_modules', 'pnpm', 'bin', 'pnpm.cjs'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('npm runs without a shell through runManager', () => {
  const result = runManager('npm', ['--version'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout.trim(), /^\d+\.\d+\.\d+$/);
});

test('pnpm runs without a shell through runManager, when this machine has it', (t) => {
  const result = runManager('pnpm', ['--version'], { encoding: 'utf8' });
  if (result.error?.code === 'ENOENT') {
    t.skip('no pnpm on this machine');
    return;
  }
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout.trim(), /^\d+\.\d+\.\d+/);
});
