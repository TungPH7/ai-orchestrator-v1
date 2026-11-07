import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readGates } from '../../lib/quality/gates.mjs';
import { reportGaps } from '../../lib/quality/merge-gate.mjs';
import { readReviewReport } from '../../lib/quality/pull-request.mjs';
import { decideKitCopy, kitCopyReport, kitReviewOf } from '../../lib/workflow/kit-copy.mjs';
import { ROOT } from '../helpers/kit.mjs';

const gates = readGates(join(ROOT, 'quality'));
const apps = { dev: 'ao-dev', review: 'ao-review' };
const REVIEW_BOT = 'ao-review[bot]';
const REF_HEAD = 'c'.repeat(40);
const MERGE = 'd'.repeat(40);
const HEAD = 'e'.repeat(40);
const claim = { repo: 'acme/peer', number: 24 };

const blob = (path, sha, more = {}) => ({ path, mode: '100644', type: 'blob', sha, ...more });
const treeOf = (entries, truncated = false) => ({ truncated, tree: [{ path: '.ai-orchestrator', mode: '040000', type: 'tree', sha: 't0' }, ...entries] });
const KIT = [
  blob('.ai-orchestrator/lib/a.mjs', 'a2'),
  blob('.ai-orchestrator/package.json', 'p1'),
  blob('.claude/hooks/guard.mjs', 'h1'),
  blob('.claude/skills/kit-skill/SKILL.md', 's1'),
  blob('.claude/agents/security.md', 'peer-agent'),
  blob('.github/workflows/ci.yml', 'c1'),
];
// The peer's own files and the project's differ, and neither is compared.
const peerTree = (more = []) => treeOf([...KIT, blob('.ai-orchestrator/deploy.yaml', 'peer'), blob('.claude/settings.json', 'peer-settings'), blob('src/peer.ts', 'x1'), ...more]);
const headTree = (more = [], without = []) => treeOf([...KIT.filter(({ path }) => !without.includes(path)).map((e) => (e.path === '.claude/agents/security.md' ? { ...e, sha: 'our-agent' } : e)), blob('.claude/settings.json', 'our-settings'), blob('.claude/skills/stack-skill/SKILL.md', 'stack'), blob('apps/api/main.ts', 'x2'), ...more]);

const report = (role, rows = '') => `# Review: chore(kit): copy the kit (DEMO-30)\n\nRole: ${role}\n\n## Context\n\nA review.\n\n## Findings\n\n| Severity | Axis | Where | Finding | Suggested fix |\n|---|---|---|---|---|\n${rows}\n\n## Verdict\n\nDone.\n`;
const review = (role, more = {}) => ({ user: { login: REVIEW_BOT }, commit_id: REF_HEAD, body: report(role), state: 'COMMENTED', ...more });
const reference = (more = {}) => ({
  pull: { number: 24, merged_at: '2026-11-07T10:00:00Z', merged_by: { login: 'owner' }, merge_commit_sha: MERGE, base: { ref: 'develop' }, head: { sha: REF_HEAD } },
  reviews: [review('reviewer'), review('security')],
  newest: MERGE,
  tree: peerTree(),
  ...more,
});
const pr = (files = ['.ai-orchestrator/lib/a.mjs']) => ({ headSha: HEAD, files: files.map((filename) => ({ filename, status: 'modified' })) });
const decide = (more = {}) => decideKitCopy({ claim, peers: ['acme/peer'], pr: pr(), headTree: headTree(), reference: reference(), gates, apps, approvers: ['owner'], ...more });
const refused = (more, text) => {
  const decision = decide(more);
  assert.equal(decision.ok, false);
  assert.match(decision.reason, text);
};

test('the line of the PR description names one repository and PR; anything else is no claim', () => {
  assert.deepEqual(kitReviewOf('## What Changed\n\nKit review: acme/peer#24\n'), claim);
  assert.deepEqual(kitReviewOf('Kit review: acme/peer#24\r\nnext line'), claim, 'GitHub keeps the line ends of a form');
  for (const body of [null, '', 'Kit review: acme/peer', 'Kit review: peer#24', 'see Kit review: acme/peer#24', 'Kit review: acme/peer#24 and more', 'Kit review: acme/peer#24\nKit review: acme/other#25']) {
    assert.equal(kitReviewOf(body), null, String(body));
  }
});

test('a PR whose kit files match the reviewed head passes, and the kit files of one side only count', () => {
  assert.deepEqual(decide(), { ok: true, compared: 4, reference: { ...claim, head: REF_HEAD }, renders: false });
});

test('the reference must be a reviewed, merged PR of a listed repository', () => {
  refused({ peers: ['acme/other'] }, /acme\/peer is not in AO_KIT_PEERS/);
  const pull = reference().pull;
  refused({ reference: reference({ pull: { ...pull, merged_at: null } }) }, /acme\/peer#24 is not merged/);
  refused({ reference: reference({ pull: { ...pull, base: { ref: 'feature/DEMO-1-x' } } }) }, /merged into feature\/DEMO-1-x, not a protected branch/);
  refused({ reference: reference({ pull: { ...pull, merged_by: { login: 'someone' } } }) }, /merged by someone, not by you/);
});

test('the reference needs both reports on its head, with no Critical or High open', () => {
  refused({ reference: reference({ reviews: [review('reviewer')] }) }, /security report on head ccccccc/);
  refused({ reference: reference({ reviews: [review('reviewer'), review('security', { commit_id: 'f'.repeat(40) })] }) }, /security report on head/);
  refused({ reference: reference({ reviews: [review('reviewer'), review('security', { body: report('security', '| High | Security | a.mjs:1 | A hole | Fix it |') })] }) }, /without Critical or High findings/);
  refused({ reference: reference({ reviews: [review('reviewer'), review('security', { user: { login: 'someone' } })] }) }, /security report on head/);
});

test('a report written by ao-step is no reference: every copy points at a real review', () => {
  const copied = kitCopyReport({ role: 'security', pr: { title: 'chore(kit): copy the kit (SMP-30)' }, key: 'SMP-30', reference: { ...claim, head: REF_HEAD }, compared: 5 });
  refused({ reference: reference({ reviews: [review('reviewer'), review('security', { body: copied })] }) }, /acme\/peer#24 is a kit copy too/);
});

test('the reference is the newest kit of its repository, so a PR cannot go back to an older one', () => {
  refused({ reference: reference({ newest: 'b'.repeat(40) }) }, /acme\/peer#24 is not the newest PR of acme\/peer on \.ai-orchestrator\/lib/);
});

test('a PR that changes anything outside the kit files is reviewed as usual', () => {
  for (const path of ['apps/api/main.ts', '.claude/settings.json', '.ai-orchestrator/deploy.yaml', '.ai-orchestrator/roster.local.yaml', '.github/workflows/deploy.yml']) {
    refused({ pr: pr(['.ai-orchestrator/lib/a.mjs', path]) }, new RegExp(`changes ${path.replaceAll('.', '\\.')}, which is not a kit file`));
  }
});

test('every file the PR changes matches the reference by content, mode and kind', () => {
  const swapped = (entry) => headTree().tree.map((e) => (e.path === entry.path ? entry : e));
  refused({ headTree: { truncated: false, tree: swapped(blob('.ai-orchestrator/lib/a.mjs', 'a3')) } }, /\.ai-orchestrator\/lib\/a\.mjs differs from acme\/peer#24/);
  refused({ headTree: { truncated: false, tree: swapped(blob('.ai-orchestrator/lib/a.mjs', 'a2', { mode: '100755' })) } }, /a\.mjs differs/);
  refused({ headTree: { truncated: false, tree: swapped(blob('.ai-orchestrator/lib/a.mjs', 'a2', { mode: '120000' })) } }, /a\.mjs differs/);
  refused({ headTree: { truncated: false, tree: swapped(blob('.ai-orchestrator/lib/a.mjs', 'a2', { type: 'commit', mode: '160000' })) } }, /a\.mjs differs/);
});

test('a file the PR removes or renames away must be gone from the reference too', () => {
  const removed = { headSha: HEAD, files: [{ filename: '.claude/skills/kit-skill/SKILL.md', status: 'removed' }] };
  refused({ pr: removed, headTree: headTree([], ['.claude/skills/kit-skill/SKILL.md']) }, /kit-skill\/SKILL\.md differs/);
  const renamed = { headSha: HEAD, files: [{ filename: '.claude/skills/kit-skill/SKILL.md', previous_filename: '.claude/skills/old/SKILL.md', status: 'renamed' }] };
  assert.equal(decide({ pr: renamed }).ok, true, 'the old name is on neither side');
  refused({ pr: renamed, reference: reference({ tree: peerTree([blob('.claude/skills/old/SKILL.md', 'o1')]) }) }, /old\/SKILL\.md differs/);
});

test('the kit files that must be the same are compared both ways: no part copy, no extra file', () => {
  refused({ headTree: headTree([blob('.ai-orchestrator/lib/extra.mjs', 'z1')]) }, /extra\.mjs differs/);
  refused({ headTree: headTree([], ['.claude/hooks/guard.mjs']) }, /guard\.mjs differs/);
  refused({ reference: reference({ tree: peerTree([blob('.ai-orchestrator/lib/new.mjs', 'n1')]) }) }, /new\.mjs differs/);
});

test('a stack skill of one project stays, and a skill the PR changes must match', () => {
  assert.equal(decide({ headTree: headTree([blob('.claude/skills/other-stack/SKILL.md', 'q')]) }).ok, true);
  refused({ pr: pr(['.claude/skills/stack-skill/SKILL.md']) }, /stack-skill\/SKILL\.md differs/);
});

test('rendered files are not compared with the peer: ao-step renders them again', () => {
  assert.deepEqual(decide({ pr: pr(['.claude/agents/security.md']) }).renders, true);
  assert.deepEqual(decide({ pr: pr(['.claude/rules/ai-orchestrator.md']) }).renders, true);
  assert.deepEqual(decide().renders, false);
});

test('a tree GitHub cut short proves nothing', () => {
  refused({ headTree: { ...headTree(), truncated: true } }, /tree of the head is too large/);
  refused({ reference: reference({ tree: { ...peerTree(), truncated: true } }) }, /tree of acme\/peer#24 is too large/);
});

test('merge-gate and audit read the report of ao-step as a report of its role, with no finding', () => {
  for (const role of gates.github_apps.review.roles) {
    const body = kitCopyReport({ role, pr: { title: 'chore(kit): copy the kit (SMP-30)' }, key: 'SMP-30', reference: { ...claim, head: REF_HEAD }, compared: 5 });
    const read = readReviewReport(body, gates.github_apps.review.roles);
    assert.deepEqual([read.ok, read.role, read.findings, read.problems], [true, role, [], []]);
    assert.match(body, /^# Review: chore\(kit\): copy the kit \(SMP-30\)\n/);
    assert.match(body, /^Kit copy of: acme\/peer#24 at c{40}$/m);
  }
  const posted = gates.github_apps.review.roles.map((role) => ({ user: { login: REVIEW_BOT }, commit_id: HEAD, body: kitCopyReport({ role, pr: { title: 'chore(kit): a title without its key' }, key: 'SMP-30', reference: { ...claim, head: REF_HEAD }, compared: 5 }) }));
  assert.deepEqual(reportGaps(posted, HEAD, 'on head eeeeeee', gates.github_apps.review.roles, REVIEW_BOT), []);
});
