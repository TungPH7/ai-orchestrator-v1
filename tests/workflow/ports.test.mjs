import { test } from 'node:test';
import assert from 'node:assert/strict';
import { laneEnv, lanePorts, portOffset, portsNote, runsAtOnce, shiftLocalUrls } from '../../lib/workflow/ports.mjs';

// The ports of a lane (parallel-runs spec 5.2), with the apps of shop.
const APPS = {
  user: { port: { env: 'PORT', default: 3000 }, env: { API_URL: 'http://localhost:3001' } },
  admin: { port: { env: 'PORT', default: 5173 } },
  api: { port: { env: 'PORT', default: 3001 } },
};

test('an offset of 0 keeps the default ports; an offset moves each port and each localhost URL by it', () => {
  assert.deepEqual(lanePorts(APPS, 0), [
    { name: 'user', port: 3000, variable: 'PORT', env: { API_URL: 'http://localhost:3001' } },
    { name: 'admin', port: 5173, variable: 'PORT' },
    { name: 'api', port: 3001, variable: 'PORT' },
  ]);
  assert.deepEqual(lanePorts(APPS, 200).map(({ port }) => port), [3200, 5373, 3201]);
  assert.equal(shiftLocalUrls('http://localhost:3001/api', 100), 'http://localhost:3101/api');
  assert.equal(shiftLocalUrls('http://127.0.0.1:3001', 100), 'http://127.0.0.1:3101');
  assert.equal(shiftLocalUrls('http://api:3001', 100), 'http://api:3001', 'a host of the compose network stays');
  assert.equal(shiftLocalUrls('http://localhost:3001', 0), 'http://localhost:3001');
});

// The apps an agent starts itself in a lane take env, never e2e_env: only the servers Playwright starts load the mock
// backend (private-car-v1-1, PCV11-3).
test('the variables a lane names for an app are its env, never its e2e_env', () => {
  const [user] = lanePorts({ user: { ...APPS.user, e2e_env: { E2E_API_MOCKING: '1' } } }, 100);
  assert.deepEqual(user.env, { API_URL: 'http://localhost:3101' });
  assert.doesNotMatch(portsNote([user], 100), /E2E_API_MOCKING/);
});

test('the note names each port and its variable, and says to keep away from the defaults', () => {
  const note = portsNote(lanePorts(APPS, 100), 100);
  assert.match(note, /AO_PORT_OFFSET=100\): user on 3100 \(PORT=3100\), admin on 5273 \(PORT=5273\), api on 3101 \(PORT=3101\)/);
  assert.match(note, /never the defaults/);
  assert.match(note, /Playwright starts the apps itself and uses no server already on these ports: stop an app you started before you run it/);
  assert.equal(portsNote([], 0), null);
  // The variables of runs.lane_env are in the run's environment already: the note names them so the agent keeps them.
  const withEnv = portsNote(lanePorts(APPS, 100), 100, { AO_PORT_OFFSET: '100', DB_PORT: '5532', COMPOSE_PROJECT_NAME: 'shop-api-s1' });
  assert.match(withEnv, /Your environment holds this lane's own services too: DB_PORT=5532, COMPOSE_PROJECT_NAME=shop-api-s1\. Keep them/);
});

// Review of shop PR #43 (Low 2): the env of an app in project.yaml reached it only when Playwright or the preview
// started it; an app the agent started in a lane read the .env.development copied in, and user called the old api.
test('the note gives the env of each app of project.yaml, its localhost URLs moved, to start the app with', () => {
  const note = portsNote(lanePorts(APPS, 100), 100);
  assert.match(note, /Start each app with its variables of project\.yaml too, as its \.env files do not have them for this lane: user with API_URL=http:\/\/localhost:3101\./);
  const none = portsNote(lanePorts({ api: { port: { env: 'PORT', default: 3001 } } }, 100), 100);
  assert.doesNotMatch(none, /variables of project\.yaml/);
});

// Review of shop PR #21: slot 0 took the default ports, where your own `pnpm dev` in the project folder answers, and the
// database of the default compose project. A run's slot k now moves them by (k + 1) × port_step.
test('no run takes the default ports: slot k is offset by (k + 1) × port_step', () => {
  assert.equal(portOffset(0, 100), 100);
  assert.equal(portOffset(2, 100), 300);
  assert.equal(portOffset(1, 50), 100);
});

test('runs.lane_env gives each slot its own ports and names, such as the database of Docker Compose', () => {
  const settings = { ports: { DB_PORT: 5432, POSTGRES_HOST_PORT: 5432 }, names: { COMPOSE_PROJECT_NAME: 'learn-postgresql-api', POSTGRES_CONTAINER_NAME: 'learn-postgres' } };
  assert.deepEqual(laneEnv(settings, 0, 100), {
    AO_PORT_OFFSET: '100',
    DB_PORT: '5532',
    POSTGRES_HOST_PORT: '5532',
    COMPOSE_PROJECT_NAME: 'learn-postgresql-api-s1',
    POSTGRES_CONTAINER_NAME: 'learn-postgres-s1',
  });
  assert.equal(laneEnv(settings, 2, 300).POSTGRES_CONTAINER_NAME, 'learn-postgres-s3');
  assert.deepEqual(laneEnv(undefined, 1, 200), { AO_PORT_OFFSET: '200' });
});

test('AO_AGENTS_AT_ONCE lowers runs.lanes_max for one machine, never raises it', () => {
  assert.equal(runsAtOnce(3, {}), 3);
  assert.equal(runsAtOnce(3, { AO_AGENTS_AT_ONCE: '1' }), 1);
  assert.equal(runsAtOnce(3, { AO_AGENTS_AT_ONCE: '5' }), 3);
  assert.equal(runsAtOnce(3, { AO_AGENTS_AT_ONCE: 'two' }), 3);
  assert.equal(runsAtOnce(3, { AO_AGENTS_AT_ONCE: '0' }), 3);
});
