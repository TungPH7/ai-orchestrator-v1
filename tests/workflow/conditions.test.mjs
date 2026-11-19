import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readContract } from '../../lib/contract.mjs';
import { CONDITIONS, pendingRuns, seoWord, stageRoles, stageRuns } from '../../lib/workflow/conditions.mjs';
import { CONTRACT_DIR } from '../helpers/kit.mjs';

const contract = readContract(CONTRACT_DIR);
const SPEC = '# Spec: Giỏ hàng\n\n## Objective\n\nMàn hình: xem design.md.\n';
const NFR = `${SPEC}\n### Non-functional requirements\n\n- p95 < 300 ms\n`;
const roles = (runs) => runs.map(({ role, purpose, when }) => [role, purpose, when].filter(Boolean).join(' '));
const declared = (runs) => runs.map(({ role, purpose }) => [role, purpose].filter(Boolean).join(' '));

test('the runs of the four stages, in the order of C1 spec section 6', () => {
  assert.deepEqual(declared(stageRuns(contract, 'spec')), ['ba spec-write', 'ux design', 'seo seo-write', 'sa spec-nfr', 'ba docs-pr']);
  assert.deepEqual(declared(stageRuns(contract, 'plan')), ['sa plan-write', 'ba plan-items']);
  assert.deepEqual(stageRoles(contract, 'build'), ['be-dev', 'fe-dev', 'devops']);
  assert.deepEqual(stageRoles(contract, 'review'), ['reviewer', 'security']);
});

test('a stage with no runs is an error, not an empty list', () => {
  assert.throws(() => stageRuns(contract, 'merge'), /stage merge of contract\/stages.yaml has no runs/);
});

test('with no SPEC yet, stage spec runs all four, and ux as a forecast: its condition cannot be answered yet', () => {
  assert.deepEqual(roles(pendingRuns(contract, 'spec', { docs: {} })), ['ba spec-write', 'ux design the SPEC has screens', 'sa spec-nfr', 'ba docs-pr']);
});

test('with a SPEC, a run whose output exists does not run again, and ux runs only for a SPEC with screens', () => {
  assert.deepEqual(roles(pendingRuns(contract, 'spec', { docs: { spec: SPEC } })), ['ux design', 'sa spec-nfr', 'ba docs-pr']);
  assert.deepEqual(roles(pendingRuns(contract, 'spec', { docs: { spec: NFR, design: '# Design' } })), ['ba docs-pr']);
  assert.deepEqual(roles(pendingRuns(contract, 'spec', { docs: { spec: '# Spec\n\n### Non-functional requirements\n' } })), ['ba docs-pr']);
});

test('stage plan: ba creates the items from the plan, so a plan still to write means items still to create', () => {
  const epic = (children) => ({ item: { children } });
  assert.deepEqual(roles(pendingRuns(contract, 'plan', { docs: {}, ...epic([{ key: 'X-2' }]) })), ['sa plan-write', 'ba plan-items']);
  assert.deepEqual(roles(pendingRuns(contract, 'plan', { docs: { plan: '# Plan' }, ...epic([]) })), ['ba plan-items']);
  assert.deepEqual(roles(pendingRuns(contract, 'plan', { docs: { plan: '# Plan' }, ...epic([{ key: 'X-2' }]) })), []);
});

test('every condition answers true, false or null, and only a condition that can be null has a text for the forecast', () => {
  for (const [name, { test: answer, text }] of Object.entries(CONDITIONS)) {
    const empty = answer({ docs: {}, item: { children: [] } });
    assert.ok([true, false, null].includes(empty), name);
    if (empty === null) assert.ok(text, `${name} needs a text`);
  }
});

test('an unknown condition is an error', () => {
  const broken = { stages: [{ id: 'spec', runs: [{ role: 'ba', when: 'spec-has-pictures' }] }] };
  assert.throws(() => pendingRuns(broken, 'spec', { docs: {} }), /unknown condition spec-has-pictures/);
});

// C1 spec 6.1: seo runs for the screens of an app with seo: true, in five steps.
const DESIGN_APPS = '## Screens\n\n| Code | Name | Route | User story | Kind | App |\n|---|---|---|---|---|---|\n| S1 | Trang chủ | / | x | ASCII | user |\n| S2 | Sản phẩm | /admin/products | y | ASCII | admin |\n';
const ADMIN_ONLY = '## Screens\n\n| Code | Name | Route | User story | Kind | App |\n|---|---|---|---|---|---|\n| S1 | Sản phẩm | /admin/products | y | ASCII | admin |\n';
const seoRun = (docs, seo) => roles(pendingRuns(contract, 'spec', { docs, seo })).filter((run) => run.startsWith('seo'));
const user = { apps: ['user'] };

test('seo runs after ux for a screen of an app with seo: true, and as a forecast while ba or ux has still to write', () => {
  assert.deepEqual(seoRun({ spec: SPEC, design: DESIGN_APPS }, user), ['seo seo-write']);
  assert.deepEqual(seoRun({}, user), ['seo seo-write design.md has screens of an app with seo: true']);
  assert.deepEqual(seoRun({ spec: SPEC }, user), ['seo seo-write design.md has screens of an app with seo: true']);
  // No app with seo: true, or a SPEC without screens: no seo, not even as a forecast.
  assert.deepEqual(seoRun({}, { apps: [] }), []);
  assert.deepEqual(seoRun({ spec: '# Spec\n' }, user), []);
});

test('step 1: no screen of an app with seo: true, no seo, even with the word seo; a table without App counts', () => {
  assert.deepEqual(seoRun({ spec: SPEC, design: ADMIN_ONLY }, user), []);
  assert.deepEqual(seoRun({ spec: SPEC, design: ADMIN_ONLY }, { ...user, word: 'seo' }), []);
  const before = '| Code | Name | Route | User story | Kind |\n|---|---|---|---|---|\n| S1 | Trang chủ | / | x | ASCII |\n';
  assert.deepEqual(seoRun({ spec: SPEC, design: before }, user), ['seo seo-write']);
});

test('steps 2 to 5: no-seo turns it off, seo on even over "SEO: không", no word keeps "SEO: không", and ## SEO is done', () => {
  const off = `${SPEC}\nSEO: không, vì trang nội bộ\n`;
  assert.deepEqual(seoRun({ spec: SPEC, design: DESIGN_APPS }, { ...user, word: 'no-seo' }), []);
  assert.deepEqual(seoRun({ spec: off, design: DESIGN_APPS }, { ...user, word: 'seo' }), ['seo seo-write']);
  assert.deepEqual(seoRun({ spec: off, design: DESIGN_APPS }, user), []);
  assert.deepEqual(seoRun({ spec: `${SPEC}\n## SEO\n\n### S1 Trang chủ\n`, design: DESIGN_APPS }, { ...user, word: 'seo' }), []);
});

test('the words of /ao-spec: seo alone, or no-seo with an optional reason; any other text is a change', () => {
  assert.deepEqual(seoWord('seo'), { word: 'seo' });
  assert.deepEqual(seoWord(' SEO \n'), { word: 'seo' });
  assert.deepEqual(seoWord('no-seo'), { word: 'no-seo', reason: null });
  assert.deepEqual(seoWord('no-seo trang chỉ cho nhân viên'), { word: 'no-seo', reason: 'trang chỉ cho nhân viên' });
  assert.equal(seoWord('thêm SEO cho trang chủ'), null);
  assert.equal(seoWord('seo cho trang chủ'), null);
  assert.equal(seoWord(undefined), null);
});
