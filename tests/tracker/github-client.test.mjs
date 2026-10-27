import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGitHubClient } from '../../lib/tracker/github-client.mjs';

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
  const { fetch } = fakeFetch([{ status: 404, body: { message: 'Not Found' } }]);
  const github = createGitHubClient({ repo: 'TungPH7/ao-pilot', token: 't', fetch });
  await assert.rejects(github.get('/pulls/99'), /GET \/pulls\/99 returned 404.*Not Found/);
});
