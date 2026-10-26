import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readContract } from '../lib/contract.mjs';
import { CONTRACT_DIR } from './helpers/kit.mjs';

const contract = readContract(CONTRACT_DIR);

function valueIds(fieldId) {
  return contract.work_item_fields.find(({ id }) => id === fieldId).values.map(({ id }) => id);
}

test('5 work types map to Jira issue types, in the order of the hierarchy table in spec 2.3', () => {
  assert.deepEqual(
    contract.work_types.map(({ id, jira_issue_type: jira }) => `${id}: ${jira}`),
    ['epic: Epic', 'story: Story', 'sub-task: Sub-task', 'task: Task', 'bug: Bug'],
  );
});

test('Project and the grouping Epic map to a Jira space and a label or component', () => {
  assert.deepEqual(
    contract.work_item_groupings.map(({ concept, jira }) => `${concept}: ${jira}`),
    ['Project: Space', 'Epic (mục tiêu lớn): Label hoặc Component'],
  );
});

test('the 7 fields of spec 2.3, in order', () => {
  assert.deepEqual(
    contract.work_item_fields.map(({ name }) => name),
    ['Found in', 'Affects Version', 'Severity', 'Fix Version', 'Rework count', 'Flagged', 'Resolution'],
  );
});

test('Severity has 4 levels, from critical to low', () => {
  assert.deepEqual(valueIds('severity'), ['critical', 'high', 'medium', 'low']);
});

test('Found in lists the 3 environments', () => {
  assert.deepEqual(valueIds('found-in'), ['development', 'staging', 'production']);
});

test('Resolution lists the 4 ways an item ends cancelled', () => {
  assert.deepEqual(valueIds('resolution'), ['wont-do', 'duplicate', 'not-a-bug', 'cannot-reproduce']);
});

test('DoR: 7 criteria for Story, 2 for Task, 3 for Bug; none for Epic and Sub-task (spec 2.5)', () => {
  assert.deepEqual(
    contract.work_types.map(({ id, dor = [] }) => `${id}: ${dor.length}`),
    ['epic: 0', 'story: 7', 'sub-task: 0', 'task: 2', 'bug: 3'],
  );
});

test('DoD: 6 common criteria for Story, Task and Bug (spec 2.5)', () => {
  assert.deepEqual(contract.dod_common.applies_to, ['story', 'task', 'bug']);
  assert.equal(contract.dod_common.criteria.length, 6);
});

test('DoD: the criteria of each type, and the DoD of Epic (spec 2.5)', () => {
  assert.deepEqual(
    contract.work_types.map(({ id, dod = [] }) => `${id}: ${dod.length}`),
    ['epic: 2', 'story: 1', 'sub-task: 0', 'task: 1', 'bug: 1'],
  );
});

test('5 conventions on branches, PRs, Sub-tasks and splitting work (spec 2.3)', () => {
  assert.equal(contract.work_item_conventions.length, 5);
});
