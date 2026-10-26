import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { readContract } from '../lib/contract.mjs';

const { workflows } = readContract(fileURLToPath(new URL('../contract/', import.meta.url)));

// One line per transition: "id: from -> to by actors", with several from-states joined by "|".
function describeTransitions(workflow) {
  return workflow.transitions.map(({ id, from, to, actors }) => `${id}: ${[from].flat().join('|')} -> ${to} by ${actors.join(', ')}`);
}

function transitionsWith(workflow, field, value) {
  return workflow.transitions.filter((transition) => transition[field]?.includes(value)).map(({ id }) => id);
}

test('standard workflow: 8 states, applies to Story, Task and Bug (spec 2.4)', () => {
  const { standard } = workflows;

  assert.deepEqual(standard.applies_to, ['story', 'task', 'bug']);
  assert.equal(standard.initial, 'new');
  assert.deepEqual(standard.final, ['done', 'cancelled']);
  assert.deepEqual(Object.keys(standard.states), ['new', 'ready', 'in-progress', 'in-review', 'ready-for-qa', 'in-qa', 'done', 'cancelled']);
});

test('standard workflow: 9 transitions with the actors of spec 2.4', () => {
  assert.deepEqual(describeTransitions(workflows.standard), [
    'refine: new -> ready by automation, human',
    'start: ready -> in-progress by fe-dev, be-dev, devops',
    'submit: in-progress -> in-review by automation',
    'request-changes: in-review -> in-progress by reviewer, security, human, automation',
    'deploy-to-qa: in-review -> ready-for-qa by automation',
    'pick-up: ready-for-qa -> in-qa by qa',
    'qa-fail: in-qa -> in-progress by qa',
    'accept: in-qa -> done by human',
    'cancel: new|ready|in-progress|in-review|ready-for-qa|in-qa -> cancelled by human',
  ]);
});

test('standard workflow: only request-changes and qa-fail increment the rework count', () => {
  assert.deepEqual(transitionsWith(workflows.standard, 'effects', 'increment-rework'), ['request-changes', 'qa-fail']);
});

test('standard workflow: submit requires every Sub-task to be done', () => {
  assert.deepEqual(transitionsWith(workflows.standard, 'guards', 'subtasks-done'), ['submit']);
});

test('epic workflow: 6 states and 5 transitions, all moved by human (spec 2.4)', () => {
  const { epic } = workflows;

  assert.deepEqual(epic.applies_to, ['epic']);
  assert.deepEqual(Object.keys(epic.states), ['new', 'specifying', 'planning', 'in-progress', 'done', 'cancelled']);
  assert.deepEqual(describeTransitions(epic), [
    'start-spec: new -> specifying by human',
    'approve-spec: specifying -> planning by human',
    'approve-plan: planning -> in-progress by human',
    'complete: in-progress -> done by human',
    'cancel: new|specifying|planning|in-progress -> cancelled by human',
  ]);
});

test('epic workflow: approving the plan moves the child Story and Task items to ready', () => {
  assert.deepEqual(transitionsWith(workflows.epic, 'effects', 'refine-children'), ['approve-plan']);
});

test('sub-task workflow: to-do, in-progress, done, moved by the assigned dev agent (spec 2.4)', () => {
  const subTask = workflows['sub-task'];

  assert.deepEqual(subTask.applies_to, ['sub-task']);
  assert.deepEqual(Object.keys(subTask.states), ['to-do', 'in-progress', 'done']);
  assert.deepEqual(describeTransitions(subTask), [
    'start: to-do -> in-progress by fe-dev, be-dev',
    'complete: in-progress -> done by fe-dev, be-dev',
  ]);
});
