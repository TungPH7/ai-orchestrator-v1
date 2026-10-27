import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { loadContract } from '../../lib/contract.mjs';
import { readMapping } from '../../lib/tracker/mapping.mjs';
import { adfText, jiraGuards, qaReportResult, readItem } from '../../lib/tracker/facts.mjs';
import { CONTRACT_DIR, ROOT } from '../helpers/kit.mjs';

const contract = loadContract(CONTRACT_DIR);
const mapping = readMapping(join(ROOT, 'tracker'));

// Jira answers in the shape GET /issue returns, built from a short description of the item.
const status = (name, category) => ({ name, statusCategory: { key: category } });
const IN_PROGRESS = status('In Progress', 'indeterminate');
const issue = ({ key, type = 'Story', st = status('Ready', 'new'), parent, subtasks = [], description = 'Có user story', labels = [] }) => ({
  key,
  fields: {
    issuetype: { name: type },
    status: st,
    labels,
    description: description && { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }] },
    parent: parent && { key: parent.key, fields: { issuetype: { name: parent.type }, status: parent.st } },
    subtasks: subtasks.map(([k, s]) => ({ key: k, fields: { status: s } })),
  },
});
// A QA report comment as Jira stores markdown posted through Rovo MCP: headings and paragraphs in ADF.
const report = (result, created) => ({
  created,
  body: {
    type: 'doc',
    version: 1,
    content: [
      { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'QA report: DEMO-5 Đăng nhập' }] },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Result' }] },
      { type: 'paragraph', content: [{ type: 'text', text: result }] },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Environment' }] },
    ],
  },
});
const note = (text, created) => ({ created, body: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] } });

function fakeJira({ issues = [], comments = {}, search = () => [] }) {
  const calls = [];
  return {
    calls,
    async get(path, query) {
      calls.push(['get', path, query]);
      const key = decodeURIComponent(path.split('/').pop());
      const found = issues.find((i) => i.key === key);
      if (!found) throw new Error(`Jira GET ${path} returned 404`);
      return found;
    },
    async getAll(path, query, itemsKey) {
      calls.push(['getAll', path, query, itemsKey]);
      return comments[path.split('/').at(-2)] ?? [];
    },
    async searchAll(jql, fields) {
      calls.push(['search', jql, fields]);
      return search(jql);
    },
  };
}

const guards = (client, key, actor, needed) => jiraGuards(client, { key, actor, needed, contract, mapping });

test('reads an item: type, status, parent, sub-tasks, labels and description as text', async () => {
  const client = fakeJira({
    issues: [
      issue({
        key: 'DEMO-5',
        parent: { key: 'DEMO-1', type: 'Epic', st: IN_PROGRESS },
        subtasks: [['DEMO-6', status('Done', 'done')], ['DEMO-7', IN_PROGRESS]],
        labels: ['needs-you'],
      }),
    ],
  });
  assert.deepEqual(await readItem(client, 'DEMO-5'), {
    key: 'DEMO-5',
    type: 'Story',
    status: 'Ready',
    labels: ['needs-you'],
    description: 'Có user story',
    parent: { key: 'DEMO-1', type: 'Epic', status: 'In Progress' },
    subtasks: [
      { key: 'DEMO-6', status: 'Done', done: true },
      { key: 'DEMO-7', status: 'In Progress', done: false },
    ],
  });
});

test('dor-met: a Story or Task with a description, under an Epic in progress', async () => {
  const epic = (st) => ({ key: 'DEMO-1', type: 'Epic', st });
  const cases = [
    [issue({ key: 'DEMO-5', parent: epic(IN_PROGRESS) }), true],
    [issue({ key: 'DEMO-5', type: 'Task', parent: epic(IN_PROGRESS) }), true],
    [issue({ key: 'DEMO-5', parent: epic(status('Planning', 'new')) }), false],
    [issue({ key: 'DEMO-5', parent: epic(IN_PROGRESS), description: '' }), false],
    [issue({ key: 'DEMO-5' }), false],
    [issue({ key: 'DEMO-5', type: 'Bug', parent: epic(IN_PROGRESS) }), false],
  ];
  for (const [item, holds] of cases) {
    assert.deepEqual(await guards(fakeJira({ issues: [item] }), 'DEMO-5', 'automation', ['dor-met']), holds ? ['dor-met'] : [], JSON.stringify(item.fields.issuetype));
  }
});

test('wip-available: counts the in-progress work of the same Agent, by Sub-task when a Story has them', async () => {
  const item = issue({ key: 'DEMO-9' });
  const busy = (rows) => fakeJira({ issues: [item], search: () => rows.map(([key, subtasks]) => ({ key, fields: { subtasks: subtasks.map((k) => ({ key: k })) } })) });

  // Nothing in progress for this agent.
  const free = busy([]);
  assert.deepEqual(await guards(free, 'DEMO-9', 'fe-dev', ['wip-available']), ['wip-available']);
  const [, jql, fields] = free.calls.find(([kind]) => kind === 'search');
  assert.equal(jql, 'project = "DEMO" AND "Agent" = "Frontend Developer" AND status in ("In Progress")');
  assert.deepEqual(fields, ['subtasks']);

  // A Story without Sub-tasks counts as one: the limit of 1 is reached.
  assert.deepEqual(await guards(busy([['DEMO-3', []]]), 'DEMO-9', 'fe-dev', ['wip-available']), []);
  // A Story with Sub-tasks does not count; its Sub-task of this agent does.
  assert.deepEqual(await guards(busy([['DEMO-3', ['DEMO-4']]]), 'DEMO-9', 'fe-dev', ['wip-available']), ['wip-available']);
  assert.deepEqual(await guards(busy([['DEMO-3', ['DEMO-4']], ['DEMO-4', []]]), 'DEMO-9', 'fe-dev', ['wip-available']), []);
});

test('wip-available needs an agent role with an Agent value', async () => {
  const client = fakeJira({ issues: [issue({ key: 'DEMO-9' })] });
  await assert.rejects(guards(client, 'DEMO-9', 'automation', ['wip-available']), /No Agent value for role 'automation'/);
});

test('subtasks-done: every Sub-task is in the Done category, or there is none', async () => {
  const withSubtasks = (rows) => fakeJira({ issues: [issue({ key: 'DEMO-5', st: IN_PROGRESS, subtasks: rows })] });
  assert.deepEqual(await guards(withSubtasks([]), 'DEMO-5', 'automation', ['subtasks-done']), ['subtasks-done']);
  assert.deepEqual(await guards(withSubtasks([['DEMO-6', status('Done', 'done')]]), 'DEMO-5', 'automation', ['subtasks-done']), ['subtasks-done']);
  assert.deepEqual(await guards(withSubtasks([['DEMO-6', status('Done', 'done')], ['DEMO-7', IN_PROGRESS]]), 'DEMO-5', 'automation', ['subtasks-done']), []);
});

test('qa-report-failed and qa-report-passed read the latest QA report comment', async () => {
  const withComments = (list) => fakeJira({ issues: [issue({ key: 'DEMO-5', st: status('In QA', 'indeterminate') })], comments: { 'DEMO-5': list } });
  const both = ['qa-report-failed', 'qa-report-passed'];

  assert.deepEqual(await guards(withComments([]), 'DEMO-5', 'qa', both), []);
  assert.deepEqual(await guards(withComments([report('FAIL', '2026-10-28T10:00:00.000+0700')]), 'DEMO-5', 'qa', both), ['qa-report-failed']);
  // The newest report counts, whatever order the comments come in; other comments are skipped.
  const fixed = [report('FAIL', '2026-10-28T10:00:00.000+0700'), note('Đã sửa, nhờ QA kiểm lại', '2026-10-28T13:00:00.000+0700'), report('PASS', '2026-10-28T12:00:00.000+0700')];
  assert.deepEqual(await guards(withComments(fixed), 'DEMO-5', 'qa', both), ['qa-report-passed']);
  assert.deepEqual(await guards(withComments(fixed.toReversed()), 'DEMO-5', 'qa', both), ['qa-report-passed']);

  const client = withComments([]);
  await guards(client, 'DEMO-5', 'qa', both);
  assert.equal(client.calls.filter(([kind]) => kind === 'getAll').length, 1);
  assert.deepEqual(client.calls.find(([kind]) => kind === 'getAll').slice(1), ['/rest/api/3/issue/DEMO-5/comment', { orderBy: '-created' }, 'comments']);
});

test('the QA result is read from markdown text as well as from ADF', () => {
  assert.equal(qaReportResult('# QA report: DEMO-5 Đăng nhập\n\n## Result\n\nFAIL\n\n## Environment\ndevelopment'), 'FAIL');
  assert.equal(qaReportResult('## Result\nPASS'), null);
  assert.equal(qaReportResult('# QA report: DEMO-5\n## Result\nPASS | FAIL'), null);
  assert.equal(qaReportResult(report('PASS').body), 'PASS');
});

test('ADF becomes text with one line per block', () => {
  assert.equal(adfText(report('PASS').body), 'QA report: DEMO-5 Đăng nhập\nResult\nPASS\nEnvironment\n');
  assert.equal(adfText(null), '');
  assert.equal(adfText({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'a' }, { type: 'hardBreak' }, { type: 'text', text: 'b' }] }] }), 'a\nb\n');
});

test('only the guards asked for are read, and guards from other sources are left out', async () => {
  const client = fakeJira({ issues: [issue({ key: 'DEMO-5' })] });
  assert.deepEqual(await guards(client, 'DEMO-5', 'fe-dev', ['branch-created', 'pr-open']), []);
  assert.deepEqual(client.calls.map(([kind]) => kind), ['get']);
});
