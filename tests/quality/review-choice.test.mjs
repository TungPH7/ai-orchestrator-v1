import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readMapping } from '../../lib/tracker/mapping.mjs';
import {
  itemReview,
  labelsAt,
  markBody,
  newestMark,
  projectDefaultAt,
  projectReviewDefault,
  readMark,
  releaseReviewGaps,
  reviewChoice,
  reviewLabels,
  skipBody,
  skipOnHead,
  skipReason,
  skipScope,
  trustedReviewLabels,
} from '../../lib/quality/review-choice.mjs';
import { ROOT } from '../helpers/kit.mjs';

const mapping = readMapping(join(ROOT, 'tracker'));
const names = reviewLabels(mapping);
const AGENTS = 'agents-account';
const YOU = 'your-account';
const change = (who, from, to, created = '2026-11-23T10:00:00.000+0000') => ({ author: { accountId: who }, created, items: [{ field: 'labels', fromString: from, toString: to }] });

test('the two labels of the kit, and no choice without them (spec 2.2)', () => {
  assert.deepEqual(names, { on: 'ao-review-on', skip: 'ao-review-skip' });
  assert.equal(reviewLabels({ work_labels: {} }), null);
  assert.deepEqual(reviewChoice({ labels: ['ao-review-skip'], names: null }), { skip: false, why: 'default', ignored: null });
});

test('the default of the project: only off turns review off (spec 2.1)', () => {
  assert.equal(projectReviewDefault({ review: { default: 'off' } }), 'off');
  for (const config of [null, {}, { review: {} }, { review: { default: 'on' } }, { review: { default: false } }, { review: { default: 'OFF' } }]) {
    assert.equal(projectReviewDefault(config), 'on', JSON.stringify(config));
  }
});

test('the label beats the default, and both labels review (spec 2.2)', () => {
  const choose = (labels, projectDefault) => reviewChoice({ labels, names, projectDefault }).skip;
  assert.equal(choose([], 'on'), false);
  assert.equal(choose([], 'off'), true);
  assert.equal(choose(['ao-review-on'], 'off'), false);
  assert.equal(choose(['ao-review-skip'], 'on'), true);
  assert.equal(choose(['ao-review-skip', 'ao-review-on'], 'off'), false);
  assert.equal(reviewChoice({ labels: ['ao-review-skip'], names }).why, 'label');
  assert.equal(reviewChoice({ labels: [], names, projectDefault: 'off' }).why, 'default');
});

test('a change of the agents account towards skipping does not count; one towards review does (spec 2.4)', () => {
  const skipAdded = change(AGENTS, 'ao-be-dev', 'ao-be-dev ao-review-skip');
  const choice = reviewChoice({ labels: ['ao-be-dev', 'ao-review-skip'], histories: [skipAdded], agentAccount: AGENTS, names });
  assert.deepEqual(choice, { skip: false, why: 'default', ignored: { label: 'ao-review-skip' } });
  // The same change by you counts.
  assert.equal(reviewChoice({ labels: ['ao-review-skip'], histories: [change(YOU, '', 'ao-review-skip')], agentAccount: AGENTS, names }).skip, true);
  // ao-review-on taken off by the agents' account comes back, under a default off.
  const onRemoved = change(AGENTS, 'ao-review-on', '');
  assert.equal(reviewChoice({ labels: [], histories: [onRemoved], agentAccount: AGENTS, names, projectDefault: 'off' }).skip, false);
  // The agents' account adds ao-review-on, or takes ao-review-skip off: that counts, with the main session.
  assert.equal(reviewChoice({ labels: ['ao-review-on'], histories: [change(AGENTS, '', 'ao-review-on')], agentAccount: AGENTS, names, projectDefault: 'off' }).skip, false);
  assert.equal(reviewChoice({ labels: [], histories: [change(AGENTS, 'ao-review-skip', '')], agentAccount: AGENTS, names }).skip, false);
  // A whole list rewritten to flag the item keeps a skip you put, since it does not add it.
  const flagged = change(AGENTS, 'ao-review-skip', 'ao-review-skip needs-you');
  assert.equal(reviewChoice({ labels: ['ao-review-skip', 'needs-you'], histories: [change(YOU, '', 'ao-review-skip', '2026-11-22T10:00:00.000+0000'), flagged], agentAccount: AGENTS, names }).skip, true);
  assert.deepEqual(trustedReviewLabels(['x'], [skipAdded], { agentAccount: undefined, names }), ['x'], 'no account id');
});

test('the labels at the time of the merge (spec 2.5)', () => {
  const later = change(YOU, '', 'ao-review-on', '2026-11-23T12:00:00.000+0000');
  const before = change(YOU, '', 'ao-review-skip', '2026-11-23T08:00:00.000+0000');
  const labels = ['ao-review-skip', 'ao-review-on'];
  assert.deepEqual(labelsAt(labels, [before, later], '2026-11-23T10:00:00Z'), ['ao-review-skip']);
  assert.equal(reviewChoice({ labels, histories: [before, later], agentAccount: AGENTS, names, at: '2026-11-23T10:00:00Z' }).skip, true);
  assert.equal(reviewChoice({ labels, histories: [before, later], agentAccount: AGENTS, names }).skip, false, 'now');
  // A skip the agents' account put after the merge was undone for the time of the merge anyway.
  const agentsAfter = change(AGENTS, '', 'ao-review-skip', '2026-11-23T12:00:00.000+0000');
  assert.equal(reviewChoice({ labels: ['ao-review-skip'], histories: [agentsAfter], agentAccount: AGENTS, names, at: '2026-11-23T10:00:00Z' }).skip, false);
});

test('only the PR of an item into develop can skip (spec 2.6)', () => {
  assert.equal(skipScope({ base: { ref: 'develop' }, head: { ref: 'feature/SHOP-1-cart' } }), true);
  assert.equal(skipScope({ base: 'develop', headRef: 'bugfix/SHOP-2-fix' }), true);
  assert.equal(skipScope({ base: { ref: 'release/v1.2.0' }, head: { ref: 'bugfix/SHOP-2-fix' } }), false);
  assert.equal(skipScope({ base: { ref: 'main' }, head: { ref: 'hotfix/SHOP-3-fix' } }), false);
  assert.equal(skipScope({ base: { ref: 'develop' }, head: { ref: 'docs/SHOP-4' } }), false);
  assert.equal(skipScope({ base: { ref: 'develop' }, head: { ref: 'main' } }), false);
});

test('the trace: read back from the review App on the head only, with the critical files named (spec 3.1, 3.2)', () => {
  const bot = 'tungph7-ao-review[bot]';
  const head = 'a'.repeat(40);
  const body = skipBody({ key: 'SHOP-90', sha: head, reason: skipReason({ why: 'label' }, names), critical: ['.github/workflows/ci.yml'] });
  assert.match(body, /^Review skipped: SHOP-90$/m);
  assert.match(body, /^Why: label ao-review-skip$/m);
  assert.match(body, /sửa file critical mà không review:\*\* `\.github\/workflows\/ci\.yml`/);
  assert.doesNotMatch(skipBody({ key: 'SHOP-90', sha: head, reason: 'x' }), /critical/);
  assert.equal(skipOnHead([{ user: { login: bot }, commit_id: head, body }], { bot, head }), 'SHOP-90');
  assert.equal(skipOnHead([{ user: { login: 'someone' }, commit_id: head, body }], { bot, head }), null);
  assert.equal(skipOnHead([{ user: { login: bot }, commit_id: 'b'.repeat(40), body }], { bot, head }), null);
  assert.match(skipReason({ why: 'default' }, names), /review\.default: off/);
});

test('the mark of a review after merge, read back; one with Critical or High names its fix (spec 4.5.2)', () => {
  const head = 'c'.repeat(40);
  assert.deepEqual(readMark(markBody({ key: 'SHOP-81', head, blocking: 0 })), { key: 'SHOP-81', head, blocking: 0, fix: null });
  assert.deepEqual(readMark(markBody({ key: 'SHOP-81', head, blocking: 2, fix: 'SHOP-95' })), { key: 'SHOP-81', head, blocking: 2, fix: 'SHOP-95' });
  assert.equal(readMark(`Reviewed after merge: SHOP-81\nHead: ${head}\nBlocking: 2`), null, 'no fix');
  assert.equal(readMark('Reviewed after merge: SHOP-81\nBlocking: 0'), null, 'no head');
  const bot = 'tungph7-ao-review[bot]';
  const comments = [
    { user: { login: bot }, body: markBody({ key: 'SHOP-81', head, blocking: 1, fix: 'SHOP-95' }) },
    { user: { login: 'someone' }, body: markBody({ key: 'SHOP-81', head, blocking: 0 }) },
  ];
  assert.equal(newestMark(comments, { bot }).blocking, 1, 'only the App counts');
  assert.equal(newestMark([], { bot }), null);
});

test('a release waits for every PR that skipped review (spec 5.1)', () => {
  const clean = { blocking: 0, fix: null, key: 'SHOP-81' };
  const found = { blocking: 2, fix: 'SHOP-95', key: 'SHOP-81' };
  assert.deepEqual(releaseReviewGaps([{ number: 1, key: 'SHOP-82', skipped: true, mark: clean }, { number: 2, key: 'SHOP-83', skipped: false, mark: null }]), []);
  assert.match(releaseReviewGaps([{ number: 1, key: 'SHOP-82', skipped: true, mark: null }])[0], /^review after merge of #1 \(SHOP-82\)/);
  assert.match(releaseReviewGaps([{ number: 1, key: 'SHOP-82', skipped: true, mark: found }])[0], /^the PR of SHOP-95/);
  assert.deepEqual(releaseReviewGaps([{ number: 1, key: 'SHOP-82', skipped: true, mark: found }, { number: 3, key: 'SHOP-95', skipped: false, mark: null }]), []);
});

test('the readers: the item from Jira, the default from GitHub, on at any failure', async () => {
  const jira = {
    get: async () => ({ fields: { labels: ['ao-review-skip'] } }),
    getAll: async () => [change(YOU, '', 'ao-review-skip')],
  };
  assert.equal((await itemReview(jira, mapping)('SHOP-90')).skip, true);
  const content = (text) => ({ get: async (path, { ref }) => (path === '/contents/.ai-orchestrator/project.yaml' && ref === 'develop' ? { content: Buffer.from(text).toString('base64') } : null) });
  assert.equal(await projectDefaultAt(content('review:\n  default: off\n'), 'develop'), 'off');
  assert.equal(await projectDefaultAt(content('review:\n  default: on\n'), 'develop'), 'on');
  assert.equal(await projectDefaultAt(content('review:\n  default: off\n'), 'main'), 'on', 'no file there');
  assert.equal(await projectDefaultAt({ get: async () => { throw new Error('404'); } }, 'develop'), 'on');
  assert.equal(await projectDefaultAt(content(': not yaml ['), 'develop'), 'on');
});
