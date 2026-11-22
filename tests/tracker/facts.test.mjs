import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { loadContract } from '../../lib/contract.mjs';
import { readMapping } from '../../lib/tracker/mapping.mjs';
import { adfText, jiraGuards, qaReportResult, readItem, wipHolders } from '../../lib/tracker/facts.mjs';
import { CONTRACT_DIR, ROOT } from '../helpers/kit.mjs';

const contract = loadContract(CONTRACT_DIR);
const mapping = readMapping(join(ROOT, 'tracker'));

// Jira answers in the shape GET /issue returns, built from a short description of the item.
const status = (name, category) => ({ name, statusCategory: { key: category } });
const IN_PROGRESS = status('In Progress', 'indeterminate');
const issue = ({ key, type = 'Story', st = status('Ready', 'new'), parent, subtasks = [], description = 'Có user story', labels = [], links = [] }) => ({
  key,
  fields: {
    issuetype: { name: type },
    status: st,
    labels,
    description: description && { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }] },
    parent: parent && { key: parent.key, fields: { issuetype: { name: parent.type }, status: parent.st } },
    subtasks: subtasks.map(([k, s]) => ({ key: k, fields: { status: s } })),
    issuelinks: links,
  },
});
const BLOCKS = { name: 'Blocks', inward: 'is blocked by', outward: 'blocks' };
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
const withComments = (list) => fakeJira({ issues: [issue({ key: 'DEMO-5', st: status('In QA', 'indeterminate') })], comments: { 'DEMO-5': list } });

test('reads an item: type, status, parent, sub-tasks, labels, blocking items and description as text', async () => {
  const client = fakeJira({
    issues: [
      issue({
        key: 'DEMO-5',
        parent: { key: 'DEMO-1', type: 'Epic', st: IN_PROGRESS },
        subtasks: [['DEMO-6', status('Done', 'done')], ['DEMO-7', IN_PROGRESS]],
        labels: ['needs-you'],
        links: [
          { type: BLOCKS, inwardIssue: { key: 'DEMO-3' } },
          { type: BLOCKS, outwardIssue: { key: 'DEMO-8' } },
          { type: { name: 'Relates', inward: 'relates to', outward: 'relates to' }, inwardIssue: { key: 'DEMO-4' } },
        ],
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
    blockedBy: ['DEMO-3'],
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

// C2 spec section 6: runs.agents_per_role lets N agents of one role work at once, each on its own item.
test('wip-available and wipHolders take the number of agents of the role from runs.agents_per_role', async () => {
  const item = issue({ key: 'DEMO-9' });
  const busy = (rows) => fakeJira({ issues: [item], search: () => rows.map(([key]) => ({ key, fields: { subtasks: [] } })) });
  const two = { 'fe-dev': 2 };
  const allowed = (client, agentsPerRole) => jiraGuards(client, { key: 'DEMO-9', actor: 'fe-dev', needed: ['wip-available'], contract, mapping, agentsPerRole });
  assert.deepEqual(await allowed(busy([['DEMO-3']]), two), ['wip-available']);
  assert.deepEqual(await allowed(busy([['DEMO-3'], ['DEMO-4']]), two), []);
  // A role it does not name keeps the limit of the contract.
  assert.deepEqual(await jiraGuards(busy([['DEMO-3']]), { key: 'DEMO-9', actor: 'be-dev', needed: ['wip-available'], contract, mapping, agentsPerRole: two }), []);
  assert.deepEqual(await wipHolders(busy([['DEMO-3']]), { space: 'DEMO', actor: 'fe-dev', contract, mapping, agentsPerRole: two }), { keys: ['DEMO-3'], limit: 2 });
  assert.equal((await wipHolders(busy([]), { space: 'DEMO', actor: 'fe-dev', contract, mapping })).limit, 1);
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
  assert.equal(qaReportResult('# QA report: DEMO-5 Đăng nhập\n\n## Result\n\nNOT TESTED\n'), 'NOT TESTED');
  assert.equal(qaReportResult(report('NOT TESTED').body), 'NOT TESTED');
  assert.equal(qaReportResult(report('FAIL').body), 'FAIL');
  assert.equal(qaReportResult('# QA report: DEMO-5\n## Result\nPASS | FAIL | NOT TESTED'), null);
});

// agent-roster spec 2.9: a report that could not test every criterion is still the latest report.
test('a NOT TESTED report hides an older FAIL, and then neither qa-report-failed nor qa-report-passed holds', async () => {
  const both = ['qa-report-failed', 'qa-report-passed'];
  const comments = [report('FAIL', '2026-10-28T10:00:00.000+0700'), report('NOT TESTED', '2026-10-28T12:00:00.000+0700')];

  assert.deepEqual(await guards(withComments(comments), 'DEMO-5', 'qa', both), []);
  assert.deepEqual(await guards(withComments(comments.toReversed()), 'DEMO-5', 'qa', both), []);
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

test('wipHolders names the items that hold the WIP of a role, and its limit', async () => {
  const client = fakeJira({ issues: [], search: () => [{ key: 'SHOP-31', fields: { subtasks: [{ key: 'SHOP-33' }] } }, { key: 'SHOP-58', fields: { subtasks: [] } }] });
  assert.deepEqual(await wipHolders(client, { space: 'SHOP', actor: 'fe-dev', contract, mapping }), { keys: ['SHOP-58'], limit: 1 });
  const [, jql] = client.calls.find(([kind]) => kind === 'search');
  assert.match(jql, /^project = "SHOP" AND "Agent" = "Frontend Developer"/);
});

// Kit followups, batch 4 item 14: an ops Task (label ao-ops) goes to QA by hand-over of devops once its evidence is on
// the item: a comment of devops with the heading Ops evidence, as Rovo MCP stores markdown.
const evidence = (agent, heading = 'Ops evidence') => ({
  created: '2026-11-19T08:00:00.000+0700',
  body: { type: 'doc', version: 1, content: [
    { type: 'paragraph', content: [{ type: 'text', text: `${agent}: thêm năm sản phẩm lên Staging` }] },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: heading }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'GET /api/products trả 5 sản phẩm mới, ảnh ở .ai/ops/DEMO-5/' }] },
  ] },
});
// ops-task reads GitHub too since the review of shop PR #78: tests/tracker/facts-github.test.mjs.
test('ops-evidence holds for a comment of devops with the heading Ops evidence', async () => {
  const ops = (labels, list = []) => fakeJira({ issues: [issue({ key: 'DEMO-5', type: 'Task', st: IN_PROGRESS, labels })], comments: { 'DEMO-5': list } });
  assert.deepEqual(await guards(ops(['ao-ops'], [evidence('DevOps Engineer')]), 'DEMO-5', 'devops', ['ops-evidence']), ['ops-evidence']);
  assert.deepEqual(await guards(ops(['ao-ops'], [evidence('Tester/QA Engineer')]), 'DEMO-5', 'devops', ['ops-evidence']), [], 'the evidence is devops\'s');
  assert.deepEqual(await guards(ops(['ao-ops'], [evidence('DevOps Engineer', 'Notes')]), 'DEMO-5', 'devops', ['ops-evidence']), [], 'with its heading');
  assert.deepEqual(await guards(ops(['ao-ops'], [note('DevOps Engineer: ## Ops evidence xong')]), 'DEMO-5', 'devops', ['ops-evidence']), [], 'a heading of its own, not words in a line');
});

test('ops-evidence reads the markdown of a comment too', async () => {
  const ops = (body) => fakeJira({ issues: [issue({ key: 'DEMO-5', type: 'Task', st: IN_PROGRESS, labels: ['ao-ops'] })], comments: { 'DEMO-5': [{ created: '2026-11-19T08:00:00.000+0700', body }] } });
  assert.deepEqual(await guards(ops('DevOps Engineer: xong\n\n## Ops evidence\n\nGET trả 200'), 'DEMO-5', 'devops', ['ops-evidence']), ['ops-evidence']);
  assert.deepEqual(await guards(ops('DevOps Engineer: xong, Ops evidence ở dưới'), 'DEMO-5', 'devops', ['ops-evidence']), []);
});

// T14 of C2: comment 10639 of SHOP-82 opened with "Tester/QA Engineer: # QA report: …" in one paragraph, as the rules
// ask every comment to start with the Agent value, and /ao-qa --retest said it had no QA report.
test('a QA report behind the Agent value of its writer is read', () => {
  assert.equal(qaReportResult('Tester/QA Engineer: # QA report: SHOP-82 Danh mục\n\n## Result\n\nNOT TESTED\n'), 'NOT TESTED');
  assert.equal(qaReportResult('Tester/QA Engineer: QA report: SHOP-82\n## Result\nPASS'), 'PASS');
  assert.equal(qaReportResult('Tester/QA Engineer:\n# QA report: SHOP-82\n## Result\nFAIL'), 'FAIL');
  // Words before a colon that are not a name stay what they are.
  assert.equal(qaReportResult('Xem lại sau khi đọc QA report: chưa có\n## Result\nPASS'), null);
});

// T14 of C2, finding 1: merge-gate and jira-sync run on workflow_run, and GitHub puts their check runs on the head of the
// default branch, where merge-gate may wait for QA up to 100 minutes. The CI of a branch head leaves them out.
test('the CI of a branch head leaves out the jobs of the kit that are not CI', async () => {
  const { readChecks, NOT_BRANCH_CI } = await import('../../lib/tracker/facts.mjs');
  const runs = [
    { name: 'build-test', status: 'completed', conclusion: 'success' },
    { name: 'merge-gate', status: 'in_progress', conclusion: null },
    { name: 'jira-sync', status: 'completed', conclusion: 'failure' },
    { name: 'audit', status: 'queued', conclusion: null },
  ];
  const github = { getAll: async () => runs, get: async () => ({ total_count: 0, state: 'pending' }) };
  assert.deepEqual(await readChecks(github, 'c'.repeat(40), { ignore: NOT_BRANCH_CI }), { green: true, failed: false, started: true });
  assert.equal((await readChecks(github, 'c'.repeat(40))).green, false, 'a PR head still counts merge-gate and audit as it did');
});
