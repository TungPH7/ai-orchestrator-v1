import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readGates } from '../../lib/quality/gates.mjs';
import { decideMerge, runMergeGate } from '../../lib/quality/merge-gate.mjs';
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
async function runOnce({ change = () => {}, dryRun = false, refuse, reply = () => ({ merged: true }), auditMain = passAll } = {}) {
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
