import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { decideAudit, mergedPull, runAudit } from '../../lib/quality/audit.mjs';
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
    apps: { dev: 'tungph7-ao-dev', review: 'tungph7-ao-review' },
    approvers: ['approver'],
  };
  change(f);
  return f;
};
const audit = (change) => decideAudit(facts(change));
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
