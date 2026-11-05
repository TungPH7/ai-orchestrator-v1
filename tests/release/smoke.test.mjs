import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { httpRequest, smoke } from '../../lib/release/smoke.mjs';

// The smoke checks of a project with an API and a public web app, and where the new containers answer.
const CHECKS = [
  { app: 'api', path: '/api/health', expect_status: 200, expect_text: 'ok' },
  { app: 'web', path: '/notes', expect_status: 200, expect_text: 'Ghi chú' },
];
const TARGETS = {
  api: { origin: 'http://172.18.0.5:4000', host: 'api:4000' },
  web: { origin: 'http://172.18.0.6:3000', host: 'sample-dev.ao.t2g.io.vn' },
};
const GOOD = { 'http://172.18.0.5:4000/api/health': { status: 200, text: '{"status":"ok"}' }, 'http://172.18.0.6:3000/notes': { status: 200, text: '<h1>Ghi chú</h1>' } };

// A clock that only moves when the code sleeps, and a request that answers from a list of rounds.
function fakes(rounds) {
  let time = 0;
  const calls = [];
  return {
    calls,
    now: () => time,
    sleep: async (ms) => {
      time += ms;
    },
    request: async ({ url, host }) => {
      calls.push({ url, host, at: time });
      // One round tries every check; the last round repeats for ever.
      const round = rounds[Math.min(Math.floor((calls.length - 1) / CHECKS.length), rounds.length - 1)];
      const answer = typeof round === 'function' ? round(url) : round[url];
      if (answer instanceof Error) throw answer;
      return answer;
    },
  };
}
const run = (rounds) => {
  const f = fakes(rounds);
  return smoke({ checks: CHECKS, targets: TARGETS, request: f.request, now: f.now, sleep: f.sleep }).then((result) => ({ ...result, calls: f.calls, end: f.now() }));
};

test('smoke passes at once when every check answers as expected, with the Host the app expects', async () => {
  const result = await run([GOOD]);
  assert.deepEqual({ ok: result.ok, failures: result.failures }, { ok: true, failures: [] });
  assert.deepEqual(result.calls, [
    { url: 'http://172.18.0.5:4000/api/health', host: 'api:4000', at: 0 },
    { url: 'http://172.18.0.6:3000/notes', host: 'sample-dev.ao.t2g.io.vn', at: 0 },
  ]);
});

test('smoke passes after a few tries while the app starts', async () => {
  const refused = () => new Error('connect ECONNREFUSED');
  const result = await run([refused, { ...GOOD, 'http://172.18.0.6:3000/notes': { status: 502, text: '' } }, GOOD]);
  assert.equal(result.ok, true);
  assert.equal(result.calls.length, 6);
  assert.equal(result.end, 4000, 'two pauses of 2 seconds');
});

test('smoke fails after 60 seconds without a green round, with the last problem of each check', async () => {
  const result = await run([{ ...GOOD, 'http://172.18.0.6:3000/notes': { status: 503, text: 'Service Unavailable' } }]);
  assert.equal(result.ok, false);
  assert.deepEqual(result.failures, [{ app: 'web', path: '/notes', problem: 'status 503, expected 200' }]);
  assert.equal(result.end, 60000);
  assert.equal(result.calls.at(-1).at, 60000, 'the last try is at the 60-second mark');
});

test('smoke reports a wrong status, a missing text, and no answer at all', async () => {
  const result = await run([
    {
      'http://172.18.0.5:4000/api/health': { status: 500, text: 'ok' },
      'http://172.18.0.6:3000/notes': { status: 200, text: '<h1>Giỏ hàng</h1>' },
    },
  ]);
  assert.deepEqual(result.failures, [
    { app: 'api', path: '/api/health', problem: 'status 500, expected 200' },
    { app: 'web', path: '/notes', problem: 'the answer has no "Ghi chú"' },
  ]);
  const silent = await run([() => new Error('connect ECONNREFUSED 172.18.0.5:4000')]);
  assert.equal(silent.failures[0].problem, 'no answer: connect ECONNREFUSED 172.18.0.5:4000');
});

test('httpRequest sends the Host it is given, and reads the status and the text', async (t) => {
  const server = createServer((req, res) => {
    res.writeHead(req.headers.host === 'pilot-dev.ao.t2g.io.vn' ? 200 : 421, { 'content-type': 'text/html; charset=utf-8' });
    res.end('<h1>Giỏ hàng</h1>');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const origin = `http://127.0.0.1:${server.address().port}`;
  assert.deepEqual(await httpRequest({ url: `${origin}/`, host: 'pilot-dev.ao.t2g.io.vn' }), { status: 200, text: '<h1>Giỏ hàng</h1>' });
  assert.equal((await httpRequest({ url: `${origin}/`, host: 'other.example' })).status, 421);
});

test('httpRequest gives up on an app that does not answer in time, and only speaks plain HTTP inside the VPS', async (t) => {
  const server = createServer(() => {});
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  await assert.rejects(httpRequest({ url: `http://127.0.0.1:${server.address().port}/`, host: 'x', timeout: 100 }), /no answer within 100 ms/);
  await assert.rejects(httpRequest({ url: 'https://127.0.0.1/', host: 'x' }), /only http:/);
});
