import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readGates } from '../../lib/quality/gates.mjs';
import { decideMerge, runMergeGate } from '../../lib/quality/merge-gate.mjs';
import { recordedClient } from '../helpers/jira.mjs';
import { ROOT } from '../helpers/kit.mjs';

const gates = readGates(join(ROOT, 'quality'));
// GitHub's answers for PR #12 of Story DEMO-12, in the shape the REST API gave for ao-pilot PR #2. The ao-dev App opened
// it; the reviewer asked for changes on the first commit; on the head commit, after a merge of develop, the reviewer
// report has only a Low finding, the security report has none, and the approver approved.
const answers = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/quality/api/merge-gate.json'), 'utf8'));
const HEAD = answers['/pulls/12'].head.sha;
const FIRST = answers['/pulls/12/commits'][0].sha;
const BOT = 'tungph7-ao-review[bot]';

// The facts of PR #12 with green CI, after `change` edits a copy.
const facts = (change = () => {}) => {
  const copy = structuredClone(answers);
  const f = {
    pr: copy['/pulls/12'],
    commits: copy['/pulls/12/commits'],
    files: copy['/pulls/12/files'],
    reviews: copy['/pulls/12/reviews'],
    checks: { green: true, failed: false },
    gates,
    apps: { dev: 'tungph7-ao-dev', review: 'tungph7-ao-review' },
    approvers: ['approver'],
  };
  change(f);
  return f;
};
const decide = (change) => decideMerge(facts(change));
const reportOf = (f, role) => f.reviews.findLast(({ body }) => body.includes(`Role: ${role}`));
const approval = (f) => f.reviews.find(({ state }) => state === 'APPROVED');

test('a PR that meets every condition is squashed at its head commit, with the PR title and the headers of its commits', () => {
  assert.deepEqual(decide(), {
    action: 'merge',
    method: 'squash',
    sha: HEAD,
    title: 'feat(auth): add email and password login (DEMO-12)',
    // The merge of develop into the branch is left out; the Sub-task keys stay.
    body: '- feat(auth): add the login endpoint (DEMO-12, DEMO-13)\n- feat(auth): add the login page (DEMO-12, DEMO-14)',
  });
});

test('an approval of an older commit does not count: a push after it needs a new approval', () => {
  assert.deepEqual(decide((f) => (approval(f).commit_id = FIRST)), { action: 'wait', missing: ['approval on head a1b2c3d'] });
  // Only your logins approve, and your latest decision is the one that counts.
  assert.deepEqual(decide((f) => (approval(f).user.login = 'someone')), { action: 'wait', missing: ['approval on head a1b2c3d'] });
  assert.deepEqual(decide((f) => (approval(f).state = 'DISMISSED')), { action: 'wait', missing: ['approval on head a1b2c3d'] });
  assert.deepEqual(decide((f) => (f.approvers = [])), { action: 'wait', missing: ['approval on head a1b2c3d'] });
});

test('without a security report on the head commit, it waits', () => {
  const missing = { action: 'wait', missing: ['security report on head a1b2c3d'] };
  assert.deepEqual(decide((f) => f.reviews.splice(f.reviews.indexOf(reportOf(f, 'security')), 1)), missing);
  // A report of an older commit, or one posted by someone other than the ao-review App, does not count.
  assert.deepEqual(decide((f) => (reportOf(f, 'security').commit_id = FIRST)), missing);
  assert.deepEqual(decide((f) => (reportOf(f, 'security').user.login = 'approver')), missing);
});

test('when the latest report of a role still has a Critical or High finding, it waits', () => {
  const withHigh = (f) => {
    const report = reportOf(f, 'reviewer');
    report.body = report.body.replace('| Low |', '| High |');
  };
  assert.deepEqual(decide(withHigh), { action: 'wait', missing: ['reviewer report on head a1b2c3d without Critical or High findings (1 open)'] });
  // A newer report of the same role on the same commit replaces it.
  const fixedLater = (f) => {
    withHigh(f);
    f.reviews.push({ ...structuredClone(answers['/pulls/12/reviews'][1]), id: 105, submitted_at: '2026-11-02T11:30:00Z' });
  };
  assert.equal(decide(fixedLater).action, 'merge');
});

// Pilot 1, second review of ao-sample PR #13: after a High, security reviews only the new part, and its report on the
// head carries the High of the full report before it.
test('a security report of the new part clears an earlier High only by listing it as Fixed', () => {
  const HIGH = '| Severity | Axis | Where | Finding | Suggested fix |\n|---|---|---|---|---|\n| High | Security | review-tree.mjs:7 | AGENTS.md reaches the review | remove it |';
  const withPart = (earlier) => (f) => {
    const part = reportOf(f, 'security');
    const full = { ...structuredClone(part), id: 90, commit_id: FIRST, submitted_at: '2026-11-02T09:40:00Z', body: part.body.replace('Không có finding.', HIGH) };
    f.reviews.splice(f.reviews.indexOf(part), 0, full);
    part.body = part.body.replace('Role: security\n', `Role: security\nScope: changes since ${FIRST.slice(0, 7)}\n`).replace('## Verdict', `## Earlier findings\n${earlier}\n## Verdict`);
  };
  const EARLIER = '| Severity | Where | Finding | Status |\n|---|---|---|---|\n';
  assert.equal(decide(withPart(`${EARLIER}| High | review-tree.mjs:7 | AGENTS.md reaches the review | Fixed |\n`)).action, 'merge');
  const open = { action: 'wait', missing: ['security report on head a1b2c3d without Critical or High findings (1 open)'] };
  assert.deepEqual(decide(withPart(`${EARLIER}| High | review-tree.mjs:7 | AGENTS.md reaches the review | Open |\n`)), open);
  assert.deepEqual(decide(withPart('Không có finding cũ.\n')), open, 'a report of the new part that leaves the High out');
});

test('a report merge-gate cannot read makes it wait, and says why', () => {
  const unreadable = (f) => {
    const report = reportOf(f, 'security');
    report.body = report.body.replace('Không có finding.', '| Severity | Axis | Where | Finding | Suggested fix |\n|---|---|---|---|---|\n| Critical / High / Medium / Low | <axis> | <file:line> | <...> | <...> |');
  };
  const [gap] = decide(unreadable).missing;
  assert.match(gap, /^readable security report on head a1b2c3d \(finding 1: severity 'Critical \/ High \/ Medium \/ Low'/);
});

test('a PR that changes a protected path is never merged: it needs you, with what is still missing', () => {
  assert.deepEqual(decide((f) => f.files.push({ filename: '.github/workflows/ci.yml', status: 'modified' })), {
    action: 'needs-you',
    paths: ['.github/workflows/ci.yml'],
    missing: [],
  });
  // A file renamed out of a protected path counts by its old name; the project's gates are protected too.
  const renamed = (f) => {
    f.files.push({ filename: 'docs/ci.yml', previous_filename: '.github/workflows/ci.yml', status: 'renamed' });
    f.files.push({ filename: '.ai-orchestrator/quality/gates.yaml', status: 'modified' });
    approval(f).commit_id = FIRST;
  };
  assert.deepEqual(decide(renamed), {
    action: 'needs-you',
    paths: ['.github/workflows/ci.yml', '.ai-orchestrator/quality/gates.yaml'],
    missing: ['approval on head a1b2c3d'],
  });
});

test('a PR you opened, a draft, and a branch that is not of a work item are skipped', () => {
  assert.match(decide((f) => (f.pr.user = { login: 'approver', type: 'User' })).reason, /^opened by approver, not by tungph7-ao-dev/);
  assert.equal(decide((f) => (f.pr.draft = true)).action, 'skip');
  for (const ref of ['release/v1.2.0', 'probe/t3-app-identity', 'feature/login']) {
    assert.deepEqual(decide((f) => (f.pr.head.ref = ref)), { action: 'skip', reason: `${ref} is not the branch of a work item` });
  }
});

test('once the PR is merged, a second run does nothing', () => {
  const merged = (f) => Object.assign(f.pr, { state: 'closed', merged_at: '2026-11-02T11:05:00Z' });
  assert.deepEqual(decide(merged), { action: 'skip', reason: 'the PR is not open' });
});

test('CI, a request for changes, the title, the description, the base branch and a conflict each make it wait', () => {
  const waits = (change) => decide(change).missing;
  assert.deepEqual(waits((f) => (f.checks = { green: false, failed: false })), ['CI green on head a1b2c3d']);
  // A failed check is also part of changes-requested, but CI already says it.
  assert.deepEqual(waits((f) => (f.checks = { green: false, failed: true })), ['CI green on head a1b2c3d']);
  const askedAgain = (f) => f.reviews.push({ ...structuredClone(answers['/pulls/12/reviews'][1]), id: 106, state: 'CHANGES_REQUESTED', submitted_at: '2026-11-02T11:10:00Z' });
  assert.deepEqual(waits(askedAgain), ['answer to the changes requested on head a1b2c3d']);
  assert.deepEqual(waits((f) => (f.pr.title = 'add login')), ['valid title (the header must be type(scope): subject (<KEY>))']);
  assert.deepEqual(waits((f) => (f.pr.body = f.pr.body.replace(/## Risks\n[^\n]*\n/, ''))), ['complete description (Risks: the section is missing)']);
  assert.deepEqual(waits((f) => (f.pr.base.ref = 'main')), ['valid branch (a feature/ branch is cut from develop, not main)']);
  assert.deepEqual(waits((f) => (f.pr.mergeable = false)), ['conflicts with develop resolved']);
  // GitHub works mergeability out in the background; until then the merge call itself refuses a conflict.
  assert.equal(decide((f) => (f.pr.mergeable = null)).action, 'merge');
});

// A run of merge-gate over the recorded repository, after `change` edits a copy of the answers. The writing client
// records each request; `refuse` makes the merge call fail with that HTTP status.
async function runOnce({ change = () => {}, dryRun = false, refuse } = {}) {
  const copy = structuredClone(answers);
  change(copy);
  const sent = [];
  const lines = [];
  let writers = 0;
  const writer = async () => {
    writers += 1;
    return {
      request: async (method, path, query, body) => {
        sent.push({ method, path, body });
        if (refuse) throw Object.assign(new Error(`GitHub ${method} ${path} returned ${refuse.status}: ${refuse.message}`), { status: refuse.status });
        return { merged: true };
      },
    };
  };
  const { failures } = await runMergeGate({
    github: recordedClient(copy),
    mergeClient: writer,
    gates,
    apps: { dev: 'tungph7-ao-dev', review: 'tungph7-ao-review' },
    approvers: ['approver'],
    dryRun,
    log: (line) => lines.push(line),
  });
  return { lines, sent, writers, failures };
}
const SKIPPED_13 = 'Skipped #13: opened by approver, not by tungph7-ao-dev: whoever opened it merges it';
const noApproval = (a) => a['/pulls/12/reviews'].pop();

test('a run merges the PR that meets every condition with the ao-dev App, at its head commit, and skips the PR you opened', async () => {
  const { lines, sent, failures } = await runOnce();
  assert.deepEqual(lines, ['Merged #12: feat(auth): add email and password login (DEMO-12) (squash at a1b2c3d)', SKIPPED_13]);
  assert.deepEqual(sent, [
    {
      method: 'PUT',
      path: '/pulls/12/merge',
      body: {
        sha: HEAD,
        merge_method: 'squash',
        commit_title: 'feat(auth): add email and password login (DEMO-12)',
        commit_message: '- feat(auth): add the login endpoint (DEMO-12, DEMO-13)\n- feat(auth): add the login page (DEMO-12, DEMO-14)',
      },
    },
  ]);
  assert.deepEqual(failures, []);
});

test('a dry run prints the same decisions, and never buys an App token or sends a request', async () => {
  const { lines, writers, sent } = await runOnce({ dryRun: true });
  assert.deepEqual(lines, ['Would merge #12: feat(auth): add email and password login (DEMO-12) (squash at a1b2c3d)', SKIPPED_13]);
  assert.equal(writers, 0);
  assert.deepEqual(sent, []);
});

test('a PR that waits prints what it waits for, the same on every run, and nothing is sent', async () => {
  const first = await runOnce({ change: noApproval });
  const second = await runOnce({ change: noApproval });
  assert.deepEqual(first.lines, ['Waiting #12: approval on head a1b2c3d', SKIPPED_13]);
  assert.deepEqual(second.lines, first.lines);
  assert.deepEqual([first.writers, second.writers], [0, 0]);
});

test('once a PR is merged, the next run does not merge it again', async () => {
  const merged = (a) => a['/pulls?direction=asc&sort=created&state=open'].shift();
  const { lines, sent } = await runOnce({ change: merged });
  assert.deepEqual(lines, [SKIPPED_13]);
  assert.deepEqual(sent, []);
});

test('GitHub refusing the merge because the head moved, or because it cannot merge, is a wait, not a failure', async () => {
  const moved = await runOnce({ refuse: { status: 409, message: '{"message":"Head branch was modified. Review and try the merge again."}' } });
  assert.match(moved.lines[0], /^Waiting #12: GitHub refused the merge at a1b2c3d \(409\): .*Head branch was modified/);
  assert.deepEqual(moved.failures, []);
  const blocked = await runOnce({ refuse: { status: 405, message: '{"message":"Pull Request is not mergeable"}' } });
  assert.match(blocked.lines[0], /^Waiting #12: GitHub refused the merge at a1b2c3d \(405\)/);
  assert.deepEqual(blocked.failures, []);
});

test('any other error is a failure, and the run goes on with the next PR', async () => {
  const { lines, failures } = await runOnce({ refuse: { status: 500, message: 'Server Error' } });
  assert.deepEqual(lines, ['Failed #12: GitHub PUT /pulls/12/merge returned 500: Server Error', SKIPPED_13]);
  assert.deepEqual(failures.map(({ number }) => number), [12]);
});

test('a PR that changes a protected path is left to you, with what it still misses', async () => {
  const touches = (a) => {
    a['/pulls/12/files'].push({ filename: '.github/workflows/ci.yml', status: 'modified' });
    noApproval(a);
  };
  const { lines, writers } = await runOnce({ change: touches });
  assert.deepEqual(lines, [
    'Needs you #12: it changes .github/workflows/ci.yml, so read the diff and merge it yourself (still missing: approval on head a1b2c3d)',
    SKIPPED_13,
  ]);
  assert.equal(writers, 0);
});

test('with no open PR the run says so', async () => {
  const { lines } = await runOnce({ change: (a) => (a['/pulls?direction=asc&sort=created&state=open'] = []) });
  assert.deepEqual(lines, ['No open PR']);
});
