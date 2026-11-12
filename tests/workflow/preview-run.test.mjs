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
// The apps come from .ai-orchestrator/project.yaml (project-scaffold spec 2.1).
const CONFIG = [
  'name: shop',
  'jira: { space: DEMO }',
  'github: { repo: acme/shop, approvers: [owner], apps: { dev: a-dev, dev_id: 1, review: a-review, review_id: 2 } }',
  'repos: [{ name: shop, path: . }]',
  'apps:',
  '  api:',
  '    repo: shop',
  '    path: apps/api',
  '    profile: nestjs',
  '    dev: npm run start:dev -w apps/api',
  '    port: { env: PORT, default: 3001 }',
  '    health: /health',
  '  web:',
  '    repo: shop',
  '    path: apps/web',
  '    profile: nextjs',
  '    dev: npm run dev -w apps/web',
  '    port: { env: PORT, default: 3000 }',
  '    health: /',
  '    public: true',
  '    env: { API_URL: "http://localhost:3001" }',
].join('\n');
const paths = previewPaths(PROJECT);
const PROTECTED = ['.github/workflows/**', '.githooks/**', '.claude/**', '.ai-orchestrator/**', '.mcp.json'];
const START = { key: 'DEMO-21', number: 15, branch: BRANCH, head: HEAD, protected: PROTECTED };

// files: path → text. The folder starts on `on`. checkoutFails: branch → { reason, switched }. npmStatus: the exit of
// npm ci. up(url): whether an app answers. origin: the head of the branch on origin after git fetch. own: what git diff
// lists from the fork point of the branch, the PR's own changes; all: what it lists from the tip of develop.
// untracked: what git status lists as untracked (??) or ignored (!!), as `?? CLAUDE.local.md`; m.untracked changes it.
function machine({ files = {}, on = 'develop', checkoutFails = {}, npmStatus = 0, up = () => true, busyPorts = [], head = HEAD, dirty = '', agent = null, origin = HEAD, own = ['apps/web/src/page.tsx'], all = own, fetched = true, untracked = [] } = {}) {
  let others = untracked;
  const store = new Map(Object.entries({ [join(PROJECT, '.ai-orchestrator/project.yaml')]: CONFIG, ...files }));
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
    if (args[0] === 'fetch') return fetched ? { status: 0, stdout: '', stderr: '' } : { status: 1, stdout: '', stderr: 'fatal: unable to access origin' };
    if (args[0] === 'rev-parse' && args.includes(`refs/remotes/origin/${BRANCH}`)) return { status: 0, stdout: `${origin}\n`, stderr: '' };
    if (args[0] === 'rev-parse') return { status: 0, stdout: `${head}\n`, stderr: '' };
    if (args[0] === 'diff') return { status: 0, stdout: (args.some((arg) => arg.includes('...')) ? own : all).map((path) => `${path}\0`).join(''), stderr: '' };
    if (args[0] === 'status' && args.includes('--ignored=matching')) return { status: 0, stdout: others.map((entry) => `${entry}\0`).join(''), stderr: '' };
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
    npm: (args, { env }) => {
      events.push(['npm', args.join(' '), branch, 'SECRET_TOKEN' in env ? 'with a secret' : 'no secret']);
      const status = typeof npmStatus === 'function' ? npmStatus(branch) : npmStatus;
      return { status, stderr: status ? 'npm ERR! the lockfile does not match' : '' };
    },
    spawn: (file, args, { env }) => {
      pid += 1;
      events.push(['spawn', pid, [file, ...args].join(' '), env.API_URL ?? '-', `PORT ${env.PORT}`, 'SECRET_TOKEN' in env ? 'with a secret' : 'no secret']);
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
  return { runner, events, store, json, branch: () => branch, untracked: (entries) => (others = entries) };
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
    ['spawn', 101, 'node npm-cli.js run start:dev -w apps/api', '-', 'PORT 3001', 'no secret'],
    ['spawn', 102, 'node npm-cli.js run dev -w apps/web', 'http://localhost:3001', 'PORT 3000', 'no secret'],
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

test('the facts of /ao-preview: the apps of project.yaml, the record, a run of another ao-step, the folder, the ports and the packages', async () => {
  const agent = { pid: 7, command: 'build', arg: 'DEMO-22' };
  const m = machine({ files: { ...active(), ...installedFor(DEVELOP_LOCK) }, busyPorts: [3001], dirty: ' M apps/web/page.tsx\n', agent });
  const facts = await m.runner.facts(false, { headSha: HEAD });
  assert.deepEqual(facts.config.map(({ name, port }) => [name, port]), [['api', 3001], ['web', 3000]]);
  assert.deepEqual({ stop: facts.stop, configError: facts.configError, key: facts.active.key, agentRunning: facts.agentRunning, dirty: facts.dirty, busy: facts.busy, install: facts.install }, { stop: false, configError: null, key: 'DEMO-21', agentRunning: agent, dirty: 1, busy: [3001], install: true });
  assert.equal((await machine({ files: installedFor(PR_LOCK) }).runner.facts(false, { headSha: HEAD })).install, false);
  const broken = await machine({ files: { [join(PROJECT, '.ai-orchestrator/project.yaml')]: 'apps: [' } }).runner.facts(true, null);
  assert.deepEqual([broken.config, broken.stop, broken.install], [null, true, true]);
  assert.match(broken.configError, /^P1 project\.yaml: is not YAML/);
  const none = await machine({ files: { [join(PROJECT, '.ai-orchestrator/project.yaml')]: undefined } });
  none.store.delete(join(PROJECT, '.ai-orchestrator/project.yaml'));
  assert.deepEqual([(await none.runner.facts(false, null)).config, (await none.runner.facts(false, null)).configError], [null, null]);
});

// T19 of human-loop, review of ao-sample PR #21: a start that failed only switched back to develop. The packages of the
// PR stayed, and the record went before the folder was back, so the next command could run on the PR branch. Now every
// failure once the folder may have left develop goes through stop (live-run-fixes spec 2.6).
const failing = (m) => m.runner.start(START).then(() => assert.fail('start should fail'), (error) => error.message);

test('npm ci that fails goes through stop: the folder goes back to develop and the packages of develop are installed again', async () => {
  const m = machine({ files: installedFor(DEVELOP_LOCK), npmStatus: (on) => (on === BRANCH ? 1 : 0) });
  const message = await failing(m);
  assert.equal(message, 'npm ci failed: npm ERR! the lockfile does not match. Stopped the preview of DEMO-21: no app ran. The project folder is back on develop. Ran npm ci --ignore-scripts again, for the packages of develop.');
  assert.equal(m.branch(), 'develop');
  assert.deepEqual(m.events.map(([what, a, b]) => [what, what === 'npm' ? b : a]), [['checkout', BRANCH], ['npm', BRANCH], ['checkout', 'develop'], ['npm', 'develop']]);
  assert.equal(m.json(paths.active), null);
  assert.equal(m.json(paths.state).lock, lockHash(DEVELOP_LOCK));
});

test('an app that does not answer stops them all through stop, with the packages of develop installed again', async () => {
  const m = machine({ files: installedFor(DEVELOP_LOCK), up: (url) => !url.includes(':3000') });
  const message = await failing(m);
  assert.match(message, /^web did not answer at http:\/\/localhost:3000\/ within 2 minutes: read \.ai\/preview\/web\.log\. Stopped the preview of DEMO-21: api, web\. The project folder is back on develop\. Ran npm ci --ignore-scripts again, for the packages of develop\.$/);
  assert.deepEqual(m.events.filter(([what]) => what === 'kill'), [['kill', 101], ['kill', 102]]);
  assert.equal(m.branch(), 'develop');
  assert.equal(m.json(paths.active), null);
});

test('a failure while the folder cannot go back keeps the record with no app, so no command runs from the PR branch', async () => {
  const m = machine({ files: installedFor(DEVELOP_LOCK), up: () => false, checkoutFails: { develop: { reason: 'the checkout has changes not committed (2 files)' } } });
  const message = await failing(m);
  assert.ok(message.endsWith(`The project folder stays on ${BRANCH}: the checkout has changes not committed (2 files)`), message);
  assert.equal(m.branch(), BRANCH);
  assert.deepEqual(m.json(paths.active).apps, []);
  assert.equal(m.json(paths.active).key, 'DEMO-21');
});

test('a switch that fails once the folder moved, such as the fast-forward, records the preview first, then goes back through stop', async () => {
  const pulled = { reason: `${BRANCH} has commits that are not on origin/${BRANCH}`, switched: true };
  const back = machine({ files: installedFor(DEVELOP_LOCK), checkoutFails: { [BRANCH]: pulled } });
  assert.equal(await failing(back), `${pulled.reason}. Stopped the preview of DEMO-21: no app ran. The project folder is back on develop.`);
  assert.equal(back.branch(), 'develop');
  assert.equal(back.json(paths.active), null);
  const stuck = machine({ files: installedFor(DEVELOP_LOCK), checkoutFails: { [BRANCH]: pulled, develop: { reason: 'git could not switch to develop' } } });
  await failing(stuck);
  assert.deepEqual(stuck.json(paths.active).apps, []);
});

test('a switch that fails before the folder moved leaves nothing to undo', async () => {
  const m = machine({ files: installedFor(DEVELOP_LOCK), checkoutFails: { [BRANCH]: { reason: 'git fetch failed: no network' } } });
  assert.equal(await failing(m), 'git fetch failed: no network');
  assert.deepEqual(m.events, [['checkout', BRANCH]]);
  assert.equal(m.json(paths.active), null);
});

test('a head other than the one checked goes back through stop, before any package or app', async () => {
  const m = machine({ files: installedFor(DEVELOP_LOCK), head: 'b'.repeat(40) });
  assert.match(await failing(m), /^feature\/DEMO-21-remove-line is at bbbbbbbb, not aaaaaaaa, the head that was checked: a push came in between\. Run \/ao-preview DEMO-21 again\. Stopped the preview of DEMO-21: no app ran\. The project folder is back on develop\.$/);
  assert.deepEqual(m.events, [['checkout', BRANCH], ['checkout', 'develop']]);
});

// Medium of security on ao-sample PR #21 (T19): the check of decidePreview reads the files GitHub lists, at most 3000.
// Before the switch, start reads the list itself with git, which has no such limit, from the head that was checked
// (live-run-fixes spec 2.7). A refusal there leaves nothing to undo.
test('before the switch, the branch on origin must be at the head that was checked', async () => {
  const m = machine({ origin: 'c'.repeat(40) });
  assert.equal(await failing(m), 'feature/DEMO-21-remove-line is at cccccccc on origin, not aaaaaaaa, the head that was checked: a push came in between. Run /ao-preview DEMO-21 again');
  assert.deepEqual(m.events, []);
  assert.equal(await failing(machine({ fetched: false })), 'git fetch failed: fatal: unable to access origin');
});

test('an instruction file past the 3000 files GitHub lists is found in the list git gives, and nothing is switched', async () => {
  const many = Array.from({ length: 3000 }, (_, i) => `apps/web/src/generated/f${String(i).padStart(4, '0')}.ts`);
  const m = machine({ own: [...many, 'apps/web/AGENTS.md'] });
  assert.equal(await failing(m), 'PR #15 changes apps/web/AGENTS.md, which steer the kit and the agents: during a preview every /ao-* command, and your own session, would load them. Read those changes in the diff instead');
  assert.deepEqual(m.events, []);
  assert.equal(m.json(paths.active), null);
});

test('a protected path in another case and the other files that steer a session are refused the same way', async () => {
  const m = machine({ own: ['.GitHub/workflows/deploy.yml', 'apps/api/.mcp.json', '.gitattributes', 'apps/web/src/page.tsx'] });
  assert.match(await failing(m), /^PR #15 changes \.GitHub\/workflows\/deploy\.yml, apps\/api\/\.mcp\.json, \.gitattributes, which steer the kit and the agents/);
  assert.deepEqual(m.events, []);
});

// Low of security on ao-sample PR #21 (T19): the apps of a PR run as you, in the project folder, and may write files
// git does not track, such as CLAUDE.local.md or .claude/settings.local.json, which outlive the preview. stop names
// those that appeared since the start; it does not delete them (live-run-fixes spec 2.8).
test('stop names the untracked files that steer a session and appeared during the preview, and deletes none', async () => {
  const before = ['?? CLAUDE.local.md', '!! node_modules/', '?? apps/web/notes.txt'];
  const m = machine({ files: installedFor(PR_LOCK), untracked: before });
  await m.runner.start(START);
  assert.deepEqual(m.json(paths.active).untracked, ['CLAUDE.local.md']);
  assert.deepEqual(m.json(paths.active).protected, PROTECTED);
  m.untracked([...before, '!! .claude/settings.local.json', '?? apps/web/AGENTS.md', '?? .ai-orchestrator/roster.local.yaml', '?? apps/web/out.log']);
  const { notes } = await m.runner.stop();
  assert.equal(notes[1], 'Files that steer a session appeared in the project folder during the preview, and git does not track them: .claude/settings.local.json, apps/web/AGENTS.md, .ai-orchestrator/roster.local.yaml. The apps of the PR may have written them, and /ao-preview --stop does not delete them: read each one, and delete those you did not make.');
  assert.equal(m.events.filter(([what]) => what === 'rm').length, 0);
});

test('stop says nothing of untracked files when none appeared, or when the record of the preview has no list of them', async () => {
  const quiet = machine({ files: installedFor(PR_LOCK), untracked: ['?? CLAUDE.local.md'] });
  await quiet.runner.start(START);
  const { notes } = await quiet.runner.stop();
  assert.ok(!notes.some((note) => note.includes('git does not track')), notes.join(' '));
  const older = machine({ on: BRANCH, files: { ...active(), ...installedFor(PR_LOCK) }, untracked: ['?? CLAUDE.local.md'] });
  assert.ok(!(await older.runner.stop()).notes.some((note) => note.includes('git does not track')));
});

test('a branch cut from an older develop is refused: the old kit and instructions of develop would load, so it merges develop first', async () => {
  const m = machine({ own: ['apps/web/src/page.tsx'], all: ['apps/web/src/page.tsx', '.claude/settings.json', '.ai-orchestrator/scripts/ao-step.mjs'] });
  assert.equal(await failing(m), 'feature/DEMO-21-remove-line was cut from an older develop: .claude/settings.json, .ai-orchestrator/scripts/ao-step.mjs differ from develop there, and those older files would steer the agents during the preview. Merge develop into feature/DEMO-21-remove-line and push, then run /ao-preview DEMO-21 again');
  assert.deepEqual(m.events, []);
  // T11 on ao-sample: a branch from before a kit copy differs in 54 such files. The reason names 8 and counts the rest.
  const kit = Array.from({ length: 55 }, (_, i) => `.ai-orchestrator/lib/f${i}.mjs`);
  assert.match(await failing(machine({ own: [], all: kit })), /: \.ai-orchestrator\/lib\/f0\.mjs, (?:[^,]+, ){6}\.ai-orchestrator\/lib\/f7\.mjs and 47 more differ from develop there/);
  assert.match(await failing(machine({ own: kit })), /^PR #15 changes \.ai-orchestrator\/lib\/f0\.mjs, (?:[^,]+, ){6}\.ai-orchestrator\/lib\/f7\.mjs and 47 more, which steer/);
});
