import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_DB_MEMORY, databaseName, databaseRunArgs, ensureDatabase } from '../../lib/release/database.mjs';

// The database of a project (project-scaffold part 3, spec 2.4; plan, decisions 5 and 6): one PostgreSQL container for
// each environment, made once, apart from the deploys of the apps.
const IMAGE = 'postgres:17-alpine@sha256:d3244e8ce3f165ee3c93d9c4a4b1d0fe48b3a89e2287b717fdcbbde92d405065';
const DB = 'ao-shop-development-db';
const NET = 'ao-shop-development';
const NAMES = ['POSTGRES_PASSWORD', 'POSTGRES_DB', 'APP_DB_NAME', 'APP_DB_USER', 'APP_DB_PASSWORD'];
const INIT = '/var/lib/ao/shop/db-init/development';

test('the database runs as postgres, with no capability, no published port, a memory cap and its own volume', () => {
  assert.equal(databaseName('shop', 'development'), DB);
  assert.equal(DEFAULT_DB_MEMORY, '256m');
  const args = databaseRunArgs({ project: 'shop', env: 'development', image: IMAGE, names: NAMES, initDir: INIT });
  assert.deepEqual(args, [
    'run', '--detach', '--name', DB, '--network', NET, '--network-alias', 'db',
    '--restart', 'unless-stopped', '--security-opt', 'no-new-privileges', '--cap-drop', 'ALL', '--user', 'postgres',
    '--memory', '256m', '--memory-swap', '256m',
    '--label', 'ao.project=shop', '--label', 'ao.env=development', '--label', 'ao.role=database',
    '--volume', `${DB}:/var/lib/postgresql/data`, '--volume', `${INIT}:/docker-entrypoint-initdb.d:ro`,
    ...NAMES.flatMap((name) => ['--env', name]),
    IMAGE,
  ]);
  for (const flag of ['--publish', '-p', '--privileged', '--cap-add', '--network=host', '--pid', '--device']) assert.ok(!args.includes(flag), flag);
  // Never an app container: swap lists only those that carry ao.app.
  assert.ok(!args.some((arg) => arg.startsWith('ao.app')));
  // Without init scripts, no second volume.
  assert.equal(databaseRunArgs({ project: 'shop', env: 'development', image: IMAGE, names: NAMES, memory: '512m' }).filter((arg) => arg === '--volume').length, 1);
});

test('only a digest-pinned image, plain names, a memory cap and an absolute init folder reach docker', () => {
  const good = { project: 'shop', env: 'development', image: IMAGE, names: NAMES };
  for (const bad of [{ image: 'postgres:17-alpine' }, { names: ['--privileged'] }, { memory: '1TB' }, { initDir: 'relative/init' }, { initDir: '/var/lib/ao/../../etc' }, { env: 'qa' }, { project: 'Shop' }]) {
    assert.throws(() => databaseRunArgs({ ...good, ...bad }), /not allowed in a docker argument/, JSON.stringify(bad));
  }
});

// A docker that answers from a table keyed by the joined arguments; a missing container or volume throws, as docker does.
function fakeDocker(answers) {
  const calls = [];
  const run = async (args, options = {}) => {
    const line = args.join(' ');
    calls.push({ line, env: options.env });
    const answer = typeof answers === 'function' ? answers(line) : answers[line];
    if (answer instanceof Error) throw answer;
    return answer ?? '';
  };
  return { calls, run, lines: () => calls.map(({ line }) => line) };
}
const STATE = `container inspect --format {{.State.Status}} ${DB}`;
const READY = `exec ${DB} pg_isready -U postgres -q`;
const NETWORK = `network inspect --format {{json .Containers}} ${NET}`;
const missing = new Error('Error: No such object');
const SECRETS = { POSTGRES_PASSWORD: 'root-secret-value', POSTGRES_DB: 'shop', APP_DB_NAME: 'shop', APP_DB_USER: 'shop_app', APP_DB_PASSWORD: 'app-secret-value' };
const database = { image: IMAGE, init: 'apps/api/docker/postgres/init' };
const ensure = (d, options = {}) => ensureDatabase({ run: d.run, project: 'shop', env: 'development', database, secrets: SECRETS, prepareInit: async () => INIT, sleep: async () => {}, ...options });

test('a running database is left alone', async () => {
  const d = fakeDocker({ [STATE]: 'running\n' });
  assert.deepEqual(await ensure(d), { created: false, started: false });
  assert.deepEqual(d.lines(), [STATE]);
});

test('a stopped database is started, and waited for', async () => {
  const d = fakeDocker({ [STATE]: 'exited\n' });
  assert.deepEqual(await ensure(d), { created: false, started: true });
  assert.deepEqual(d.lines(), [STATE, `start ${DB}`, READY]);
});

test('the first deploy makes the database on a new volume, with its init scripts, the values only in its environment', async () => {
  let prepared = 0;
  const d = fakeDocker({ [STATE]: missing, [`volume inspect ${DB}`]: missing, [NETWORK]: '{"c":{"Name":"caddy"}}' });
  const result = await ensure(d, { prepareInit: async () => (prepared++, INIT) });
  assert.deepEqual(result, { created: true, started: false, init: true });
  assert.equal(prepared, 1);
  const run = d.calls.find(({ line }) => line.startsWith('run '));
  assert.ok(run.line.includes(`--volume ${INIT}:/docker-entrypoint-initdb.d:ro`));
  assert.deepEqual(run.env, SECRETS);
  for (const value of [SECRETS.POSTGRES_PASSWORD, SECRETS.APP_DB_PASSWORD]) assert.ok(!d.lines().some((line) => line.includes(value)), 'no password in an argument');
  assert.equal(d.lines().at(-1), READY);
});

test('a volume that is there already keeps its data, and gets no init scripts', async () => {
  let prepared = 0;
  const d = fakeDocker({ [STATE]: missing, [NETWORK]: '{"c":{"Name":"caddy"}}' });
  assert.deepEqual(await ensure(d, { prepareInit: async () => (prepared++, INIT) }), { created: true, started: false, init: false });
  assert.equal(prepared, 0);
  assert.ok(!d.lines().some((line) => line.includes('docker-entrypoint-initdb.d')));
});

test('a database that never answers stops the deploy, and says why', async () => {
  const d = fakeDocker((line) => (line === STATE ? 'exited\n' : line === READY ? new Error('no response') : ''));
  await assert.rejects(ensure(d), /did not answer pg_isready within 60 s/);
});
