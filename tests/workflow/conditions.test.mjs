import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readContract } from '../../lib/contract.mjs';
import { CONDITIONS, pendingRuns, stageRoles, stageRuns } from '../../lib/workflow/conditions.mjs';
import { CONTRACT_DIR } from '../helpers/kit.mjs';

const contract = readContract(CONTRACT_DIR);
const SPEC = '# Spec: Giỏ hàng\n\n## Objective\n\nMàn hình: xem design.md.\n';
const NFR = `${SPEC}\n### Non-functional requirements\n\n- p95 < 300 ms\n`;
const roles = (runs) => runs.map(({ role, purpose, when }) => [role, purpose, when].filter(Boolean).join(' '));
const declared = (runs) => runs.map(({ role, purpose }) => [role, purpose].filter(Boolean).join(' '));

test('the runs of the four stages, in the order of C1 spec section 6', () => {
  assert.deepEqual(declared(stageRuns(contract, 'spec')), ['ba spec-write', 'ux design', 'sa spec-nfr', 'ba docs-pr']);
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
