import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { loadContract } from '../../lib/contract.mjs';
import { planDorLine, tickDorLine } from '../../lib/tracker/dor.mjs';
import { readMapping } from '../../lib/tracker/mapping.mjs';
import { runSync } from '../../lib/tracker/sync.mjs';
import { fakeJira, jiraIssue, jiraStatus } from '../helpers/jira.mjs';
import { CONTRACT_DIR, ROOT } from '../helpers/kit.mjs';

const contract = loadContract(CONTRACT_DIR);
const mapping = readMapping(join(ROOT, 'tracker'));
const text = (value, marks) => ({ type: 'text', text: value, ...(marks && { marks }) });
const item = (...content) => ({ type: 'listItem', content: [{ type: 'paragraph', content }] });
const doc = (...content) => ({ type: 'doc', version: 1, content });
// The Definition of Ready of Story DEMO-12 as ba wrote it through MCP (dev-workflow T7): a bullet list whose items start
// with [ ] or [x] as text, the plan line with a note after it.
const story = (box = '[ ]') =>
  doc(
    { type: 'heading', attrs: { level: 2 }, content: [text('Definition of Ready')] },
    {
      type: 'bulletList',
      content: [
        item(text('[x] Có câu user story')),
        item(text(`${box} Thuộc Epic có plan đã duyệt: chờ gate ② plan-approval`)),
        item(text('[x] Có thiết kế màn hình: S1 trong '), text('design.md', [{ type: 'code' }])),
      ],
    },
  );
// The same line as an ADF task list, the form Jira's editor makes.
const taskList = (state = 'TODO') =>
  doc({
    type: 'taskList',
    attrs: { localId: 'l1' },
    content: [
      { type: 'taskItem', attrs: { localId: 't1', state: 'DONE' }, content: [text('Có mục tiêu và checklist kỹ thuật kiểm tra được')] },
      { type: 'taskItem', attrs: { localId: 't2', state }, content: [text('Thuộc Epic có plan đã duyệt, hoặc được bạn duyệt trực tiếp')] },
    ],
  });

test('the line comes from the DoR of the work type in the contract: the one dor-met checks, a plan approved for its Epic', () => {
  assert.equal(planDorLine(contract, 'story'), 'Thuộc Epic có plan đã duyệt');
  assert.equal(planDorLine(contract, 'task'), 'Thuộc Epic có plan đã duyệt, hoặc được bạn duyệt trực tiếp');
  assert.equal(planDorLine(contract, 'bug'), undefined);
  assert.equal(planDorLine(contract, 'epic'), undefined);
});

test('[ ] before the line becomes [x]; the rest of the description stays as it was', () => {
  const { description, status } = tickDorLine(story(), planDorLine(contract, 'story'));
  assert.equal(status, 'ticked');
  assert.deepEqual(description, story('[x]'));
});

test('an ADF task item of the line becomes DONE; a Task line matches on its first clause', () => {
  const { description, status } = tickDorLine(taskList(), planDorLine(contract, 'task'));
  assert.equal(status, 'ticked');
  assert.deepEqual(description, taskList('DONE'));
  assert.equal(tickDorLine(taskList(), planDorLine(contract, 'story')).status, 'ticked', 'the Story line is the first clause of the Task line');
});

test('a line already ticked is left alone, and a description without it says so', () => {
  assert.deepEqual(tickDorLine(story('[x]'), planDorLine(contract, 'story')), { description: story('[x]'), status: 'already' });
  assert.deepEqual(tickDorLine(story('[X]'), planDorLine(contract, 'story')).status, 'already');
  assert.deepEqual(tickDorLine(taskList('DONE'), planDorLine(contract, 'task')).status, 'already');
  const none = doc({ type: 'paragraph', content: [text('Có user story')] });
  assert.deepEqual(tickDorLine(none, planDorLine(contract, 'story')), { description: none, status: 'missing' });
  assert.deepEqual(tickDorLine(null, planDorLine(contract, 'story')).status, 'missing');
});

test('a line that only mentions the plan, or a box further in the text, is not the DoR line', () => {
  const mention = doc({ type: 'paragraph', content: [text('Ghi chú: [ ] Thuộc Epic có plan đã duyệt sẽ được tick sau')] });
  assert.equal(tickDorLine(mention, planDorLine(contract, 'story')).status, 'missing');
});

// jira-sync refines the children of an Epic that passed gate ② and ticks the line of each one, once.
const IN_PROGRESS = jiraStatus('In Progress', 'indeterminate');
const NEW = jiraStatus('New', 'new');
const parent = { key: 'DEMO-20', type: 'Epic', st: IN_PROGRESS };
const child = (key, description, type = 'Story') => {
  const found = jiraIssue({ key, type, st: NEW, parent });
  found.fields.description = description;
  return found;
};

test('refine-children ticks the line of each child it refines, and comments on a child without it', async () => {
  const kids = [child('DEMO-21', story()), child('DEMO-24', taskList(), 'Task'), child('DEMO-25', doc({ type: 'paragraph', content: [text('Có user story')] }))];
  const jira = fakeJira({ issues: [jiraIssue({ key: 'DEMO-20', type: 'Epic', st: IN_PROGRESS }), ...kids], search: { 'parent = "DEMO-20"': kids } });
  const lines = [];
  const { failures } = await runSync({ event: 'workflow_dispatch', payload: { inputs: { item: 'DEMO-20' } }, jira, github: null, contract, mapping, space: 'DEMO', log: (line) => lines.push(line) });
  assert.deepEqual(failures, []);
  assert.deepEqual(lines, [
    'workflow_dispatch: DEMO-20',
    'Made DEMO-21: Refine (new → ready); ticked its DoR line',
    'Made DEMO-24: Refine (new → ready); ticked its DoR line',
    'Made DEMO-25: Refine (new → ready); its description has no DoR line to tick, so it got a comment',
  ]);
  assert.deepEqual(jira.writes, [
    ['transition', 'DEMO-21', 'Refine'],
    ['edit', 'DEMO-21', { fields: { description: story('[x]') } }],
    ['transition', 'DEMO-24', 'Refine'],
    ['edit', 'DEMO-24', { fields: { description: taskList('DONE') } }],
    ['transition', 'DEMO-25', 'Refine'],
    ['comment', 'DEMO-25', 'jira-sync: DEMO-25 is Ready: the plan of DEMO-20 is approved. Its description has no Definition of Ready line "Thuộc Epic có plan đã duyệt" to tick.'],
  ]);
});

test('a dry run ticks nothing', async () => {
  const kids = [child('DEMO-21', story())];
  const jira = fakeJira({ issues: [jiraIssue({ key: 'DEMO-20', type: 'Epic', st: IN_PROGRESS }), ...kids], search: { 'parent = "DEMO-20"': kids } });
  await runSync({ event: 'workflow_dispatch', payload: { inputs: { item: 'DEMO-20' } }, jira, github: null, contract, mapping, space: 'DEMO', dryRun: true, log: () => {} });
  assert.deepEqual(jira.writes, []);
});
