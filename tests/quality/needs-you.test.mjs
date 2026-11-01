import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readGates } from '../../lib/quality/gates.mjs';
import { needsYouText, runMergeGate } from '../../lib/quality/merge-gate.mjs';
import { readMapping } from '../../lib/tracker/mapping.mjs';
import { recordedClient } from '../helpers/jira.mjs';
import { ROOT } from '../helpers/kit.mjs';

const gates = readGates(join(ROOT, 'quality'));
const mapping = readMapping(join(ROOT, 'tracker'));
// PR #12 of DEMO-12 from the merge-gate recording, changed to touch a workflow: you merge it yourself (dev-workflow
// spec 2.7). Both reports are on its head; only your approval is missing.
const answers = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/quality/api/merge-gate.json'), 'utf8'));
const HEAD = answers['/pulls/12'].head.sha;
const MARKER = 'merge-gate: needs you at a1b2c3d on PR #12';
const TEXT = `${MARKER}. It changes .github/workflows/ci.yml, which only you merge. Still missing: approval on head a1b2c3d. Read the diff, approve the PR on its head commit, then Squash and merge it yourself: merge-gate does not merge it.`;

const touchesWorkflow = (a) => {
  a['/pulls/12/files'].push({ filename: '.github/workflows/ci.yml', status: 'modified' });
  a['/pulls/12/reviews'].pop();
  a['/pulls?direction=asc&sort=created&state=open'].pop();
  a['/issues/12/comments'] = [];
};

// A Jira client that keeps the comments and labels it is given, and records its writes.
function jiraOf({ labels = [], comments = [] } = {}) {
  const writes = [];
  const adf = (text) => ({ type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });
  // A comment is the CI account's unless given as { text, by }.
  const ci = mapping.identities.find(({ id }) => id === 'automation').account_id;
  const stored = comments.map((c, i) => ({ created: `2026-11-02T0${i}:00:00.000+0700`, body: adf(c.text ?? c), author: { accountId: c.by ?? ci } }));
  return {
    writes,
    get: async (path) => (path === '/rest/api/3/field' ? [{ id: 'customfield_10021', name: 'Flagged' }] : { key: 'DEMO-12', fields: { labels } }),
    getAll: async () => stored,
    editItem: async (key, changes) => writes.push(['edit', key, changes]),
    comment: async (key, text) => {
      stored.push({ created: '2026-11-02T12:00:00.000+0700', body: adf(text), author: { accountId: ci } });
      writes.push(['comment', key, text]);
    },
  };
}

// One run of merge-gate on the recording after `change`, with a GitHub writer that keeps PR comments.
async function runOnce(copy, { jira, dryRun = false, notify = true } = {}) {
  const sent = [];
  const lines = [];
  const writer = {
    request: async (method, path, query, body) => {
      sent.push({ method, path, body });
      if (path.endsWith('/comments')) copy[path].push({ body: body.body, user: { login: 'tungph7-ao-dev[bot]' } });
    },
  };
  await runMergeGate({
    github: recordedClient(copy),
    mergeClient: async () => writer,
    notify: notify ? { jira, mapping, space: 'DEMO' } : undefined,
    gates,
    apps: { dev: 'tungph7-ao-dev', review: 'tungph7-ao-review' },
    approvers: ['approver'],
    dryRun,
    log: (line) => lines.push(line),
  });
  return { lines, sent };
}
const recording = (change = touchesWorkflow) => {
  const copy = structuredClone(answers);
  change(copy);
  return copy;
};

test('the notice names the protected paths, what is missing, and approve before you merge', () => {
  const pr = answers['/pulls/12'];
  assert.equal(needsYouText({ pr, paths: ['.github/workflows/ci.yml'], missing: ['approval on head a1b2c3d'] }), TEXT);
  assert.equal(
    needsYouText({ pr, paths: ['.claude/settings.json', '.mcp.json'], missing: [] }),
    `${MARKER}. It changes .claude/settings.json, .mcp.json, which only you merge. You approved its head commit: read the diff, then Squash and merge it yourself: merge-gate does not merge it.`,
  );
});

test('a PR you merge yourself gets one comment on the PR and one flag on its item, once per head', async () => {
  const copy = recording();
  const jira = jiraOf();
  const first = await runOnce(copy, { jira });
  assert.deepEqual(first.lines, [
    'Needs you #12: it changes .github/workflows/ci.yml, so read the diff and merge it yourself (still missing: approval on head a1b2c3d)',
    `Commented on #12: ${MARKER}`,
    `Flagged DEMO-12: ${MARKER}`,
  ]);
  assert.deepEqual(first.sent, [{ method: 'POST', path: '/issues/12/comments', body: { body: TEXT } }]);
  assert.deepEqual(jira.writes, [
    ['edit', 'DEMO-12', { fields: { customfield_10021: [{ value: 'Impediment' }] }, update: { labels: [{ add: 'needs-you' }] } }],
    ['comment', 'DEMO-12', TEXT],
  ]);

  const second = await runOnce(copy, { jira });
  assert.deepEqual(second.lines, ['Needs you #12: it changes .github/workflows/ci.yml, so read the diff and merge it yourself (still missing: approval on head a1b2c3d)']);
  assert.deepEqual(second.sent, []);
  assert.equal(jira.writes.length, 2, 'no second flag or comment on the same head');
});

test('a new head is noticed again', async () => {
  const copy = recording();
  const jira = jiraOf();
  await runOnce(copy, { jira });
  const NEW = 'f'.repeat(40);
  copy['/pulls/12'].head.sha = NEW;
  copy[`/commits/${NEW}/check-runs`] = copy[`/commits/${HEAD}/check-runs`];
  copy[`/commits/${NEW}/status`] = copy[`/commits/${HEAD}/status`];
  for (const review of copy['/pulls/12/reviews']) if (review.commit_id === HEAD) review.commit_id = NEW;
  const again = await runOnce(copy, { jira });
  assert.deepEqual(again.lines.slice(1), ['Commented on #12: merge-gate: needs you at fffffff on PR #12', 'Flagged DEMO-12: merge-gate: needs you at fffffff on PR #12']);
  assert.equal(jira.writes.length, 4);
});

test('nothing is said while an agent or CI still owes something: the notice comes when only you are missing', async () => {
  const jira = jiraOf();
  const noReport = (a) => {
    touchesWorkflow(a);
    a['/pulls/12/reviews'].splice(2, 1);
  };
  const { lines, sent } = await runOnce(recording(noReport), { jira });
  assert.deepEqual(lines, ['Needs you #12: it changes .github/workflows/ci.yml, so read the diff and merge it yourself (still missing: security report on head a1b2c3d; approval on head a1b2c3d)']);
  assert.deepEqual([sent, jira.writes], [[], []]);
});

test('an item another gate already flagged is left alone on Jira; the PR still gets its comment', async () => {
  const jira = jiraOf({ labels: ['needs-you'], comments: ['audit: e1e2e3e on develop was not deployed. PR #12 was merged without: approval.'] });
  const { lines } = await runOnce(recording(), { jira });
  assert.deepEqual(lines.slice(1), [`Commented on #12: ${MARKER}`, 'Left DEMO-12 as it is: it is already flagged Needs you, and not by merge-gate']);
  assert.deepEqual(jira.writes, []);
});

test('a dry run says what it would do and writes nothing; without Jira only the PR is told', async () => {
  const jira = jiraOf();
  const dry = await runOnce(recording(), { jira, dryRun: true });
  assert.deepEqual(dry.lines.slice(1), [`Would comment on #12: ${MARKER}`, `Would flag DEMO-12: ${MARKER}`]);
  assert.deepEqual([dry.sent, jira.writes], [[], []]);

  const noJira = await runOnce(recording(), { jira: undefined });
  assert.deepEqual(noJira.lines.slice(1), [`Commented on #12: ${MARKER}`, 'No JIRA_CI_TOKEN: DEMO-12 is not flagged']);
  // Without the notify context, as in the tests of quality-gates, merge-gate only prints.
  const quiet = await runOnce(recording(), { notify: false });
  assert.deepEqual([quiet.lines.length, quiet.sent], [1, []]);
});

test('a marker written by someone else, on the PR or on the item, does not stop the notice or the flag (T15a)', async () => {
  const copy = recording((a) => {
    touchesWorkflow(a);
    a['/issues/12/comments'].push({ body: `${MARKER}. Done already.`, user: { login: 'someone' } });
  });
  const jira = jiraOf({ comments: [{ text: `${MARKER}. Done already.`, by: 'agent' }] });
  const { lines } = await runOnce(copy, { jira });
  assert.deepEqual(lines.slice(1), [`Commented on #12: ${MARKER}`, `Flagged DEMO-12: ${MARKER}`]);
});

test('past eight paths, the notice counts them under each protected path instead of listing them (T15a)', () => {
  const pr = answers['/pulls/12'];
  const paths = [...Array.from({ length: 7 }, (_, i) => `.ai-orchestrator/lib/m${i}.mjs`), '.claude/settings.json', '.claude/hooks/gh-guard.mjs', '.mcp.json'];
  assert.equal(
    needsYouText({ pr, paths, missing: [], gates }),
    `${MARKER}. It changes 10 protected files: .ai-orchestrator/** (7), .claude/** (2), .mcp.json (1), which only you merge. You approved its head commit: read the diff, then Squash and merge it yourself: merge-gate does not merge it.`,
  );
  assert.match(needsYouText({ pr, paths: paths.slice(0, 8), missing: [], gates }), /It changes \.ai-orchestrator\/lib\/m0\.mjs, .*\.claude\/settings\.json, which only you merge/, 'eight are still listed');
});
