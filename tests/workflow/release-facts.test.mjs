import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { contains, readReleaseFacts, readRunning } from '../../lib/workflow/facts.mjs';
import { readMapping } from '../../lib/tracker/mapping.mjs';
import { fakeJira, recordedClient } from '../helpers/jira.mjs';
import { ROOT } from '../helpers/kit.mjs';

const mapping = readMapping(join(ROOT, 'tracker'));
const sha = (ch) => ch.repeat(40);
const deployment = (id, ch) => ({ id, sha: sha(ch), environment: 'x', created_at: '2026-11-06T03:00:00Z' });
const latest = (state, url) => [{ state, ...(url && { environment_url: url }) }];

// GitHub as the deployer leaves it (release-workflow spec 2.5): on Development a newer deploy failed its smoke test, so
// the one before still runs; Staging has no deployment yet; on Production a deploy is under way over v0.1.0.
const answers = {
  '/deployments?environment=development&per_page=30': [deployment(3, 'c'), deployment(2, 'b'), deployment(1, 'a')],
  '/deployments/3/statuses?per_page=1': latest('failure'),
  '/deployments/2/statuses?per_page=1': latest('success', 'https://pilot-dev.ao.t2g.io.vn'),
  '/deployments?environment=staging&per_page=30': [],
  '/deployments?environment=production&per_page=30': [deployment(9, 'e'), deployment(8, 'd')],
  '/deployments/9/statuses?per_page=1': latest('in_progress'),
  '/deployments/8/statuses?per_page=1': latest('success', 'https://pilot.ao.t2g.io.vn'),
  [`/compare/${sha('a')}...${sha('b')}`]: { status: 'ahead', ahead_by: 1 },
  [`/compare/${sha('c')}...${sha('b')}`]: { status: 'behind', ahead_by: 0 },
  '/git/matching-refs/heads/release/': [
    { ref: 'refs/heads/release/v0.2.0', object: { sha: sha('f') } },
    { ref: 'refs/heads/release/v0.1.0', object: { sha: sha('d') } },
    { ref: 'refs/heads/release/0.1.0', object: { sha: sha('9') } },
  ],
  [`/compare/main...${sha('f')}`]: { status: 'ahead', ahead_by: 3 },
  [`/compare/main...${sha('d')}`]: { status: 'behind', ahead_by: 0 },
  '/tags': [{ name: 'v0.1.0', commit: { sha: sha('d') } }],
};
const github = recordedClient(answers);

test('the release running in each environment is the newest deployment whose latest status is success', async () => {
  assert.deepEqual(await readRunning(github, mapping), {
    development: { sha: sha('b'), deployment: 2, url: 'https://pilot-dev.ao.t2g.io.vn' },
    staging: null,
    production: { sha: sha('d'), deployment: 8, url: 'https://pilot.ao.t2g.io.vn' },
  });
});

test('a running release contains a merge commit when it is that commit or comes after it', async () => {
  assert.equal(await contains(github, sha('b'), sha('b')), true);
  assert.equal(await contains(github, sha('b'), sha('a')), true);
  assert.equal(await contains(github, sha('b'), sha('c')), false);
});

test('the release facts: what runs where, the release branches not merged into main, the tags, the Fix Versions on Jira', async () => {
  const jira = fakeJira({ gets: { '/rest/api/3/project/DEMO/versions': [{ id: '1', name: 'v0.1.0', released: true }, { id: '2', name: 'v0.2.0', released: false }] } });
  const facts = await readReleaseFacts({ github, jira, mapping, space: 'DEMO' });
  assert.equal(facts.running.staging, null);
  // release/v0.1.0 is merged into main already; release/0.1.0 is not a release branch of the conventions.
  assert.deepEqual(facts.releaseBranches, [{ name: 'release/v0.2.0', version: '0.2.0', sha: sha('f') }]);
  assert.deepEqual(facts.tags, [{ name: 'v0.1.0', sha: sha('d') }]);
  assert.deepEqual(facts.versions, [{ name: 'v0.1.0', released: true }, { name: 'v0.2.0', released: false }]);
});

test('a repository without release branches answers an empty list', async () => {
  const empty = recordedClient({ ...answers, '/git/matching-refs/heads/release/': [] });
  const jira = fakeJira({ gets: { '/rest/api/3/project/DEMO/versions': [] } });
  assert.deepEqual((await readReleaseFacts({ github: empty, jira, mapping, space: 'DEMO' })).releaseBranches, []);
});

test('the QA facts of an item: the QA environment of its route, the release that runs there, and whether it holds the merge', async () => {
  const { readContract } = await import('../../lib/contract.mjs');
  const { CONTRACT_DIR } = await import('../helpers/kit.mjs');
  const { readQaFacts } = await import('../../lib/workflow/facts.mjs');
  const contract = readContract(CONTRACT_DIR);
  // New work merges into develop and is tested on Development; a hotfix merges into main and is tested on Staging.
  assert.deepEqual(await readQaFacts(github, { base: 'develop', mergeCommit: sha('a') }, { contract, mapping }), {
    environment: 'development',
    running: { sha: sha('b'), deployment: 2, url: 'https://pilot-dev.ao.t2g.io.vn' },
    contains: true,
  });
  assert.deepEqual(await readQaFacts(github, { base: 'main', mergeCommit: sha('a') }, { contract, mapping }), { environment: 'staging', running: null, contains: false });
});
