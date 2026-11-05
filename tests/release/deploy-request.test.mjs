import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestDeploy } from '../../lib/release/deploy-request.mjs';

const SHA = 'a'.repeat(40);

// The client of your gh login: GitHub records the login of the token that creates a deployment, and the deployer
// takes a request only from AO_APPROVERS (spec 2.4, T8).
function yourClient() {
  const sent = [];
  return { sent, request: async (method, path, query, body) => (sent.push({ method, path, body }), { id: 78 }) };
}

test('a deployment request is a deployment of the commit, with the payload the deployer reads', async () => {
  const github = yourClient();
  assert.equal(await requestDeploy(github, { sha: SHA, environment: 'production', rollback: true }), 78);
  assert.deepEqual(github.sent, [
    {
      method: 'POST',
      path: '/deployments',
      body: { ref: SHA, environment: 'production', auto_merge: false, required_contexts: [], payload: { ao: 'request', rollback: true }, description: 'ao-step: rollback', production_environment: true, transient_environment: false },
    },
  ]);
  await requestDeploy(github, { sha: SHA, environment: 'development', rollback: false });
  assert.deepEqual([github.sent[1].body.payload, github.sent[1].body.production_environment, github.sent[1].body.description], [{ ao: 'request', rollback: false }, false, 'ao-step: request']);
});

test('only a full commit hash and an environment of the kit make a request', async () => {
  for (const [sha, environment] of [['abc1234', 'production'], [SHA, 'qa'], [`${SHA}\n`, 'staging']]) {
    await assert.rejects(requestDeploy(yourClient(), { sha, environment, rollback: false }), /not a full commit hash|not an environment/);
  }
});
