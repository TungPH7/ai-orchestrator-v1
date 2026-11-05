import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { auditRange } from '../../lib/quality/audit.mjs';
import { readGates } from '../../lib/quality/gates.mjs';
import { recordedClient } from '../helpers/jira.mjs';
import { ROOT } from '../helpers/kit.mjs';

const gates = readGates(join(ROOT, 'quality'));
// PR #12 of the merge-gate recording met every gate at its head commit; each commit below is the squash of a copy.
const answers = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/quality/api/merge-gate.json'), 'utf8'));
const BOT = 'tungph7-ao-dev[bot]';
const [S, A, B, C, M, P] = ['5', 'a', 'b', 'c', 'd', 'e'].map((ch) => ch.repeat(40));

// The recorded answers for `sha` as the squash of PR `number`, or, with number null, as a commit pushed without one.
function commit(sha, number) {
  const entry = { sha, commit: { message: `feat(cart): change ${sha.slice(0, 7)} (DEMO-12)` }, author: { login: BOT }, committer: { login: BOT }, parents: [{ sha: S }], files: [] };
  if (number === null) return { [`/commits/${sha}`]: entry, [`/commits/${sha}/pulls`]: [] };
  const pull = { ...structuredClone(answers['/pulls/12']), number, state: 'closed', merged_at: '2026-11-06T01:00:00Z', merge_commit_sha: sha, merged_by: { login: BOT, type: 'Bot' } };
  return {
    [`/commits/${sha}`]: entry,
    [`/commits/${sha}/pulls`]: [pull],
    [`/pulls/${number}`]: pull,
    [`/pulls/${number}/files`]: answers['/pulls/12/files'],
    [`/pulls/${number}/reviews`]: answers['/pulls/12/reviews'],
  };
}
const github = (...commits) => recordedClient(Object.assign({}, answers, ...commits));

// A git that answers only the commands it was given, as the deployer's mirror would.
const git = (outputs) => async (args) => {
  const key = args.join(' ');
  if (!(key in outputs)) throw new Error(`no git answer for: git ${key}`);
  return outputs[key];
};
const range = (options) => auditRange({ branch: 'develop', gates, apps: { dev: 'tungph7-ao-dev', review: 'tungph7-ao-review' }, approvers: ['approver'], space: 'DEMO', ...options });
const summary = ({ audits }) => audits.map(({ sha, ok }) => `${sha.slice(0, 1)} ${ok ? 'ok' : 'fail'}`);

test('auditRange audits every first-parent commit after the last one audited, oldest first', async () => {
  const result = await range({
    git: git({ [`merge-base ${S} ${C}`]: `${S}\n`, [`rev-list --first-parent --reverse ${S}..${C}`]: `${A}\n${B}\n${C}\n` }),
    github: github(commit(A, 21), commit(B, 22), commit(C, 23)),
    since: S,
    head: C,
  });
  assert.deepEqual({ base: result.base, rewritten: result.rewritten }, { base: S, rewritten: false });
  assert.deepEqual(summary(result), ['a ok', 'b ok', 'c ok']);
  assert.deepEqual(result.audits.map(({ pr }) => pr), [21, 22, 23]);
  // The branch each PR came from tells the deployer a hotfix from the merge of a release on main.
  assert.deepEqual(result.audits[0].pull, { number: 21, head: 'feature/DEMO-12-login' });
});

test('a commit pushed without a PR under a valid one fails the range at that commit, and the audit stops there', async () => {
  // No answers are recorded for C: auditing it would throw.
  const result = await range({
    git: git({ [`merge-base ${S} ${C}`]: S, [`rev-list --first-parent --reverse ${S}..${C}`]: `${A}\n${P}\n${C}\n` }),
    github: github(commit(A, 21), commit(P, null)),
    since: S,
    head: C,
  });
  assert.deepEqual(summary(result), ['a ok', 'e fail']);
  assert.deepEqual(result.audits[1].problems, ['eeeeeee on develop is not the merge of a PR into develop: it was pushed without one']);
});

test('when the history was rewritten, the audit starts again from the newest commit both histories share', async () => {
  // S was force-pushed away: develop now runs M, then B and C.
  const result = await range({
    git: git({ [`merge-base ${S} ${C}`]: M, [`rev-list --first-parent --reverse ${M}..${C}`]: `${B}\n${C}\n` }),
    github: github(commit(B, 22), commit(C, 23)),
    since: S,
    head: C,
  });
  assert.deepEqual({ base: result.base, rewritten: result.rewritten }, { base: M, rewritten: true });
  assert.deepEqual(summary(result), ['b ok', 'c ok']);
});

test('nothing new since the last audit: no commit to audit', async () => {
  const result = await range({ git: git({ [`merge-base ${C} ${C}`]: C, [`rev-list --first-parent --reverse ${C}..${C}`]: '' }), github: github(), since: C, head: C });
  assert.deepEqual(result, { base: C, rewritten: false, audits: [] });
});

test('auditRange gives git only full commit hashes, so no value can pass for an option', async () => {
  for (const [since, head] of [['--output=x', C], [S, 'develop'], [S, C.slice(0, 7)]]) {
    await assert.rejects(range({ git: git({}), github: github(), since, head }), /not a full commit hash/);
  }
});
