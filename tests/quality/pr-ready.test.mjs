import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markReadyForReview, READY_PERMISSIONS } from '../../lib/quality/pr-ready.mjs';

// A fake fetch: GET of the PR, then the GraphQL call, answered from `answers`.
function fake({ draft = true, graphql = { data: { markPullRequestReadyForReview: { pullRequest: { number: 15, isDraft: false } } } }, status = 200 } = {}) {
  const calls = [];
  const fetch = async (url, init = {}) => {
    calls.push({ url, method: init.method ?? 'GET', body: init.body ? JSON.parse(init.body) : undefined, auth: init.headers.Authorization });
    if (url.endsWith('/graphql')) return { ok: status === 200, status, json: async () => graphql };
    return { ok: true, status: 200, json: async () => ({ number: 15, draft, node_id: 'PR_kw15' }) };
  };
  return { calls, fetch };
}

test('a draft PR is marked ready through the GraphQL mutation, by its node id, with the token given', async () => {
  const { calls, fetch } = fake();
  assert.equal(await markReadyForReview({ token: 't0k', repo: 'TungPH7/ao-sample', number: 15, fetch }), true);
  assert.deepEqual(calls.map(({ url, method }) => `${method} ${url}`), ['GET https://api.github.com/repos/TungPH7/ao-sample/pulls/15', 'POST https://api.github.com/graphql']);
  assert.match(calls[1].body.query, /markPullRequestReadyForReview\(input: \{ pullRequestId: \$id \}\)/);
  assert.deepEqual(calls[1].body.variables, { id: 'PR_kw15' });
  assert.ok(calls.every(({ auth }) => auth === 'Bearer t0k'));
});

test('a PR that is not a draft is left alone', async () => {
  const { calls, fetch } = fake({ draft: false });
  assert.equal(await markReadyForReview({ token: 't', repo: 'r/p', number: 15, fetch }), false);
  assert.equal(calls.length, 1);
});

test('a refusal of GitHub stops with its message, as T2 met it with pull_requests: write alone', async () => {
  const { fetch } = fake({ graphql: { data: { markPullRequestReadyForReview: null }, errors: [{ type: 'FORBIDDEN', message: 'Resource not accessible by integration' }] } });
  await assert.rejects(markReadyForReview({ token: 't', repo: 'r/p', number: 15, fetch }), /did not mark PR #15 ready: Resource not accessible by integration/);
  const still = fake({ graphql: { data: { markPullRequestReadyForReview: { pullRequest: { number: 15, isDraft: true } } } } });
  await assert.rejects(markReadyForReview({ token: 't', repo: 'r/p', number: 15, fetch: still.fetch }), /still a draft/);
  assert.deepEqual(READY_PERMISSIONS, { pull_requests: 'write', contents: 'write' });
});
