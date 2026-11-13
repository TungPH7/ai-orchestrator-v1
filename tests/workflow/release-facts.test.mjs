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
const latest = (state, url, login = 'tungph7-ao-deploy[bot]') => [{ state, creator: { login }, ...(url && { environment_url: url }) }];

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
  // project.yaml at what runs (project-scaffold part 2, spec 2.4): none at b, as before part 2.
  [`/contents/.ai-orchestrator/project.yaml?ref=${sha('b')}`]: { $status: 404 },
};
const github = recordedClient(answers);

test('the release running in each environment is the newest deployment whose latest status is success', async () => {
  assert.deepEqual(await readRunning(github, mapping), {
    development: { sha: sha('b'), deployment: 2, url: 'https://pilot-dev.ao.t2g.io.vn' },
    staging: null,
    production: { sha: sha('d'), deployment: 8, url: 'https://pilot.ao.t2g.io.vn' },
  });
});

test('only a success status the deployer wrote counts: another writer could point qa, and its basic auth, at any URL', async () => {
  const forged = recordedClient({
    ...answers,
    '/deployments?environment=development&per_page=30': [deployment(5, 'e'), deployment(4, 'f'), deployment(2, 'b')],
    '/deployments/5/statuses?per_page=1': latest('success', 'https://evil.example', 'tungph7-ao-dev[bot]'),
    '/deployments/4/statuses?per_page=1': latest('success', 'https://evil.example', 'TungPH7'),
  });
  assert.deepEqual((await readRunning(forged, mapping)).development, { sha: sha('b'), deployment: 2, url: 'https://pilot-dev.ao.t2g.io.vn' });
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
    running: { sha: sha('b'), deployment: 2, url: 'https://pilot-dev.ao.t2g.io.vn', projectText: null },
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

test('the cut facts leave the key of an Epic out of the release: its spec commit does not hold the cut point', async () => {
  const { readContract } = await import('../../lib/contract.mjs');
  const { CONTRACT_DIR } = await import('../helpers/kit.mjs');
  const { readCutFacts } = await import('../../lib/workflow/facts.mjs');
  const issue = (key, type, status, category) => ({ key, fields: { issuetype: { name: type }, status: { name: status, statusCategory: { key: category } }, fixVersions: [] } });
  const jira = fakeJira({
    issues: [issue('DEMO-20', 'Epic', 'In Progress', 'indeterminate'), issue('DEMO-21', 'Story', 'Done', 'done')],
    gets: { '/rest/api/3/project/DEMO/versions': [] },
  });
  const history = async () => [`${sha('1')}\tdocs(spec): remove a line (DEMO-20)`, `${sha('2')}\tfeat(cart): remove a line (DEMO-21)`].join('\n');
  const facts = await readCutFacts({ jira, deploys: github, history, contract: readContract(CONTRACT_DIR), mapping, space: 'DEMO' });
  assert.equal(facts.cut.sha, sha('2'));
  assert.deepEqual(facts.included.map(({ key }) => key), ['DEMO-21']);
  assert.deepEqual(facts.after, []);
  assert.deepEqual(facts.cancelled, []);
});

test('the cut facts let the commits of a Cancelled item go out with the release, and list the item apart', async () => {
  const { readContract } = await import('../../lib/contract.mjs');
  const { CONTRACT_DIR } = await import('../helpers/kit.mjs');
  const { readCutFacts } = await import('../../lib/workflow/facts.mjs');
  const issue = (key, status, category) => ({ key, fields: { issuetype: { name: 'Task' }, status: { name: status, statusCategory: { key: category } }, fixVersions: [] } });
  const jira = fakeJira({
    issues: [issue('DEMO-1', 'Cancelled', 'done'), issue('DEMO-4', 'Done', 'done')],
    gets: { '/rest/api/3/project/DEMO/versions': [] },
  });
  const history = async () => [`${sha('1')}\tchore(repo): scaffold the app (DEMO-1)`, `${sha('2')}\tfeat(api): one error shape (DEMO-4)`].join('\n');
  const facts = await readCutFacts({ jira, deploys: github, history, contract: readContract(CONTRACT_DIR), mapping, space: 'DEMO' });
  assert.equal(facts.cut.sha, sha('2'));
  assert.deepEqual(facts.included.map(({ key }) => key), ['DEMO-4']);
  assert.deepEqual(facts.cancelled, [{ key: 'DEMO-1', state: 'cancelled', status: 'Cancelled', fixVersions: [] }]);
});

test('the ship facts: the release branch, what Staging runs, the open Bugs Critical and High, the regression on record, the notes and the PR', async () => {
  const { readContract } = await import('../../lib/contract.mjs');
  const { CONTRACT_DIR } = await import('../helpers/kit.mjs');
  const { readShipFacts } = await import('../../lib/workflow/facts.mjs');
  const contract = readContract(CONTRACT_DIR);
  const ship = recordedClient({
    ...answers,
    '/deployments?environment=staging&per_page=30': [deployment(41, 'f')],
    '/deployments/41/statuses?per_page=1': latest('success', 'https://pilot-staging.ao.t2g.io.vn'),
    [`/compare/${sha('e')}...${sha('f')}`]: { status: 'ahead', files: [{ filename: 'CHANGELOG.md' }, { filename: 'docs/releases/v0.2.0.md', previous_filename: 'docs/releases/draft.md' }] },
    '/pulls?base=main&state=open': [{ number: 30, head: { ref: 'release/v0.2.0', sha: sha('f') } }, { number: 31, head: { ref: 'hotfix/DEMO-40-x', sha: sha('1') } }],
    [`/contents/.ai-orchestrator/project.yaml?ref=${sha('f')}`]: { content: Buffer.from('name: pilot\n').toString('base64'), encoding: 'base64' },
  });
  const severity = (name) => `project = "DEMO" AND issuetype = "Bug" AND fixVersion = "v0.2.0" AND statusCategory != Done AND "Severity" = "${name}"`;
  const jira = fakeJira({ gets: { '/rest/api/3/project/DEMO/versions': [] }, search: { [severity('High')]: [{ key: 'DEMO-30' }] } });
  const files = { 'regression-report.md': '## Regression Result\n\nResult: PASS\n', 'changelog.md': '## v0.2.0', 'pr-description.md': 'x', 'fix-version.md': 'y' };
  const local = { runState: () => ({ runs: [{ purpose: 'regression', outcome: 'done', qa: { sha: sha('e') } }] }), runFile: (key, name) => (key === 'v0.2.0' ? (files[name] ?? null) : null) };
  const facts = await readShipFacts({ jira, github: ship, deploys: ship, local, contract, mapping, space: 'DEMO', version: 'v0.2.0' });
  assert.deepEqual(facts.branch, { name: 'release/v0.2.0', version: '0.2.0', sha: sha('f') });
  assert.equal(facts.staging.sha, sha('f'));
  assert.equal(facts.staging.projectText, 'name: pilot\n');
  assert.deepEqual(facts.bugs, [{ key: 'DEMO-30', severity: 'High' }]);
  assert.deepEqual(facts.regression, { sha: sha('e'), result: 'PASS' });
  assert.deepEqual(facts.changedSinceRegression, ['CHANGELOG.md', 'docs/releases/draft.md', 'docs/releases/v0.2.0.md']);
  assert.equal(facts.notes, true);
  assert.deepEqual(facts.pr, { number: 30, headSha: sha('f') });
  // Notes written before the newest regression are stale: the release may hold more since (T21, Bug DEMO-27).
  const runs = [
    { purpose: 'regression', outcome: 'done', qa: { sha: sha('d') } },
    { purpose: 'release-notes', outcome: 'done' },
    { purpose: 'regression', outcome: 'done', qa: { sha: sha('e') } },
  ];
  const stale = await readShipFacts({ jira, github: ship, deploys: ship, local: { ...local, runState: () => ({ runs }) }, contract, mapping, space: 'DEMO', version: 'v0.2.0' });
  assert.equal(stale.notes, false);
  const fresh = await readShipFacts({ jira, github: ship, deploys: ship, local: { ...local, runState: () => ({ runs: [...runs, { purpose: 'release-notes', outcome: 'done' }] }) }, contract, mapping, space: 'DEMO', version: 'v0.2.0' });
  assert.equal(fresh.notes, true);
});

test('the hotfix facts: the release on Production and its next patch, the merge at the head of main, its Bug, the tag and the request', async () => {
  const { readContract } = await import('../../lib/contract.mjs');
  const { CONTRACT_DIR } = await import('../helpers/kit.mjs');
  const { readHotfixFacts } = await import('../../lib/workflow/facts.mjs');
  const contract = readContract(CONTRACT_DIR);
  const hot = recordedClient({
    ...answers,
    '/git/ref/heads/main': { object: { sha: sha('7') } },
    [`/commits/${sha('7')}/pulls`]: [{ number: 31, merged_at: '2026-11-06T05:00:00Z', merge_commit_sha: sha('7'), head: { ref: 'hotfix/DEMO-40-cart-total' } }],
    '/deployments?environment=staging&per_page=30': [deployment(50, '7')],
    '/deployments/50/statuses?per_page=1': latest('success', 'https://pilot-staging.ao.t2g.io.vn'),
  });
  const bug = { key: 'DEMO-40', fields: { issuetype: { name: 'Bug' }, status: { name: 'Done' }, fixVersions: [{ name: 'v0.1.1' }] } };
  const jira = fakeJira({ issues: [bug], gets: { '/rest/api/3/project/DEMO/versions': [] } });
  const facts = await readHotfixFacts({ jira, github: hot, deploys: hot, contract, mapping, space: 'DEMO', version: 'v0.1.1' });
  // Production runs d…, which the tag v0.1.0 names.
  assert.deepEqual([facts.production, facts.expected], [{ sha: sha('d'), version: 'v0.1.0' }, 'v0.1.1']);
  assert.deepEqual(facts.main, { sha: sha('7'), pull: { number: 31, head: 'hotfix/DEMO-40-cart-total', key: 'DEMO-40' } });
  assert.deepEqual(facts.bug, { key: 'DEMO-40', state: 'done', status: 'Done', fixVersions: ['v0.1.1'] });
  assert.deepEqual([facts.staging.sha, facts.tag, facts.request], [sha('7'), null, null]);
});

test('the rollback facts: what runs, the releases that ran there before, the commit you name, and a request not handled yet', async () => {
  const { readRollbackFacts } = await import('../../lib/workflow/facts.mjs');
  const back = recordedClient({
    '/deployments?environment=production&per_page=30': [
      { id: 12, sha: sha('9'), payload: { ao: 'request', rollback: true } },
      { id: 11, sha: sha('3'), payload: { ao: 'deploy' } },
      { id: 10, sha: sha('2'), payload: { ao: 'deploy' } },
      { id: 9, sha: sha('1'), payload: { ao: 'deploy' } },
    ],
    '/deployments/12/statuses?per_page=30': [],
    '/deployments/11/statuses?per_page=30': [{ state: 'success' }, { state: 'in_progress' }],
    '/deployments/10/statuses?per_page=30': [{ state: 'failure' }, { state: 'in_progress' }],
    '/deployments/9/statuses?per_page=30': [{ state: 'inactive' }, { state: 'success' }],
    '/commits/1111111': { sha: sha('1') },
  });
  const facts = await readRollbackFacts({ deploys: back, mapping, environment: 'production', extra: '1111111' });
  assert.deepEqual(facts, { environment: 'production', running: { sha: sha('3'), deployment: 11 }, earlier: [{ sha: sha('1'), deployment: 9 }], target: { sha: sha('1') }, requested: { id: 12, sha: sha('9') } });
});
