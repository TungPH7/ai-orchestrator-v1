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

test('the cut facts: the history of develop since the newest tag, the state of each item it names, and the cut point', async () => {
  const { readContract } = await import('../../lib/contract.mjs');
  const { CONTRACT_DIR } = await import('../helpers/kit.mjs');
  const { readCutFacts } = await import('../../lib/workflow/facts.mjs');
  const contract = readContract(CONTRACT_DIR);
  const issue = (key, status, category, fixVersions = []) => ({ key, fields: { issuetype: { name: 'Story' }, status: { name: status, statusCategory: { key: category } }, fixVersions: fixVersions.map((name) => ({ name })) } });
  const jira = fakeJira({
    issues: [issue('DEMO-12', 'Done', 'done'), issue('DEMO-21', 'Done', 'done'), issue('DEMO-24', 'In Review', 'indeterminate', ['v0.2.0'])],
    gets: { '/rest/api/3/project/DEMO/versions': [{ name: 'v0.2.0', released: false }, { name: 'v0.3.0', released: false }] },
  });
  const asked = [];
  const history = async (tag) => {
    asked.push(tag);
    return [`${sha('1')}\tfeat(cart): add a line (DEMO-12)`, `${sha('2')}\tfeat(cart): remove a line (DEMO-21)`, `${sha('3')}\tfeat(cart): coupon (DEMO-24)`, `${sha('4')}\tdocs: typo (DEMO-99)`].join('\n');
  };
  const facts = await readCutFacts({ jira, deploys: github, history, contract, mapping, space: 'DEMO' });
  assert.deepEqual(asked, ['v0.1.0'], 'the history starts at the newest tag');
  assert.deepEqual({ latestTag: facts.latestTag, version: facts.version, commits: facts.commits }, { latestTag: 'v0.1.0', version: 'v0.2.0', commits: 4 });
  assert.deepEqual(facts.cut, { sha: sha('2'), subject: 'feat(cart): remove a line (DEMO-21)', keys: ['DEMO-21'] });
  assert.deepEqual(facts.included.map(({ key, status }) => `${key} ${status}`), ['DEMO-12 Done', 'DEMO-21 Done']);
  // An item Jira does not know, such as one moved to another space, holds the cut point back like any item not Done.
  assert.deepEqual(facts.after, [
    { key: 'DEMO-24', state: 'in-review', status: 'In Review', fixVersions: ['v0.2.0'] },
    { key: 'DEMO-99', state: null, status: 'not on Jira', fixVersions: [] },
  ]);
  assert.deepEqual(facts.releaseBranches.map(({ name }) => name), ['release/v0.2.0']);
});
