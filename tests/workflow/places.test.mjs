import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkoutBranch, laneDir, laneNote, laneOf, laneRoot, lanesToPrune } from '../../lib/workflow/places.mjs';

// Where a run works (parallel-runs spec, part 1): the lane of its item next to the project folder, or the folder.
const isProtected = (branch) => ['develop', 'main'].includes(branch) || branch.startsWith('release/');

test('a lane sits next to the project folder, in <project>-wt, named by the key', () => {
  assert.equal(laneRoot(join('D:', 'work', 'shop')), join('D:', 'work', 'shop-wt'));
  assert.equal(laneRoot(`${join('D:', 'work', 'shop')}/`), join('D:', 'work', 'shop-wt'));
  assert.equal(laneDir(join('D:', 'work', 'my shop'), 'SHOP-13'), join('D:', 'work', 'my shop-wt', 'SHOP-13'));
  assert.equal(laneDir('/home/u/shop', 'SHOP_X-2'), join('/home/u', 'shop-wt', 'SHOP_X-2'));
});

test('a key that is not a work item key never becomes a folder', () => {
  for (const key of ['../SHOP-1', 'SHOP-1/..', 'shop-1', 'SHOP', 'v0.2.0', '', undefined]) {
    assert.throws(() => laneDir('/p/shop', key), /not the key of a work item/, String(key));
  }
});

test('every run of /ao-build and /ao-fix works in the lane of its item, a Sub-task in the lane of its Story', () => {
  const build = { worktrees: true, command: 'build' };
  const fix = { worktrees: true, command: 'fix' };
  assert.equal(laneOf({ role: 'fe-dev', key: 'SHOP-10', purpose: 'build', checkout: { branch: 'develop', pull: true } }, build), 'SHOP-10');
  assert.equal(laneOf({ role: 'be-dev', key: 'SHOP-13', purpose: 'build' }, build), 'SHOP-13');
  assert.equal(laneOf({ role: 'be-dev', key: 'SHOP-22', story: 'SHOP-21', purpose: 'build' }, build), 'SHOP-21');
  assert.equal(laneOf({ role: 'fe-dev', key: 'SHOP-8', purpose: 'fix', checkout: { branch: 'feature/SHOP-8-x', pull: true } }, fix), 'SHOP-8');
  // ba changing the criteria on the branch of the PR, before the dev agent fixes.
  assert.equal(laneOf({ role: 'ba', key: 'SHOP-21', purpose: 'ac-revise', checkout: { branch: 'feature/SHOP-21-detail', pull: true } }, fix), 'SHOP-21');
});

test('reviews keep their temporary worktree, and the runs of the Epic, QA and releases stay in the project folder', () => {
  assert.equal(laneOf({ role: 'reviewer', key: 'SHOP-8', purpose: 'review', checkout: { branch: 'develop', pull: true }, worktree: { name: 'pr-18' } }, { worktrees: true, command: 'fix' }), null);
  // The record of a review run keeps no worktree: its purpose tells it apart, so its work put aside is not looked for in a lane.
  assert.equal(laneOf({ role: 'security', key: 'SHOP-8', purpose: 'review-delta', checkout: { branch: 'develop', pull: true } }, { worktrees: true, command: 'fix' }), null);
  assert.equal(laneOf({ role: 'qa', key: 'SHOP-8', purpose: 'qa', worktree: { name: 'qa-SHOP-8', kind: 'qa' } }, { worktrees: true, command: 'qa' }), null);
  assert.equal(laneOf({ role: 'ba', key: 'SHOP-8', purpose: 'ac-add', checkout: { branch: 'develop', pull: true } }, { worktrees: true, command: 'qa' }), null);
  assert.equal(laneOf({ role: 'ba', key: 'SHOP-7', purpose: 'spec-write', checkout: { branch: 'feature/SHOP-7-spec' } }, { worktrees: true, command: 'spec' }), null);
  assert.equal(laneOf({ role: 'sa', key: 'SHOP-7', purpose: 'plan-write', checkout: { branch: 'feature/SHOP-7-spec' } }, { worktrees: true, command: 'plan' }), null);
  assert.equal(laneOf({ role: 'devops', key: 'v0.2.0', purpose: 'release-notes', checkout: { branch: 'release/v0.2.0' } }, { worktrees: true, command: 'ship' }), null);
});

test('with worktrees off, every run stays in the project folder; a run with no item key has no lane', () => {
  assert.equal(laneOf({ role: 'fe-dev', key: 'SHOP-10', purpose: 'build' }, { worktrees: false, command: 'build' }), null);
  assert.equal(laneOf({ role: 'ba', key: 'SHOP-21', purpose: 'ac-revise', checkout: { branch: 'feature/SHOP-21-detail' } }, { worktrees: false, command: 'fix' }), null);
  assert.equal(laneOf({ role: 'fe-dev', key: '../SHOP-1', purpose: 'build' }, { worktrees: true, command: 'build' }), null);
});

test('a lane goes when every PR of its branch is merged or closed, and stays while one is open or none is', () => {
  const lanes = [
    { key: 'SHOP-8', branch: 'feature/SHOP-8-tokens' },
    { key: 'SHOP-10', branch: 'feature/SHOP-10-tokens' },
    { key: 'SHOP-13', branch: 'feature/SHOP-13-schema' },
    { key: 'SHOP-14', branch: '' },
    { key: 'SHOP-15', branch: 'feature/SHOP-15-api' },
  ];
  const pulls = [
    { headRef: 'feature/SHOP-8-tokens', state: 'merged' },
    { headRef: 'feature/SHOP-10-tokens', state: 'open' },
    { headRef: 'feature/SHOP-15-api', state: 'closed' },
    { headRef: 'feature/SHOP-15-api', state: 'open' },
  ];
  assert.deepEqual(lanesToPrune(lanes, pulls).map(({ key }) => key), ['SHOP-8']);
  assert.deepEqual(lanesToPrune([{ key: 'SHOP-15', branch: 'feature/SHOP-15-api' }], [{ headRef: 'feature/SHOP-15-api', state: 'closed' }]).map(({ key }) => key), ['SHOP-15']);
});

test('the note of a lane names the worktree with forward slashes', () => {
  assert.match(laneNote('D:\\work\\shop-wt\\SHOP-13', 'SHOP-13'), /worktree D:\/work\/shop-wt\/SHOP-13, the lane of SHOP-13/);
});

// checkoutBranch on real repositories: an origin, the project folder on develop, and a lane, a worktree of it.
function repos(t) {
  const root = mkdtempSync(join(tmpdir(), 'places-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const at = (dir) => (...args) => spawnSync('git', ['-c', 'user.name=ao test', '-c', 'user.email=ao@example.com', '-c', 'core.autocrlf=false', ...args], { cwd: dir, encoding: 'utf8' });
  const origin = join(root, 'origin.git');
  const project = join(root, 'shop');
  const lane = join(root, 'shop-wt', 'SHOP-13');
  spawnSync('git', ['init', '--quiet', '--bare', '--initial-branch=develop', origin]);
  spawnSync('git', ['clone', '--quiet', origin, project]);
  const git = at(project);
  git('switch', '--quiet', '-c', 'develop');
  writeFileSync(join(project, 'README.md'), '# shop\n');
  git('add', '.');
  git('commit', '--quiet', '-m', 'chore: start');
  git('push', '--quiet', '-u', 'origin', 'develop');
  git('worktree', 'add', '--quiet', '--detach', lane, 'origin/develop');
  return { project, lane, git, laneGit: at(lane), head: (g) => g('rev-parse', 'HEAD').stdout.trim(), branch: (g) => g('branch', '--show-current').stdout.trim() };
}

test('in a lane, develop is taken detached at origin/develop, since the project folder holds the branch', (t) => {
  const r = repos(t);
  const done = checkoutBranch(r.laneGit, { branch: 'develop', pull: true }, { lane: true, isProtected });
  assert.deepEqual(done, { ok: true });
  assert.equal(r.branch(r.laneGit), '');
  assert.equal(r.head(r.laneGit), r.head(r.git));
  assert.equal(r.branch(r.git), 'develop');
});

test('in the project folder, develop is switched to as before', (t) => {
  const r = repos(t);
  r.git('switch', '--quiet', '-c', 'feature/SHOP-1-x');
  assert.deepEqual(checkoutBranch(r.git, { branch: 'develop', pull: true }), { ok: true });
  assert.equal(r.branch(r.git), 'develop');
});

test('a branch of an item is made in the lane from origin/develop, without origin/develop as its upstream', (t) => {
  const r = repos(t);
  assert.deepEqual(checkoutBranch(r.laneGit, { branch: 'feature/SHOP-13-schema' }, { lane: true, isProtected }), { ok: true });
  assert.equal(r.branch(r.laneGit), 'feature/SHOP-13-schema');
  assert.equal(r.laneGit('rev-parse', '--abbrev-ref', '@{upstream}').status === 0, false);
});

test('a branch on origin is tracked and brought up to date in the lane', (t) => {
  const r = repos(t);
  r.git('switch', '--quiet', '-c', 'feature/SHOP-8-tokens');
  writeFileSync(join(r.project, 'tokens.css'), ':root {}\n');
  r.git('add', '.');
  r.git('commit', '--quiet', '-m', 'feat: tokens');
  r.git('push', '--quiet', '-u', 'origin', 'feature/SHOP-8-tokens');
  r.git('switch', '--quiet', 'develop');
  r.git('branch', '--quiet', '-D', 'feature/SHOP-8-tokens');
  assert.deepEqual(checkoutBranch(r.laneGit, { branch: 'feature/SHOP-8-tokens', pull: true }, { lane: true, isProtected }), { ok: true });
  assert.equal(r.branch(r.laneGit), 'feature/SHOP-8-tokens');
  assert.equal(r.laneGit('rev-parse', '--abbrev-ref', '@{upstream}').stdout.trim(), 'origin/feature/SHOP-8-tokens');
});

test('a lane with changes not committed is not moved', (t) => {
  const r = repos(t);
  writeFileSync(join(r.lane, 'README.md'), '# changed\n');
  const done = checkoutBranch(r.laneGit, { branch: 'feature/SHOP-13-schema' }, { lane: true, isProtected });
  assert.equal(done.ok, false);
  assert.match(done.reason, /changes not committed \(1 files\)/);
});

// Review of shop PR #78 (Medium): an ops Task has no branch, so its lane was never pruned, and three of them would hold
// every lane of runs.lanes_max. Its run takes no lane.
test('a run with lane: false, as the build of an ops Task, works in the project folder', () => {
  const build = { worktrees: true, command: 'build' };
  assert.equal(laneOf({ role: 'devops', key: 'SHOP-80', purpose: 'build', lane: false }, build), null);
});
