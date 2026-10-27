import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readContract } from '../../lib/contract.mjs';
import { readMapping } from '../../lib/tracker/mapping.mjs';
import { CONTRACT_DIR, ROOT } from '../helpers/kit.mjs';

const contract = readContract(CONTRACT_DIR);
const mapping = readMapping(join(ROOT, 'tracker'));

const statuses = (workflow) => Object.values(mapping.workflows[workflow].states).map(({ status }) => status);
const transitionNames = (workflow) => Object.values(mapping.workflows[workflow].transitions).map(({ name }) => name);

test('status names are the state ids in title case (spec 2.3)', () => {
  assert.deepEqual(statuses('standard'), ['New', 'Ready', 'In Progress', 'In Review', 'Ready for QA', 'In QA', 'Done', 'Cancelled']);
  assert.deepEqual(statuses('epic'), ['New', 'Specifying', 'Planning', 'In Progress', 'Done', 'Cancelled']);
  assert.deepEqual(statuses('sub-task'), ['To Do', 'In Progress', 'Done']);
});

test('status categories follow spec 2.3: early states are To Do, final states are Done, the rest In Progress', () => {
  const expected = (state) =>
    ['new', 'ready', 'to-do', 'specifying', 'planning'].includes(state) ? 'to-do' : ['done', 'cancelled'].includes(state) ? 'done' : 'in-progress';
  for (const [name, { states }] of Object.entries(mapping.workflows)) {
    for (const [state, { category }] of Object.entries(states)) assert.equal(category, expected(state), `${name}.${state}`);
  }
});

test('transition names are the transition ids in sentence case (spec 2.3)', () => {
  assert.deepEqual(transitionNames('standard'), [
    'Refine', 'Start', 'Submit', 'Request changes', 'Deploy to QA', 'Pick up', 'QA fail', 'Accept', 'Cancel',
  ]);
  assert.deepEqual(transitionNames('epic'), ['Start spec', 'Approve spec', 'Approve plan', 'Complete', 'Cancel']);
  assert.deepEqual(transitionNames('sub-task'), ['Start', 'Complete']);
});

test('the transitions into done set Resolution to Done, and cancel asks for a Resolution on a screen (spec 2.3)', () => {
  const into = (target) =>
    Object.entries(contract.workflows).flatMap(([name, { transitions }]) =>
      transitions.filter(({ to }) => to === target).map(({ id }) => [name, id, mapping.workflows[name].transitions[id]]),
    );
  for (const [name, id, { set_resolution: resolution }] of into('done')) assert.equal(resolution, 'Done', `${name}.${id}`);
  for (const [name, id, { screen }] of into('cancelled')) assert.equal(screen, 'resolution', `${name}.${id}`);
});

test('the three workflows are named for Jira and share one workflow scheme', () => {
  assert.equal(mapping.workflow_scheme, 'AO workflow scheme');
  assert.deepEqual(
    Object.entries(mapping.workflows).map(([name, { jira_workflow: jira }]) => `${name}: ${jira}`),
    ['standard: AO standard', 'epic: AO epic', 'sub-task: AO sub-task'],
  );
});

test('Found in, Severity and Agent are single-select custom fields; Rework count is counted from the history', () => {
  const byType = (type) => Object.keys(mapping.fields).filter((id) => mapping.fields[id].type === type);
  assert.deepEqual(byType('select'), ['found-in', 'severity', 'agent']);
  assert.deepEqual(byType('builtin'), ['affects-version', 'fix-version', 'flagged', 'resolution']);
  assert.deepEqual(mapping.fields['rework-count'], { derived_from: 'changelog' });
});

test('Resolution values use the names Jira ships, plus Not a bug (spec 2.3)', () => {
  assert.deepEqual(mapping.fields.resolution.values, {
    'wont-do': "Won't Do",
    duplicate: 'Duplicate',
    'not-a-bug': 'Not a bug',
    'cannot-reproduce': 'Cannot Reproduce',
  });
});

test('one Kanban board: columns in workflow order, max 2 in In Review, no Epics (spec 2.3)', () => {
  assert.equal(mapping.board.type, 'kanban');
  assert.deepEqual(
    mapping.board.columns.map(({ id, name, wip_limit: wip }) => (wip ? `${name} (${wip})` : name)),
    ['Backlog', 'Ready', 'In Progress', 'In Review (in-review)', 'QA', 'Done'],
  );
  assert.equal(contract.wip_limits.find(({ id }) => id === 'in-review').limit, 2);
  assert.equal(mapping.workflows.epic.on_board, false);
  assert.match(mapping.board.filter, /issuetype != Epic/);
});

test('Sub-task statuses sit in the Ready, In Progress and Done columns', () => {
  assert.deepEqual(mapping.workflows['sub-task'].board_columns, { 'to-do': 'ready', 'in-progress': 'in-progress', done: 'done' });
});

test('each environment maps to the GitHub environment of the same name and the Jira environment type', () => {
  assert.deepEqual(mapping.environments, {
    development: { github_environment: 'development', jira_type: 'development' },
    staging: { github_environment: 'staging', jira_type: 'staging' },
    production: { github_environment: 'production', jira_type: 'production' },
  });
});

test('flag-needs-you adds the label needs-you (spec 2.3)', () => {
  assert.equal(mapping.needs_you_label, 'needs-you');
});
