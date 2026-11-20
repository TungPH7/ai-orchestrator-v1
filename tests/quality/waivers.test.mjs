import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readGates } from '../../lib/quality/gates.mjs';
import { waiverBody, waiverCandidates, waiverFor, waiverOnHead } from '../../lib/quality/waivers.mjs';
import { ROOT } from '../helpers/kit.mjs';

const gates = readGates(join(ROOT, 'quality'));
const DOCS = ['docs/user-guide/cart.md', 'docs/user-guide/img/cart.png', 'apps/web/messages/vi.json'];

test('the waiver light-docs of the kit (C1 spec 3.4)', () => {
  assert.deepEqual(gates.review.waivers.map(({ id, level }) => `${id} ${level}`), ['light-docs light']);
});

test('it holds for a PR of docs, images and copy only, of an item at level light', () => {
  assert.deepEqual(waiverFor({ files: DOCS, gates, label: 'light' }), { id: 'light-docs', level: 'light', files: DOCS });
});

test('it does not hold when one file is outside it, the level is not light, or the PR cannot be read whole', () => {
  assert.equal(waiverFor({ files: [...DOCS, 'apps/web/src/cart.ts'], gates, label: 'light' }), null, 'one .ts file');
  assert.equal(waiverFor({ files: DOCS, gates, label: 'standard' }), null);
  assert.equal(waiverFor({ files: DOCS, gates, label: null }), null, 'no label is standard');
  assert.equal(waiverFor({ files: DOCS, gates, label: 'light', blockingFound: true }), null, 'a High made it standard');
  assert.equal(waiverFor({ files: ['docs/a.md', '.claude/rules/ai-orchestrator.md'], gates, label: 'light' }), null, 'a critical file makes it heavy');
  // Review of shop PR #79: Markdown that steers an agent is no doc, at any depth.
  for (const file of ['CLAUDE.md', 'apps/user/AGENTS.md', 'apps/user/.claude/rules/x.md', 'docs/specs/SHOP-90/CLAUDE.local.md']) {
    assert.equal(waiverFor({ files: [...DOCS, file], gates, label: 'light' }), null, file);
  }
  assert.equal(waiverFor({ files: DOCS, gates, label: 'light', truncated: true }), null);
  assert.equal(waiverFor({ files: [], gates, label: 'light' }), null);
  assert.equal(waiverFor({ files: [{ filename: 'docs/a.md', previous_filename: 'apps/web/src/a.ts' }], gates, label: 'light' }), null, 'a file renamed from code counts by its old name');
});

test('the candidates: whether the label is worth reading, whatever the level', () => {
  assert.equal(waiverCandidates(DOCS, gates).length, 1);
  assert.equal(waiverCandidates([...DOCS, 'apps/web/src/cart.ts'], gates).length, 0);
});

test('the trace: its line read back from the newest review of the App on the head only', () => {
  const bot = 'tungph7-ao-review[bot]';
  const head = 'a'.repeat(40);
  const body = waiverBody({ id: 'light-docs', level: 'light', files: DOCS, key: 'DEMO-30', sha: head });
  assert.match(body, /^Waiver: light-docs$/m);
  assert.match(body, /^- docs\/user-guide\/cart\.md$/m);
  assert.equal(waiverOnHead([{ user: { login: bot }, commit_id: head, body }], { bot, head }), 'light-docs');
  assert.equal(waiverOnHead([{ user: { login: 'someone' }, commit_id: head, body }], { bot, head }), null, 'another login');
  assert.equal(waiverOnHead([{ user: { login: bot }, commit_id: 'b'.repeat(40), body }], { bot, head }), null, 'another commit');
});
