import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { auditBroughtBack, commitArgument, decideAudit, mergedPull, runAudit } from '../../lib/quality/audit.mjs';
import { findingId, readReviewReport } from '../../lib/quality/pull-request.mjs';
import { readGates } from '../../lib/quality/gates.mjs';
import { readMapping } from '../../lib/tracker/mapping.mjs';
import { recordedClient } from '../helpers/jira.mjs';
import { ROOT } from '../helpers/kit.mjs';

const gates = readGates(join(ROOT, 'quality'));
const mapping = readMapping(join(ROOT, 'tracker'));
// PR #12 of the merge-gate recording, merged: the ao-dev App squashed it into develop as commit SQUASH.
const answers = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/quality/api/merge-gate.json'), 'utf8'));
const SQUASH = 'e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4';
const HEAD = answers['/pulls/12'].head.sha;
const BOT = { login: 'tungph7-ao-dev[bot]', type: 'Bot' };
const YOU = { login: 'approver', type: 'User' };
const merged = (pr) => Object.assign(pr, { state: 'closed', merged_at: '2026-11-02T11:05:00Z', merge_commit_sha: SQUASH, merged_by: BOT });

// The facts of a deploy of SQUASH from develop, after `change` edits a copy.
const facts = (change = () => {}) => {
  const copy = structuredClone(answers);
  const f = {
    sha: SQUASH,
    branch: 'develop',
    message: 'feat(auth): add email and password login (DEMO-12)\n\n- feat(auth): add the login endpoint (DEMO-12, DEMO-13)',
    pull: merged(copy['/pulls/12']),
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
const audit = (change) => decideAudit(facts(change));
const MERGE_BOT = { login: 'tungph7-ao-merge[bot]', type: 'Bot' };
const PASSED = { ok: true, pr: 12, problems: [], keys: ['DEMO-12'] };
const noApproval = (f) => f.reviews.pop();

test('the squash commit of a PR that met every gate at its head commit passes', () => {
  assert.deepEqual(audit(), PASSED);
});

test('a commit pushed without a PR fails; the item to flag is the one in its header, if any', () => {
  assert.deepEqual(audit((f) => (f.pull = null)), {
    ok: false,
    pr: null,
    problems: ['e1e2e3e on develop is not the merge of a PR into develop: it was pushed without one'],
    keys: ['DEMO-12'],
  });
  assert.deepEqual(audit((f) => Object.assign(f, { pull: null, message: 'chore: bump the version' })).keys, []);
});

test('a PR merged by hand before you approved it fails, with what it lacked', () => {
  const byHand = (f) => {
    noApproval(f);
    f.pull.merged_by = YOU;
  };
  assert.deepEqual(audit(byHand), { ok: false, pr: 12, problems: ['PR #12 was merged without: approval on head a1b2c3d'], keys: ['DEMO-12'] });
  const unreviewed = (f) => {
    byHand(f);
    f.reviews.splice(0);
  };
  assert.deepEqual(audit(unreviewed).problems, ['PR #12 was merged without: reviewer report on head a1b2c3d; security report on head a1b2c3d; approval on head a1b2c3d']);
});

test('a PR that changes a protected path passes when you merged it, and fails when the bot did', () => {
  const touches = (f) => f.files.push({ filename: '.github/workflows/ci.yml', status: 'modified' });
  assert.deepEqual(audit((f) => {
    touches(f);
    f.pull.merged_by = YOU;
  }), PASSED);
  assert.deepEqual(audit(touches).problems, ['PR #12 changes .github/workflows/ci.yml, which only you merge, but tungph7-ao-dev[bot] merged it']);
  // In another case too: on Windows .Claude/ is written into .claude/ (live-run-fixes spec 2.9).
  const cased = (f) => f.files.push({ filename: '.Claude/rules/x.md', status: 'added' });
  assert.deepEqual(audit(cased).problems, ['PR #12 changes .Claude/rules/x.md, which only you merge, but tungph7-ao-dev[bot] merged it']);
});

test('a PR you opened counts as approved by you, since GitHub does not let you approve it', () => {
  assert.deepEqual(audit((f) => {
    noApproval(f);
    Object.assign(f.pull, { user: YOU, merged_by: YOU });
  }), PASSED);
});

test('a new release branch cut from develop passes on the merge of a PR into develop; main does not take it', () => {
  assert.deepEqual(audit((f) => (f.branch = 'release/v1.2.0')), PASSED);
  assert.deepEqual(audit((f) => (f.branch = 'main')).problems, ['PR #12 was merged into develop, not main']);
});

test('a PR from a release branch needs only green CI and your approval on its head commit', () => {
  const release = (f) => {
    Object.assign(f.pull, { title: 'Release v1.2.0', body: '', head: { ref: 'release/v1.2.0', sha: HEAD }, base: { ref: 'main' } });
    f.reviews.splice(0, 3);
    f.branch = 'main';
  };
  assert.deepEqual(audit(release), { ok: true, pr: 12, problems: [], keys: [] });
  assert.deepEqual(audit((f) => {
    release(f);
    noApproval(f);
    f.checks = { green: false, failed: true };
  }).problems, ['PR #12 was merged without: CI green on head a1b2c3d; approval on head a1b2c3d']);
});

test('the PR of a commit is the merged one whose merge commit it is, into the branch deployed or, for a release branch, develop', () => {
  const pr = merged(structuredClone(answers['/pulls/12']));
  const open = { ...structuredClone(answers['/pulls/12']), number: 14 };
  assert.equal(mergedPull([open, pr], SQUASH, 'develop'), pr);
  assert.equal(mergedPull([pr], SQUASH, 'release/v1.2.0'), pr);
  // A PR that only contains the commit is not its merge, and a PR into develop does not reach main.
  assert.equal(mergedPull([{ ...pr, merge_commit_sha: 'f0' }], SQUASH, 'develop'), undefined);
  assert.equal(mergedPull([pr], SQUASH, 'main'), undefined);
  assert.equal(mergedPull([], SQUASH, 'develop'), undefined);
});

// A Jira client that keeps the comments it is sent, so a second run sees the first one's.
function commentingJira() {
  const comments = [];
  const writes = [];
  return {
    writes,
    get: async () => [{ id: 'customfield_10021', name: 'Flagged' }],
    getAll: async () => comments.map((text) => ({ body: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] } })),
    editItem: async (key, changes) => writes.push(['edit', key, changes]),
    comment: async (key, text) => {
      comments.push(text);
      writes.push(['comment', key, text]);
    },
  };
}

// The recording of a deploy of SQUASH from develop, after `change` edits it.
function recording(change = () => {}) {
  const copy = structuredClone(answers);
  copy[`/commits/${SQUASH}/pulls`] = [merged(structuredClone(copy['/pulls/12']))];
  merged(copy['/pulls/12']);
  copy[`/commits/${SQUASH}`] = { sha: SQUASH, commit: { message: 'feat(auth): add email and password login (DEMO-12)' } };
  change(copy);
  return copy;
}
const run = (copy, jira, options = {}) => {
  const lines = [];
  const result = runAudit({
    github: recordedClient(copy),
    jira,
    mapping,
    space: 'DEMO',
    sha: SQUASH,
    branch: 'develop',
    gates,
    apps: { dev: 'tungph7-ao-dev', review: 'tungph7-ao-review' },
    approvers: ['approver'],
    log: (line) => lines.push(line),
    ...options,
  });
  return result.then((r) => ({ ...r, lines }));
};

test('a run that passes says so and writes nothing to Jira', async () => {
  const jira = commentingJira();
  const { ok, lines } = await run(recording(), jira);
  assert.equal(ok, true);
  assert.deepEqual(lines, ['audit passed: e1e2e3e on develop is the merge of PR #12, which met every gate']);
  assert.deepEqual(jira.writes, []);
});

// audit.mjs --sha 22a0213 said the merge of PR #14 was pushed without a PR (Pilot 2, T10): the PR's merge commit is
// matched by the full hash GitHub gives back.
test('a short hash is audited as its full one, and --sha takes only a commit hash', async () => {
  const short = SQUASH.slice(0, 7);
  const jira = commentingJira();
  const { ok, lines } = await run(recording((a) => {
    a[`/commits/${short}`] = a[`/commits/${SQUASH}`];
  }), jira, { sha: short });
  assert.equal(ok, true);
  assert.deepEqual(lines, ['audit passed: e1e2e3e on develop is the merge of PR #12, which met every gate']);
  assert.equal(commitArgument('E1E2E3E'), 'e1e2e3e');
  assert.equal(commitArgument(SQUASH), SQUASH);
  for (const bad of ['develop', 'v0.1.0', 'e1e2e3', 'HEAD~1', SQUASH + '0', undefined]) {
    assert.throws(() => commitArgument(bad), /--sha takes a commit hash of 7 to 40 hex digits/, String(bad));
  }
});

test('a run that fails flags the item once: a second run adds no comment', async () => {
  const unapproved = (a) => a['/pulls/12/reviews'].pop();
  const jira = commentingJira();
  const first = await run(recording(unapproved), jira);
  await run(recording(unapproved), jira);
  assert.equal(first.ok, false);
  assert.deepEqual(first.lines, ['audit failed: e1e2e3e on develop', '- PR #12 was merged without: approval on head a1b2c3d', 'Flagged DEMO-12']);
  const comment = 'audit: e1e2e3e on develop was not deployed. PR #12 was merged without: approval on head a1b2c3d. It is flagged with the label needs-you and waits for you.';
  const edit = ['edit', 'DEMO-12', { fields: { customfield_10021: [{ value: 'Impediment' }] }, update: { labels: [{ add: 'needs-you' }] } }];
  assert.deepEqual(jira.writes, [edit, ['comment', 'DEMO-12', comment], edit]);
});

test('a failed run flags only items of the project space, and a dry run flags nothing', async () => {
  const otherSpace = (a) => {
    a['/pulls/12/reviews'].pop();
    a['/pulls/12'].title = 'feat(auth): add email and password login (SCRUM-3)';
  };
  const jira = commentingJira();
  const { lines } = await run(recording(otherSpace), jira);
  assert.equal(lines.at(-1), 'No work item of DEMO to flag');
  assert.deepEqual(jira.writes, []);
  const dry = await run(recording((a) => a['/pulls/12/reviews'].pop()), jira, { dryRun: true });
  assert.equal(dry.lines.at(-1), 'Would flag DEMO-12');
  assert.deepEqual(jira.writes, []);
});

// A commit pushed to a release branch without a PR, as the script of /ao-ship committed the report before Pilot 3,
// spec 2.9.
const pushed = (files, change = () => {}) => (f) => {
  Object.assign(f, { pull: null, branch: 'release/v0.1.0', message: 'docs(release): add the report of v0.1.0' });
  f.commit = { author: BOT.login, committer: BOT.login, parents: 1, files: files.map((filename) => ({ filename, status: 'modified' })) };
  change(f);
};
const REPORT = ['docs/releases/v0.1.0.md', 'CHANGELOG.md'];

// Pilot 3, review of shop PR #13 (spec 2.9): whoever holds the token of ao-dev, an agent included, could change the
// release notes sent to customers that way. The report comes through its own PR now.
test('every commit pushed without a PR fails, a commit of ao-dev that only changes the release report included', () => {
  const without = (branch) => [`e1e2e3e on ${branch} is not the merge of a PR into ${branch}: it was pushed without one`];
  assert.deepEqual(audit(pushed(REPORT)).problems, without('release/v0.1.0'));
  assert.deepEqual(audit(pushed(['CHANGELOG.md'])).problems, without('release/v0.1.0'));
  assert.deepEqual(audit(pushed(REPORT, (f) => (f.commit.author = YOU.login))).problems, without('release/v0.1.0'));
  assert.deepEqual(audit(pushed(REPORT, (f) => (f.branch = 'develop'))).problems, without('develop'));
  assert.deepEqual(audit(pushed(REPORT, (f) => delete f.commit)).problems, without('release/v0.1.0'));
});

// The PR of the release report (Pilot 3, spec 2.9): release-notes/vX.Y.Z into release/vX.Y.Z, which ao-dev opens and
// merge-gate merges with ao-merge.
const notesPr = (change = () => {}) => (f) => {
  const repo = { full_name: 'TungPH7/ao-pilot' };
  Object.assign(f, { branch: 'release/v0.1.0', message: 'release notes: v0.1.0 (#12)' });
  Object.assign(f.pull, { title: 'release notes: v0.1.0', body: '', head: { ref: 'release-notes/v0.1.0', sha: HEAD, repo }, base: { ref: 'release/v0.1.0', repo }, merged_by: MERGE_BOT });
  f.files = REPORT.map((filename) => ({ filename, status: 'modified' }));
  f.reviews.splice(0);
  change(f);
};

test('the PR of a release report passes with green CI when ao-dev opened it, merge-gate or you merged it, and it changes only the report and the changelog of its version', () => {
  assert.deepEqual(audit(notesPr()), { ok: true, pr: 12, problems: [], keys: [] });
  assert.equal(audit(notesPr((f) => (f.pull.merged_by = YOU))).ok, true);
  // A project with no ao-merge yet merges with ao-dev; one with ao-merge does not take a merge of the agents' App
  // (review round 2 of shop PR #13).
  assert.equal(audit(notesPr((f) => {
    f.pull.merged_by = BOT;
    f.apps = { dev: 'tungph7-ao-dev', review: 'tungph7-ao-review' };
  })).ok, true);
  assert.deepEqual(audit(notesPr((f) => (f.pull.merged_by = BOT))).problems, ['PR #12 is the report of v0.1.0, which merge-gate or you merge, but tungph7-ao-dev[bot] merged it']);
});

test('the PR of a release report fails on any other file, without green CI, or opened or merged by anyone else', () => {
  const only = 'PR #12 is the report of v0.1.0, which may only change docs/releases/v0.1.0.md and CHANGELOG.md, but it changes';
  assert.deepEqual(audit(notesPr((f) => f.files.push({ filename: 'apps/web/src/page.tsx', status: 'modified' }))).problems, [`${only} apps/web/src/page.tsx`]);
  // A file moved into an allowed path leaves its old path, which the image held.
  assert.deepEqual(audit(notesPr((f) => (f.files[1] = { filename: 'CHANGELOG.md', previous_filename: 'apps/api/src/main.ts', status: 'renamed' }))).problems, [`${only} apps/api/src/main.ts`]);
  assert.deepEqual(audit(notesPr((f) => (f.checks = { green: false, failed: true }))).problems, ['PR #12 was merged without: CI green on head a1b2c3d']);
  assert.deepEqual(audit(notesPr((f) => (f.pull.user = YOU))).problems, ['PR #12 is the report of v0.1.0, which ao-dev opens, but approver opened it']);
  assert.deepEqual(audit(notesPr((f) => (f.pull.merged_by = { login: 'someone', type: 'User' }))).problems, ['PR #12 is the report of v0.1.0, which merge-gate or you merge, but someone merged it']);
});

// The PR that merges main back into develop after a release or a hotfix (spec 2.7), merged by merge-gate.
const backMerge = (change = () => {}) => (f) => {
  const repo = { full_name: 'TungPH7/ao-pilot' };
  Object.assign(f.pull, { title: 'Merge main into develop after v0.1.0', body: '', head: { ref: 'main', sha: HEAD, repo }, base: { ref: 'develop', repo }, merged_by: MERGE_BOT });
  f.reviews.splice(0);
  f.tags = [{ name: 'v0.1.0', sha: HEAD }];
  f.brought = [{ sha: HEAD, ok: true, problems: [] }];
  change(f);
};

test('the merge of a PR from main back into develop or the open release branch passes with green CI and a release tag on its head, merged by merge-gate (spec 2.10)', () => {
  assert.deepEqual(audit(backMerge()), { ok: true, pr: 12, problems: [], keys: [] });
  assert.deepEqual(audit(backMerge((f) => {
    f.pull.base.ref = 'release/v0.1.0';
    f.branch = 'release/v0.1.0';
  })), { ok: true, pr: 12, problems: [], keys: [] });
  // You may merge it by hand too, for instance while merge-gate is down; a project with no ao-merge merges with ao-dev,
  // and one with ao-merge does not take a merge of the agents' App (review round 2 of shop PR #13).
  assert.deepEqual(audit(backMerge((f) => (f.pull.merged_by = YOU))).ok, true);
  assert.deepEqual(audit(backMerge((f) => {
    f.pull.merged_by = BOT;
    f.apps = { dev: 'tungph7-ao-dev', review: 'tungph7-ao-review' };
  })).ok, true);
  assert.deepEqual(audit(backMerge((f) => (f.pull.merged_by = BOT))).problems, ['PR #12 merges main back into develop, which merge-gate or you merge, but tungph7-ao-dev[bot] merged it']);
});

test('a merge back from main fails without green CI on its head, without a release tag there, or when someone else merged it', () => {
  assert.deepEqual(audit(backMerge((f) => (f.checks = { green: false, failed: true }))).problems, ['PR #12 was merged without: CI green on head a1b2c3d']);
  // Pilot 3, spec 2.9: a commit that reached main without a release does not flow into develop on CI alone.
  assert.deepEqual(audit(backMerge((f) => (f.tags = [{ name: 'v0.1.0', sha: SQUASH }]))).problems, ['PR #12 was merged without: a release tag vX.Y.Z on head a1b2c3d']);
  assert.deepEqual(audit(backMerge((f) => delete f.tags)).problems, ['PR #12 was merged without: a release tag vX.Y.Z on head a1b2c3d']);
  assert.deepEqual(audit(backMerge((f) => (f.pull.merged_by = { login: 'someone', type: 'User' }))).problems, [
    'PR #12 merges main back into develop, which merge-gate or you merge, but someone merged it',
  ]);
});

test('a PR from a branch named main in another repo is no merge back: it needs every gate', () => {
  const fork = audit(backMerge((f) => (f.pull.head.repo = { full_name: 'someone/ao-pilot' })));
  assert.equal(fork.ok, false);
  assert.match(fork.problems[0], /PR #12 was merged without: .*approval on head a1b2c3d/);
});

// Review round 3 of shop PR #13: what a merge back brings from main passes audit commit by commit, as a deploy does.
test('a merge back fails when a commit it brings from main did not pass audit, or when they were not audited', () => {
  const pushed = 'c0c1c2c on main is not the merge of a PR into main: it was pushed without one';
  assert.deepEqual(audit(backMerge((f) => (f.brought = [{ sha: HEAD, ok: true, problems: [] }, { sha: 'c0c1c2c'.padEnd(40, '0'), ok: false, problems: [pushed] }]))).problems, [
    `PR #12 was merged without: c0c1c2c on main passing audit (${pushed})`,
  ]);
  assert.deepEqual(audit(backMerge((f) => delete f.brought)).problems, ['PR #12 was merged without: an audit of the commits main brings back']);
});

// Pilot 3, spec 2.9 part 5: a High you accepted in your approval of the head, on the day of the merge.
test('a PR merged with a High you accepted passes while the acceptance held on the day of the merge', () => {
  const accepting = (until) => (f) => {
    const report = f.reviews.findLast(({ body }) => body.includes('Role: reviewer'));
    report.body = report.body.replace('| Low |', '| High |');
    const id = findingId(readReviewReport(report.body, ['reviewer', 'security']).blocking[0]);
    f.reviews.find(({ state }) => state === 'APPROVED').body = `Accept risk: ${id} until ${until}: the fix comes with the ao-agent account`;
  };
  assert.deepEqual(audit(accepting('2026-12-31')), PASSED);
  const late = audit(accepting('2026-11-01'));
  assert.equal(late.ok, false);
  assert.match(late.problems[0], /reviewer report on head a1b2c3d without Critical or High findings \(1 open; Accept risk: [0-9a-f]{8} of approver: until 2026-11-01, before 2026-11-02\)/);
});

test('a PR whose files GitHub did not list in full fails: its paths cannot be checked', () => {
  assert.deepEqual(audit((f) => (f.pull.changed_files = 3001)).problems, ['PR #12 changes 3001 files, of which GitHub listed 2: check its paths by hand']);
  assert.deepEqual(audit((f) => (f.pull.changed_files = 2)), PASSED);
});

// A fake GitHub of main for auditBroughtBack: `commits` of the merge back, and for each commit of main its parents and
// the PR it merged (or none).
function mainOf(chain) {
  const answers = { '/pulls/40/commits': chain.filter(({ brought }) => brought).map(({ sha }) => ({ sha })) };
  for (const { sha, parent, pull } of chain) {
    answers[`/commits/${sha}`] = { sha, parents: parent ? [{ sha: parent }] : [], commit: { message: pull ? `release: v0.1.1 (#${pull.number})` : 'chore: pushed' } };
    answers[`/commits/${sha}/pulls`] = pull ? [pull] : [];
    if (pull) {
      answers[`/pulls/${pull.number}`] = pull;
      answers[`/pulls/${pull.number}/files`] = [{ filename: 'apps/api/pom.xml', status: 'modified' }];
      answers[`/pulls/${pull.number}/reviews`] = [{ user: { login: 'approver' }, state: 'APPROVED', commit_id: pull.head.sha, body: '', submitted_at: '2026-11-14T10:00:00Z' }];
      answers[`/commits/${pull.head.sha}/check-runs`] = { check_runs: [{ name: 'build-test', status: 'completed', conclusion: 'success' }] };
      answers[`/commits/${pull.head.sha}/status`] = { total_count: 0, statuses: [] };
    }
  }
  const read = (path) => {
    if (!(path in answers)) throw new Error(`no answer for ${path}`);
    return structuredClone(answers[path]);
  };
  return { get: async (path) => read(path), getAll: async (path, query, key) => (key ? read(path)[key] : read(path)) };
}
const repo = { full_name: 'TungPH7/ao-pilot' };
const releasePull = (number, sha) => ({ number, title: `release: v0.1.${number}`, state: 'closed', merged_at: '2026-11-14T11:00:00Z', merge_commit_sha: sha, merged_by: MERGE_BOT, user: BOT, head: { ref: `release/v0.1.${number}`, sha: `${number}`.padEnd(40, 'a'), repo }, base: { ref: 'main', repo } });

test('auditBroughtBack audits each commit a merge back brings on the first-parent line of main, newest first, and stops at the first that fails', async () => {
  const M2 = '2'.repeat(40);
  const M1 = '1'.repeat(40);
  const X = '9'.repeat(40);
  const B = 'b'.repeat(40);
  const back = { number: 40, head: { sha: M2 } };
  const args = { gates, apps: { dev: 'tungph7-ao-dev', review: 'tungph7-ao-review', merge: 'tungph7-ao-merge' }, approvers: ['approver'] };
  // M2, the merge of release v0.1.2, on M1 that main had before: only M2 is brought.
  const clean = await auditBroughtBack({ github: mainOf([{ sha: M2, parent: M1, pull: releasePull(2, M2), brought: true }, { sha: M1, parent: B, pull: releasePull(1, M1) }]), pr: back, ...args });
  assert.deepEqual(clean.map(({ sha, ok }) => [sha.slice(0, 7), ok]), [['2222222', true]]);
  // X, pushed onto main without a PR under M2: brought, and it fails.
  const slipped = await auditBroughtBack({ github: mainOf([{ sha: M2, parent: X, pull: releasePull(2, M2), brought: true }, { sha: X, parent: M1, brought: true }, { sha: M1, parent: B, pull: releasePull(1, M1) }]), pr: back, ...args });
  assert.deepEqual(slipped.map(({ sha, ok }) => [sha.slice(0, 7), ok]), [['2222222', true], ['9999999', false]]);
  assert.deepEqual(slipped[1].problems, ['9999999 on main is not the merge of a PR into main: it was pushed without one']);
});

test('auditBroughtBack does not check a merge back of 250 commits or more in part: it fails', async () => {
  const many = { get: async () => ({}), getAll: async () => Array.from({ length: 250 }, (_, i) => ({ sha: `${i}`.padEnd(40, '0') })) };
  const audits = await auditBroughtBack({ github: many, pr: { number: 40, head: { sha: 'f'.repeat(40) } }, gates, apps: { dev: 'd', review: 'r', merge: 'm' }, approvers: [] });
  assert.deepEqual(audits, [{ sha: 'f'.repeat(40), ok: false, problems: ['the merge back brings 250 commits or more, more than GitHub lists: check them by hand'] }]);
});
