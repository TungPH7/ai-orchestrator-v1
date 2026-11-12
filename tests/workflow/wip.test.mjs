import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { restoreWip, saveWip, wipLabel } from '../../lib/workflow/wip.mjs';

// The work a run left uncommitted when it stopped (live-run-fixes spec 2.1), on a real repository: git's stash is what
// is tested. T20 of human-loop: fe-dev hit the usage limit on the branch of SMP-24 with its work not committed.
const BRANCH = 'feature/DEMO-21-remove-line';
const RUN = { key: 'DEMO-21', n: 3, role: 'fe-dev' };
const isProtected = (branch) => ['develop', 'main'].includes(branch) || branch.startsWith('release/');

function repo(t) {
  const dir = mkdtempSync(join(tmpdir(), 'wip-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const git = (...args) => spawnSync('git', ['-c', 'user.name=ao test', '-c', 'user.email=ao@example.com', '-c', 'core.autocrlf=false', ...args], { cwd: dir, encoding: 'utf8' });
  const write = (path, text) => {
    mkdirSync(join(dir, path, '..'), { recursive: true });
    writeFileSync(join(dir, path), text);
  };
  const read = (path) => (existsSync(join(dir, path)) ? readFileSync(join(dir, path), 'utf8') : null);
  git('init', '--quiet', '--initial-branch=develop');
  write('.gitignore', '.ai/\n');
  write('src/cart.ts', 'export const total = 0;\n');
  git('add', '.');
  git('commit', '--quiet', '-m', 'chore: start');
  git('switch', '--quiet', '-c', BRANCH);
  return { dir, git, write, read, status: () => git('status', '--porcelain', '--untracked-files=all').stdout.trim() };
}

// fe-dev stopped with a change to a tracked file, a new file, and its ledger in .ai/, which git ignores.
function stopped(r) {
  r.write('src/cart.ts', 'export const total = 120000;\n');
  r.write('src/cart-line.tsx', 'export function CartLine() {}\n');
  r.write('.ai/ledger/DEMO-21.md', '# Ledger\n');
}

test('the work of a stopped run is put aside with its label, untracked files included, and the ledger stays', (t) => {
  const r = repo(t);
  stopped(r);
  const wip = saveWip({ git: r.git, run: RUN, isProtected });
  assert.match(wip.stash, /^[0-9a-f]{40}$/);
  assert.equal(wip.branch, BRANCH);
  assert.equal(r.status(), '');
  assert.equal(r.read('src/cart-line.tsx'), null);
  assert.equal(r.read('.ai/ledger/DEMO-21.md'), '# Ledger\n');
  assert.equal(r.git('stash', 'list', '--format=%H %gs').stdout.trim(), `${wip.stash} On ${BRANCH}: ${wipLabel(RUN)}`);
  assert.equal(wipLabel(RUN), 'ao-step DEMO-21 run 3 fe-dev');
});

test('nothing is put aside on a clean checkout, or on a protected branch', (t) => {
  const r = repo(t);
  assert.equal(saveWip({ git: r.git, run: RUN, isProtected }), null);
  r.git('switch', '--quiet', 'develop');
  r.write('src/cart.ts', 'export const total = 1;\n');
  assert.equal(saveWip({ git: r.git, run: RUN, isProtected }), null);
  assert.equal(r.git('stash', 'list').stdout, '');
});

// The checkout went back to develop when the command ended, and another worktree put a stash on top in between.
test('the work comes back on its branch, and only its own stash is dropped, by its SHA', (t) => {
  const r = repo(t);
  stopped(r);
  const wip = saveWip({ git: r.git, run: RUN, isProtected });
  r.git('switch', '--quiet', 'develop');
  r.write('notes.txt', 'someone else\n');
  r.git('stash', 'push', '--include-untracked', '-m', 'another worktree');
  const back = restoreWip({ git: r.git, wip });
  assert.equal(back.ok, true, back.reason);
  assert.deepEqual(back.notes, [`The work the stopped run left uncommitted, put aside in stash ${wip.stash.slice(0, 8)}, is back on ${BRANCH}.`]);
  assert.equal(r.git('branch', '--show-current').stdout.trim(), BRANCH);
  assert.equal(r.read('src/cart.ts'), 'export const total = 120000;\n');
  assert.equal(r.read('src/cart-line.tsx'), 'export function CartLine() {}\n');
  assert.deepEqual(r.git('stash', 'list', '--format=%gs').stdout.trim().split('\n'), ['On develop: another worktree']);
});

test('the work is not applied on a branch that moved since, or over other changes: the command stops with the SHA, and the stash stays', (t) => {
  const r = repo(t);
  stopped(r);
  const wip = saveWip({ git: r.git, run: RUN, isProtected });
  r.write('src/cart.ts', 'export const total = 5;\n');
  const dirty = restoreWip({ git: r.git, wip });
  assert.equal(dirty.ok, false);
  assert.match(dirty.reason, new RegExp(`stash ${wip.stash}, but ${BRANCH} has other changes not committed \\(1 files\\)`));
  r.git('commit', '--quiet', '-am', 'feat: someone pushed');
  const moved = restoreWip({ git: r.git, wip });
  assert.equal(moved.ok, false);
  assert.match(moved.reason, new RegExp(`apply it yourself with git stash apply ${wip.stash}, then drop it, and settle what conflicts$`));
  assert.equal(r.git('stash', 'list', '--format=%H').stdout.trim(), wip.stash);
});

// Between git stash list and git stash drop, another worktree pushed an entry: the place found points at it.
test('an entry dropped in its place by mistake is put back with git stash store, and the run goes on with a note', () => {
  const ours = 'a'.repeat(40);
  const theirs = 'b'.repeat(40);
  const calls = [];
  const git = (...args) => {
    calls.push(args.join(' '));
    if (args[0] === 'branch') return { status: 0, stdout: `${BRANCH}\n`, stderr: '' };
    if (args[0] === 'status') return { status: 0, stdout: '', stderr: '' };
    if (args[0] === 'rev-parse') return { status: 0, stdout: `${'c'.repeat(40)}\n`, stderr: '' };
    if (args[0] === 'stash' && args[1] === 'list') return { status: 0, stdout: `${ours}\n`, stderr: '' };
    if (args[0] === 'stash' && args[1] === 'drop') return { status: 0, stdout: `Dropped stash@{0} (${theirs})\n`, stderr: '' };
    if (args[0] === 'log') return { status: 0, stdout: 'On develop: another worktree\n', stderr: '' };
    return { status: 0, stdout: '', stderr: '' };
  };
  const back = restoreWip({ git, wip: { stash: ours, branch: BRANCH } });
  assert.equal(back.ok, true);
  assert.ok(calls.includes(`stash store -m On develop: another worktree ${theirs}`), calls.join('\n'));
  assert.equal(back.notes.at(-1), 'Stash aaaaaaaa stays in git stash list: another entry took its place as it was dropped, and was put back. Drop aaaaaaaa yourself.');
});

test('a failed git stash push leaves the work where it is, and says why', () => {
  const git = (...args) => {
    if (args[0] === 'branch') return { status: 0, stdout: `${BRANCH}\n`, stderr: '' };
    if (args[0] === 'status') return { status: 0, stdout: ' M src/cart.ts\n', stderr: '' };
    if (args[0] === 'stash') return { status: 1, stdout: '', stderr: 'error: unable to unlink src/cart.ts: Permission denied' };
    return { status: 0, stdout: '', stderr: '' };
  };
  assert.deepEqual(saveWip({ git, run: RUN, isProtected }), { error: 'git stash push failed: error: unable to unlink src/cart.ts: Permission denied' });
});
