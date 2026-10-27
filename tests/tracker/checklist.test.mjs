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

test('every item is a box to tick, in the order of spec 2.10', () => {
  const headings = lines.filter((line) => line.startsWith('## ')).map((line) => line.replace(/^## \d+\. /, ''));
  assert.deepEqual(headings, [
    'Group và service account', 'Rovo MCP', 'Status', 'Workflow', 'Workflow scheme', 'Trường', 'Resolution',
    'Space', 'Board', 'GitHub for Jira', 'Môi trường', 'Kiểm lại',
  ]);
});

test('each identity has its group, with its account as the member', () => {
  for (const { group, account } of mapping.identities) {
    assert.ok(lines.some((line) => line.startsWith('- [ ]') && line.includes(`\`${group}\``) && line.includes(account)), group);
  }
});

test('each status is listed once, with its category', () => {
  const statusLines = section('## 3.');
  assert.deepEqual(statusLines, [
    '- [ ] `New`: nhóm To Do',
    '- [ ] `Ready`: nhóm To Do',
    '- [ ] `In Progress`: nhóm In Progress',
    '- [ ] `In Review`: nhóm In Progress',
    '- [ ] `Ready for QA`: nhóm In Progress',
    '- [ ] `In QA`: nhóm In Progress',
    '- [ ] `Done`: nhóm Done',
    '- [ ] `Cancelled`: nhóm Done',
    '- [ ] `Specifying`: nhóm To Do',
    '- [ ] `Planning`: nhóm To Do',
    '- [ ] `To Do`: nhóm To Do',
  ]);
});

test('a transition line names its statuses, the groups allowed to move it, and what it sets', () => {
  const standard = section('### `AO standard`');
  assert.ok(standard.includes('- [ ] Transition `Submit`: `In Progress` → `In Review`. Chỉ group `ao-automation`'));
  assert.ok(standard.includes('- [ ] Transition `Accept`: `In QA` → `Done`. Chỉ group `ao-humans`. Đặt Resolution là `Done`'));
  assert.ok(standard.includes('- [ ] Transition `Refine`: `New` → `Ready`. Chỉ group `ao-humans`, `ao-automation`'));
  assert.ok(
    standard.includes('- [ ] Transition `Request changes`: `In Review` → `In Progress`. Chỉ group `ao-humans`, `ao-agents`, `ao-automation`'),
  );
});

test('cancel becomes one Jira transition per `from`, each asking for a Resolution', () => {
  const cancels = (heading) => section(heading).filter((line) => line.includes('Transition `Cancel`'));
  assert.equal(cancels('### `AO standard`').length, 6);
  assert.equal(cancels('### `AO epic`').length, 4);
  for (const line of [...cancels('### `AO standard`'), ...cancels('### `AO epic`')]) assert.match(line, /Màn hình chọn Resolution$/);
});

test('the workflow scheme maps each Jira issue type to its workflow', () => {
  assert.deepEqual(section('## 5.').slice(1), [
    '- [ ] `Epic` → `AO epic`',
    '- [ ] `Story` → `AO standard`',
    '- [ ] `Sub-task` → `AO sub-task`',
    '- [ ] `Task` → `AO standard`',
    '- [ ] `Bug` → `AO standard`',
  ]);
});

test('custom fields list their type, work types and options; Rework count is not a field', () => {
  const fields = section('## 6.');
  assert.ok(fields.includes('- [ ] Tạo custom field `Severity`, loại Select List (single choice), cho `Bug`. Option: `Critical`, `High`, `Medium`, `Low`'));
  assert.ok(fields.some((line) => line.startsWith('- [ ] Tạo custom field `Agent`') && line.includes('`Story`, `Sub-task`, `Task`, `Bug`') && line.includes('`Frontend Developer`')));
  assert.ok(!doc.includes('Rework count`, loại'));
});

test('resolutions: the four Jira ships are kept, Not a bug is created', () => {
  assert.deepEqual(section('## 7.'), [
    "- [ ] `Won't Do`: có sẵn trong Jira, giữ lại",
    '- [ ] `Duplicate`: có sẵn trong Jira, giữ lại',
    '- [ ] `Not a bug`: tạo mới',
    '- [ ] `Cannot Reproduce`: có sẵn trong Jira, giữ lại',
    '- [ ] `Done`: có sẵn trong Jira, giữ lại',
  ]);
});

test('board columns list their statuses, the Kanban backlog and the WIP limit', () => {
  const board = section('## 9.');
  assert.ok(board.includes('- [ ] Filter của board: `project = <KEY> AND issuetype != Epic ORDER BY Rank ASC`'));
  assert.ok(board.includes('- [ ] Cột `Backlog` (Kanban backlog): status `New`'));
  assert.ok(board.includes('- [ ] Cột `Ready`: status `Ready`, `To Do`'));
  assert.ok(board.includes('- [ ] Cột `In Review`: status `In Review`. Tối đa 2'));
  assert.ok(board.includes('- [ ] Cột `QA`: status `Ready for QA`, `In QA`'));
  assert.ok(board.some((line) => line.includes('`Cancelled`') && line.includes('không gắn vào cột nào')));
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
