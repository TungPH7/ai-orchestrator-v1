import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readGates } from '../../lib/quality/gates.mjs';
import { reportGaps } from '../../lib/quality/merge-gate.mjs';
import { readReviewReport } from '../../lib/quality/pull-request.mjs';
import { decideKitCopy, kitCopyReport, kitReviewOf, postKitCopyReports, readKitCopy, renderedReason } from '../../lib/workflow/kit-copy.mjs';
import { ROOT } from '../helpers/kit.mjs';

const gates = readGates(join(ROOT, 'quality'));
const apps = { dev: 'ao-dev', review: 'ao-review' };
const REVIEW_BOT = 'ao-review[bot]';
const REF_HEAD = 'c'.repeat(40);
const MERGE = 'd'.repeat(40);
const HEAD = 'e'.repeat(40);
const BASE = 'b'.repeat(40);
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
const OURS = [blob('.claude/settings.json', 'our-settings'), blob('.claude/skills/stack-skill/SKILL.md', 'stack'), blob('apps/api/main.ts', 'x2')];
// The peer's own files and the project's differ, and neither is compared. The rendered agent holds the space key of each.
const peerTree = (more = []) => treeOf([...KIT, blob('.ai-orchestrator/deploy.yaml', 'peer'), blob('.claude/settings.json', 'peer-settings'), blob('src/peer.ts', 'x1'), ...more]);
const ourKit = (without = []) => KIT.filter(({ path }) => !without.includes(path)).map((e) => (e.path === '.claude/agents/security.md' ? { ...e, sha: 'our-agent' } : e));
const headTree = (more = [], without = []) => treeOf([...ourKit(without), ...OURS, ...more]);
// Before the PR: the older kit, in which only a.mjs and the agent differ.
const baseTree = (more = []) => treeOf([...ourKit().map((e) => (e.path === '.ai-orchestrator/lib/a.mjs' ? { ...e, sha: 'a1' } : e.path === '.claude/agents/security.md' ? { ...e, sha: 'our-old-agent' } : e)), ...OURS, ...more]);
const swap = (tree, entry) => ({ ...tree, tree: tree.tree.map((e) => (e.path === entry.path ? entry : e)) });

const report = (role, rows = '') => `# Review: chore(kit): copy the kit (DEMO-30)\n\nRole: ${role}\n\n## Context\n\nA review.\n\n## Findings\n\n| Severity | Axis | Where | Finding | Suggested fix |\n|---|---|---|---|---|\n${rows}\n\n## Verdict\n\nDone.\n`;
const review = (role, more = {}) => ({ user: { login: REVIEW_BOT }, commit_id: REF_HEAD, body: report(role), state: 'COMMENTED', ...more });
const reference = (more = {}) => ({
  pull: { number: 24, merged_at: '2026-11-07T10:00:00Z', merged_by: { login: 'owner' }, merge_commit_sha: MERGE, base: { ref: 'develop' }, head: { sha: REF_HEAD } },
  reviews: [review('reviewer'), review('security')],
  newest: MERGE,
  tree: peerTree(),
  ...more,
});
const decide = (more = {}) => decideKitCopy({ claim, peers: ['acme/peer'], headTree: headTree(), baseTree: baseTree(), reference: reference(), gates, apps, approvers: ['owner'], ...more });
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

test('a PR whose kit files match the reviewed head passes, and the files of one project only do not count', () => {
  assert.deepEqual(decide(), { ok: true, compared: 5, reference: { ...claim, head: REF_HEAD } });
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

// The files a PR changes come from its trees, by SHA: the list of GET /pulls/{n}/files stops at 3000 and is read by
// number (review of ao-pilot PR #24).
test('a PR that changes anything outside the kit files is reviewed as usual, however many files it has', () => {
  for (const path of ['apps/api/main.ts', '.claude/settings.json', '.ai-orchestrator/deploy.yaml', '.ai-orchestrator/roster.local.yaml', '.github/workflows/deploy.yml', 'src/zz-after-3000-files.ts']) {
    const changed = blob(path, 'new');
    const head = headTree().tree.some((e) => e.path === path) ? swap(headTree(), changed) : headTree([changed]);
    refused({ headTree: head }, new RegExp(`changes ${path.replaceAll('.', '\\.')}, which is not a kit file`));
  }
  refused({ baseTree: baseTree([blob('apps/api/gone.ts', 'g1')]) }, /changes apps\/api\/gone\.ts, which is not a kit file/);
});

test('every file the PR changes matches the reference by content, mode and kind', () => {
  refused({ headTree: swap(headTree(), blob('.ai-orchestrator/lib/a.mjs', 'a3')) }, /\.ai-orchestrator\/lib\/a\.mjs differs from acme\/peer#24/);
  refused({ headTree: swap(headTree(), blob('.ai-orchestrator/lib/a.mjs', 'a2', { mode: '100755' })) }, /a\.mjs differs/);
  refused({ headTree: swap(headTree(), blob('.ai-orchestrator/lib/a.mjs', 'a2', { mode: '120000' })) }, /a\.mjs differs/);
  refused({ headTree: swap(headTree(), blob('.ai-orchestrator/lib/a.mjs', 'a2', { type: 'commit', mode: '160000' })) }, /a\.mjs differs/);
});

test('a kit file the PR removes or renames away must be gone from the reference too', () => {
  const old = blob('.ai-orchestrator/lib/old.mjs', 'o1');
  assert.equal(decide({ baseTree: baseTree([old]) }).ok, true, 'the reference removed it too');
  refused({ baseTree: baseTree([old]), reference: reference({ tree: peerTree([old]) }) }, /old\.mjs differs/);
});

test('the kit files that must be the same are compared both ways: no part copy, no extra file', () => {
  refused({ headTree: headTree([blob('.ai-orchestrator/lib/extra.mjs', 'z1')]) }, /extra\.mjs differs/);
  refused({ headTree: headTree([], ['.claude/hooks/guard.mjs']) }, /guard\.mjs differs/);
  refused({ reference: reference({ tree: peerTree([blob('.ai-orchestrator/lib/new.mjs', 'n1')]) }) }, /new\.mjs differs/);
});

test('a stack skill of one project stays, a skill the PR changes must match, and a skill it removes needs a review', () => {
  assert.equal(decide({ headTree: headTree([blob('.claude/skills/other-stack/SKILL.md', 'q')]), baseTree: baseTree([blob('.claude/skills/other-stack/SKILL.md', 'q')]) }).ok, true);
  refused({ headTree: swap(headTree(), blob('.claude/skills/stack-skill/SKILL.md', 'changed')) }, /stack-skill\/SKILL\.md differs/);
  // Both sides lack it, which is no match: the reference never had it (review of ao-pilot PR #24).
  refused({ headTree: { ...headTree(), tree: headTree().tree.filter(({ path }) => !path.startsWith('.claude/skills/stack-skill/')) } }, /removes \.claude\/skills\/stack-skill\/SKILL\.md, which only a review can judge/);
});

// Review of ao-pilot PR #24: render-agents --check compares only the files it renders, so a file added beside them
// was read by no one.
test('rendered files are compared by name both ways; their content is left to the render check', () => {
  assert.equal(decide().ok, true, 'the agent differs from the peer, as the space key does');
  refused({ headTree: headTree([blob('.claude/agents/helper.md', 'z')]) }, /\.claude\/agents\/helper\.md is in the PR but not in acme\/peer#24/);
  refused({ headTree: headTree([blob('.claude/agents/helper.md', 'z')]), baseTree: baseTree([blob('.claude/agents/helper.md', 'z')]) }, /helper\.md is in the PR but not/);
  refused({ reference: reference({ tree: peerTree([blob('.claude/agents/qa.md', 'q')]) }) }, /\.claude\/agents\/qa\.md is in acme\/peer#24 but not in the PR/);
});

test('a tree GitHub cut short proves nothing', () => {
  refused({ headTree: { ...headTree(), truncated: true } }, /tree of the head is too large/);
  refused({ baseTree: { ...baseTree(), truncated: true } }, /tree of the merge base is too large/);
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

// A project and a peer on GitHub, as the two clients see them.
function world({ peerRead = () => {}, headNow = HEAD, render = async () => null } = {}) {
  const asked = [];
  const refer = reference();
  const peer = {
    get: async (path, query) => {
      asked.push(['peer', path, query]);
      peerRead(path);
      if (path === '/pulls/24') return refer.pull;
      if (path === '/commits') return [{ sha: refer.newest }];
      if (path === `/git/trees/${REF_HEAD}`) return refer.tree;
      throw new Error(`unexpected ${path}`);
    },
    getAll: async (path) => {
      asked.push(['peer', path]);
      return refer.reviews;
    },
  };
  const github = {
    get: async (path, query) => {
      asked.push(['project', path, query]);
      if (path === '/pulls/30') return { head: { sha: headNow } };
      if (path === `/compare/release/v0.3.0...${HEAD}`) return { merge_base_commit: { sha: BASE } };
      if (path === `/git/trees/${HEAD}`) return headTree();
      if (path === `/git/trees/${BASE}`) return baseTree();
      throw new Error(`unexpected ${path}`);
    },
    getAll: async (path) => {
      asked.push(['project', path]);
      throw new Error(`unexpected list ${path}`);
    },
  };
  const opened = [];
  return { asked, opened, input: { pr: { number: 30, headSha: HEAD, base: 'release/v0.3.0', body: 'Kit review: acme/peer#24' }, github, peer: (repo) => { opened.push(repo); return peer; }, peers: ['acme/peer'], gates, apps, approvers: ['owner'], render } };
}

test('readKitCopy reads the trees by SHA, decides, and always renders; without the line of the description it reads nothing', async () => {
  const rendered = [];
  const { input, asked } = world({ render: async (sha) => { rendered.push(sha); return null; } });
  assert.deepEqual(await readKitCopy(input), { ok: true, compared: 5, reference: { ...claim, head: REF_HEAD } });
  assert.deepEqual(rendered, [HEAD]);
  assert.deepEqual(asked.find(([, path]) => path === '/commits')[2], { path: '.ai-orchestrator/lib', sha: 'develop', per_page: 1 });
  assert.equal(asked.some(([, path]) => path.endsWith('/files')), false, 'no list of files, which GitHub cuts at 3000');
  const none = world();
  assert.equal(await readKitCopy({ ...none.input, pr: { ...none.input.pr, body: 'A usual PR.' } }), null);
  assert.deepEqual(none.asked, []);
});

test('readKitCopy opens no repository outside AO_KIT_PEERS: your login reads only those', async () => {
  const { input, opened } = world();
  const decision = await readKitCopy({ ...input, pr: { ...input.pr, body: 'Kit review: evil/repo#1' } });
  assert.deepEqual(decision, { ok: false, reason: 'evil/repo is not in AO_KIT_PEERS' });
  assert.deepEqual(opened, []);
});

test('readKitCopy falls back to the review on any error, on a push while it reads, and on a kit without kit_copy', async () => {
  const failing = world({ peerRead: () => { throw new Error('GitHub GET returned 404'); } });
  assert.deepEqual(await readKitCopy(failing.input), { ok: false, reason: 'could not read the reference: GitHub GET returned 404' });
  const pushed = world({ headNow: 'f'.repeat(40) });
  assert.deepEqual(await readKitCopy(pushed.input), { ok: false, reason: `the head of PR #30 moved from ${HEAD.slice(0, 7)} while it was compared` });
  const old = world();
  assert.equal(await readKitCopy({ ...old.input, gates: { ...gates, kit_copy: undefined } }), null);
});

test('a wrong render refuses the copy, and a copy refused before it renders nothing', async () => {
  const wrong = world({ render: async () => 'the rendered files at eeeeeee do not match their sources' });
  assert.deepEqual(await readKitCopy(wrong.input), { ok: false, reason: 'the rendered files at eeeeeee do not match their sources' });
  const rendered = [];
  const outside = world({ render: async (sha) => { rendered.push(sha); return null; } });
  assert.equal((await readKitCopy({ ...outside.input, peers: ['acme/peer'], pr: { ...outside.input.pr, body: 'Kit review: acme/peer#25' } })).ok, false);
  assert.deepEqual(rendered, []);
});

test('renderedReason always removes its tree, and says what did not match', () => {
  const steps = [];
  const tree = (ok = true) => ({ add: () => { steps.push('add'); return ok ? { ok, path: '/tmp/t' } : { ok, reason: 'no such commit' }; }, remove: () => { steps.push('remove'); } });
  assert.equal(renderedReason({ sha: HEAD, tree: tree(), render: (path) => { steps.push(path); return { status: 0, text: '' }; } }), null);
  assert.deepEqual(steps, ['add', '/tmp/t', 'remove']);
  assert.equal(renderedReason({ sha: HEAD, tree: tree(), render: () => ({ status: 1, text: '.claude/agents/security.md is stale\n' }) }), 'the rendered files at eeeeeee do not match their sources: .claude/agents/security.md is stale');
  steps.length = 0;
  assert.throws(() => renderedReason({ sha: HEAD, tree: tree(), render: () => { throw new Error('boom'); } }), /boom/);
  assert.deepEqual(steps, ['add', 'remove']);
  assert.equal(renderedReason({ sha: HEAD, tree: tree(false), render: () => assert.fail('no tree, no render') }), 'the tree of eeeeeee could not be made: no such commit');
});

test('the reports go on the head that was compared, whatever the head is by then', async () => {
  const posted = [];
  const github = { request: async (method, path, query, body) => { posted.push({ method, path, body }); } };
  const step = { number: 30, title: 'chore(kit): copy the kit (SMP-30)', key: 'SMP-30', sha: HEAD, roles: ['security'], reference: { ...claim, head: REF_HEAD }, compared: 4 };
  const notes = await postKitCopyReports({ github, step });
  assert.equal(posted.length, 1);
  assert.deepEqual([posted[0].method, posted[0].path, posted[0].body.commit_id, posted[0].body.event], ['POST', '/pulls/30/reviews', HEAD, 'COMMENT']);
  assert.match(posted[0].body.body, /^Role: security$/m);
  assert.deepEqual(notes, ['Posted the security report of PR #30 on eeeeeee: a copy of acme/peer#24, 4 files compared, no agent ran.']);
});
