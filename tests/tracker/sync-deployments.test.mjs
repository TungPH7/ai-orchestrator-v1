import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadContract } from '../../lib/contract.mjs';
import { readMapping } from '../../lib/tracker/mapping.mjs';
import { runSync, syncEvent } from '../../lib/tracker/sync.mjs';
import { fakeJira, jiraIssue, jiraStatus, recordedClient } from '../helpers/jira.mjs';
import { CONTRACT_DIR, ROOT } from '../helpers/kit.mjs';

// release-workflow spec 2.9, 2.10: the deployment events the deployer reports, and what jira-sync makes of them.
const contract = loadContract(CONTRACT_DIR);
const mapping = readMapping(join(ROOT, 'tracker'));
const answers = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/tracker/api/github.json'), 'utf8'));
const event = (environment, state, { id = 55, sha = 'h1', description = 'web /: status 500, expected 200' } = {}) => ({
  action: 'created',
  deployment_status: { state, environment, description, created_at: '2026-11-06T03:00:00Z' },
  deployment: { id, sha, ref: sha, environment, created_at: '2026-11-06T02:58:00Z' },
  repository: { full_name: 'TungPH7/ao-pilot' },
});
const github = (change = () => {}) => {
  const copy = structuredClone(answers);
  copy['/tags'] = [{ name: 'v0.1.1', commit: { sha: 'h1' } }, { name: 'v0.1.0', commit: { sha: 'm0' } }];
  copy['/commits/d21'] = { sha: 'd21', commit: { message: 'feat(cart): remove a line from the cart (DEMO-21)\n\n- feat(cart): add the button (DEMO-21)' } };
  change(copy);
  return recordedClient(copy);
};
const FIELDS = [
  { id: 'customfield_10021', name: 'Flagged' },
  { id: 'customfield_10050', name: 'Found in' },
  { id: 'customfield_10051', name: 'Severity' },
];
const BUG_SEARCH = 'project = "DEMO" AND labels = "ao-deployment-55"';
// The CI account's view of DEMO: issue type names come in its language, with the English name beside them (T1).
const jiraFor = (extra = {}) =>
  fakeJira({
    fields: FIELDS,
    lists: { '/rest/api/3/issue/createmeta/DEMO/issuetypes': [{ id: '10001', name: '故事', untranslatedName: 'Story' }, { id: '10004', name: '缺陷', untranslatedName: 'Bug' }] },
    gets: { '/rest/api/3/project/DEMO/versions': [{ name: 'v0.1.0' }, { name: 'v0.1.1' }] },
    created: { 'POST /rest/api/3/issue': { key: 'DEMO-40' } },
    ...extra,
  });
const run = (payload, jira, gh = github()) => {
  const lines = [];
  return runSync({ event: 'deployment_status', payload, jira, github: gh, contract, mapping, space: 'DEMO', approvers: ['TungPH7'], log: (line) => lines.push(line) }).then((result) => ({ ...result, lines }));
};

test('a failed deployment to Production makes a Bug Critical, Found in Production, with the release as Affects Version', async () => {
  const jira = jiraFor();
  const { lines, failures } = await run(event('production', 'failure'), jira);
  assert.deepEqual(failures, []);
  const [[kind, call, body]] = jira.writes;
  assert.deepEqual([kind, call], ['request', 'POST /rest/api/3/issue']);
  const { description, ...fields } = body.fields;
  assert.deepEqual(fields, {
    project: { key: 'DEMO' },
    issuetype: { id: '10004' },
    summary: 'Smoke test failed on Production at v0.1.1',
    labels: ['ao-deployment-55'],
    customfield_10050: { value: 'Production' },
    customfield_10051: { value: 'Critical' },
    versions: [{ name: 'v0.1.1' }],
  });
  assert.match(JSON.stringify(description), /deployment 55 of h1 to production failed: web \/: status 500, expected 200/);
  assert.deepEqual(lines.slice(-1), ['Made Bug Critical for deployment 55 (v0.1.1); made DEMO-40']);
  assert.deepEqual(jira.searches, [BUG_SEARCH]);
});

test('the same failed deployment reported twice makes one Bug', async () => {
  const jira = jiraFor({ search: { [BUG_SEARCH]: [{ key: 'DEMO-40' }] } });
  const { lines, actions } = await run(event('production', 'failure'), jira);
  assert.deepEqual([actions, jira.writes], [[], []]);
  assert.ok(lines.includes('Kept deployment 55: Bug DEMO-40 was made for it already'), lines.join('\n'));
});

test('a release that is no Fix Version on Jira yet leaves Affects Version empty, and the Bug says so', async () => {
  const jira = jiraFor({ gets: { '/rest/api/3/project/DEMO/versions': [{ name: 'v0.1.0' }] } });
  await run(event('production', 'failure'), jira);
  const { fields } = jira.writes[0][2];
  assert.equal(fields.versions, undefined);
  assert.match(JSON.stringify(fields.description), /v0\.1\.1 is no version of DEMO on Jira/);
});

test('a deployment the deployer refused on Production makes no Bug: the release never ran (spec 2.4)', async () => {
  const jira = jiraFor();
  const { keys, actions } = await run(event('production', 'error', { description: 'the tree of 2222222 has not passed Staging' }), jira);
  assert.deepEqual([keys, actions, jira.writes, jira.searches], [[], [], [], []]);
});

test('a failed or refused deployment to Development or Staging flags the item of the commit, once per deployment', async () => {
  for (const [environment, state, said] of [['development', 'failure', 'failed'], ['staging', 'error', 'was refused']]) {
    const jira = jiraFor({ issues: [jiraIssue({ key: 'DEMO-21', st: jiraStatus('In Review', 'indeterminate') })] });
    const { keys, failures } = await run(event(environment, state, { id: 21, sha: 'd21', description: 'eeeeeee did not pass audit: pushed without a PR' }), jira);
    assert.deepEqual([keys, failures], [['DEMO-21'], []]);
    assert.deepEqual(jira.writes.map(([kind, key]) => `${kind} ${key}`), ['edit DEMO-21', 'comment DEMO-21']);
    assert.equal(jira.writes[1][2], `jira-sync: deployment 21 of d21 to ${environment} ${said}: eeeeeee did not pass audit: pushed without a PR. DEMO-21 is flagged with the label needs-you and waits for you.`);
  }
  const comment = (text) => ({ body: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] } });
  const again = jiraFor({ changelogs: { 'DEMO-21': [comment('jira-sync: deployment 21 of d21 to development failed: x. DEMO-21 is flagged.')] } });
  const { actions } = await run(event('development', 'failure', { id: 21, sha: 'd21' }), again);
  assert.deepEqual([actions, again.writes], [[], []]);
});

test('a successful deployment of a hotfix to Staging sends its Bug to QA (spec 2.8)', async () => {
  const bug = jiraIssue({ key: 'DEMO-11', type: 'Bug', st: jiraStatus('In Review', 'indeterminate') });
  const jira = fakeJira({ issues: [bug], search: { 'project = "DEMO" AND status in ("In Review")': [{ key: 'DEMO-11' }] } });
  const hotfix = (a) => {
    const pr = a['/pulls?direction=desc&sort=created&state=all'].find(({ number }) => number === 4);
    Object.assign(pr.head, { ref: 'hotfix/DEMO-11-cart-total' });
    Object.assign(pr.base, { ref: 'main' });
    a['/pulls/4/reviews'] = [{ user: { login: 'TungPH7' }, state: 'APPROVED', commit_id: 'c4', submitted_at: '2026-11-01T11:00:00Z' }];
    a['/commits/c4/check-runs'] = { total_count: 1, check_runs: [{ name: 'test', status: 'completed', conclusion: 'success' }] };
    a['/commits/c4/status'] = { state: 'pending', total_count: 0, statuses: [] };
    a['/deployments?environment=staging'] = [{ id: 31, sha: 'd31', ref: 'main', environment: 'staging', created_at: '2026-11-01T12:10:00Z' }];
    a['/compare/m4...d31'] = { status: 'ahead', ahead_by: 1, behind_by: 0 };
    a['/deployments/31/statuses'] = [{ state: 'success' }];
  };
  const success = event('staging', 'success', { id: 31, sha: 'd31' });
  const result = await syncEvent({ event: 'deployment_status', payload: success, jira, github: github(hotfix), contract, mapping, space: 'DEMO', approvers: ['TungPH7'] });
  assert.deepEqual(result.failures, []);
  assert.deepEqual(result.actions.map(({ key, transition }) => `${key} ${transition}`), ['DEMO-11 deploy-to-qa']);
});
