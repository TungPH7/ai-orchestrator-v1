import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadContract } from '../../lib/contract.mjs';
import { readMapping } from '../../lib/tracker/mapping.mjs';
import { changesRequestedOn, githubGuards, lastDecision, readChecks } from '../../lib/tracker/facts.mjs';
import { recordedClient } from '../helpers/jira.mjs';
import { CONTRACT_DIR, ROOT } from '../helpers/kit.mjs';

const contract = loadContract(CONTRACT_DIR);
const mapping = readMapping(join(ROOT, 'tracker'));
// GitHub answers in the shape of the REST API for a repository where DEMO-12 failed QA once: PR #3 from
// feature/DEMO-12-login was merged, and PR #5 from feature/DEMO-12-login-r2 is open. DEMO-11 (PR #4) is merged and
// deployed to development.
const answers = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/tracker/api/github.json'), 'utf8'));

// An item as readItem returns it.
const item = (key, { type = 'Story', parent = null, blockedBy = [] } = {}) => ({ key, type, status: 'In Progress', labels: [], description: 'x', parent, subtasks: [], blockedBy });
const holds = async (it, needed, { change = () => {}, approvers = ['TungPH7'] } = {}) => {
  const copy = structuredClone(answers);
  change(copy);
  return githubGuards(recordedClient(copy), { item: it, needed, contract, mapping, approvers });
};
const pulls = (a) => a['/pulls?direction=desc&sort=created&state=all'];
const pr = (a, number) => pulls(a).find((p) => p.number === number);

test('branch-created: a branch with the item key and the prefix of its work type', async () => {
  assert.deepEqual(await holds(item('DEMO-12'), ['branch-created']), ['branch-created']);
  assert.deepEqual(await holds(item('DEMO-12', { type: 'Bug' }), ['branch-created']), []);
  assert.deepEqual(
    await holds(item('DEMO-12'), ['branch-created'], { change: (a) => (a['/git/matching-refs/heads/feature/DEMO-12-'] = []) }),
    [],
  );
});

test('pr-open and pr-merged look at the newest PR of the item only', async () => {
  // PR #3 of the first round is merged, but PR #5 after qa-fail is the one that counts.
  assert.deepEqual(await holds(item('DEMO-12'), ['pr-open', 'pr-merged']), ['pr-open']);
  assert.deepEqual(
    await holds(item('DEMO-12'), ['pr-open', 'pr-merged'], {
      change: (a) => Object.assign(pr(a, 5), { state: 'closed', merged_at: '2026-11-02T12:00:00Z', merge_commit_sha: 'm5' }),
    }),
    ['pr-merged'],
  );
  assert.deepEqual(await holds(item('DEMO-99'), ['pr-open', 'pr-merged']), []);
});

test('pr-open needs the base branch of the work type', async () => {
  assert.deepEqual(await holds(item('DEMO-12'), ['pr-open'], { change: (a) => (pr(a, 5).base.ref = 'main') }), []);
});

test('ci-green: every check run of the newest commit succeeded or was skipped, and no commit status failed', async () => {
  assert.deepEqual(await holds(item('DEMO-12'), ['ci-green']), ['ci-green']);
  const runs = (a) => a['/commits/c5/check-runs'].check_runs;
  assert.deepEqual(await holds(item('DEMO-12'), ['ci-green'], { change: (a) => (runs(a)[0].conclusion = 'failure') }), []);
  assert.deepEqual(await holds(item('DEMO-12'), ['ci-green'], { change: (a) => Object.assign(runs(a)[0], { status: 'in_progress', conclusion: null }) }), []);
  assert.deepEqual(
    await holds(item('DEMO-12'), ['ci-green'], { change: (a) => (a['/commits/c5/status'] = { state: 'failure', total_count: 1, statuses: [{}] }) }),
    [],
  );
  // No check at all is not green.
  assert.deepEqual(
    await holds(item('DEMO-12'), ['ci-green'], { change: (a) => (a['/commits/c5/check-runs'] = { total_count: 0, check_runs: [] }) }),
    [],
  );
});

test('the check run of jira-sync itself is not CI: running or failed, it changes neither ci-green nor changes-requested', async () => {
  // jira-sync runs on pull_request too, so its own job is a check run on the PR head (found in T18).
  for (const own of [{ status: 'in_progress', conclusion: null }, { status: 'completed', conclusion: 'failure' }]) {
    const withOwn = (a) => a['/commits/c5/check-runs'].check_runs.push({ name: 'jira-sync', ...own });
    assert.deepEqual(await holds(item('DEMO-12'), ['ci-green', 'changes-requested'], { change: withOwn }), ['ci-green']);
  }
  // With only its own check, the commit has no CI yet.
  const onlyOwn = (a) => (a['/commits/c5/check-runs'] = { total_count: 1, check_runs: [{ name: 'jira-sync', status: 'completed', conclusion: 'success' }] });
  assert.deepEqual(await holds(item('DEMO-12'), ['ci-green'], { change: onlyOwn }), []);
});

test('changes-requested: the latest review that decides asks for changes, or a check failed', async () => {
  const reviews = (a) => a['/pulls/5/reviews'];
  // The approval after the request for changes wins; comments do not decide.
  assert.deepEqual(await holds(item('DEMO-12'), ['changes-requested']), []);
  assert.deepEqual(await holds(item('DEMO-12'), ['changes-requested'], { change: (a) => reviews(a).pop() }), ['changes-requested']);
  assert.deepEqual(
    await holds(item('DEMO-12'), ['changes-requested'], { change: (a) => (a['/commits/c5/check-runs'].check_runs[0].conclusion = 'failure') }),
    ['changes-requested'],
  );
});

test('changes-requested: a push after the request answers it, so a review of an older commit no longer counts', async () => {
  // Without this, jira-sync would submit the fixed PR and then send it back for the old request, again and again.
  const older = (a) => {
    a['/pulls/5/reviews'].pop();
    a['/pulls/5/reviews'][0].commit_id = 'c4';
  };
  assert.deepEqual(await holds(item('DEMO-12'), ['changes-requested'], { change: older }), []);
  const failedOnHead = (a) => {
    older(a);
    a['/commits/c5/check-runs'].check_runs[0].conclusion = 'failure';
  };
  assert.deepEqual(await holds(item('DEMO-12'), ['changes-requested'], { change: failedOnHead }), ['changes-requested']);
});

test('merge-approved: one of the approvers approved, and did not ask for changes after', async () => {
  assert.deepEqual(await holds(item('DEMO-12'), ['merge-approved']), ['merge-approved']);
  assert.deepEqual(await holds(item('DEMO-12'), ['merge-approved'], { approvers: ['someone-else'] }), []);
  assert.deepEqual(await holds(item('DEMO-12'), ['merge-approved'], { approvers: [] }), []);
  assert.deepEqual(
    await holds(item('DEMO-12'), ['merge-approved'], {
      change: (a) => a['/pulls/5/reviews'].push({ user: { login: 'TungPH7' }, state: 'CHANGES_REQUESTED', submitted_at: '2026-11-02T12:00:00Z' }),
    }),
    [],
  );
});

test('qa-deployed: a successful deployment to the QA environment of the base branch contains the merge commit', async () => {
  assert.deepEqual(await holds(item('DEMO-11'), ['qa-deployed']), ['qa-deployed']);
  assert.deepEqual(
    await holds(item('DEMO-11'), ['qa-deployed'], { change: (a) => (a['/deployments/21/statuses'][0].state = 'failure') }),
    [],
  );
  assert.deepEqual(await holds(item('DEMO-11'), ['qa-deployed'], { change: (a) => (a['/compare/m4...d21'].status = 'behind') }), []);
  // Not merged yet: nothing to deploy.
  assert.deepEqual(await holds(item('DEMO-12'), ['qa-deployed']), []);
});

test('dependencies-merged: the newest PR of every blocking item is merged', async () => {
  assert.deepEqual(await holds(item('DEMO-15'), ['dependencies-merged']), ['dependencies-merged']);
  assert.deepEqual(await holds(item('DEMO-15', { blockedBy: ['DEMO-11'] }), ['dependencies-merged']), ['dependencies-merged']);
  assert.deepEqual(await holds(item('DEMO-15', { blockedBy: ['DEMO-11', 'DEMO-12'] }), ['dependencies-merged']), []);
});

test('work-committed: the branch of the parent Story has a commit with the Sub-task key', async () => {
  const subtask = (key) => item(key, { type: 'Sub-task', parent: { key: 'DEMO-12', type: 'Story', status: 'In Progress' } });
  assert.deepEqual(await holds(subtask('DEMO-13'), ['work-committed']), ['work-committed']);
  assert.deepEqual(await holds(subtask('DEMO-14'), ['work-committed']), ['work-committed']);
  assert.deepEqual(await holds(subtask('DEMO-16'), ['work-committed']), []);
  // The body of a commit does not count, only its header.
  assert.deepEqual(
    await holds(subtask('DEMO-13'), ['work-committed'], {
      change: (a) => (a['/commits?per_page=100&sha=feature/DEMO-12-login-r2'][1].commit.message = 'feat(auth): add the login form (DEMO-12)\n\nPart of DEMO-13.'),
    }),
    [],
  );
});

test('guards from other sources are left out, and the PR list is read once', async () => {
  let calls = 0;
  const client = recordedClient(answers);
  const getAll = client.getAll;
  client.getAll = (path, ...rest) => {
    if (path === '/pulls') calls += 1;
    return getAll(path, ...rest);
  };
  const result = await githubGuards(client, { item: item('DEMO-12'), needed: ['wip-available', 'pr-open', 'pr-merged', 'ci-green'], contract, mapping, approvers: [] });
  assert.deepEqual(result, ['pr-open', 'ci-green']);
  assert.equal(calls, 1);
});

test('merge-gate shares the reading of checks and reviews: readChecks, the latest deciding review, changes requested on a commit', async () => {
  assert.deepEqual(await readChecks(recordedClient(answers), 'c5'), { green: true, failed: false });
  const reviews = [
    { user: { login: 'TungPH7' }, state: 'CHANGES_REQUESTED', commit_id: 'c4' },
    { user: { login: 'reviewer-bot' }, state: 'COMMENTED', commit_id: 'c5' },
    { user: { login: 'TungPH7' }, state: 'APPROVED', commit_id: 'c5' },
  ];
  assert.equal(lastDecision(reviews), reviews[2]);
  assert.equal(lastDecision(reviews, 'reviewer-bot'), undefined);
  assert.equal(changesRequestedOn(reviews, 'c4'), true);
  assert.equal(changesRequestedOn(reviews, 'c5'), false);
});
