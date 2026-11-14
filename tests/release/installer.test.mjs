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
const PROJECT = { name: 'pilot', repo: 'TungPH7/ao-pilot', hosts: { development: 'pilot-dev.ao.t2g.io.vn', staging: 'pilot-staging.ao.t2g.io.vn', production: 'pilot.ao.t2g.io.vn' } };

function fakes({ deployYaml = DEPLOY_YAML, build = '', smoke = { ok: true, failures: [] }, open = null, project = PROJECT } = {}) {
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
    project,
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
  assert.deepEqual(await f.installer.install({ env: 'development', sha: SHA, tree: TREE }), { outcome: 'success', public: [{ app: 'web', port: 3000 }] });
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

// project-scaffold part 2, spec 2.4: two public apps, each on its own host of /etc/ao/deployer.yaml.
const TWO_PUBLIC = DEPLOY_YAML.replace('apps:\n', 'apps:\n  admin:\n    dockerfile: apps/admin/Dockerfile\n    port: 5173\n    health: /\n    public: true\n');
const SHOP_HOSTS = {
  web: { development: 'shop-dev.ao.t2g.io.vn', staging: 'shop-staging.ao.t2g.io.vn', production: 'shop.ao.t2g.io.vn' },
  admin: { development: 'shop-admin-dev.ao.t2g.io.vn', staging: 'shop-admin-staging.ao.t2g.io.vn', production: 'shop-admin.ao.t2g.io.vn' },
};

test('two public apps: each gets AO_PUBLIC_URL and the smoke test of its own host, and both go to Caddy', async () => {
  const f = fakes({ deployYaml: TWO_PUBLIC, project: { ...PROJECT, hosts: SHOP_HOSTS } });
  assert.deepEqual(await f.installer.install({ env: 'development', sha: SHA, tree: TREE }), { outcome: 'success', public: [{ app: 'admin', port: 5173 }, { app: 'web', port: 3000 }] });
  assert.deepEqual(f.asked, [
    { admin: { origin: 'http://172.18.0.9:5173', host: 'shop-admin-dev.ao.t2g.io.vn' } },
    { web: { origin: 'http://172.18.0.9:3000', host: 'shop-dev.ao.t2g.io.vn' } },
  ]);
  const runs = f.dockerCalls.filter((line) => line.startsWith('run --detach'));
  assert.equal(runs.length, 2);
  for (const line of runs) assert.match(line, /--env AO_PUBLIC_URL /);
});

test('two public apps with one host for each environment, or a public app with no host, deploy nothing', async () => {
  const single = fakes({ deployYaml: TWO_PUBLIC });
  const refused = await single.installer.install({ env: 'development', sha: SHA, tree: TREE });
  assert.equal(refused.outcome, 'error');
  assert.match(refused.reason, /^deploy\.yaml has 2 public apps \(admin, web\), and \/etc\/ao\/deployer\.yaml names one host for each environment: give each public app its own hosts there/);
  assert.deepEqual(single.dockerCalls, []);
  const partial = fakes({ deployYaml: TWO_PUBLIC, project: { ...PROJECT, hosts: { web: SHOP_HOSTS.web } } });
  assert.match((await partial.installer.install({ env: 'development', sha: SHA, tree: TREE })).reason, /^admin is public in deploy\.yaml but has no development host in \/etc\/ao\/deployer\.yaml$/);
  assert.deepEqual(partial.dockerCalls, []);
});

// project-scaffold part 3, spec 2.5: a Dockerfile made for its app folder builds from that folder.
test('an app with a context builds from that folder of the worktree, with its Dockerfile named from the root', async () => {
  const withApi = DEPLOY_YAML.replace('apps:\n', 'apps:\n  api:\n    dockerfile: apps/api/Dockerfile\n    context: apps/api\n    port: 3001\n    health: /actuator/health\n    memory: 768m\n    start_timeout: 180\n');
  const f = fakes({ deployYaml: withApi });
  assert.equal((await f.installer.install({ env: 'development', sha: SHA, tree: TREE })).outcome, 'success');
  assert.equal(f.dockerCalls[0], `build --file ${DIR}/apps/api/Dockerfile --tag ao-pilot-api:${TREE} --label ao.project=pilot --label ao.app=api --label ao.tree=${TREE} ${DIR}/apps/api`);
  assert.ok(f.dockerCalls.some((line) => line.startsWith(`run --detach --name ao-pilot-development-api-${TREE.slice(0, 12)} `) && line.includes('--memory 768m --memory-swap 768m')));
});

// project-scaffold part 3, spec 2.4: the database of a project runs before its apps, made once from its .db.env.
const WITH_DB = `${DEPLOY_YAML}database:\n  image: postgres:17-alpine@sha256:${'d'.repeat(64)}\n  init: db/init\n`;
function dbFakes({ dbEnv = 'POSTGRES_PASSWORD=root-secret\nPOSTGRES_DB=pilot\n', exists = false } = {}) {
  const dockerCalls = [];
  const copied = [];
  const docker = async (args) => {
    const line = args.join(' ');
    dockerCalls.push(line);
    if (!exists && (line.startsWith('container inspect') || line.startsWith('volume inspect'))) throw new Error('Error: No such object');
    if (exists && line.startsWith('container inspect')) return 'running\n';
    if (args[0] === 'inspect') return '{"ao-pilot-development":{"IPAddress":"172.18.0.9"}}';
    return '';
  };
  const installer = createInstaller({
    project: PROJECT,
    git: async (args) => (args[0] === 'show' ? WITH_DB : ''),
    docker,
    open: async () => {},
    copyInit: async (from, to) => copied.push({ from, to }),
    smoke: async () => ({ ok: true, failures: [] }),
    workDir: '/var/lib/ao/pilot/work',
    readSecrets: async (name) => {
      if (name === 'development') return 'HOST=0.0.0.0\nPORT=3000\n';
      if (name === 'development.db' && dbEnv !== null) return dbEnv;
      throw new Error(`ENOENT: no such file, open '/etc/ao/secrets/pilot/${name}.env'`);
    },
  });
  return { installer, dockerCalls, copied };
}

test('the first deploy of a project with a database makes it from its init scripts, before the apps run', async () => {
  const f = dbFakes();
  assert.equal((await f.installer.install({ env: 'development', sha: SHA, tree: TREE })).outcome, 'success');
  assert.deepEqual(f.copied, [{ from: `${DIR}/db/init`, to: '/var/lib/ao/pilot/db-init/development' }]);
  const at = (prefix) => f.dockerCalls.findIndex((line) => line.startsWith(prefix));
  assert.ok(at('build ') < at('run --detach --name ao-pilot-development-db '), 'the build first');
  assert.ok(at('run --detach --name ao-pilot-development-db ') < at('exec ao-pilot-development-db pg_isready'));
  assert.ok(at('exec ao-pilot-development-db pg_isready') < at(`run --detach --name ao-pilot-development-web-${TREE.slice(0, 12)} `), 'the database answers before the app runs');
  assert.ok(!f.dockerCalls.some((line) => line.includes('root-secret')));
});

test('a database that runs already is left alone, and its init scripts are not copied again', async () => {
  const f = dbFakes({ exists: true });
  assert.equal((await f.installer.install({ env: 'development', sha: SHA, tree: TREE })).outcome, 'success');
  assert.deepEqual(f.copied, []);
  assert.ok(!f.dockerCalls.some((line) => line.startsWith('run --detach --name ao-pilot-development-db ')));
});

test('without its .db.env the project deploys nothing, and says which file is missing', async () => {
  const f = dbFakes({ dbEnv: null });
  const result = await f.installer.install({ env: 'development', sha: SHA, tree: TREE });
  assert.equal(result.outcome, 'error');
  assert.match(result.reason, /the database of development needs \/etc\/ao\/secrets\/pilot\/development\.db\.env/);
  assert.deepEqual(f.dockerCalls, []);
});
