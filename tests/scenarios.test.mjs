import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { allowedTransitions, checkTransition, loadContract, routeBug } from '../lib/contract.mjs';

const contract = loadContract(fileURLToPath(new URL('../contract/', import.meta.url)));
const EVERY_GUARD = Object.keys(contract.guards);

test('a Critical bug on Staging is fixed from release/* in the current release and tested on Staging (spec section 7)', () => {
  assert.deepEqual(routeBug(contract, { affects: 'staging', severity: 'critical' }), {
    fixVersion: 'current-release',
    baseBranch: 'release/*',
    qaEnvironments: ['staging'],
  });
});

test('a Critical bug on Production is fixed from main as a patch and tested on Staging, then Production (spec section 7)', () => {
  assert.deepEqual(routeBug(contract, { affects: 'production', severity: 'critical' }), {
    fixVersion: 'patch-of-production',
    baseBranch: 'main',
    qaEnvironments: ['staging', 'production'],
  });
});

test('a Low bug on Production is fixed from develop in the next release and tested on Development (spec section 7)', () => {
  assert.deepEqual(routeBug(contract, { affects: 'production', severity: 'low' }), {
    fixVersion: 'next-release',
    baseBranch: 'develop',
    qaEnvironments: ['development'],
  });
});

test('a Story goes from new to done when every guard holds (spec section 7)', () => {
  const steps = [
    ['refine', 'automation'],
    ['start', 'fe-dev'],
    ['submit', 'automation'],
    ['deploy-to-qa', 'automation'],
    ['pick-up', 'qa'],
    ['accept', 'human'],
  ];
  let state = 'new';

  for (const [id, actor] of steps) {
    const transition = allowedTransitions(contract, 'story', state).find((t) => t.id === id);
    assert.ok(transition, `${id} is allowed from ${state}`);
    assert.equal(checkTransition(contract, 'story', id, { actor, facts: { guards: EVERY_GUARD } }).ok, true, `${id} by ${actor}`);
    state = transition.to;
  }

  assert.equal(state, 'done');
});

test('accept called by an agent is rejected even when every guard holds', () => {
  const result = checkTransition(contract, 'story', 'accept', { actor: 'qa', facts: { guards: EVERY_GUARD } });

  assert.deepEqual(result, { ok: false, actorAllowed: false, missingGuards: [], effects: [] });
});

test('submit is rejected and names the guards that do not hold', () => {
  const result = checkTransition(contract, 'story', 'submit', { actor: 'automation', facts: { guards: ['subtasks-done'] } });

  assert.deepEqual(result, { ok: false, actorAllowed: true, missingGuards: ['pr-open', 'ci-green'], effects: [] });
});

test('the third qa-fail in a row flags the item Needs you; the first two do not', () => {
  const effectsAfter = (reworkCount) =>
    checkTransition(contract, 'story', 'qa-fail', { actor: 'qa', facts: { guards: ['qa-report-failed'], reworkCount } }).effects;

  assert.deepEqual(effectsAfter(0), ['increment-rework']);
  assert.deepEqual(effectsAfter(1), ['increment-rework']);
  assert.deepEqual(effectsAfter(2), ['increment-rework', 'flag-needs-you']);
});

test('allowedTransitions lists request-changes, deploy-to-qa and cancel from in-review', () => {
  assert.deepEqual(allowedTransitions(contract, 'story', 'in-review'), [
    { id: 'request-changes', to: 'in-progress', actors: ['reviewer', 'security', 'human', 'automation'], guards: ['changes-requested'] },
    { id: 'deploy-to-qa', to: 'ready-for-qa', actors: ['automation'], guards: ['merge-approved', 'pr-merged', 'qa-deployed'] },
    { id: 'cancel', to: 'cancelled', actors: ['human'], guards: ['resolution-set'] },
  ]);
});

test('allowedTransitions reports no way out of a final state', () => {
  assert.deepEqual(allowedTransitions(contract, 'bug', 'done'), []);
});

test('a work type no workflow applies to is an error', () => {
  assert.throws(() => allowedTransitions(contract, 'feature', 'new'), /feature/);
});

test('a transition that is not in the work type\'s workflow is an error', () => {
  assert.throws(() => checkTransition(contract, 'story', 'approve-plan', { actor: 'human', facts: { guards: [] } }), /approve-plan/);
});
