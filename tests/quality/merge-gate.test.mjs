import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readGates } from '../../lib/quality/gates.mjs';
import { decideMerge, readReleasePulls, reviewChoiceOf, reviewRolesNeeded, runMergeGate, waiverLabel } from '../../lib/quality/merge-gate.mjs';
import { markBody, skipBody } from '../../lib/quality/review-choice.mjs';
import { findingId, readReviewReport } from '../../lib/quality/pull-request.mjs';
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
    apps: { dev: 'tungph7-ao-dev', review: 'tungph7-ao-review', merge: 'tungph7-ao-merge' },
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

// On Windows (NTFS) a checkout writes .Claude/rules/x.md into .claude/rules/, so a protected path in another case is the
// protected path itself (live-run-fixes spec 2.9).
test('a protected path in another case is a protected path: the PR is yours to merge', () => {
  const cased = (f) => {
    f.files.push({ filename: '.Claude/settings.json', status: 'added' });
    f.files.push({ filename: '.GitHub/Workflows/ci.yml', status: 'added' });
  };
  assert.deepEqual(decide(cased), { action: 'needs-you', paths: ['.Claude/settings.json', '.GitHub/Workflows/ci.yml'], missing: [] });
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
// `auditMain` audits the commits a merge back brings from main: by default each passes; null gives merge-gate none.
const passAll = async (pr) => [{ sha: pr.head.sha, ok: true, problems: [] }];
async function runOnce({ change = () => {}, dryRun = false, refuse, reply = () => ({ merged: true }), auditMain = passAll, waitQa } = {}) {
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
        return reply(method, path);
      },
    };
  };
  const { failures } = await runMergeGate({
    github: recordedClient(copy),
    mergeClient: writer,
    gates,
    apps: { dev: 'tungph7-ao-dev', review: 'tungph7-ao-review', merge: 'tungph7-ao-merge' },
    approvers: ['approver'],
    dryRun,
    ...(auditMain && { auditMain }),
    ...(waitQa && { waitQa: (pr) => waitQa(pr, copy) }),
    log: (line) => lines.push(line),
  });
  return { lines, sent, writers, failures };
}
const SKIPPED_13 = 'Skipped #13: opened by approver, not by tungph7-ao-dev: whoever opened it merges it';

// C2 spec section 9: before a merge, merge-gate waits while qa tests the commit the merge builds on (waitQa waits, and
// resolves null once free, or the reason it gave up); the PR then waits for the next run.
test('merge-gate merges once the QA on the base has ended, and leaves the PR to the next run when it gave up waiting', async () => {
  const asked = [];
  const free = await runOnce({ waitQa: async (pr) => (asked.push(pr.base.ref), null) });
  assert.deepEqual(asked, ['develop']);
  assert.deepEqual(free.sent.map(({ path }) => path), ['/pulls/12/merge']);
  const held = await runOnce({ waitQa: async () => 'qa tests DEMO-21 on development, still after 100 minutes' });
  assert.deepEqual(held.sent, []);
  assert.deepEqual(held.lines, ['Waiting #12: qa tests DEMO-21 on development, still after 100 minutes', SKIPPED_13]);
  // A dry run waits for nothing.
  const dry = await runOnce({ dryRun: true, waitQa: async () => assert.fail('a dry run waited') });
  assert.match(dry.lines[0], /^Would merge #12/);
});
const noApproval = (a) => a['/pulls/12/reviews'].pop();

// Review of shop PR #80 (security, Medium): the wait may last 100 minutes, and you may ask for changes or dismiss your
// approval meanwhile. merge-gate reads the PR and decides again after it, as it does before.
test('after waiting for QA merge-gate decides again: an approval dismissed or changes asked meanwhile hold the merge', async () => {
  const meanwhile = (change) => async (pr, copy) => (change(copy['/pulls/12/reviews']), null);
  const asked = await runOnce({ waitQa: meanwhile((reviews) => reviews.push({ ...structuredClone(reviews[3]), id: 105, state: 'CHANGES_REQUESTED', submitted_at: '2026-11-02T11:30:00Z' })) });
  assert.deepEqual(asked.sent, [], 'changes asked during the wait');
  assert.match(asked.lines[0], /^Waiting #12: /);
  const dismissed = await runOnce({ waitQa: meanwhile((reviews) => (reviews[3].state = 'DISMISSED')) });
  assert.deepEqual(dismissed.sent, [], 'the approval dismissed during the wait');
  assert.match(dismissed.lines[0], /^Waiting #12: /);
  const unchanged = await runOnce({ waitQa: meanwhile(() => {}) });
  assert.deepEqual(unchanged.sent.map(({ path }) => path), ['/pulls/12/merge']);
});

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

// Review round 2 of shop PR #13 (Pilot 3, spec 2.9): the merge call pins the head, not the base, so merge-gate reads the
// PR again right before it merges, and leaves it to the next run when its base or its head moved in between.
test('a PR whose base or head changed after merge-gate read it is left for the next run, and nothing is merged', async () => {
  for (const [what, change] of [['base', (pr) => (pr.base.ref = 'main')], ['head', (pr) => (pr.head.sha = 'b'.repeat(40))]]) {
    const recorded = recordedClient(structuredClone(answers));
    let reads = 0;
    const github = {
      ...recorded,
      get: async (path, query) => {
        const answer = await recorded.get(path, query);
        if (path === '/pulls/12' && ++reads > 1) change(answer);
        return answer;
      },
    };
    const sent = [];
    const lines = [];
    const writer = async () => ({ request: async (method, path) => (sent.push(`${method} ${path}`), { merged: true }) });
    await runMergeGate({ github, mergeClient: writer, gates, apps: { dev: 'tungph7-ao-dev', review: 'tungph7-ao-review', merge: 'tungph7-ao-merge' }, approvers: ['approver'], log: (line) => lines.push(line) });
    assert.deepEqual(sent, [], what);
    assert.match(lines[0], /^Waiting #12: the PR changed while merge-gate read it/, what);
    assert.equal(reads, 2, `${what}: read once to decide, once right before the merge`);
  }
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

// release-workflow spec 2.7: PR #12 as the PR of release/v0.1.0 into main, which the script of /ao-ship opens as ao-dev.
const REPO = { full_name: 'TungPH7/ao-pilot' };
const asRelease = (pr) => Object.assign(pr, { title: 'release: v0.1.0', head: { ...pr.head, ref: 'release/v0.1.0', repo: REPO }, base: { ...pr.base, ref: 'main', repo: REPO } });
// PR #12 as the PR that merges main back into develop, which merge-gate opened after the release; nobody approves it.
const asBackMerge = (pr) => Object.assign(pr, { title: 'Merge main into develop after v0.1.0', body: '', head: { ...pr.head, ref: 'main', repo: REPO }, base: { ...pr.base, ref: 'develop', repo: REPO } });
const RELEASE_MERGE = { action: 'merge', method: 'merge', sha: HEAD, title: 'release: v0.1.0 (#12)', release: { tag: 'v0.1.0', backMerge: 'develop' } };

test('a release PR you approved on its head is merged with a merge commit, to be tagged v0.1.0 and merged back into develop', () => {
  assert.deepEqual(decide((f) => asRelease(f.pr)), RELEASE_MERGE);
  // Every change in it passed its own gates: protected paths do not make it yours to merge.
  assert.deepEqual(decide((f) => {
    asRelease(f.pr);
    f.files.push({ filename: '.github/workflows/ci.yml', status: 'modified' });
  }), RELEASE_MERGE);
});

test('a release PR waits for green CI and your approval on its head commit', () => {
  assert.deepEqual(decide((f) => {
    asRelease(f.pr);
    f.reviews.splice(f.reviews.indexOf(approval(f)), 1);
    f.checks = { green: false, failed: false };
  }), { action: 'wait', missing: ['CI green on head a1b2c3d', 'approval on head a1b2c3d'] });
  assert.deepEqual(decide((f) => {
    asRelease(f.pr);
    approval(f).commit_id = FIRST;
  }), { action: 'wait', missing: ['approval on head a1b2c3d'] });
});

test('a merge back from main needs only green CI, a release tag on its head and no conflict; a conflict is yours to resolve', () => {
  const noReviews = (f) => {
    asBackMerge(f.pr);
    f.reviews.splice(0);
    f.tags = [{ name: 'v0.1.0', sha: HEAD }];
    f.brought = [{ sha: HEAD, ok: true, problems: [] }];
  };
  assert.deepEqual(decide(noReviews), { action: 'merge', method: 'merge', sha: HEAD, title: 'Merge main into develop after v0.1.0 (#12)' });
  assert.deepEqual(decide((f) => {
    noReviews(f);
    f.pr.base.ref = 'release/v0.1.0';
  }).action, 'merge');
  assert.deepEqual(decide((f) => {
    noReviews(f);
    f.checks = { green: false, failed: false };
  }), { action: 'wait', missing: ['CI green on head a1b2c3d'] });
  assert.deepEqual(decide((f) => {
    noReviews(f);
    f.pr.mergeable = false;
  }), { action: 'conflict', base: 'develop' });
});

// Pilot 3, review of shop PR #13 (spec 2.9): what main brings back must be a released version, a commit a tag vX.Y.Z
// names, so a commit that reached main some other way does not flow into develop on CI alone.
test('a merge back waits until the head of main is the commit of a release tag', () => {
  const backMerge = (tags) => (f) => {
    asBackMerge(f.pr);
    f.reviews.splice(0);
    f.tags = tags;
    f.brought = [{ sha: HEAD, ok: true, problems: [] }];
  };
  const waits = { action: 'wait', missing: ['a release tag vX.Y.Z on head a1b2c3d: main merges back only once its head is a version you shipped'] };
  assert.deepEqual(decide(backMerge([])), waits);
  assert.deepEqual(decide(backMerge([{ name: 'v0.1.0', sha: FIRST }])), waits);
  assert.deepEqual(decide(backMerge(undefined)), waits);
  assert.equal(decide(backMerge([{ name: 'v0.1.0', sha: FIRST }, { name: 'v0.1.1', sha: HEAD }])).action, 'merge');
});

test('merge-gate opens the merge back with ao-merge, so a merge back ao-merge opened is merge-gate\'s; any other PR of ao-merge is skipped', () => {
  const byMerge = (f) => {
    asBackMerge(f.pr);
    f.pr.user.login = 'tungph7-ao-merge[bot]';
    f.reviews.splice(0);
    f.tags = [{ name: 'v0.1.0', sha: HEAD }];
    f.brought = [{ sha: HEAD, ok: true, problems: [] }];
  };
  assert.equal(decide(byMerge).action, 'merge');
  assert.deepEqual(decide((f) => (f.pr.user.login = 'tungph7-ao-merge[bot]')), { action: 'skip', reason: 'opened by tungph7-ao-merge[bot], not by tungph7-ao-dev: whoever opened it merges it' });
});

// Pilot 3, review of shop PR #13 (spec 2.9): /ao-ship no longer commits its report straight onto the release branch,
// which only a bypass of ao-dev allowed. ao-dev opens release-notes/vX.Y.Z into release/vX.Y.Z, and merge-gate merges it
// when it changes nothing but the report and the changelog of that version.
const asNotes = (pr) => Object.assign(pr, { title: 'release notes: v0.1.0', body: '', head: { ...pr.head, ref: 'release-notes/v0.1.0', repo: REPO }, base: { ...pr.base, ref: 'release/v0.1.0', repo: REPO } });
const NOTES_FILES = [{ filename: 'docs/releases/v0.1.0.md', status: 'added' }, { filename: 'CHANGELOG.md', status: 'modified' }];
// One commit on the head of the release branch, as /ao-ship makes it (review round 3 of shop PR #13).
const notesOf = (f) => {
  asNotes(f.pr);
  f.files = structuredClone(NOTES_FILES);
  f.reviews.splice(0);
  f.commits = [{ sha: HEAD, parents: [{ sha: 'c'.repeat(40) }], commit: { message: 'docs(release): the report of v0.1.0' } }];
  f.baseHead = 'c'.repeat(40);
};

test('the PR of the release report is squashed once CI is green, with no review and no approval', () => {
  assert.deepEqual(decide(notesOf), { action: 'merge', method: 'squash', sha: HEAD, title: 'release notes: v0.1.0 (#12)' });
  assert.deepEqual(decide((f) => {
    notesOf(f);
    f.checks = { green: false, failed: false };
    f.pr.mergeable = false;
  }), { action: 'wait', missing: ['CI green on head a1b2c3d', 'conflicts with release/v0.1.0 resolved'] });
});

test('a PR of the release report that changes any other file, the report of another version included, is yours to read and merge', () => {
  const plus = (file) => (f) => {
    notesOf(f);
    f.files.push(file);
  };
  assert.deepEqual(decide(plus({ filename: 'apps/api/pom.xml', status: 'modified' })), { action: 'needs-you', paths: ['apps/api/pom.xml'], missing: [] });
  assert.deepEqual(decide(plus({ filename: 'docs/releases/v0.2.0.md', status: 'added' })), { action: 'needs-you', paths: ['docs/releases/v0.2.0.md'], missing: [] });
  // A file renamed into an allowed path counts by its old name too.
  assert.deepEqual(decide(plus({ filename: 'CHANGELOG.md', previous_filename: 'apps/user/next.config.ts', status: 'renamed' })), { action: 'needs-you', paths: ['apps/user/next.config.ts'], missing: [] });
});

test('only ao-dev opens the PR of the release report, from release-notes/vX.Y.Z of this repository into release/vX.Y.Z', () => {
  assert.deepEqual(decide((f) => {
    notesOf(f);
    f.pr.user.login = 'tungph7-ao-merge[bot]';
  }), { action: 'skip', reason: 'opened by tungph7-ao-merge[bot], not by tungph7-ao-dev: whoever opened it merges it' });
  assert.deepEqual(decide((f) => {
    notesOf(f);
    f.pr.base.ref = 'release/v0.2.0';
  }), { action: 'skip', reason: 'release-notes/v0.1.0 is not the branch of a work item' });
  assert.deepEqual(decide((f) => {
    notesOf(f);
    f.pr.head.repo = { full_name: 'someone/ao-pilot' };
  }), { action: 'skip', reason: 'release-notes/v0.1.0 is not the branch of a work item' });
});

test('only main of this repository merges back, and only into develop or a release branch', () => {
  const cases = [
    [(pr) => Object.assign(asBackMerge(pr), { head: { ...pr.head, ref: 'develop' } }), 'develop is not the branch of a work item'],
    [(pr) => Object.assign(asBackMerge(pr), { base: { ...pr.base, ref: 'feature/DEMO-12-login' } }), 'main merges back only into develop or release/*'],
    [(pr) => Object.assign(asBackMerge(pr), { head: { ...pr.head, repo: { full_name: 'someone/ao-pilot' } } }), 'main is not the branch of a work item'],
    [(pr) => Object.assign(asRelease(pr), { base: { ...pr.base, ref: 'develop' } }), 'release/v0.1.0 is not the branch of a work item'],
  ];
  for (const [change, reason] of cases) assert.deepEqual(decide((f) => change(f.pr)), { action: 'skip', reason });
});

// A run with only PR #12 open, as the release PR or the merge back; the writer answers each request in turn.
const MERGED = 'f'.repeat(40);
async function runRelease({ change = asRelease, more = () => {}, answers: replies = {}, dryRun = false, auditMain } = {}) {
  return runOnce({
    dryRun,
    ...(auditMain !== undefined && { auditMain }),
    change: (a) => {
      a['/pulls?direction=asc&sort=created&state=open'] = [change(a['/pulls/12'])];
      a['/pulls?base=develop&state=open'] = [];
      // The tags of the repository, as GET /git/matching-refs/tags/v lists them: an annotated tag names a tag object.
      a['/git/matching-refs/tags/v'] = [{ ref: 'refs/tags/v0.1.0', object: { sha: HEAD, type: 'commit' } }, { ref: 'refs/tags/v0.0.9', object: { sha: FIRST, type: 'tag' } }];
      // The PRs each commit of the release merged (SPEC-review-per-item.md section 5): none here.
      for (const { sha } of a['/pulls/12/commits']) a[`/commits/${sha}/pulls`] = [];
      more(a);
    },
    reply: (method, path) => {
      const answer = replies[`${method} ${path}`];
      if (answer instanceof Error) throw answer;
      return answer ?? (method === 'PUT' ? { merged: true, sha: MERGED } : method === 'POST' && path === '/pulls' ? { number: 40 } : {});
    },
  });
}

test('after merging a release PR, merge-gate tags the merge commit and opens the merge back into develop', async () => {
  const { lines, sent, failures } = await runRelease();
  assert.deepEqual(sent, [
    { method: 'PUT', path: '/pulls/12/merge', body: { sha: HEAD, merge_method: 'merge', commit_title: 'release: v0.1.0 (#12)' } },
    { method: 'POST', path: '/git/refs', body: { ref: 'refs/tags/v0.1.0', sha: MERGED } },
    {
      method: 'POST',
      path: '/pulls',
      body: { title: 'Merge main into develop after v0.1.0', head: 'main', base: 'develop', body: 'merge-gate merges main back into develop with a merge commit once CI is green and there is no conflict (release-workflow spec 2.7).' },
    },
  ]);
  assert.deepEqual(lines, ['Merged #12: release: v0.1.0 (#12) (merge at a1b2c3d)', 'Tagged v0.1.0 at fffffff', 'Opened #40: Merge main into develop after v0.1.0']);
  assert.deepEqual(failures, []);
});

test('a tag that already names the merge commit, or an open merge back, is left as it is; a tag on another commit is a failure', async () => {
  const exists = Object.assign(new Error('GitHub POST /git/refs returned 422: Reference already exists'), { status: 422 });
  const backMergeOpen = (a) => {
    a['/pulls?base=develop&state=open'] = [asBackMerge({ ...structuredClone(a['/pulls/12']), number: 41 })];
  };
  const same = await runRelease({ answers: { 'POST /git/refs': exists }, more: (a) => {
    a['/git/ref/tags/v0.1.0'] = { object: { sha: MERGED } };
    backMergeOpen(a);
  } });
  assert.deepEqual(same.sent.map(({ method, path }) => `${method} ${path}`), ['PUT /pulls/12/merge', 'POST /git/refs']);
  assert.deepEqual(same.lines.slice(1), ['Tag v0.1.0 is already at fffffff', 'The merge back into develop is open already: #41']);
  const other = await runRelease({ answers: { 'POST /git/refs': exists }, more: (a) => (a['/git/ref/tags/v0.1.0'] = { object: { sha: FIRST } }) });
  assert.deepEqual(other.failures.map(({ number }) => number), [12]);
  assert.match(other.lines.at(-1), /^Failed #12: tag v0\.1\.0 is at [0-9a-f]{7}, not at the merge commit fffffff/);
});

test('a dry run of a release PR says what it would do, and sends nothing', async () => {
  const { lines, sent, writers } = await runRelease({ dryRun: true });
  assert.deepEqual([sent, writers], [[], 0]);
  assert.deepEqual(lines, ['Would merge #12: release: v0.1.0 (#12) (merge at a1b2c3d), then tag v0.1.0 and merge main back into develop']);
});

test('a merge back with a conflict gets one comment per head commit, and is not merged', async () => {
  const conflict = (pr) => Object.assign(asBackMerge(pr), { mergeable: false });
  const first = await runRelease({ change: conflict, more: (a) => (a['/issues/12/comments'] = []) });
  assert.deepEqual(first.lines, ['Needs you #12: merging main back into develop conflicts, so merge-gate does not merge it', 'Commented on #12: merge-gate: needs you at a1b2c3d on PR #12']);
  assert.equal(first.sent.length, 1);
  assert.equal(first.sent[0].body.body, 'merge-gate: needs you at a1b2c3d on PR #12. Merging main back into develop conflicts, so merge-gate does not merge it: resolve the conflicts as docs/quality-gates.md says (case 3).');
  const again = await runRelease({ change: conflict, more: (a) => (a['/issues/12/comments'] = [{ body: first.sent[0].body.body, user: { login: 'tungph7-ao-dev[bot]' } }]) });
  assert.deepEqual(again.sent, []);
  // merge-gate writes with ao-merge now (Pilot 3, spec 2.9): its own comment counts too.
  const byMerge = await runRelease({ change: conflict, more: (a) => (a['/issues/12/comments'] = [{ body: first.sent[0].body.body, user: { login: 'tungph7-ao-merge[bot]' } }]) });
  assert.deepEqual(byMerge.sent, []);
});

test('a run reads the tags of the repository for a merge back: a lightweight tag on the head of main lets it merge', async () => {
  const merged = await runRelease({ change: (pr) => asBackMerge(pr), more: (a) => (a['/pulls/12/reviews'] = []) });
  assert.deepEqual(merged.lines, ['Merged #12: Merge main into develop after v0.1.0 (#12) (merge at a1b2c3d)']);
  // An annotated tag names a tag object, not the commit: merge-gate does not take it for the commit.
  const annotated = await runRelease({ change: (pr) => asBackMerge(pr), more: (a) => {
    a['/pulls/12/reviews'] = [];
    a['/git/matching-refs/tags/v'] = [{ ref: 'refs/tags/v0.1.0', object: { sha: HEAD, type: 'tag' } }];
  } });
  assert.deepEqual(annotated.sent, []);
  assert.match(annotated.lines[0], /^Waiting #12: a release tag vX\.Y\.Z on head a1b2c3d/);
});

// Pilot 3, spec 2.9 part 5: a High you accept, by its id, in your approval of the head (review round 3 of shop PR #13).
test('a High you accept in your approval of the head no longer makes the PR wait, up to its last day', () => {
  const withHigh = (f) => {
    const report = reportOf(f, 'reviewer');
    report.body = report.body.replace('| Low |', '| High |');
  };
  const idOf = (f) => findingId(readReviewReport(reportOf(f, 'reviewer').body, ['reviewer', 'security']).blocking[0]);
  let id;
  const accepting = (until) => (f) => {
    withHigh(f);
    id = idOf(f);
    approval(f).body = `Accept risk: ${id} until ${until}: the fix comes with the ao-agent account`;
  };
  assert.equal(decideMerge({ ...facts(accepting('2026-12-31')), today: '2026-11-14' }).action, 'merge');
  assert.equal(decide(accepting('2026-12-31')).action, 'wait', 'with no day to hold on, no acceptance counts');
  assert.deepEqual(decideMerge({ ...facts(accepting('2026-11-13')), today: '2026-11-14' }), {
    action: 'wait',
    missing: [`reviewer report on head a1b2c3d without Critical or High findings (1 open; Accept risk: ${id} of approver: until 2026-11-13, before 2026-11-14)`],
  });
});

// Review round 3 of shop PR #13: a commit that reached main without you must not flow into develop with the merge back.
const BROUGHT_OK = [{ sha: HEAD, ok: true, problems: [] }];
test('a merge back waits while a commit main brings back did not pass audit, or while merge-gate could not audit them', () => {
  const backMerge = (brought) => (f) => {
    asBackMerge(f.pr);
    f.reviews.splice(0);
    f.tags = [{ name: 'v0.1.1', sha: HEAD }];
    f.brought = brought;
  };
  assert.equal(decide(backMerge(BROUGHT_OK)).action, 'merge');
  const pushed = `${FIRST.slice(0, 7)} on main is not the merge of a PR into main: it was pushed without one`;
  assert.deepEqual(decide(backMerge([...BROUGHT_OK, { sha: FIRST, ok: false, problems: [pushed] }])), { action: 'wait', missing: [`${FIRST.slice(0, 7)} on main passing audit (${pushed})`] });
  assert.deepEqual(decide(backMerge(undefined)), { action: 'wait', missing: ['an audit of the commits main brings back'] });
});

const BASE_HEAD = 'c'.repeat(40);
test('the PR of the release report merges only as one commit on the head of its release branch', () => {
  const waits = (missing) => ({ action: 'wait', missing: [missing] });
  const one = 'one commit on the head ccccccc of release/v0.1.0';
  assert.deepEqual(decide((f) => {
    notesOf(f);
    f.commits.push({ sha: 'e'.repeat(40), parents: [{ sha: HEAD }] });
  }), waits(`${one} (2 commits)`));
  assert.deepEqual(decide((f) => {
    notesOf(f);
    f.commits[0].parents.push({ sha: 'd'.repeat(40) });
  }), waits(`${one} (a merge commit)`));
  assert.deepEqual(decide((f) => {
    notesOf(f);
    f.baseHead = 'd'.repeat(40);
  }), waits('one commit on the head ddddddd of release/v0.1.0 (it is on ccccccc)'));
  assert.deepEqual(decide((f) => {
    notesOf(f);
    f.baseHead = undefined;
  }), waits('the head of release/v0.1.0'));
});

test('a PR whose files GitHub does not list in full waits: merge-gate cannot check their paths', () => {
  const truncated = 'every file listed: GitHub listed 2 of the 3001 files, so merge-gate cannot check their paths; read the PR and merge it yourself';
  assert.deepEqual(decide((f) => (f.pr.changed_files = 3001)), { action: 'wait', missing: [truncated] });
  assert.equal(decide((f) => (f.pr.changed_files = 2)).action, 'merge');
  assert.deepEqual(decide((f) => {
    notesOf(f);
    f.pr.changed_files = 3001;
  }), { action: 'wait', missing: [truncated] });
});

test('merge-gate buys its token before it reads the PR again, so nothing but the merge call comes after that read', async () => {
  const recorded = recordedClient(structuredClone(answers));
  const events = [];
  let reads = 0;
  const github = { ...recorded, get: async (path, query) => (path === '/pulls/12' && events.push(`read ${++reads}`), recorded.get(path, query)) };
  const writer = async () => (events.push('token'), { request: async (method, path) => (events.push(`${method} ${path}`), { merged: true }) });
  await runMergeGate({ github, mergeClient: writer, gates, apps: { dev: 'tungph7-ao-dev', review: 'tungph7-ao-review', merge: 'tungph7-ao-merge' }, approvers: ['approver'], log: () => {} });
  assert.deepEqual(events.slice(0, 4), ['read 1', 'token', 'read 2', 'PUT /pulls/12/merge']);
});

test('a PR that ends up merged into another base than the one merge-gate read is a failure, said loudly', async () => {
  const recorded = recordedClient(structuredClone(answers));
  let reads = 0;
  const github = {
    ...recorded,
    get: async (path, query) => {
      const answer = await recorded.get(path, query);
      if (path === '/pulls/12' && ++reads === 3) answer.base.ref = 'main';
      return answer;
    },
  };
  const lines = [];
  const writer = async () => ({ request: async () => ({ merged: true }) });
  const { failures } = await runMergeGate({ github, mergeClient: writer, gates, apps: { dev: 'tungph7-ao-dev', review: 'tungph7-ao-review', merge: 'tungph7-ao-merge' }, approvers: ['approver'], log: (line) => lines.push(line) });
  assert.deepEqual(failures.map(({ number }) => number), [12]);
  assert.match(lines.join('\n'), /Failed #12: PR #12 was merged into main, not develop as merge-gate read it: check that merge by hand/);
});

test('a run audits the commits main brings back, with the function it is given, and waits without one', async () => {
  const seen = [];
  const backMerge = { change: (pr) => asBackMerge(pr), more: (a) => (a['/pulls/12/reviews'] = []) };
  const merged = await runRelease({ ...backMerge, auditMain: async (pr) => (seen.push(pr.number), BROUGHT_OK) });
  assert.deepEqual(seen, [12]);
  assert.deepEqual(merged.lines, ['Merged #12: Merge main into develop after v0.1.0 (#12) (merge at a1b2c3d)']);
  const none = await runRelease({ ...backMerge, auditMain: null });
  assert.deepEqual(none.lines, ['Waiting #12: an audit of the commits main brings back']);
});

// Review round 4 of shop PR #13: an acceptance of a Critical says why it does nothing.
test('an acceptance that names a Critical does nothing, and the wait says so', () => {
  let id;
  const critical = (f) => {
    const report = reportOf(f, 'reviewer');
    report.body = report.body.replace('| Low |', '| Critical |');
    id = findingId(readReviewReport(report.body, ['reviewer', 'security']).blocking[0]);
    approval(f).body = `Accept risk: ${id} until 2026-12-31: we will fix it later`;
  };
  assert.deepEqual(decideMerge({ ...facts(critical), today: '2026-11-14' }), {
    action: 'wait',
    missing: [`reviewer report on head a1b2c3d without Critical or High findings (1 open; Accept risk: ${id} names a Critical, which cannot be accepted)`],
  });
});

test('a release PR is not held by a file list GitHub cut short: each of its changes passed its own PR', () => {
  assert.equal(decide((f) => {
    asRelease(f.pr);
    f.pr.changed_files = 3001;
  }).action, 'merge');
});

// Review round 4 of shop PR #13: the read after the merge must not cost a release its tag and its merge back.
test('when the read after merging a release PR fails, the run still tags it and opens the merge back, and fails loudly', async () => {
  let reads = 0;
  const lines = [];
  const sent = [];
  const copy = structuredClone(answers);
  copy['/pulls?direction=asc&sort=created&state=open'] = [asRelease(copy['/pulls/12'])];
  copy['/pulls?base=develop&state=open'] = [];
  for (const { sha } of copy['/pulls/12/commits']) copy[`/commits/${sha}/pulls`] = [];
  const recorded = recordedClient(copy);
  const github = {
    ...recorded,
    get: async (path, query) => {
      if (path === '/pulls/12' && ++reads === 3) throw Object.assign(new Error('GitHub GET /pulls/12 returned 502: Bad Gateway'), { status: 502 });
      return recorded.get(path, query);
    },
  };
  const writer = async () => ({ request: async (method, path, query, body) => (sent.push(`${method} ${path}`), method === 'PUT' ? { merged: true, sha: 'f'.repeat(40) } : method === 'POST' && path === '/pulls' ? { number: 40 } : {}) });
  const { failures } = await runMergeGate({ github, mergeClient: writer, gates, apps: { dev: 'tungph7-ao-dev', review: 'tungph7-ao-review', merge: 'tungph7-ao-merge' }, approvers: ['approver'], log: (line) => lines.push(line) });
  assert.deepEqual(sent, ['PUT /pulls/12/merge', 'POST /git/refs', 'POST /pulls']);
  assert.deepEqual(failures.map(({ number }) => number), [12]);
  assert.match(lines.join('\n'), /Failed #12: could not read PR #12 again after the merge \(GitHub GET \/pulls\/12 returned 502: Bad Gateway\): check by hand that it went into main/);
});

// C1 spec 3.1: merge-gate asks for the security report by the tier of the PR's own files, as ao-step runs security.
test('a PR of normal files merges with the reviewer report only; a sensitive one, or one security reported on, needs the security report too', () => {
  const normal = (f) => {
    f.files = [{ filename: 'apps/web/app/cart/cart-line.tsx', status: 'modified' }];
    f.reviews = f.reviews.filter((r) => !r.body?.includes('Role: security'));
  };
  assert.equal(decide(normal).action, 'merge', 'no security report needed');
  // A renamed file counts by its old name too: moved out of auth/, it is still critical.
  assert.deepEqual(decide((f) => { normal(f); f.files = [{ filename: 'apps/web/app/cart/login.tsx', previous_filename: 'apps/web/app/auth/login.tsx', status: 'renamed' }]; }), { action: 'wait', missing: ['security report on head a1b2c3d'] });
  assert.deepEqual(decide((f) => { normal(f); f.files = [{ filename: 'apps/api/src/cart/cart.service.ts', status: 'modified' }]; }), { action: 'wait', missing: ['security report on head a1b2c3d'] });
  // GitHub listed only part of the files: merge-gate asks you first, and the PR counts as critical.
  const cut = facts((f) => { normal(f); f.pr.changed_files = 4000; });
  assert.deepEqual(reviewRolesNeeded(cut), ['reviewer', 'security']);
  assert.deepEqual(reviewRolesNeeded(facts(normal)), ['reviewer']);
  assert.deepEqual(reviewRolesNeeded({ ...facts(normal), files: undefined }), ['reviewer', 'security'], 'no list of files: critical');
  // security reported on an older commit: its report on the head is needed, even on a normal PR now.
  const reportedBefore = (f) => {
    const security = reportOf(f, 'security');
    f.files = [{ filename: 'apps/web/app/cart/cart-line.tsx', status: 'modified' }];
    security.commit_id = FIRST;
  };
  assert.deepEqual(decide(reportedBefore), { action: 'wait', missing: ['security report on head a1b2c3d'] });
});

// C1 spec 3.4: a PR of docs only, of an item at level light, merges with the trace of the waiver in place of the reports.
// merge-gate works the rule out again: the trace alone opens nothing.
test('a review waived by rule: the trace stands in for the reports, but only where the rule holds again', () => {
  const docsOnly = (label) => (f) => {
    f.files = [{ filename: 'docs/user-guide/cart.md', status: 'modified' }, { filename: 'apps/web/messages/vi.json', status: 'modified' }];
    f.reviews = f.reviews.filter((r) => !/Role: (reviewer|security)/.test(r.body ?? ''));
    f.label = label;
  };
  const trace = (f) => f.reviews.push({ user: { login: BOT }, commit_id: HEAD, state: 'COMMENTED', body: '# Review waiver: DEMO-12\n\nWaiver: light-docs\nLevel: light\n' });
  assert.equal(decide((f) => { docsOnly('light')(f); trace(f); }).action, 'merge');
  assert.deepEqual(decide(docsOnly('light')).missing, ['review waiver light-docs on head a1b2c3d, which ao-step review posts']);
  // The label is standard, or could not be read: the trace counts for nothing, and the reports are needed.
  for (const label of ['standard', null]) {
    assert.deepEqual(decide((f) => { docsOnly(label)(f); trace(f); }).missing, ['reviewer report on head a1b2c3d'], String(label));
  }
  // One file of code: no waiver.
  assert.deepEqual(decide((f) => { docsOnly('light')(f); trace(f); f.files.push({ filename: 'apps/web/src/cart.tsx', status: 'modified' }); }).missing, ['reviewer report on head a1b2c3d']);
  // Your approval is still needed.
  assert.deepEqual(decide((f) => { docsOnly('light')(f); trace(f); f.reviews = f.reviews.filter(({ state }) => state !== 'APPROVED'); }).missing, ['approval on head a1b2c3d']);
});

test('the label of the item is read only when a waiver could take in every file, and a failed read gives no waiver', async () => {
  const pr = { head: { ref: 'feature/DEMO-30-guide' } };
  const docsFiles = [{ filename: 'docs/guide.md' }];
  const asked = [];
  const docs = { levelOf: async (key) => (asked.push(key), 'light') };
  assert.equal(await waiverLabel({ pr, files: docsFiles, gates, docs }), 'light');
  assert.equal(await waiverLabel({ pr, files: [{ filename: 'apps/web/src/a.ts' }], gates, docs }), null);
  assert.deepEqual(asked, ['DEMO-30'], 'Jira is not read for a PR of code');
  assert.equal(await waiverLabel({ pr, files: docsFiles, gates, docs: { levelOf: async () => { throw new Error('401'); } } }), null);
  assert.equal(await waiverLabel({ pr, files: docsFiles, gates, docs: undefined }), null, 'no Jira token');
});

// SPEC-review-per-item.md 3.5: an item that skips review needs the trace on the head in place of the reports; CI, your
// approval and the rest stay.
const skipTrace = (sha, key = 'DEMO-12') => ({ user: { login: BOT }, state: 'COMMENTED', commit_id: sha, body: skipBody({ key, sha, reason: 'label ao-review-skip' }), submitted_at: '2026-11-23T10:00:00Z' });
const merges = (decision) => decision.action === 'merge' && decision.sha === HEAD;
test('an item that skips review merges with the trace on its head, CI and your approval, and no report', () => {
  const skipping = (f) => {
    f.reviews = [approval(f), skipTrace(HEAD)];
    f.review = { skip: true, why: 'label' };
  };
  assert.equal(merges(decide(skipping)), true);
  // Without the trace on the head: it waits for it.
  assert.deepEqual(decide((f) => { skipping(f); f.reviews = [approval(f), skipTrace(FIRST)]; }), { action: 'wait', missing: ['the trace of the review DEMO-12 skips on head a1b2c3d, which ao-step review posts'] });
  // The clean reports of a full review you asked for do as well as the trace.
  assert.equal(merges(decide((f) => { f.reviews = f.reviews.slice(1); f.review = { skip: true, why: 'label' }; })), true);
  // Your approval and CI stay.
  assert.deepEqual(decide((f) => { skipping(f); f.reviews = [skipTrace(HEAD)]; }).missing, ['approval on head a1b2c3d']);
  assert.deepEqual(decide((f) => { skipping(f); f.checks = { green: false, failed: false }; }).missing, ['CI green on head a1b2c3d']);
  // The choice is review, or could not be read: the reports.
  for (const review of [null, { skip: false, why: 'label' }]) {
    assert.deepEqual(decide((f) => { skipping(f); f.review = review; }).missing, ['reviewer report on head a1b2c3d', 'security report on head a1b2c3d'], JSON.stringify(review));
  }
});

test('the skip holds only for an item PR into develop, and no longer once a review of the PR found a Critical or High (spec 2.6, 2.7)', () => {
  // The fixture: the first reviewer report asked for changes with a High; the reports on the head are clean.
  assert.equal(merges(decide((f) => { f.reviews = [...f.reviews, skipTrace(HEAD)]; f.review = { skip: true, why: 'label' }; })), true, 'it merges on its reports');
  const stillHigh = decide((f) => { f.reviews = [f.reviews[0], approval(f), skipTrace(HEAD)]; f.review = { skip: true, why: 'label' }; });
  assert.equal(stillHigh.action, 'wait');
  assert.match(stillHigh.missing.join('; '), /reviewer report on head a1b2c3d/);
  const intoRelease = decide((f) => { f.pr.base.ref = 'release/v0.1.0'; f.pr.head.ref = 'bugfix/DEMO-12-login'; f.reviews = [approval(f), skipTrace(HEAD)]; f.review = { skip: true, why: 'label' }; });
  assert.match(intoRelease.missing.join('; '), /reviewer report on head a1b2c3d/);
});

test('a release PR waits for the review after merge of each PR it brings that skipped review (spec 5.1)', () => {
  const mark = { key: 'DEMO-1', head: 'c'.repeat(40), blocking: 0, fix: null };
  assert.deepEqual(decide((f) => { asRelease(f.pr); f.releasePulls = [{ number: 20, key: 'DEMO-20', skipped: true, mark }]; }), RELEASE_MERGE);
  assert.deepEqual(decide((f) => { asRelease(f.pr); f.releasePulls = [{ number: 20, key: 'DEMO-20', skipped: true, mark: null }]; }), { action: 'wait', missing: ['review after merge of #20 (DEMO-20), which skipped review: /ao-review DEMO-20'] });
  assert.equal(decide((f) => { asRelease(f.pr); f.releasePulls = null; }).action, 'wait', 'more commits than GitHub lists');
  const found = { ...mark, blocking: 1, fix: 'DEMO-25' };
  assert.equal(decide((f) => { asRelease(f.pr); f.releasePulls = [{ number: 20, key: 'DEMO-20', skipped: true, mark: found }]; }).action, 'wait');
  assert.deepEqual(decide((f) => { asRelease(f.pr); f.releasePulls = [{ number: 20, key: 'DEMO-20', skipped: true, mark: found }, { number: 26, key: 'DEMO-25', skipped: false, mark: null }]; }), RELEASE_MERGE);
});

test('the PRs a release brings, read from its commits: skipped when the trace is the only word of the App on its head', async () => {
  const head = (n) => String(n).padEnd(40, 'e');
  const mergeSha = (n) => String(n).padEnd(40, 'f');
  const merged = (n, base = 'develop') => ({ number: n, merged_at: '2026-11-20T10:00:00Z', merge_commit_sha: mergeSha(n), base: { ref: base }, head: { ref: `feature/DEMO-${n}-x`, sha: head(n) } });
  const answers = {
    '/pulls/12/commits': [{ sha: mergeSha(20) }, { sha: mergeSha(21) }, { sha: mergeSha(22) }, { sha: '9'.repeat(40) }],
    [`/commits/${mergeSha(20)}/pulls`]: [merged(20)],
    [`/commits/${mergeSha(21)}/pulls`]: [merged(21)],
    [`/commits/${mergeSha(22)}/pulls`]: [merged(22, 'release/v0.1.0')],
    [`/commits/${'9'.repeat(40)}/pulls`]: [],
    '/pulls/20/reviews': [skipTrace(head(20), 'DEMO-20')],
    '/pulls/21/reviews': [skipTrace(head(21), 'DEMO-21'), { user: { login: BOT }, commit_id: head(21), body: 'Role: reviewer' }],
    '/pulls/22/reviews': [],
    '/issues/20/comments': [{ user: { login: BOT }, body: markBody({ key: 'DEMO-1', head: 'c'.repeat(40), blocking: 0 }) }],
  };
  const github = {
    getAll: async (path) => {
      if (!(path in answers)) throw new Error(`no answer for ${path}`);
      return answers[path];
    },
  };
  const pr = { number: 12, head: { ref: 'release/v0.1.0' } };
  assert.deepEqual(await readReleasePulls(github, pr, { apps: { review: 'tungph7-ao-review' } }), [
    { number: 20, key: 'DEMO-20', skipped: true, mark: { key: 'DEMO-1', head: 'c'.repeat(40), blocking: 0, fix: null } },
    { number: 21, key: 'DEMO-21', skipped: false, mark: null },
    { number: 22, key: 'DEMO-22', skipped: false, mark: null },
  ]);
  const many = { getAll: async () => Array.from({ length: 250 }, (_, i) => ({ sha: String(i) })) };
  assert.equal(await readReleasePulls(many, pr, { apps: { review: 'tungph7-ao-review' } }), null);
});

test('the choice of a PR is read only for an item PR into develop, with the default of project.yaml at the ref asked', async () => {
  const asked = [];
  const docs = { reviewOf: async (key, options) => (asked.push([key, options]), { skip: options.projectDefault === 'off', why: 'default' }) };
  const github = { get: async (path, { ref }) => (asked.push(['contents', ref]), { content: Buffer.from('review:\n  default: off\n').toString('base64') }) };
  const pr = { head: { ref: 'feature/DEMO-12-login' }, base: { ref: 'develop' } };
  assert.deepEqual(await reviewChoiceOf({ pr, docs, github }), { skip: true, why: 'default' });
  assert.deepEqual(asked, [['contents', 'develop'], ['DEMO-12', { at: undefined, projectDefault: 'off' }]]);
  asked.length = 0;
  await reviewChoiceOf({ pr, docs, github, at: '2026-11-23T10:00:00Z', ref: 'a'.repeat(40) });
  assert.deepEqual(asked, [['contents', 'a'.repeat(40)], ['DEMO-12', { at: '2026-11-23T10:00:00Z', projectDefault: 'off' }]]);
  assert.equal(await reviewChoiceOf({ pr: { ...pr, base: { ref: 'release/v0.1.0' } }, docs, github }), null);
  assert.equal(await reviewChoiceOf({ pr, docs: undefined, github }), null, 'no Jira token');
  assert.equal(await reviewChoiceOf({ pr, docs: { reviewOf: async () => { throw new Error('401'); } }, github }), null);
});
