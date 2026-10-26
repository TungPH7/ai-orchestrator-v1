import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readContract } from '../lib/contract.mjs';
import { CONTRACT_DIR } from './helpers/kit.mjs';

const contract = readContract(CONTRACT_DIR);

test('the 11 stages of spec 2.2, in order', () => {
  assert.deepEqual(
    contract.stages.map(({ id }) => id),
    ['spec', 'plan', 'build', 'ci-gate', 'review', 'merge', 'qa-verify', 'release-cut', 'staging-verify', 'ship', 'hotfix'],
  );
});

test('every stage names who works in it, its input, its outputs and how it is passed', () => {
  for (const { id, roles, input, outputs, exit, gate } of contract.stages) {
    assert.ok(roles.length > 0 && input && (outputs.artifacts || outputs.other) && (exit || gate), id);
  }
});

test('the 5 approval gates, numbered 1 to 5, are approved by human only', () => {
  assert.deepEqual(
    contract.gates.map(({ id, number, approvers }) => `${number} ${id}: ${approvers.join(', ')}`),
    ['1 spec-approval: human', '2 plan-approval: human', '3 merge-approval: human', '4 release-cut-approval: human', '5 production-approval: human'],
  );
});

test('each gate closes the stage of spec 2.2', () => {
  assert.deepEqual(
    contract.stages.filter(({ gate }) => gate).map(({ id, gate }) => `${id}: ${gate}`),
    ['spec: spec-approval', 'plan: plan-approval', 'review: merge-approval', 'release-cut: release-cut-approval', 'ship: production-approval'],
  );
});

test('stage outputs that are artifacts: spec, plan with Story and Task, review report, QA report, regression report and release note', () => {
  assert.deepEqual(
    contract.stages.filter(({ outputs }) => outputs.artifacts).map(({ id, outputs }) => `${id}: ${outputs.artifacts.join(', ')}`),
    ['spec: spec', 'plan: plan, story, task', 'review: review-report', 'qa-verify: qa-report', 'staging-verify: regression-report, release-notes'],
  );
});

test('release-cut needs a valid cut point and no open release branch (spec 2.7)', () => {
  assert.deepEqual(contract.stages.find(({ id }) => id === 'release-cut').guards, ['cut-point-ready', 'no-open-release']);
});

test('the 3 environments and the branches they take code from (spec 2.6)', () => {
  assert.deepEqual(
    contract.environments.map(({ id, branches, tagged }) => `${id}: ${branches.join(', ')}${tagged ? ' + tag' : ''}`),
    ['development: develop', 'staging: release/*, hotfix/*', 'production: main + tag'],
  );
});

test('cadence: Monday, daily, when you decide, Friday (spec 2.7)', () => {
  assert.deepEqual(contract.cadence.schedule.map(({ when }) => when), ['Thứ 2', 'Hằng ngày', 'Khi bạn quyết định', 'Thứ 6']);
});

test('4 release rules: release on your decision, the cut point, one open release branch, Fix Version (spec 2.7)', () => {
  assert.equal(contract.release_rules.length, 4);
});
