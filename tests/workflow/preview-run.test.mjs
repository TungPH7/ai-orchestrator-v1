import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { lockHash } from '../../lib/workflow/preview.mjs';
import { previewPaths, previewRunner } from '../../lib/workflow/preview-run.mjs';

// /ao-preview on a machine made of fakes: the project folder, git, npm and the apps (live-run-fixes spec 2.6).
const PROJECT = 'D:/work/shop';
const HEAD = 'a'.repeat(40);
const BRANCH = 'feature/DEMO-21-remove-line';
const PR_LOCK = '{"lockfileVersion":3,"of":"the PR"}';
const DEVELOP_LOCK = '{"lockfileVersion":3,"of":"develop"}';
const CONFIG = [
  'apps:',
  '  api:',
  '    command: npm run start:dev -w apps/api',
  '    url: http://localhost:3001/health',
  '  web:',
  '    command: npm run dev -w apps/web',
  '    url: http://localhost:3000/',
  '    env: { API_URL: "http://localhost:3001" }',
].join('\n');
const paths = previewPaths(PROJECT);
const START = { key: 'DEMO-21', number: 15, branch: BRANCH, head: HEAD };

// files: path → text. The folder starts on `on`. checkoutFails: branch → { reason, switched }. npmStatus: the exit of
// npm ci. up(url): whether an app answers. lock(): the package-lock.json of the branch the folder is on.
function machine({ files = {}, on = 'develop', checkoutFails = {}, npmStatus = 0, up = () => true, busyPorts = [], head = HEAD, dirty = '', agent = null } = {}) {
  const store = new Map(Object.entries({ [join(PROJECT, '.ai-orchestrator/preview.yaml')]: CONFIG, ...files }));
  const events = [];
  let branch = on;
  const lockFile = join(PROJECT, 'package-lock.json');
  const sync = () => store.set(lockFile, branch === 'develop' ? DEVELOP_LOCK : PR_LOCK);
  sync();
  const fs = {
    existsSync: (path) => store.has(path),
    readFileSync: (path) => {
      if (!store.has(path)) throw Object.assign(new Error(`ENOENT: ${path}`), { code: 'ENOENT' });
      return store.get(path);
    },
    writeFileSync: (path, text) => store.set(path, text),
    rmSync: (path) => store.delete(path),
    mkdirSync: () => {},
    openSync: () => 3,
  };
  const git = (...args) => {
    if (args[0] === 'branch') return { status: 0, stdout: `${branch}\n`, stderr: '' };
    if (args[0] === 'rev-parse') return { status: 0, stdout: `${head}\n`, stderr: '' };
    if (args[0] === 'status') return { status: 0, stdout: dirty, stderr: '' };
    if (args[0] === 'show') return { status: 0, stdout: PR_LOCK, stderr: '' };
    return { status: 0, stdout: '', stderr: '' };
  };
  const checkout = ({ branch: to }) => {
    events.push(['checkout', to]);
    const fail = checkoutFails[to];
    if (fail?.switched) branch = to;
    if (fail) return (sync(), { ok: false, reason: fail.reason });
    branch = to;
    sync();
    return { ok: true };
  };
  let pid = 100;
  const runner = previewRunner({
    projectDir: PROJECT,
    git,
    checkout,
    npm: (args, { env }) => (events.push(['npm', args.join(' '), branch, 'SECRET_TOKEN' in env ? 'with a secret' : 'no secret']), { status: npmStatus, stderr: npmStatus ? 'npm ERR! the lockfile does not match' : '' }),
    spawn: (file, args, { env }) => {
      pid += 1;
      events.push(['spawn', pid, [file, ...args].join(' '), env.API_URL ?? '-', 'SECRET_TOKEN' in env ? 'with a secret' : 'no secret']);
      return { pid, unref: () => {} };
    },
    fs,
    portBusy: async (port) => busyPorts.includes(port),
    answers: async (url) => up(url),
    killTree: (target) => events.push(['kill', target]),
    sleep: async () => {},
    env: { PATH: 'C:/bin', SECRET_TOKEN: 's3cr3t' },
    execPath: 'node',
    npmCli: () => 'npm-cli.js',
    agentRunning: () => agent,
    now: () => Date.parse('2026-11-12T08:00:00Z'),
  });
  const json = (path) => (store.has(path) ? JSON.parse(store.get(path)) : null);
  return { runner, events, store, json, branch: () => branch };
}

const installedFor = (lock) => ({ [paths.state]: JSON.stringify({ lock: lockHash(lock), at: '2026-11-11T08:00:00Z' }) });
const active = (more = {}) => ({ [paths.active]: JSON.stringify({ key: 'DEMO-21', pr: 15, branch: BRANCH, head: HEAD, apps: [{ name: 'api', url: 'http://localhost:3001/health', port: 3001, pid: 101 }, { name: 'web', url: 'http://localhost:3000/', port: 3000, pid: 102 }], startedAt: '2026-11-12T07:00:00Z', ...more }) });

test('start puts the folder on the PR branch, installs the packages of its lockfile with no secret, then starts each app in order and records it', async () => {
  const m = machine({ files: installedFor(DEVELOP_LOCK) });
  const notes = await m.runner.start(START);
  assert.equal(m.branch(), BRANCH);
  assert.deepEqual(m.events, [
    ['checkout', BRANCH],
    ['npm', 'ci --ignore-scripts --no-audit --no-fund', BRANCH, 'no secret'],
    ['spawn', 101, 'node npm-cli.js run start:dev -w apps/api', '-', 'no secret'],
    ['spawn', 102, 'node npm-cli.js run dev -w apps/web', 'http://localhost:3001', 'no secret'],
  ]);
  assert.equal(m.json(paths.state).lock, lockHash(PR_LOCK));
  assert.deepEqual(m.json(paths.active).apps.map(({ name, pid }) => [name, pid]), [['api', 101], ['web', 102]]);
  assert.deepEqual(notes, [
    `The project folder is on ${BRANCH} at aaaaaaaa.`,
    'Ran npm ci --ignore-scripts, since package-lock.json differs from the one installed before.',
    'api: http://localhost:3001/health',
    'web: http://localhost:3000/',
    'Stop it with /ao-preview DEMO-21 --stop: the apps stop and the folder goes back to develop. /ao-fix and /ao-review stop it too.',
  ]);
});

test('start runs no npm ci when the lockfile of the branch is the one installed', async () => {
  const m = machine({ files: installedFor(PR_LOCK) });
  await m.runner.start(START);
  assert.equal(m.events.filter(([what]) => what === 'npm').length, 0);
});

test('stop stops every app, puts the folder back on develop, drops the record, and installs the packages of develop again', async () => {
  const m = machine({ on: BRANCH, files: { ...active(), ...installedFor(PR_LOCK) } });
  const { home, notes } = await m.runner.stop();
  assert.equal(home, true);
  assert.equal(m.branch(), 'develop');
  assert.deepEqual(m.events, [['kill', 101], ['kill', 102], ['checkout', 'develop'], ['npm', 'ci --ignore-scripts --no-audit --no-fund', 'develop', 'no secret']]);
  assert.equal(m.json(paths.active), null);
  assert.equal(m.json(paths.state).lock, lockHash(DEVELOP_LOCK));
  assert.deepEqual(notes, ['Stopped the preview of DEMO-21: api, web.', 'The project folder is back on develop.', 'Ran npm ci --ignore-scripts again, for the packages of develop.']);
});

test('stop says which port still answers, and a failed npm ci for develop is a note, not a failure', async () => {
  const m = machine({ on: BRANCH, files: { ...active(), ...installedFor(PR_LOCK) }, busyPorts: [3000], npmStatus: 1 });
  const { home, notes } = await m.runner.stop();
  assert.equal(home, true);
  assert.deepEqual(notes, [
    'Stopped the preview of DEMO-21: api, web. Still answering: web (port 3000); stop it yourself.',
    'The project folder is back on develop.',
    'npm ci for develop failed: npm ERR! the lockfile does not match. Run npm ci yourself before a test or a build.',
  ]);
});

test('stop keeps the record, with no app, while the folder cannot go back to develop', async () => {
  const m = machine({ on: BRANCH, files: { ...active(), ...installedFor(PR_LOCK) }, checkoutFails: { develop: { reason: 'the checkout has changes not committed (1 files)' } } });
  const { home, notes } = await m.runner.stop();
  assert.equal(home, false);
  assert.equal(m.branch(), BRANCH);
  assert.deepEqual(m.json(paths.active).apps, []);
  assert.equal(m.json(paths.active).stoppedAt, '2026-11-12T08:00:00.000Z');
  assert.equal(notes.at(-1), `The project folder stays on ${BRANCH}: the checkout has changes not committed (1 files)`);
  assert.equal(m.events.filter(([what]) => what === 'npm').length, 0);
  assert.deepEqual(await machine().runner.stop(), { home: true, notes: ['No preview runs.'] });
});

test('the facts of /ao-preview: the apps of preview.yaml, the record, a run of another ao-step, the folder, the ports and the packages', async () => {
  const agent = { pid: 7, command: 'build', arg: 'DEMO-22' };
  const m = machine({ files: { ...active(), ...installedFor(DEVELOP_LOCK) }, busyPorts: [3001], dirty: ' M apps/web/page.tsx\n', agent });
  const facts = await m.runner.facts(false, { headSha: HEAD });
  assert.deepEqual(facts.config.map(({ name, port }) => [name, port]), [['api', 3001], ['web', 3000]]);
  assert.deepEqual({ stop: facts.stop, configError: facts.configError, key: facts.active.key, agentRunning: facts.agentRunning, dirty: facts.dirty, busy: facts.busy, install: facts.install }, { stop: false, configError: null, key: 'DEMO-21', agentRunning: agent, dirty: 1, busy: [3001], install: true });
  assert.equal((await machine({ files: installedFor(PR_LOCK) }).runner.facts(false, { headSha: HEAD })).install, false);
  const broken = await machine({ files: { [join(PROJECT, '.ai-orchestrator/preview.yaml')]: 'apps: [' } }).runner.facts(true, null);
  assert.deepEqual([broken.config, broken.stop, broken.install], [null, true, true]);
  assert.match(broken.configError, /preview\.yaml is not YAML/);
});
