import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInstaller, openForBuild } from '../../lib/release/deployer.mjs';
import { ROOT } from '../helpers/kit.mjs';

const SHA = 'c'.repeat(40);
const TREE = 'f'.repeat(40);
const DIR = `/var/lib/ao/pilot/work/${TREE}`;
const DEPLOY_YAML = readFileSync(join(ROOT, 'tests/fixtures/release/deploy.yaml'), 'utf8');
const PROJECT = { name: 'pilot', repo: 'TungPH7/ao-pilot', urls: { development: 'https://pilot-dev.ao.t2g.io.vn' } };

function fakes({ deployYaml = DEPLOY_YAML, build = '', smoke = { ok: true, failures: [] }, open = null } = {}) {
  const gitCalls = [];
  const dockerCalls = [];
  const git = async (args) => {
    gitCalls.push(args.join(' '));
    if (args[0] === 'show') {
      if (deployYaml === null) throw new Error(`fatal: path '.ai-orchestrator/deploy.yaml' does not exist in '${SHA}'`);
      return deployYaml;
    }
    return '';
  };
  const docker = async (args) => {
    dockerCalls.push(args.join(' '));
    if (args[0] === 'build' && build instanceof Error) throw build;
    if (args[0] === 'inspect') return '{"ao-pilot-development":{"IPAddress":"172.18.0.9"}}';
    return '';
  };
  const asked = [];
  const opened = [];
  const installer = createInstaller({
    project: PROJECT,
    git,
    docker,
    open: async (dir) => {
      if (open instanceof Error) throw open;
      opened.push({ dir, gitCalls: gitCalls.length, dockerCalls: dockerCalls.length });
    },
    smoke: async (checks, targets) => {
      asked.push(targets);
      return smoke;
    },
    workDir: '/var/lib/ao/pilot/work',
    readSecrets: async (env) => (env === 'development' ? 'HOST=0.0.0.0\nPORT=3000\n' : ''),
  });
  return { installer, gitCalls, dockerCalls, asked, opened };
}

test('openForBuild opens every file and folder under the worktree, and leaves links alone', async () => {
  const root = mkdtempSync(join(tmpdir(), 'ao-open-')).replaceAll('\\', '/');
  try {
    mkdirSync(join(root, 'src'), { mode: 0o700 });
    writeFileSync(join(root, 'src', 'server.ts'), 'x', { mode: 0o600 });
    writeFileSync(join(root, 'run.sh'), 'x', { mode: 0o700 });
    if (process.platform !== 'win32') symlinkSync('/etc/hostname', join(root, 'link'));
    await openForBuild(root);
    // Windows has no such modes: CI on Linux checks them, and this run checks that the walk finishes.
    if (process.platform !== 'win32') {
      const mode = (...path) => statSync(join(root, ...path)).mode & 0o777;
      assert.deepEqual([mode('src'), mode('src', 'server.ts'), mode('run.sh')], [0o755, 0o644, 0o755]);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the worktree is opened for reading after checkout and before the build: the service runs with UMask=0077', async () => {
  const f = fakes();
  await f.installer.install({ env: 'development', sha: SHA, tree: TREE });
  assert.deepEqual(f.opened, [{ dir: DIR, gitCalls: 4, dockerCalls: 0 }]);
  const failed = fakes({ open: new Error('EPERM') });
  assert.deepEqual(await failed.installer.install({ env: 'development', sha: SHA, tree: TREE }), { outcome: 'error', reason: 'the build folder could not be opened: EPERM' });
  assert.equal(failed.gitCalls.at(-1), `worktree remove --force ${DIR}`);
  assert.deepEqual(failed.dockerCalls, []);
});

test('install builds every app from a worktree at the commit, removes the worktree, and swaps the new containers in', async () => {
  const f = fakes();
  // The public app and its port tell Caddy where the environment now answers.
  assert.deepEqual(await f.installer.install({ env: 'development', sha: SHA, tree: TREE }), { outcome: 'success', public: { app: 'web', port: 3000 } });
  assert.deepEqual(f.gitCalls, [
    `show ${SHA}:.ai-orchestrator/deploy.yaml`,
    `worktree remove --force ${DIR}`,
    'worktree prune',
    `worktree add --detach --force ${DIR} ${SHA}`,
    `worktree remove --force ${DIR}`,
  ]);
  assert.equal(f.dockerCalls[0], `build --file ${DIR}/Dockerfile --tag ao-pilot-web:${TREE} --label ao.project=pilot --label ao.app=web --label ao.tree=${TREE} ${DIR}`);
  assert.ok(f.dockerCalls.some((line) => line.startsWith(`run --detach --name ao-pilot-development-web-${TREE.slice(0, 12)} `)));
  assert.deepEqual(f.asked, [{ web: { origin: 'http://172.18.0.9:3000', host: 'pilot-dev.ao.t2g.io.vn' } }]);
});

test('a failed smoke test is a failure, with each problem in the reason', async () => {
  const f = fakes({ smoke: { ok: false, failures: [{ app: 'web', path: '/', problem: 'status 500, expected 200' }] } });
  assert.deepEqual(await f.installer.install({ env: 'development', sha: SHA, tree: TREE }), { outcome: 'failure', reason: 'web /: status 500, expected 200' });
});

test('nothing runs without a valid deploy.yaml at the commit: that is an error, not a failure', async () => {
  const none = fakes({ deployYaml: null });
  assert.deepEqual(await none.installer.install({ env: 'development', sha: SHA, tree: TREE }), { outcome: 'error', reason: 'ccccccc has no .ai-orchestrator/deploy.yaml' });
  const broken = fakes({ deployYaml: DEPLOY_YAML.replace('public: true', 'public: false') });
  const result = await broken.installer.install({ env: 'development', sha: SHA, tree: TREE });
  assert.equal(result.outcome, 'error');
  assert.match(result.reason, /^deploy\.yaml: D2 apps: no app is public/);
  assert.deepEqual([...none.dockerCalls, ...broken.dockerCalls], []);
});

test('a missing secret or a failed build is an error, and the worktree still goes', async () => {
  const f = fakes();
  assert.deepEqual(await f.installer.install({ env: 'staging', sha: SHA, tree: TREE }), { outcome: 'error', reason: 'missing in /etc/ao/secrets/pilot/staging.env: HOST (web), PORT (web)' });
  assert.deepEqual(f.dockerCalls, [], 'a missing secret is found before any build');
  const b = fakes({ build: new Error('npm ci exited with 1') });
  assert.deepEqual(await b.installer.install({ env: 'development', sha: SHA, tree: TREE }), { outcome: 'error', reason: 'the build of web failed: npm ci exited with 1' });
  assert.equal(b.gitCalls.at(-1), `worktree remove --force ${DIR}`);
  assert.ok(!b.dockerCalls.some((line) => line.startsWith('run ')));
});
