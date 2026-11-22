import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGitHubClient, readGitHubToken } from '../../lib/tracker/github-client.mjs';

function fakeFetch(responses) {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url: new URL(url), init });
    const { status = 200, body, link } = responses.shift();
    return new Response(JSON.stringify(body), { status, headers: link ? { link } : {} });
  };
  return { fetch, calls };
}

test('refuses any method but GET, without sending the request', async () => {
  const { fetch, calls } = fakeFetch([]);
  const github = createGitHubClient({ repo: 'TungPH7/ao-pilot', token: 't', fetch });
  await assert.rejects(github.request('POST', '/pulls'), /read-only/i);
  assert.equal(calls.length, 0);
});

test('with write: true it sends other methods with a JSON body, and an empty answer becomes null', async () => {
  const { fetch, calls } = fakeFetch([{ status: 201, body: { number: 8 } }]);
  const github = createGitHubClient({ repo: 'TungPH7/ao-pilot', token: 't', fetch, write: true });
  assert.deepEqual(await github.request('POST', '/pulls', {}, { title: 'x' }), { number: 8 });
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(calls[0].init.body), { title: 'x' });

  const empty = createGitHubClient({ repo: 'TungPH7/ao-pilot', token: 't', write: true, fetch: async () => new Response(null, { status: 204 }) });
  assert.equal(await empty.request('PUT', '/pulls/8/merge'), null);
});

test('sends GET for the repository, with the token and the API version', async () => {
  const { fetch, calls } = fakeFetch([{ body: { number: 7 } }]);
  const github = createGitHubClient({ repo: 'TungPH7/ao-pilot', token: 'ghs_x', fetch });

  assert.deepEqual(await github.get('/pulls/7'), { number: 7 });
  const [{ url, init }] = calls;
  assert.equal(url.href, 'https://api.github.com/repos/TungPH7/ao-pilot/pulls/7');
  assert.equal(init.headers.Authorization, 'Bearer ghs_x');
  assert.equal(init.headers['X-GitHub-Api-Version'], '2022-11-28');
  assert.ok(init.headers['User-Agent']);
});

test('follows the next link, for lists and for lists under a key', async () => {
  const next = '<https://api.github.com/repositories/1/pulls?state=all&per_page=100&page=2>; rel="next", <https://api.github.com/repositories/1/pulls?page=2>; rel="last"';
  const pages = fakeFetch([{ body: [1, 2], link: next }, { body: [3] }]);
  const github = createGitHubClient({ repo: 'TungPH7/ao-pilot', token: 't', fetch: pages.fetch });
  assert.deepEqual(await github.getAll('/pulls', { state: 'all' }), [1, 2, 3]);
  assert.equal(pages.calls[0].url.searchParams.get('per_page'), '100');
  assert.equal(pages.calls[1].url.href, 'https://api.github.com/repositories/1/pulls?state=all&per_page=100&page=2');

  const runs = fakeFetch([{ body: { total_count: 1, check_runs: [{ id: 1 }] } }]);
  const keyed = createGitHubClient({ repo: 'TungPH7/ao-pilot', token: 't', fetch: runs.fetch });
  assert.deepEqual(await keyed.getAll('/commits/abc/check-runs', {}, 'check_runs'), [{ id: 1 }]);
});

test('an error response becomes an error with the status', async () => {
  const { fetch } = fakeFetch([{ status: 404, body: { message: 'Not Found' } }, { status: 409, body: {} }]);
  const github = createGitHubClient({ repo: 'TungPH7/ao-pilot', token: 't', fetch });
  await assert.rejects(github.get('/pulls/99'), /GET \/pulls\/99 returned 404.*Not Found/);
  // merge-gate tells a refused merge (405, 409) from a failure by the status.
  await assert.rejects(github.get('/pulls/99'), { status: 409 });
});

test('the token comes from GITHUB_TOKEN first, then from the GitHub CLI', () => {
  const noGh = () => assert.fail('gh should not run');
  assert.equal(readGitHubToken({ env: { GITHUB_TOKEN: 'ci-token' }, gh: noGh }), 'ci-token');
  const gh = (args) => (args.join(' ') === 'auth token' ? { stdout: 'gho_new123\n', stderr: '' } : assert.fail(`unexpected gh ${args}`));
  assert.equal(readGitHubToken({ env: {}, gh }), 'gho_new123');
  assert.equal(readGitHubToken({ env: {}, gh: () => ({ stdout: '', stderr: '' }) }), null);
});

// The installation token of a GitHub App is now 390 characters with dots in it; cut at the first dot it got 401 Bad
// credentials, and jira-guard refused be-dev's Start of DEMO-21 (dev-workflow T18).
test('an App token with dots, from GH_TOKEN of an agent session or from gh, is read whole', () => {
  const token = `ghs_${'a'.repeat(44)}.${'b'.repeat(200)}.${'c'.repeat(141)}`;
  const noGh = () => assert.fail('gh should not run');
  assert.equal(readGitHubToken({ env: { GH_TOKEN: token }, gh: noGh }), token);
  assert.equal(readGitHubToken({ env: {}, gh: (args) => (args[1] === 'token' ? { stdout: `${token}\n`, stderr: '' } : assert.fail('no status')) }), token);
  const status = (args) => (args[1] === 'token' ? { stdout: '', stderr: '' } : { stdout: '', stderr: `  ✓ Token: ${token}\n` });
  assert.equal(readGitHubToken({ env: {}, gh: status }), token);
});

test('with gh before 2.17 the token comes from auth status, which prints on stderr', () => {
  // gh 2.16 has no `auth token`, and `auth status` writes to stderr even when it exits 0 (found in T15).
  const gh = (args) =>
    args[1] === 'token'
      ? { stdout: '', stderr: 'unknown command "token" for "gh auth"\n' }
      : { stdout: '', stderr: 'github.com\n  ✓ Logged in to github.com as someone (keyring)\n  ✓ Token: gho_old456\n' };
  assert.equal(readGitHubToken({ env: {}, gh }), 'gho_old456');
});

// Phiên 33 of shop: `ao-step fix 55` ended at once on "GitHub GET /commits/<sha>/status returned 502: Server Error".
// A read is tried again on 502, 503 and 504 and on a network error, three times, 1, 2 and 4 s apart; a write is not,
// since it may have been done.
test('a read is tried again on 502, 503, 504 and a network error; a write and other errors are not', async () => {
  const waits = [];
  const sleep = async (ms) => waits.push(ms);
  const flaky = fakeFetch([{ status: 502, body: {} }, { status: 503, body: {} }, { body: { number: 55 } }]);
  assert.deepEqual(await createGitHubClient({ repo: 'TungPH7/ao-pilot', token: 't', fetch: flaky.fetch, sleep }).get('/pulls/55'), { number: 55 });
  assert.deepEqual(waits, [1000, 2000]);

  waits.length = 0;
  let thrown = 0;
  const offline = async (url, init) => {
    if (thrown++ === 0) throw new TypeError('fetch failed');
    return new Response(JSON.stringify([{ number: 1 }]), { status: 200 });
  };
  assert.deepEqual(await createGitHubClient({ repo: 'TungPH7/ao-pilot', token: 't', fetch: offline, sleep }).getAll('/pulls'), [{ number: 1 }]);
  assert.deepEqual(waits, [1000]);

  waits.length = 0;
  const down = fakeFetch([504, 504, 504, 504].map((status) => ({ status, body: {} })));
  await assert.rejects(createGitHubClient({ repo: 'TungPH7/ao-pilot', token: 't', fetch: down.fetch, sleep }).get('/pulls/55'), /returned 504/);
  assert.deepEqual([down.calls.length, waits], [4, [1000, 2000, 4000]]);

  waits.length = 0;
  const write = fakeFetch([{ status: 502, body: {} }]);
  await assert.rejects(createGitHubClient({ repo: 'TungPH7/ao-pilot', token: 't', fetch: write.fetch, sleep, write: true }).request('PUT', '/pulls/55/merge', {}, {}), /returned 502/);
  const missing = fakeFetch([{ status: 404, body: {} }]);
  await assert.rejects(createGitHubClient({ repo: 'TungPH7/ao-pilot', token: 't', fetch: missing.fetch, sleep }).get('/pulls/99'), /returned 404/);
  assert.deepEqual([write.calls.length, missing.calls.length, waits], [1, 1, []]);
});

// T14 of C2 (SHOP-82 and SHOP-84): a build of 70 minutes outlived the App token ao-step bought at its start, and the
// reads after it got 401. A token given as a function is asked before each request, so a token bought again reaches
// the client at once.
test('a token given as a function is read before each request', async () => {
  const { fetch, calls } = fakeFetch([{ body: [] }, { body: [] }]);
  let token = 'first';
  const github = createGitHubClient({ repo: 'TungPH7/shop', token: async () => token, fetch });
  await github.get('/pulls');
  token = 'second';
  await github.get('/pulls');
  assert.deepEqual(calls.map(({ init }) => init.headers.Authorization), ['Bearer first', 'Bearer second']);
});

// Quan sát của T14: ao-step ended with exit 1 on one 500 of GET /pulls/82/reviews after a run of seo.
test('a read is tried again on 500 too', async () => {
  const waits = [];
  const flaky = fakeFetch([{ status: 500, body: {} }, { body: { number: 82 } }]);
  assert.deepEqual(await createGitHubClient({ repo: 'TungPH7/shop', token: 't', fetch: flaky.fetch, sleep: async (ms) => waits.push(ms) }).get('/pulls/82'), { number: 82 });
  assert.deepEqual(waits, [1000]);
});
