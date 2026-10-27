import { test } from 'node:test';
import assert from 'node:assert/strict';
import { basicAuth, bearerAuth, createJiraClient } from '../../lib/tracker/jira-client.mjs';

// A fetch that answers from a list of responses and records the requests it gets.
function fakeFetch(responses) {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url: new URL(url), init });
    const { status = 200, body } = responses.shift();
    return new Response(JSON.stringify(body), { status });
  };
  return { fetch, calls };
}

test('refuses any method but GET, without sending the request', async () => {
  const { fetch, calls } = fakeFetch([]);
  const client = createJiraClient({ cloudId: 'c1', authorization: 'Basic x', fetch });
  for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
    await assert.rejects(client.request(method, '/rest/api/3/issue/DEMO-1/transitions'), /read-only/i);
  }
  assert.equal(calls.length, 0);
});

test('sends GET through api.atlassian.com with the token and English names', async () => {
  const { fetch, calls } = fakeFetch([{ body: { id: '10001' } }]);
  const client = createJiraClient({ cloudId: 'c1', authorization: basicAuth('me@example.com', 't0k'), fetch });

  assert.deepEqual(await client.get('/rest/api/3/issuetype/project', { projectId: '10001' }), { id: '10001' });
  const [{ url, init }] = calls;
  assert.equal(url.href, 'https://api.atlassian.com/ex/jira/c1/rest/api/3/issuetype/project?projectId=10001');
  assert.equal(init.method, 'GET');
  assert.equal(init.headers.Authorization, `Basic ${Buffer.from('me@example.com:t0k').toString('base64')}`);
  assert.equal(init.headers['Accept-Language'], 'en-US');
});

test('follows startAt pages until isLast', async () => {
  const { fetch, calls } = fakeFetch([
    { body: { startAt: 0, isLast: false, values: [1, 2] } },
    { body: { startAt: 2, isLast: true, values: [3] } },
  ]);
  const client = createJiraClient({ cloudId: 'c1', authorization: 'Basic x', fetch });

  assert.deepEqual(await client.getAll('/rest/api/3/resolution/search', { maxResults: 2 }), [1, 2, 3]);
  assert.deepEqual(calls.map(({ url }) => url.searchParams.get('startAt')), ['0', '2']);
  assert.ok(calls.every(({ url }) => url.searchParams.get('maxResults') === '2'));
});

test('stops on total when a page has no isLast, and on an empty page', async () => {
  const byTotal = fakeFetch([{ body: { total: 3, values: [1, 2] } }, { body: { total: 3, values: [3] } }]);
  const client = createJiraClient({ cloudId: 'c1', authorization: 'Basic x', fetch: byTotal.fetch });
  assert.deepEqual(await client.getAll('/x'), [1, 2, 3]);

  const empty = fakeFetch([{ body: { isLast: false, values: [] } }]);
  assert.deepEqual(await createJiraClient({ cloudId: 'c1', authorization: 'Basic x', fetch: empty.fetch }).getAll('/x'), []);
  assert.equal(empty.calls.length, 1);
});

test('an error response becomes an error with the status', async () => {
  const { fetch } = fakeFetch([{ status: 401, body: { code: 401, message: 'Unauthorized; scope does not match' } }]);
  const client = createJiraClient({ cloudId: 'c1', authorization: 'Basic x', fetch });
  await assert.rejects(client.get('/rest/api/3/workflows/search'), /GET \/rest\/api\/3\/workflows\/search returned 401.*scope does not match/);
});

test('a service account token goes as Bearer', () => {
  assert.equal(bearerAuth('t0k'), 'Bearer t0k');
});

test('lists under another key than values, like comments', async () => {
  const { fetch } = fakeFetch([{ body: { startAt: 0, total: 1, comments: [{ id: '1' }] } }]);
  const client = createJiraClient({ cloudId: 'c1', authorization: 'Basic x', fetch });
  assert.deepEqual(await client.getAll('/rest/api/3/issue/DEMO-1/comment', { orderBy: '-created' }, 'comments'), [{ id: '1' }]);
});

test('searches with JQL by GET, following nextPageToken', async () => {
  const { fetch, calls } = fakeFetch([
    { body: { issues: [{ key: 'DEMO-1' }], nextPageToken: 'p2', isLast: false } },
    { body: { issues: [{ key: 'DEMO-2' }], isLast: true } },
  ]);
  const client = createJiraClient({ cloudId: 'c1', authorization: 'Basic x', fetch });

  assert.deepEqual(await client.searchAll('project = DEMO', ['status', 'subtasks']), [{ key: 'DEMO-1' }, { key: 'DEMO-2' }]);
  assert.ok(calls.every(({ init }) => init.method === 'GET'));
  assert.deepEqual(
    calls.map(({ url }) => [url.pathname, url.searchParams.get('jql'), url.searchParams.get('fields'), url.searchParams.get('nextPageToken')]),
    [
      ['/ex/jira/c1/rest/api/3/search/jql', 'project = DEMO', 'status,subtasks', null],
      ['/ex/jira/c1/rest/api/3/search/jql', 'project = DEMO', 'status,subtasks', 'p2'],
    ],
  );
});
