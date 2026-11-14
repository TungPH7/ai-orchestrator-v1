import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRUNE_CACHE, buildArgs, containerEnv, parseSecrets, pruneImages, readableMode, runArgs, swap, treesToKeep } from '../../lib/release/docker.mjs';

const T = 'f'.repeat(40); // the tree to deploy
const O = 'e'.repeat(40); // the tree running now
const NET = 'ao-sample-development';
const CONFIG = {
  apps: {
    web: { dockerfile: 'apps/web/Dockerfile', port: 3000, health: '/', public: true, env: ['API_URL'] },
    api: { dockerfile: 'apps/api/Dockerfile', port: 4000, health: '/api/health', env: ['DATABASE_URL'] },
  },
  smoke: [
    { app: 'api', path: '/api/health', expect_status: 200, expect_text: 'ok' },
    { app: 'web', path: '/notes', expect_status: 200, expect_text: 'Ghi chú' },
  ],
};
const SECRETS = { API_URL: 'http://api:4000', DATABASE_URL: 'postgres://app:s3cr3t-value@db/app', UNUSED: 'other' };
const PUBLIC_URL = 'https://sample-dev.ao.t2g.io.vn';
const FORBIDDEN = ['--publish', '-p', '--privileged', '--volume', '-v', '--mount', '--network=host', '--net=host', '--pid', '--ipc', '--cap-add', '--device'];

const name = (app, tree) => `ao-sample-development-${app}-${tree.slice(0, 12)}`;
const ps = (...rows) => rows.map((row) => row.join('\t')).join('\n');
const RUNNING = ps([name('api', O), 'running', 'api', O], [name('web', O), 'running', 'web', O]);

// A docker that answers from a table keyed by the joined arguments, and records every call with the environment it got.
function fakeDocker(answers = {}) {
  const calls = [];
  const run = async (args, options = {}) => {
    calls.push({ args, env: options.env });
    const answer = answers[args.join(' ')];
    if (answer instanceof Error) throw answer;
    return answer ?? '';
  };
  return { calls, run, lines: () => calls.map(({ args }) => args.join(' ')) };
}
const docker = (extra = {}) =>
  fakeDocker({
    [`network inspect --format {{json .Containers}} ${NET}`]: '{"c1":{"Name":"caddy"}}',
    [`ps --all --filter label=ao.project=sample --filter label=ao.env=development --filter label=ao.app --format {{.Names}}\t{{.State}}\t{{.Label "ao.app"}}\t{{.Label "ao.tree"}}`]: RUNNING,
    [`inspect --format {{json .NetworkSettings.Networks}} ${name('api', T)}`]: `{"${NET}":{"IPAddress":"172.18.0.7"}}`,
    [`inspect --format {{json .NetworkSettings.Networks}} ${name('web', T)}`]: `{"${NET}":{"IPAddress":"172.18.0.8"}}`,
    ...extra,
  });
// A smoke test that answers from a list, one result per app, and records what it was asked.
function fakeSmoke(results) {
  const asked = [];
  const smoke = async (checks, targets, options) => {
    asked.push({ checks, targets, options });
    return results.shift();
  };
  return { asked, smoke };
}
const PASS = { ok: true, failures: [] };
const deploy = (d, s, options = {}) => swap({ run: d.run, smoke: s.smoke, project: 'sample', env: 'development', tree: T, config: CONFIG, secrets: SECRETS, publicUrls: { web: PUBLIC_URL }, ...options });

const runLine = (app, env, memory = '512m') => `run --detach --name ${name(app, T)} --network ${NET} --restart unless-stopped --pull never --security-opt no-new-privileges --cap-drop ALL --memory ${memory} --memory-swap ${memory} --label ao.project=sample --label ao.env=development --label ao.app=${app} --label ao.tree=${T} ${env.map((n) => `--env ${n}`).join(' ')} ao-sample-${app}:${T}`;
const give = (app, tree) => [`network disconnect ${NET} ${name(app, tree)}`, `network connect --alias ${app} --alias ao-sample-development-${app} ${NET} ${name(app, tree)}`];
const strip = (app, tree) => [`network disconnect ${NET} ${name(app, tree)}`, `network connect ${NET} ${name(app, tree)}`];

test('buildArgs tags the image by tree and builds from the root of the checkout, without a shell', () => {
  assert.deepEqual(buildArgs({ project: 'sample', app: 'web', tree: T, dockerfile: 'apps/web/Dockerfile', context: '/var/lib/ao/work/sample-ffff' }), [
    'build', '--file', '/var/lib/ao/work/sample-ffff/apps/web/Dockerfile', '--tag', `ao-sample-web:${T}`,
    '--label', 'ao.project=sample', '--label', 'ao.app=web', '--label', `ao.tree=${T}`, '/var/lib/ao/work/sample-ffff',
  ]);
  assert.throws(() => buildArgs({ project: 'sample', app: 'web', tree: T, dockerfile: '../Dockerfile', context: '/var/lib/ao/work/x' }), /dockerfile/);
  assert.throws(() => buildArgs({ project: 'sample', app: 'web', tree: T, dockerfile: 'Dockerfile', context: 'relative' }), /context/);
  // project-scaffold part 3, spec 2.5: a Dockerfile made for the app folder builds from it; the file is still named
  // from the root of the checkout.
  assert.deepEqual(buildArgs({ project: 'shop', app: 'api', tree: T, dockerfile: 'apps/api/Dockerfile', context: '/var/lib/ao/work/x', folder: 'apps/api' }).slice(-1), ['/var/lib/ao/work/x/apps/api']);
  assert.equal(buildArgs({ project: 'shop', app: 'api', tree: T, dockerfile: 'apps/api/Dockerfile', context: '/var/lib/ao/work/x', folder: 'apps/api' })[2], '/var/lib/ao/work/x/apps/api/Dockerfile');
  for (const folder of ['../x', 'apps/../..', '/etc']) assert.throws(() => buildArgs({ project: 'shop', app: 'api', tree: T, dockerfile: 'Dockerfile', context: '/var/lib/ao/work/x', folder }), /folder/, folder);
});

test('runArgs never publishes a port, mounts a volume, joins the host network or runs privileged', () => {
  const args = runArgs({ project: 'sample', env: 'development', app: 'web', tree: T, names: ['API_URL', 'AO_PUBLIC_URL'] });
  assert.equal(args.join(' '), runLine('web', ['API_URL', 'AO_PUBLIC_URL']));
  for (const flag of FORBIDDEN) assert.ok(!args.includes(flag), flag);
});

test('only full commit trees and plain names reach docker: a branch name or an option cannot', () => {
  const good = { project: 'sample', env: 'development', app: 'web', tree: T, names: [] };
  for (const bad of [{ tree: 'release/v0.1.0' }, { tree: T.slice(0, 12) }, { app: '--privileged' }, { app: 'Web' }, { project: 'x;rm -rf /' }, { env: 'qa' }, { names: ['--privileged'] }]) {
    assert.throws(() => runArgs({ ...good, ...bad }), /not allowed in a docker argument/, JSON.stringify(bad));
  }
});

test('each app gets only the variables it names; the public app also gets AO_PUBLIC_URL; values never reach the arguments', () => {
  assert.deepEqual(containerEnv({ app: CONFIG.apps.web, secrets: SECRETS, publicUrl: PUBLIC_URL }), {
    names: ['API_URL', 'AO_PUBLIC_URL'],
    values: { API_URL: 'http://api:4000', AO_PUBLIC_URL: PUBLIC_URL },
    missing: [],
  });
  assert.deepEqual(containerEnv({ app: CONFIG.apps.api, secrets: SECRETS, publicUrl: PUBLIC_URL }), {
    names: ['DATABASE_URL'],
    values: { DATABASE_URL: SECRETS.DATABASE_URL },
    missing: [],
  });
  assert.deepEqual(containerEnv({ app: CONFIG.apps.api, secrets: {}, publicUrl: PUBLIC_URL }).missing, ['DATABASE_URL']);
});

test('parseSecrets reads NAME=value lines and names a bad line by number, never by its text', () => {
  assert.deepEqual(parseSecrets('# development\nAPI_URL=http://api:4000\r\n\nDATABASE_URL=postgres://a:b=c@db/app\n'), { API_URL: 'http://api:4000', DATABASE_URL: 'postgres://a:b=c@db/app' });
  assert.throws(() => parseSecrets('API_URL=x\nexport TOKEN s3cr3t\n'), (error) => /line 2/.test(error.message) && !error.message.includes('s3cr3t'));
});

test('swap runs each new container next to the old one, smoke-tests it, moves the aliases, then stops the old ones (plan decision 4)', async () => {
  const d = docker();
  const s = fakeSmoke([PASS, PASS]);
  assert.deepEqual(await deploy(d, s), { outcome: 'switched', failures: [], stopped: [name('api', O), name('web', O)] });
  // Apps that are not public go first, so the new public app is smoke-tested against the new API.
  assert.deepEqual(d.lines().slice(2), [
    runLine('api', ['DATABASE_URL']),
    `inspect --format {{json .NetworkSettings.Networks}} ${name('api', T)}`,
    ...give('api', T),
    ...strip('api', O),
    runLine('web', ['API_URL', 'AO_PUBLIC_URL']),
    `inspect --format {{json .NetworkSettings.Networks}} ${name('web', T)}`,
    ...give('web', T),
    ...strip('web', O),
    `stop ${name('api', O)}`,
    `rm ${name('api', O)}`,
    `stop ${name('web', O)}`,
    `rm ${name('web', O)}`,
  ]);
  assert.deepEqual(s.asked, [
    {
      checks: [{ app: 'api', path: '/api/health', expect_status: 200, expect_text: 'ok' }],
      targets: { api: { origin: 'http://172.18.0.7:4000', host: 'api:4000' } },
      options: { timeout: 60000 },
    },
    {
      checks: [{ app: 'web', path: '/', expect_status: 200, expect_text: '' }, { app: 'web', path: '/notes', expect_status: 200, expect_text: 'Ghi chú' }],
      targets: { web: { origin: 'http://172.18.0.8:3000', host: 'sample-dev.ao.t2g.io.vn' } },
      options: { timeout: 60000 },
    },
  ]);
  // Secrets reach docker through its environment, one app at a time, and no call carries a forbidden flag.
  const runs = d.calls.filter(({ args }) => args[0] === 'run');
  assert.deepEqual(runs.map(({ env }) => env), [{ DATABASE_URL: SECRETS.DATABASE_URL }, { API_URL: SECRETS.API_URL, AO_PUBLIC_URL: PUBLIC_URL }]);
  for (const { args } of d.calls) {
    assert.ok(!args.some((arg) => arg.includes('s3cr3t')), args.join(' '));
    for (const flag of FORBIDDEN) assert.ok(!args.includes(flag), `${flag} in ${args.join(' ')}`);
  }
});

test('when the smoke test of a later app fails, the earlier apps get their old containers back and every new one goes', async () => {
  const d = docker();
  const failure = { ok: false, failures: [{ app: 'web', path: '/notes', problem: 'status 500, expected 200' }] };
  assert.deepEqual(await deploy(d, fakeSmoke([PASS, failure])), { outcome: 'failed', failures: failure.failures, stopped: [] });
  const lines = d.lines();
  assert.deepEqual(lines.slice(lines.indexOf(`inspect --format {{json .NetworkSettings.Networks}} ${name('web', T)}`) + 1), [
    `rm --force ${name('web', T)}`,
    ...give('api', O),
    `rm --force ${name('api', T)}`,
  ]);
  assert.ok(!lines.some((line) => line.startsWith('stop ')), 'no old container stops');
});

test('when the first app fails its smoke test, only its new container goes', async () => {
  const d = docker();
  const failure = { ok: false, failures: [{ app: 'api', path: '/api/health', problem: 'no answer: connect ECONNREFUSED' }] };
  assert.deepEqual(await deploy(d, fakeSmoke([failure])), { outcome: 'failed', failures: failure.failures, stopped: [] });
  assert.deepEqual(d.lines().slice(-1), [`rm --force ${name('api', T)}`]);
});

test('a container that does not start counts as a failed deploy', async () => {
  const d = docker({ [runLine('api', ['DATABASE_URL'])]: new Error('docker: Error response from daemon: port is already allocated') });
  const result = await deploy(d, fakeSmoke([]));
  assert.deepEqual(result, { outcome: 'failed', failures: [{ app: 'api', path: null, problem: 'the container did not start: docker: Error response from daemon: port is already allocated' }], stopped: [] });
  assert.deepEqual(d.lines().slice(-1), [`rm --force ${name('api', T)}`]);
  // docker run may fail before the container exists; removing it then fails too, and the deploy still ends as failed.
  const none = docker({
    [runLine('api', ['DATABASE_URL'])]: new Error('docker: invalid reference format'),
    [`rm --force ${name('api', T)}`]: new Error(`Error response from daemon: No such container: ${name('api', T)}`),
  });
  assert.equal((await deploy(none, fakeSmoke([]))).outcome, 'failed');
});

test('a build context becomes readable by all: COPY keeps its modes, and a USER other than root must read the image', () => {
  assert.equal(readableMode(0o600, false), 0o644);
  assert.equal(readableMode(0o700, false), 0o755); // a script stays executable
  assert.equal(readableMode(0o700, true), 0o755);
  assert.equal(readableMode(0o644, false), 0o644);
  assert.equal(readableMode(0o755, true), 0o755);
});

test('a container with no address is not running: the deploy says how it stands, without a smoke test, and it goes', async () => {
  const d = docker({
    [`inspect --format {{json .NetworkSettings.Networks}} ${name('api', T)}`]: `{"${NET}":{"IPAddress":""}}`,
    [`inspect --format {{.State.Status}}, exit code {{.State.ExitCode}} ${name('api', T)}`]: 'restarting, exit code 1\n',
  });
  const s = fakeSmoke([]);
  assert.deepEqual(await deploy(d, s), { outcome: 'failed', failures: [{ app: 'api', path: null, problem: 'the container has no address: it is restarting, exit code 1' }], stopped: [] });
  assert.deepEqual(s.asked, []);
  assert.ok(d.lines().includes(`rm --force ${name('api', T)}`));
});

test('the first deploy creates the network, connects Caddy, and has nothing old to stop', async () => {
  const d = docker({
    [`network inspect --format {{json .Containers}} ${NET}`]: new Error('network ao-sample-development not found'),
    [`ps --all --filter label=ao.project=sample --filter label=ao.env=development --filter label=ao.app --format {{.Names}}\t{{.State}}\t{{.Label "ao.app"}}\t{{.Label "ao.tree"}}`]: '',
  });
  assert.deepEqual(await deploy(d, fakeSmoke([PASS, PASS])), { outcome: 'switched', failures: [], stopped: [] });
  assert.deepEqual(d.lines().slice(1, 4), [
    `network create --driver bridge --label ao.project=sample --label ao.env=development ${NET}`,
    `network connect ${NET} caddy`,
    `ps --all --filter label=ao.project=sample --filter label=ao.env=development --filter label=ao.app --format {{.Names}}\t{{.State}}\t{{.Label "ao.app"}}\t{{.Label "ao.tree"}}`,
  ]);
  assert.ok(!d.lines().some((line) => line.startsWith('stop ') || line === `network connect ${NET} ${name('api', O)}`));
});

test('a leftover container of the same tree, from a deploy cut short, is removed before the new one runs', async () => {
  const d = docker({
    [`ps --all --filter label=ao.project=sample --filter label=ao.env=development --filter label=ao.app --format {{.Names}}\t{{.State}}\t{{.Label "ao.app"}}\t{{.Label "ao.tree"}}`]: ps(
      [name('api', O), 'running', 'api', O],
      [name('web', O), 'running', 'web', O],
      [name('api', T), 'exited', 'api', T],
    ),
  });
  await deploy(d, fakeSmoke([PASS, PASS]));
  const lines = d.lines();
  assert.ok(lines.indexOf(`rm --force ${name('api', T)}`) < lines.indexOf(runLine('api', ['DATABASE_URL'])));
});

test('a variable an app names but the secrets file lacks stops the deploy before docker runs anything', async () => {
  const d = docker();
  const result = await deploy(d, fakeSmoke([]), { secrets: { API_URL: 'http://api:4000' } });
  assert.deepEqual(result, { outcome: 'refused', failures: [], stopped: [], reason: 'missing in /etc/ao/secrets/sample/development.env: DATABASE_URL (api)' });
  assert.deepEqual(d.calls, []);
});

test('the deployer keeps the three newest images that ran on each environment, and removes the rest', async () => {
  const [t1, t2, t3, t4, t5] = ['1', '2', '3', '4', '5'].map((ch) => ch.repeat(40));
  const record = {
    development: [{ tree: t1, ok: true }, { tree: t2, ok: true }, { tree: t3, ok: false }, { tree: t4, ok: true }, { tree: t5, ok: true }],
    staging: [{ tree: t1, ok: true }],
  };
  assert.deepEqual([...treesToKeep(record)].sort(), [t1, t2, t4, t5].sort());
  const d = fakeDocker({ 'image ls --filter label=ao.project=sample --format {{.Repository}}:{{.Tag}}': [t1, t2, t3, t4, t5].map((t) => `ao-sample-web:${t}`).join('\n') });
  // Only t4 and t5 ran on Development among its last three deploys, since t3 failed its smoke test.
  const keep = treesToKeep({ development: record.development.slice(2) });
  assert.deepEqual(await pruneImages({ run: d.run, project: 'sample', keep }), [t1, t2, t3].map((t) => `ao-sample-web:${t}`));
  assert.deepEqual(d.lines().slice(1), [t1, t2, t3].map((t) => `image rm ao-sample-web:${t}`));
});

test('an image still in use is left alone', async () => {
  const d = fakeDocker({
    'image ls --filter label=ao.project=sample --format {{.Repository}}:{{.Tag}}': `ao-sample-web:${O}`,
    [`image rm ao-sample-web:${O}`]: new Error('conflict: unable to remove repository reference (must force) - container is using its referenced image'),
  });
  assert.deepEqual(await pruneImages({ run: d.run, project: 'sample', keep: new Set() }), []);
});

test('the build cache is trimmed to the 4 GB used most recently (T2: six builds left 7.25 GB)', () => {
  assert.deepEqual(PRUNE_CACHE, ['buildx', 'prune', '--force', '--max-used-space', '4gb']);
});

// project-scaffold part 3, spec 2.5: a memory cap on every container, and time for a JVM app to start.
test('each container has a memory cap, 512m unless deploy.yaml names one, and no swap beyond it', () => {
  const good = { project: 'shop', env: 'development', app: 'api', tree: T, names: [] };
  const args = runArgs({ ...good, memory: '768m' });
  const at = args.indexOf('--memory');
  assert.deepEqual(args.slice(at, at + 4), ['--memory', '768m', '--memory-swap', '768m']);
  assert.deepEqual(runArgs(good).slice(at, at + 4), ['--memory', '512m', '--memory-swap', '512m']);
  for (const memory of ['1TB', '768', '--privileged']) assert.throws(() => runArgs({ ...good, memory }), /not allowed in a docker argument/, memory);
});

test('the smoke test of an app waits as long as its start_timeout, 60 s by default, and its cap reaches docker', async () => {
  const d = docker();
  const s = fakeSmoke([PASS, PASS]);
  const config = { ...CONFIG, apps: { ...CONFIG.apps, api: { ...CONFIG.apps.api, start_timeout: 180, memory: '768m' } } };
  assert.equal((await deploy(d, s, { config })).outcome, 'switched');
  assert.deepEqual(s.asked.map(({ options }) => options), [{ timeout: 180000 }, { timeout: 60000 }]);
  assert.ok(d.lines().includes(runLine('api', ['DATABASE_URL'], '768m')));
  assert.ok(d.lines().includes(runLine('web', ['API_URL', 'AO_PUBLIC_URL'])));
});
