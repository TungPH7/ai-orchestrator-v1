import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readRoster } from '../../lib/agents/roster.mjs';
import { readContract } from '../../lib/contract.mjs';
import { readGates } from '../../lib/quality/gates.mjs';
import { markBody, skipBody } from '../../lib/quality/review-choice.mjs';
import { readMapping } from '../../lib/tracker/mapping.mjs';
import { afterMergeNote, afterMergeReport, afterMergeTodo, findingsSource, fixSubtask, fixSummary, fixTask, reportComment, reportLine, splitFindings } from '../../lib/workflow/after-merge.mjs';
import { readAfterMerge } from '../../lib/workflow/facts.mjs';
import { findingsComment } from '../../lib/workflow/findings.mjs';
import { planRound } from '../../lib/workflow/dispatch.mjs';
import { decideStep } from '../../lib/workflow/steps.mjs';
import { CONTRACT_DIR, ROOT } from '../helpers/kit.mjs';

const contract = readContract(CONTRACT_DIR);
const roster = readRoster(join(ROOT, 'agents'));
const gates = readGates(join(ROOT, 'quality'));
const mapping = readMapping(join(ROOT, 'tracker'));
const options = { roster, contract, gates, mapping, appRoles: { api: 'be-dev', web: 'fe-dev' } };
const HEAD = 'd'.repeat(40);
const BASE = 'b'.repeat(40);
const BOT = 'tungph7-ao-review[bot]';

const report = (role, rows = []) => [
  '# Review: review sau merge (DEMO-20)',
  '',
  `Role: ${role}`,
  'Verdict: ok',
  '',
  '## Findings',
  '',
  '| Severity | Where | Finding | Fix |',
  '|---|---|---|---|',
  ...rows.map(({ severity, where, finding }) => `| ${severity} | ${where} | ${finding} | sửa |`),
].join('\n');

// Epic DEMO-20 with Stories DEMO-21 and DEMO-22, both merged without review, and Task DEMO-23 not merged yet.
function facts(change = () => {}) {
  const f = {
    command: 'review',
    arg: 'DEMO-20',
    space: 'DEMO',
    item: { key: 'DEMO-20', type: 'Epic', workType: 'epic', state: 'in-progress', status: 'In Progress', summary: 'Giỏ hàng', labels: [], children: [], subtasks: [], parent: null },
    pr: null,
    docs: null,
    afterMerge: {
      pulls: [
        { number: 31, key: 'DEMO-21', merged: true, skipped: true, mark: null },
        { number: 32, key: 'DEMO-22', merged: true, skipped: true, mark: null },
        { number: 33, key: 'DEMO-24', merged: true, skipped: false, mark: null },
      ],
      files: ['apps/api/src/cart/cart.service.ts', 'apps/web/app/cart/page.tsx'],
      base: BASE,
      head: HEAD,
      levels: { 'DEMO-21': null, 'DEMO-22': 'standard' },
      waiting: ['DEMO-23'],
      reports: {},
    },
    run: null,
  };
  return change(f) ?? f;
}
const decide = (f, more = {}) => decideStep('review', f, { ...options, ...more });
const runOf = (role, more = {}) => ({ command: 'review', role, key: 'DEMO-20', purpose: 'review-after-merge', effort: 'high', head: HEAD, note: afterMergeNote([31, 32]), outcome: 'done', session: `s-${role}`, checkout: { branch: 'develop', pull: true }, ...more });

test('/ao-review <Epic> runs reviewer and security at once on what the PRs that skipped review changed (spec 4.2–4.4)', () => {
  const decision = decide(facts());
  assert.equal(decision.go, true);
  assert.deepEqual(decision.runs.map(({ role, effort, purpose, together }) => `${role} ${effort} ${purpose} ${together}`), ['reviewer high review-after-merge true', 'security high review-after-merge true']);
  const [first] = decision.runs;
  assert.deepEqual(first.worktree, { name: 'after-DEMO-20-reviewer', sha: HEAD });
  assert.deepEqual(first.checkout, { branch: 'develop', pull: true });
  assert.equal(first.note, 'after-merge:31,32');
  assert.match(first.prompt, /^Review after merge for DEMO-20: 2 PRs of its items merged into develop without review: #31 \(DEMO-21\), #32 \(DEMO-22\)\./);
  assert.match(first.prompt, /git diff b{40} d{40} -- <file>/);
  assert.match(first.prompt, /save it as \.ai\/reviews\/DEMO-20-reviewer-ddddddd\.md in the project folder\. Do not post it anywhere/);
  assert.match(first.prompt, /^- apps\/web\/app\/cart\/page\.tsx$/m);
  assert.ok(decision.lines.includes('Not merged yet, so not in this review: DEMO-23'));
  assert.ok(decision.lines.includes('To review after merge: PR #31 (DEMO-21), PR #32 (DEMO-22); 2 files'));
  // A tier of normal files only: reviewer alone, unless an item is heavy.
  const normal = (f) => (f.afterMerge.files = ['apps/web/app/cart/page.tsx']) && f;
  assert.deepEqual(decide(facts(normal)).runs.map(({ role }) => role), ['reviewer']);
  assert.deepEqual(decide(facts((f) => normal(f) && (f.afterMerge.levels['DEMO-21'] = 'heavy') && f)).runs.map(({ role }) => role), ['reviewer', 'security']);
});

test('once both runs are done, ao-step posts from the saved reports; a stopped run goes on; a missing report stops', () => {
  const reports = { [afterMergeReport('DEMO-20', 'reviewer', HEAD)]: report('reviewer'), [afterMergeReport('DEMO-20', 'security', HEAD)]: report('security') };
  const done = (f) => {
    f.run = { runs: [runOf('reviewer'), runOf('security')] };
    f.afterMerge.reports = reports;
    return f;
  };
  assert.deepEqual(decide(facts(done)).runs, [{ action: 'after-merge-post', key: 'DEMO-20', epic: 'DEMO-20', head: HEAD, base: BASE, pulls: [31, 32], items: ['DEMO-21', 'DEMO-22'], files: ['apps/api/src/cart/cart.service.ts', 'apps/web/app/cart/page.tsx'], reports: { reviewer: 'DEMO-20-reviewer-ddddddd.md', security: 'DEMO-20-security-ddddddd.md' } }]);
  // Only the reviewer is done: security runs; a run of another set of PRs does not count.
  assert.deepEqual(decide(facts((f) => done(f) && (f.run.runs = [runOf('reviewer'), runOf('security', { note: 'after-merge:31' })]) && f)).runs.map(({ role }) => role), ['security']);
  const stopped = decide(facts((f) => done(f) && (f.run.runs = [runOf('reviewer'), runOf('security', { outcome: 'usage-limit' })]) && f));
  assert.deepEqual(stopped.runs.map(({ role, resume, worktree }) => `${role} ${resume} ${worktree.name}`), ['security s-security after-DEMO-20-security']);
  const missing = decide(facts((f) => done(f) && (f.afterMerge.reports = { [afterMergeReport('DEMO-20', 'reviewer', HEAD)]: report('reviewer') }) && f));
  assert.equal(missing.waits, 'fix');
  assert.match(missing.reason, /security: \.ai\/reviews\/DEMO-20-security-ddddddd\.md is missing/);
  assert.match(missing.next, /it posts without another run$/);
});

test('nothing to review, or every PR reviewed after merge: it says so, and names the fix Task left', () => {
  const none = decide(facts((f) => (f.afterMerge.pulls = [{ number: 33, key: 'DEMO-24', merged: true, skipped: false, mark: null }]) && f));
  assert.equal(none.go, false);
  assert.match(none.reason, /^no PR of DEMO-20's items merged into develop without review$/);
  const mark = { key: 'DEMO-20', head: HEAD, blocking: 1, fix: 'DEMO-30' };
  const fixed = decide(facts((f) => (f.afterMerge.pulls = [{ number: 31, key: 'DEMO-21', merged: true, skipped: true, mark }]) && f));
  assert.equal(fixed.waits, 'item');
  assert.equal(fixed.next, '/ao-build DEMO-30');
  const clean = decide(facts((f) => (f.afterMerge.pulls = [{ number: 31, key: 'DEMO-21', merged: true, skipped: true, mark: { ...mark, blocking: 0, fix: null } }]) && f));
  assert.match(clean.reason, /with no Critical or High$/);
  assert.equal(decide(facts((f) => (f.item = { ...f.item, key: 'DEMO-22', type: 'Sub-task', workType: 'sub-task', parent: { key: 'DEMO-21' } }) && f)).waits, 'fix');
});

test('the Critical and High go to one fix Task, with a Sub-task per app when they are in several (spec 4.5.1)', () => {
  const reports = {
    reviewer: { findings: [{ severity: 'High', where: 'apps/api/src/cart/cart.service.ts:40', finding: 'xóa sai dòng' }, { severity: 'Low', where: 'apps/web/app/cart/page.tsx', finding: 'tên biến' }] },
    security: { findings: [{ severity: 'Critical', where: 'apps/web/app/cart/page.tsx:12', finding: 'XSS | ở tên' }, { severity: 'Medium', where: 'x', finding: 'Tái hiện: y' }] },
  };
  const { blocking, minor } = splitFindings(reports);
  assert.deepEqual(blocking.map(({ role, severity }) => `${role} ${severity}`), ['reviewer High', 'security Critical']);
  assert.deepEqual(minor.map(({ role, severity }) => `${role} ${severity}`), ['reviewer Low', 'security Medium']);
  const roleOf = (where) => ({ api: 'be-dev', web: 'fe-dev' })[/^apps\/([^/]+)\//.exec(where)?.[1]] ?? null;
  const task = fixTask({ key: 'DEMO-20', head: HEAD, findings: blocking, pulls: [31, 32], roleOf });
  assert.equal(task.summary, fixSummary('DEMO-20', HEAD));
  assert.equal(task.summary, 'Sửa Critical và High của review sau merge DEMO-20 ở ddddddd');
  assert.deepEqual(task.roles, ['be-dev', 'fe-dev']);
  assert.match(task.description, /^\| Critical \| security \| apps\/web\/app\/cart\/page\.tsx:12 \| XSS \/ ở tên \|$/m);
  assert.match(task.description, /PR #31, PR #32/);
  assert.deepEqual(fixTask({ key: 'DEMO-20', head: HEAD, findings: blocking.slice(0, 1), pulls: [31], roleOf }).roles, ['be-dev']);
  assert.match(fixTask({ key: 'DEMO-20', head: HEAD, findings: [{ severity: 'High', role: 'reviewer', where: 'scripts/x.sh', finding: 'y' }], pulls: [31], roleOf }).description, /Gắn nhãn role/);
  assert.match(fixSubtask('fe-dev', 'DEMO-20').summary, /^FE: /);
});

test('the comment on KEY, and the Medium and Low by the source of the review after merge (spec 4.5.3, 4.5.4)', () => {
  const text = reportComment({ key: 'DEMO-20', head: HEAD, base: BASE, pulls: [31, 32], files: ['a', 'b'], fix: 'DEMO-30', reports: { reviewer: report('reviewer'), security: report('security') } });
  assert.ok(text.startsWith(reportLine('DEMO-20', HEAD)));
  assert.match(text, /Task DEMO-30 sửa chúng/);
  assert.match(text, /^Role: security$/m);
  assert.match(reportComment({ key: 'DEMO-20', head: HEAD, base: BASE, pulls: [31], files: ['a'], fix: null, reports: {} }), /Không có Critical hay High/);
  const findings = findingsComment({ key: 'DEMO-21, DEMO-22', findings: [{ role: 'reviewer', severity: 'Low', where: 'a', finding: 'b', id: 'x' }], source: findingsSource('DEMO-20', HEAD) });
  assert.match(findings, /^Finding chưa sửa của lượt review sau merge DEMO-20 ở ddddddd:$/m);
  assert.deepEqual(afterMergeTodo([{ merged: true, skipped: true, mark: null }, { merged: true, skipped: true, mark: {} }, { merged: true, skipped: false, mark: null }]).length, 1);
});

test('the facts: the merged PRs of the Epic items, each skipped or not, its mark, and the files of those to review', async () => {
  const pull = (number, key, more = {}) => ({ number, merged_at: `2026-11-2${number - 30}T10:00:00Z`, merge_commit_sha: `${number}`.padEnd(40, 'm'), base: { ref: 'develop', repo: { full_name: 'o/r' } }, head: { ref: `feature/${key}-x`, sha: `${number}`.padEnd(40, 'h'), repo: { full_name: 'o/r' } }, ...more });
  const trace = (number, key) => ({ user: { login: BOT }, commit_id: `${number}`.padEnd(40, 'h'), body: skipBody({ key, sha: `${number}`.padEnd(40, 'h'), reason: 'x' }) });
  const answers = {
    '/pulls': [pull(31, 'DEMO-21'), pull(32, 'DEMO-22'), pull(34, 'DEMO-21', { merged_at: null }), pull(35, 'DEMO-99')],
    '/pulls/31/reviews': [trace(31, 'DEMO-21')],
    '/pulls/32/reviews': [trace(32, 'DEMO-22')],
    '/issues/31/comments': [],
    '/issues/32/comments': [{ user: { login: BOT }, body: markBody({ key: 'DEMO-20', head: HEAD, blocking: 0 }) }],
    '/pulls/31/files': [{ filename: 'apps/web/new.tsx', previous_filename: 'apps/web/old.tsx' }],
    [`/commits/${'31'.padEnd(40, 'm')}`]: { parents: [{ sha: BASE }] },
    '/git/ref/heads/develop': { object: { sha: HEAD } },
  };
  const github = {
    get: async (path) => answers[path],
    getAll: async (path) => {
      if (!(path in answers)) throw new Error(`no answer for ${path}`);
      return answers[path];
    },
  };
  const epic = { key: 'DEMO-20', workType: 'epic', children: [{ key: 'DEMO-21', workType: 'story', state: 'done', level: 'heavy' }, { key: 'DEMO-22', workType: 'task', state: 'in-qa' }, { key: 'DEMO-23', workType: 'story', state: 'in-progress' }, { key: 'DEMO-25', workType: 'task', state: 'cancelled' }] };
  const read = await readAfterMerge(github, epic, { gates, apps: { review: 'tungph7-ao-review' } }, { reviews: (prefix) => ({ [`${prefix}reviewer-ddddddd.md`]: 'r' }) });
  assert.deepEqual(read.pulls.map(({ number, key, skipped, mark }) => `${number} ${key} ${skipped} ${mark ? mark.key : null}`), ['31 DEMO-21 true null', '32 DEMO-22 true DEMO-20']);
  assert.deepEqual(read.files, ['apps/web/new.tsx', 'apps/web/old.tsx']);
  assert.equal(read.base, BASE);
  assert.equal(read.head, HEAD);
  assert.deepEqual(read.waiting, ['DEMO-23']);
  assert.equal(read.levels['DEMO-21'], 'heavy');
  assert.deepEqual(Object.keys(read.reports), ['DEMO-20-reviewer-ddddddd.md']);
});

test('/ao-run of an Epic whose items are all done asks you for its review after merge, and does not start it (spec 6.1)', async () => {
  const epic = { key: 'DEMO-20', workType: 'epic', state: 'in-progress', requests: [] };
  const findingsTask = { key: 'DEMO-29', workType: 'task', state: 'new', findings: true, requests: [], parent: 'DEMO-20' };
  const asked = [];
  const decide = async (command, arg) => (asked.push(`${command} ${arg}`), command === 'review' ? { go: true, runs: [{ role: 'reviewer' }] } : { go: false, waits: 'item', next: '' });
  const round = await planRound({ items: [epic, findingsTask], scope: { epic: 'DEMO-20' }, cap: 2, decide });
  assert.deepEqual(round.start, []);
  assert.ok(round.waiting.some(({ key, waits, text }) => key === 'DEMO-20' && waits === 'you' && text === '/ao-review DEMO-20'));
  assert.ok(asked.includes('review DEMO-20'));
  // An item still open: no review after merge yet.
  const busy = await planRound({ items: [epic, { key: 'DEMO-21', workType: 'story', state: 'in-qa', requests: [], parent: 'DEMO-20' }], scope: { epic: 'DEMO-20' }, cap: 2, decide: async () => ({ go: false, waits: 'you', next: 'x' }) });
  assert.equal(busy.waiting.some(({ text }) => text === '/ao-review DEMO-20'), false);
  // Nothing to review: nothing waits for it.
  const none = await planRound({ items: [epic], scope: { epic: 'DEMO-20' }, cap: 2, decide: async () => ({ go: false, waits: 'fix', reason: 'no PR' }) });
  assert.deepEqual(none.waiting, []);
});
