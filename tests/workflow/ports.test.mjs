import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lanePorts, portsNote, runsAtOnce, shiftLocalUrls } from '../../lib/workflow/ports.mjs';

// The ports of a lane (parallel-runs spec 5.2), with the apps of shop.
const APPS = {
  user: { port: { env: 'PORT', default: 3000 }, env: { API_URL: 'http://localhost:3001' } },
  admin: { port: { env: 'PORT', default: 5173 } },
  api: { port: { env: 'PORT', default: 3001 } },
};

test('slot 0 keeps the default ports; slot k moves each port and each localhost URL by k × port_step', () => {
  assert.deepEqual(lanePorts(APPS, 0), [
    { name: 'user', port: 3000, variable: 'PORT' },
    { name: 'admin', port: 5173, variable: 'PORT' },
    { name: 'api', port: 3001, variable: 'PORT' },
  ]);
  assert.deepEqual(lanePorts(APPS, 200).map(({ port }) => port), [3200, 5373, 3201]);
  assert.equal(shiftLocalUrls('http://localhost:3001/api', 100), 'http://localhost:3101/api');
  assert.equal(shiftLocalUrls('http://127.0.0.1:3001', 100), 'http://127.0.0.1:3101');
  assert.equal(shiftLocalUrls('http://api:3001', 100), 'http://api:3001', 'a host of the compose network stays');
  assert.equal(shiftLocalUrls('http://localhost:3001', 0), 'http://localhost:3001');
});

test('the note names each port and its variable, and says to keep away from the defaults', () => {
  const note = portsNote(lanePorts(APPS, 100), 100);
  assert.match(note, /AO_PORT_OFFSET=100\): user on 3100 \(PORT=3100\), admin on 5273 \(PORT=5273\), api on 3101 \(PORT=3101\)/);
  assert.match(note, /never the defaults/);
  assert.equal(portsNote([], 0), null);
});

test('AO_AGENTS_AT_ONCE lowers runs.lanes_max for one machine, never raises it', () => {
  assert.equal(runsAtOnce(3, {}), 3);
  assert.equal(runsAtOnce(3, { AO_AGENTS_AT_ONCE: '1' }), 1);
  assert.equal(runsAtOnce(3, { AO_AGENTS_AT_ONCE: '5' }), 3);
  assert.equal(runsAtOnce(3, { AO_AGENTS_AT_ONCE: 'two' }), 3);
  assert.equal(runsAtOnce(3, { AO_AGENTS_AT_ONCE: '0' }), 3);
});
