import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadContract } from '../../lib/contract.mjs';
import { readMapping } from '../../lib/tracker/mapping.mjs';
import { renderChecklist, renderJiraConfig } from '../../lib/tracker/checklist.mjs';
import { CONTRACT_DIR, ROOT, makeKit } from '../helpers/kit.mjs';

const CHECKLIST_SCRIPT = join(ROOT, 'scripts', 'jira-checklist.mjs');

const contract = loadContract(CONTRACT_DIR);
const mapping = readMapping(join(ROOT, 'tracker'));
const doc = renderChecklist(contract, mapping);
const lines = doc.split('\n');

// The checklist lines of one workflow section.
function section(heading) {
  const start = lines.findIndex((line) => line.startsWith(heading));
  const end = lines.findIndex((line, index) => index > start && /^#{2,3} /.test(line));
  return lines.slice(start, end === -1 ? undefined : end).filter((line) => line.startsWith('- [ ]'));
}

test('the generated file says it is generated and must not be edited by hand', () => {
  assert.match(lines[0], /generated.*do not edit/i);
});

test('sections follow spec 2.10, with resolutions before the workflows that set them and work types before the scheme', () => {
  const headings = lines.filter((line) => line.startsWith('## ')).map((line) => line.replace(/^## \d+\. /, ''));
  assert.deepEqual(headings, [
    'Group và service account', 'Rovo MCP', 'Resolution', 'Status', 'Workflow', 'Work type', 'Workflow scheme',
    'Trường', 'Space', 'Board', 'GitHub for Jira', 'Môi trường', 'Kiểm lại',
  ]);
});

test('every section but the last says where to click before it lists the items', () => {
  const starts = lines.flatMap((line, index) => (line.startsWith('## ') ? [index] : []));
  for (const [n, start] of starts.slice(0, -1).entries()) {
    const body = lines.slice(start + 1, starts[n + 1]);
    const firstItem = body.findIndex((line) => line.startsWith('- [ ]'));
    assert.ok(body.slice(0, firstItem).some((line) => line.includes('**')), lines[start]);
  }
});

test('each identity has its group, with its account as the member', () => {
  for (const { group, account } of mapping.identities) {
    assert.ok(lines.some((line) => line.startsWith('- [ ]') && line.includes(`\`${group}\``) && line.includes(account)), group);
  }
});

test('each status is listed once, with its category', () => {
  assert.deepEqual(section('## 4.'), [
    '- [ ] Name `New`, Category `To Do`',
    '- [ ] Name `Ready`, Category `To Do`',
    '- [ ] Name `In Progress`, Category `In Progress`',
    '- [ ] Name `In Review`, Category `In Progress`',
    '- [ ] Name `Ready for QA`, Category `In Progress`',
    '- [ ] Name `In QA`, Category `In Progress`',
    '- [ ] Name `Done`, Category `Done`',
    '- [ ] Name `Cancelled`, Category `Done`',
    '- [ ] Name `Specifying`, Category `To Do`',
    '- [ ] Name `Planning`, Category `To Do`',
    '- [ ] Name `To Do`, Category `To Do`',
  ]);
});

test('a transition line names its statuses, the groups allowed to move it, and what it sets', () => {
  const standard = section('### `AO standard`');
  assert.ok(standard.includes('- [ ] Transition `Submit`: From `In Progress`, To `In Review`. Restrict → Groups: `ao-automation`'));
  assert.ok(
    standard.includes('- [ ] Transition `Accept`: From `In QA`, To `Done`. Restrict → Groups: `ao-humans`. Rule đặt Resolution là `Done`'),
  );
  assert.ok(standard.includes('- [ ] Transition `Refine`: From `New`, To `Ready`. Restrict → Groups: `ao-humans`, `ao-automation`'));
  assert.ok(
    standard.includes(
      '- [ ] Transition `Request changes`: From `In Review`, To `In Progress`. Restrict → Groups: `ao-humans`, `ao-agents`, `ao-automation`',
    ),
  );
  assert.equal(standard.at(-1), '- [ ] Bấm **Update workflow** để lưu');
});

test('cancel becomes one Jira transition per `from`, each asking for a Resolution', () => {
  const cancels = (heading) => section(heading).filter((line) => line.includes('Transition `Cancel`'));
  assert.equal(cancels('### `AO standard`').length, 6);
  assert.equal(cancels('### `AO epic`').length, 4);
  for (const line of [...cancels('### `AO standard`'), ...cancels('### `AO epic`')]) assert.match(line, /Rule hỏi Resolution khi hủy$/);
});

test('work types: Epic is built in, Sub-task is a sub-task type, the others are standard', () => {
  assert.deepEqual(section('## 6.'), [
    '- [ ] Work type `Epic`: có sẵn trong Jira, không tạo',
    '- [ ] Work type `Story`, loại Standard',
    '- [ ] Work type `Sub-task`, loại sub-task (trang **Sub-tasks**)',
    '- [ ] Work type `Task`, loại Standard',
    '- [ ] Work type `Bug`, loại Standard',
  ]);
});

test('the workflow scheme lists each workflow with the Jira work types it serves', () => {
  assert.deepEqual(section('## 7.').slice(1), [
    '- [ ] Workflow `AO epic`: `Epic`',
    '- [ ] Workflow `AO standard`: `Story`, `Task`, `Bug`',
    '- [ ] Workflow `AO sub-task`: `Sub-task`',
  ]);
});

test('custom fields list their type, work types and options, and keep the global context; Rework count is not a field', () => {
  const fields = section('## 8.');
  assert.ok(fields.includes('- [ ] Field `Severity`, type Select List (single choice), dùng cho `Bug`. Option: `Critical`, `High`, `Medium`, `Low`'));
  assert.ok(
    fields.some(
      (line) => line.startsWith('- [ ] Field `Agent`') && line.includes('dùng cho') && line.includes('`Story`, `Sub-task`, `Task`, `Bug`') && line.includes('`Frontend Developer`'),
    ),
  );
  assert.ok(fields.includes('- [ ] Rework count: không tạo trường, số này được đếm từ lịch sử chuyển trạng thái'));
  // Jira no longer lets the global context be restricted to work types (CHANGE-3019).
  assert.ok(!doc.includes('Applicable work types'));
});

test('resolutions: the four of the contract, then Done for the transitions into done', () => {
  assert.deepEqual(section('## 3.'), [
    "- [ ] Resolution `Won't Do`",
    '- [ ] Resolution `Duplicate`',
    '- [ ] Resolution `Not a bug`',
    '- [ ] Resolution `Cannot Reproduce`',
    '- [ ] Resolution `Done`',
  ]);
});

test('board columns list their statuses, the Kanban backlog and the WIP limit', () => {
  const start = lines.findIndex((line) => line.startsWith('## 10.'));
  const board = lines.slice(start, lines.findIndex((line, index) => index > start && line.startsWith('## '))).filter((line) => line.startsWith('- [ ]'));
  assert.ok(board.includes('- [ ] Filter: `project = <KEY> AND issuetype != Epic ORDER BY Rank ASC`'));
  assert.ok(board.includes('- [ ] Kanban backlog (`Backlog`): status `New`'));
  assert.ok(board.includes('- [ ] Cột `Ready`: status `Ready`, `To Do`'));
  assert.ok(board.includes('- [ ] Cột `In Review`: status `In Review`. Tối đa 2'));
  assert.ok(board.includes('- [ ] Cột `QA`: status `Ready for QA`, `In QA`'));
  assert.ok(board.some((line) => line.includes('`Cancelled`') && line.includes('Unmapped statuses')));
});

test('.jira/config.yml maps each Jira environment type to its GitHub environment', () => {
  assert.equal(
    renderJiraConfig(mapping),
    ['deployments:', '  environmentMapping:', '    development: ["development"]', '    staging: ["staging"]', '    production: ["production"]', ''].join('\n'),
  );
  assert.ok(doc.includes(renderJiraConfig(mapping)));
});

test('the output uses LF line endings and ends with one newline', () => {
  assert.ok(!doc.includes('\r'));
  assert.ok(doc.endsWith('\n') && !doc.endsWith('\n\n'));
});

test('the committed docs/jira-setup.md is up to date', () => {
  const result = spawnSync(process.execPath, [CHECKLIST_SCRIPT, '--check'], { cwd: ROOT, encoding: 'utf8' });

  assert.equal(result.status, 0, result.stderr);
});

test('--check fails when docs/jira-setup.md is out of date, and writing fixes it', (t) => {
  const root = makeKit(t, { 'tracker/jira.yaml': readFileSync(join(ROOT, 'tracker', 'jira.yaml'), 'utf8') });
  const run = (...flags) =>
    spawnSync(process.execPath, [CHECKLIST_SCRIPT, ...flags, join(root, 'contract'), join(root, 'docs', 'jira-setup.md')], { encoding: 'utf8' });

  assert.notEqual(run('--check').status, 0);
  assert.equal(run().status, 0);
  assert.equal(run('--check').status, 0);
  appendFileSync(join(root, 'docs', 'jira-setup.md'), 'edited by hand\n');
  const stale = run('--check');
  assert.notEqual(stale.status, 0);
  assert.match(stale.stderr, /out of date/);
});
