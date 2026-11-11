import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readContract } from '../lib/contract.mjs';
import { CONTRACT_DIR } from './helpers/kit.mjs';

const contract = readContract(CONTRACT_DIR);

test('3 default WIP limits: 1 per dev agent, 2 in review, 1 Epic being specified or planned (spec 2.7)', () => {
  assert.deepEqual(
    contract.wip_limits.map(({ id, limit }) => `${id}: ${limit}`),
    ['dev-agent: 1', 'in-review: 2', 'epic-shaping: 1'],
  );
});

test('retry: a flaky CI run is re-run once; an agent stops after 2 failures in a row (spec 2.8)', () => {
  assert.deepEqual(contract.retry, { flaky_ci_reruns: 1, agent_failures_before_stop: 2 });
});

test('7 error situations, each with how to handle it (spec 2.8)', () => {
  assert.equal(contract.error_handling.length, 7);
});

test('the 7 retro metrics of spec 2.7, in order', () => {
  assert.deepEqual(
    contract.metrics.map(({ name }) => name),
    ['Cycle time', 'Thời gian chờ release', 'Throughput', 'Rework', 'Lỗi lọt', 'Thời gian chờ bạn', 'Usage mỗi item'],
  );
});

test('14 artifacts, Epic, Story, Task and Bug separate, each with its own template (spec 2.9; agent-roster spec 2.11; human-loop spec 3.1)', () => {
  assert.deepEqual(
    contract.artifacts.map(({ id }) => id),
    ['spec', 'design', 'plan', 'adr', 'epic', 'story', 'task', 'bug', 'pull-request', 'review-report', 'qa-report', 'regression-report', 'release-notes', 'ledger'],
  );
  for (const { id, template } of contract.artifacts) assert.equal(template, `templates/${id}.md`, id);
});

test('every artifact says who creates it and where it is stored', () => {
  for (const { id, created_by: createdBy, stored_in: storedIn } of contract.artifacts) {
    assert.ok(createdBy.length > 0, `${id}: created_by`);
    assert.ok(storedIn.length > 0, `${id}: stored_in`);
  }
});

test('ux writes the design next to the SPEC, with the images of Figma screens in a design/ folder (agent-roster spec 2.11)', () => {
  const design = contract.artifacts.find(({ id }) => id === 'design');

  assert.equal(design.name, 'Thiết kế màn hình');
  assert.deepEqual(design.created_by, ['ux']);
  assert.deepEqual(
    design.stored_in.map(({ place, path }) => `${place}: ${path}`),
    ['git: docs/specs/<EPIC-KEY>/design.md', 'git: docs/specs/<EPIC-KEY>/design/'],
  );
});

test('a Bug is created by whoever reports it, a ledger by the agent working on the item', () => {
  const createdBy = (id) => contract.artifacts.find((artifact) => artifact.id === id).created_by;

  assert.equal(createdBy('bug'), 'reporter');
  assert.equal(createdBy('ledger'), 'assignee');
});

test('language: templates in English, filled-in content in Vietnamese, code, commits and PRs in English (spec 2.9)', () => {
  assert.deepEqual(contract.language.map(({ language }) => language), ['en', 'vi', 'en']);
});
