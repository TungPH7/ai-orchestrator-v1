import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { laneKeeper, runsSettings } from '../../lib/workflow/lanes.mjs';

// The lanes of a project on this machine (parallel-runs spec, part 1), on real repositories: an origin and the project
// folder on develop, with the lanes next to it.
const isProtected = (branch) => ['develop', 'main'].includes(branch) || branch.startsWith('release/');
const fs = { existsSync, mkdirSync, copyFileSync, readdirSync };
const gitIn = (dir) => (...args) => spawnSync('git', ['-c', 'user.name=ao test', '-c', 'user.email=ao@example.com', '-c', 'core.autocrlf=false', ...args], { cwd: dir, encoding: 'utf8' });

function setup(t, { settings = { worktrees: true, copy: ['apps/api/.env'] }, pulls = {}, installed = { ok: true, notes: ['Ran pnpm install.'] } } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'lanes-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const origin = join(root, 'origin.git');
  const project = join(root, 'shop');
  spawnSync('git', ['init', '--quiet', '--bare', '--initial-branch=develop', origin]);
  spawnSync('git', ['clone', '--quiet', origin, project]);
  const git = gitIn(project);
  git('switch', '--quiet', '-c', 'develop');
  writeFileSync(join(project, '.gitignore'), '.ai/\n.env\nnode_modules/\n');
  writeFileSync(join(project, 'README.md'), '# shop\n');
  git('add', '.');
  git('commit', '--quiet', '-m', 'chore: start');
  git('push', '--quiet', '-u', 'origin', 'develop');
  mkdirSync(join(project, 'apps', 'api'), { recursive: true });
  writeFileSync(join(project, 'apps', 'api', '.env'), 'DB_URL=postgres://localhost/shop\n');
  mkdirSync(join(project, '.ai', 'ledger'), { recursive: true });
  writeFileSync(join(project, '.ai', 'ledger', 'SHOP-10.md'), '# Ledger of SHOP-10\n');
  const installs = [];
  const keeper = laneKeeper({
    projectDir: project,
    gitIn,
    install: async (dir) => (installs.push(dir), installed),
    fs,
    pullsOf: async (branch) => pulls[branch] ?? [],
    isProtected,
    settings,
  });
  return { root, project, git, keeper, installs, lane: (key) => join(root, 'shop-wt', key) };
}

test('a lane is made next to the project, at origin/develop, with its packages, the files of runs.copy and its ledger', async (t) => {
  const s = setup(t);
  const made = await s.keeper.ensure('SHOP-10');
  assert.equal(made.ok, true);
  assert.equal(made.made, true);
  assert.equal(made.dir, s.lane('SHOP-10'));
  assert.deepEqual(s.installs, [s.lane('SHOP-10')]);
  const lane = gitIn(made.dir);
  assert.equal(lane('branch', '--show-current').stdout.trim(), '');
  assert.equal(lane('rev-parse', 'HEAD').stdout.trim(), s.git('rev-parse', 'origin/develop').stdout.trim());
  assert.equal(readFileSync(join(made.dir, 'apps', 'api', '.env'), 'utf8'), 'DB_URL=postgres://localhost/shop\n');
  assert.equal(readFileSync(join(made.dir, '.ai', 'ledger', 'SHOP-10.md'), 'utf8'), '# Ledger of SHOP-10\n');
  assert.match(made.notes.join(' '), /Made the lane of SHOP-10 .* Ran pnpm install\. Copied into it: apps.api.\.env, \.ai.ledger.SHOP-10\.md\./);
  // The project folder stays on develop.
  assert.equal(s.git('branch', '--show-current').stdout.trim(), 'develop');
  // Made once: the second call finds it.
  const again = await s.keeper.ensure('SHOP-10');
  assert.equal(again.made, false);
  assert.equal(s.installs.length, 1);
  assert.deepEqual(s.keeper.list().map(({ key, branch }) => `${key} ${branch}`), ['SHOP-10 ']);
});

test('a lane whose packages do not install is named, with the reason', async (t) => {
  const s = setup(t, { installed: { ok: false, reason: 'pnpm install failed: ERR_PNPM_OUTDATED_LOCKFILE' } });
  const made = await s.keeper.ensure('SHOP-13');
  assert.equal(made.ok, false);
  assert.match(made.reason, /the lane of SHOP-13 is at .*, but its packages are not installed: pnpm install failed/);
});

test('the build of an item puts its lane on its branch, and the project folder does not move', async (t) => {
  const s = setup(t);
  const run = { role: 'be-dev', key: 'SHOP-13', purpose: 'build', checkout: { branch: 'develop', pull: true } };
  assert.deepEqual(await s.keeper.checkout(run.checkout, run, 'build'), { ok: true });
  const place = await s.keeper.placeOf(run, 'build');
  assert.deepEqual({ key: place.key, dir: place.dir }, { key: 'SHOP-13', dir: s.lane('SHOP-13') });
  // The agent makes its branch in the lane.
  gitIn(place.dir)('switch', '--quiet', '-c', 'feature/SHOP-13-schema');
  const fix = { role: 'be-dev', key: 'SHOP-13', purpose: 'fix', checkout: { branch: 'feature/SHOP-13-schema', pull: true } };
  assert.deepEqual(await s.keeper.checkout(fix.checkout, fix, 'fix'), { ok: true });
  assert.equal(s.git('branch', '--show-current').stdout.trim(), 'develop');
  assert.equal(s.installs.length, 1, 'the lane is made once');
});

test('with worktrees off, or for a review, the checkout is the project folder as before', async (t) => {
  const off = setup(t, { settings: { worktrees: false, copy: [] } });
  const run = { role: 'fe-dev', key: 'SHOP-10', purpose: 'build', checkout: { branch: 'feature/SHOP-10-tokens' } };
  assert.deepEqual(await off.keeper.checkout(run.checkout, run, 'build'), { ok: true });
  assert.equal(off.git('branch', '--show-current').stdout.trim(), 'feature/SHOP-10-tokens');
  assert.equal(await off.keeper.placeOf(run, 'build'), null);
  assert.equal(existsSync(off.lane('SHOP-10')), false);
  const on = setup(t);
  const review = { role: 'reviewer', key: 'SHOP-10', purpose: 'review', checkout: { branch: 'develop', pull: true }, worktree: { name: 'pr-19' } };
  assert.equal(await on.keeper.placeOf(review, 'fix'), null);
});

test('a ledger is found in the project folder or in a lane', async (t) => {
  const s = setup(t);
  const made = await s.keeper.ensure('SHOP-21');
  mkdirSync(join(made.dir, '.ai', 'ledger'), { recursive: true });
  writeFileSync(join(made.dir, '.ai', 'ledger', 'SHOP-22.md'), '# Ledger of a Sub-task\n');
  assert.equal(s.keeper.ledgerExists('SHOP-22'), true);
  assert.equal(s.keeper.ledgerExists('SHOP-10'), true);
  assert.equal(s.keeper.ledgerExists('SHOP-99'), false);
});

test('a lane whose PR merged goes, with its ledgers back in the project folder, even once its branch left origin', async (t) => {
  const s = setup(t, { pulls: { 'feature/SHOP-8-tokens': [{ number: 18, state: 'merged' }] } });
  const made = await s.keeper.ensure('SHOP-8');
  const lane = gitIn(made.dir);
  lane('switch', '--quiet', '-c', 'feature/SHOP-8-tokens');
  writeFileSync(join(made.dir, 'tokens.css'), ':root {}\n');
  lane('add', '.');
  lane('commit', '--quiet', '-m', 'feat: tokens');
  mkdirSync(join(made.dir, '.ai', 'ledger'), { recursive: true });
  writeFileSync(join(made.dir, '.ai', 'ledger', 'SHOP-8.md'), '# Ledger of SHOP-8, done\n');
  const notes = await s.keeper.prune();
  assert.match(notes.join(' '), /Removed the lane of SHOP-8: its PR is merged; its ledgers are back in \.ai\/ledger\//);
  assert.equal(existsSync(made.dir), false);
  assert.equal(readFileSync(join(s.project, '.ai', 'ledger', 'SHOP-8.md'), 'utf8'), '# Ledger of SHOP-8, done\n');
  assert.deepEqual(s.keeper.list(), []);
});

test('a lane stays while its PR is open, has no PR, or holds work not committed or not pushed', async (t) => {
  const s = setup(t, {
    pulls: {
      'feature/SHOP-10-tokens': [{ number: 19, state: 'open' }],
      'feature/SHOP-15-api': [{ number: 30, state: 'merged' }],
      'feature/SHOP-16-api': [{ number: 31, state: 'closed' }],
    },
  });
  const branchOf = async (key, branch) => {
    const made = await s.keeper.ensure(key);
    gitIn(made.dir)('switch', '--quiet', '-c', branch);
    return made.dir;
  };
  await branchOf('SHOP-10', 'feature/SHOP-10-tokens');
  await branchOf('SHOP-14', 'feature/SHOP-14-domain');
  const dirty = await branchOf('SHOP-15', 'feature/SHOP-15-api');
  writeFileSync(join(dirty, 'README.md'), '# changed\n');
  const unpushed = await branchOf('SHOP-16', 'feature/SHOP-16-api');
  writeFileSync(join(unpushed, 'list.ts'), 'export {};\n');
  gitIn(unpushed)('add', '.');
  gitIn(unpushed)('commit', '--quiet', '-m', 'feat: list');
  const notes = await s.keeper.prune();
  assert.deepEqual(s.keeper.list().map(({ key }) => key).sort(), ['SHOP-10', 'SHOP-14', 'SHOP-15', 'SHOP-16']);
  assert.match(notes.join('\n'), /The lane of SHOP-15 stays .*: its PR is merged, but it has changes not committed\./);
  assert.match(notes.join('\n'), /The lane of SHOP-16 stays .*: its PR is closed, but it has commits on feature\/SHOP-16-api, which is gone from origin\./);
});

test('runs of project.yaml: off when absent; runs.copy holds relative paths inside the project only', () => {
  assert.deepEqual(runsSettings({}), { worktrees: false, copy: [] });
  assert.deepEqual(runsSettings({ runs: { worktrees: true, copy: ['apps/api/.env', '.env.development'] } }), { worktrees: true, copy: ['apps/api/.env', '.env.development'] });
  assert.deepEqual(runsSettings({ runs: { worktrees: 'yes' } }), { worktrees: false, copy: [] });
  for (const bad of ['../secrets.env', '/etc/passwd', 'C:/Users/me/.ssh/id_rsa', 'apps/../../x', '', 7]) {
    assert.throws(() => runsSettings({ runs: { copy: [bad] } }), /runs\.copy of project\.yaml has/, String(bad));
  }
  assert.throws(() => runsSettings({ runs: { copy: 'apps/api/.env' } }), /not a list of paths/);
});
