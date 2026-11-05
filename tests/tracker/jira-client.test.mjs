import { test } from 'node:test';
import assert from 'node:assert/strict';
import { basicAuth, bearerAuth, createJiraClient } from '../../lib/tracker/jira-client.mjs';

// A fetch that answers from a list of responses and records the requests it gets.
function fakeFetch(responses) {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url: new URL(url), init });
    const { status = 200, body } = responses.shift();
    return new Response(status === 204 ? null : JSON.stringify(body), { status });
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

test('the write requests of jira-sync are refused unless the client is made for writing', async () => {
  const { fetch, calls } = fakeFetch([{ body: { transitions: [{ id: '4', name: 'Submit' }] } }]);
  const client = createJiraClient({ cloudId: 'c1', authorization: 'Bearer x', fetch });
  await assert.rejects(client.editItem('DEMO-1', { update: {} }), /read-only/i);
  await assert.rejects(client.comment('DEMO-1', 'x'), /read-only/i);
  await assert.rejects(client.transition('DEMO-1', 'Submit'), /read-only/i);
  assert.deepEqual(calls.map(({ init }) => init.method), ['GET']);
});

test('a client made for writing moves an item by the transition name, edits it and comments in ADF', async () => {
  const { fetch, calls } = fakeFetch([
    { body: { transitions: [{ id: '11', name: 'Cancel' }, { id: '4', name: 'Submit' }] } },
    { status: 204 },
    { status: 204 },
    { status: 201, body: { id: '10050' } },
  ]);
  const client = createJiraClient({ cloudId: 'c1', authorization: 'Bearer x', fetch, write: true });

  await client.transition('DEMO-1', 'Submit');
  await client.editItem('DEMO-1', { update: { labels: [{ add: 'needs-you' }] } });
  assert.deepEqual(await client.comment('DEMO-1', 'Waits for you.'), { id: '10050' });

  const sent = calls.map(({ url, init }) => [init.method, url.pathname, init.body && JSON.parse(init.body)]);
  assert.deepEqual(sent, [
    ['GET', '/ex/jira/c1/rest/api/3/issue/DEMO-1/transitions', undefined],
    ['POST', '/ex/jira/c1/rest/api/3/issue/DEMO-1/transitions', { transition: { id: '4' } }],
    ['PUT', '/ex/jira/c1/rest/api/3/issue/DEMO-1', { update: { labels: [{ add: 'needs-you' }] } }],
    [
      'POST',
      '/ex/jira/c1/rest/api/3/issue/DEMO-1/comment',
      { body: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Waits for you.' }] }] } },
    ],
  ]);
  assert.ok(calls.slice(1).every(({ init }) => init.headers['Content-Type'] === 'application/json'));
});

test('a transition the account cannot make on the item is an error, and nothing is posted', async () => {
  const { fetch, calls } = fakeFetch([{ body: { transitions: [{ id: '11', name: 'Cancel' }] } }]);
  const client = createJiraClient({ cloudId: 'c1', authorization: 'Bearer x', fetch, write: true });
  await assert.rejects(client.transition('DEMO-1', 'Submit'), /DEMO-1 has no transition "Submit" for this account/);
  assert.equal(calls.length, 1);
});

test('attach uploads one file as multipart form data, with the header Jira asks for on uploads (release-workflow T12)', async () => {
  const { fetch, calls } = fakeFetch([{ body: [{ id: '10500', filename: 'cart.png' }] }]);
  const client = createJiraClient({ cloudId: 'c1', authorization: 'Bearer x', fetch, write: true });
  assert.deepEqual(await client.attach('DEMO-21', 'cart.png', Buffer.from('png bytes')), [{ id: '10500', filename: 'cart.png' }]);
  const [{ url, init }] = calls;
  assert.equal(url.href, 'https://api.atlassian.com/ex/jira/c1/rest/api/3/issue/DEMO-21/attachments');
  assert.equal(init.method, 'POST');
  assert.equal(init.headers['X-Atlassian-Token'], 'no-check');
  assert.equal(init.headers['Content-Type'], undefined, 'fetch sets the multipart boundary itself');
  const file = init.body.get('file');
  assert.equal(file.name, 'cart.png');
  assert.equal(await file.text(), 'png bytes');
});

test('a read-only client refuses to attach, without sending the request', async () => {
  const { fetch, calls } = fakeFetch([]);
  const client = createJiraClient({ cloudId: 'c1', authorization: 'Bearer x', fetch });
  await assert.rejects(client.attach('DEMO-21', 'cart.png', Buffer.from('x')), /read-only/i);
  assert.equal(calls.length, 0);
});
