import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadContract } from '../lib/contract.mjs';
import { renderDocs } from '../lib/render.mjs';
import { CONTRACT_DIR, ROOT, makeKit } from './helpers/kit.mjs';

const RENDER_SCRIPT = join(ROOT, 'scripts', 'render-docs.mjs');

const contract = loadContract(CONTRACT_DIR);
const docs = renderDocs(contract);

function render(root, ...flags) {
  return spawnSync(process.execPath, [RENDER_SCRIPT, ...flags, join(root, 'contract'), join(root, 'docs', 'sdlc.md')], { encoding: 'utf8' });
}

// The fenced mermaid block that follows a workflow's heading.
function diagramOf(name) {
  const section = docs.slice(docs.indexOf(`### \`${name}\``));
  return section.slice(section.indexOf('```mermaid'), section.indexOf('```', section.indexOf('```mermaid') + 3));
}

test('the generated file says it is generated and must not be edited by hand', () => {
  assert.match(docs.split('\n')[0], /generated.*do not edit/i);
});

test('the stage table has one row per stage, and the gate table one row per gate', () => {
  for (const { id, name } of contract.stages) assert.ok(docs.includes(`| \`${id}\` | ${name} |`), id);
  for (const { id, number } of contract.gates) assert.ok(docs.includes(`| ${String.fromCharCode(0x2460 + number - 1)} | \`${id}\` |`), id);
});

test('the environment table has one row per environment', () => {
  for (const { name, deploy, data } of contract.environments) {
    const row = docs.split('\n').find((line) => line.startsWith(`| ${name} |`));
    assert.ok(row?.endsWith(`| ${deploy} | ${data} |`), name);
  }
});

test('the cadence table and the release rules are rendered', () => {
  for (const { when } of contract.cadence.schedule) assert.ok(docs.includes(`| ${when} |`), when);
  for (const { title } of contract.release_rules) assert.ok(docs.includes(`**${title}.**`), title);
});

test('the bug routing table has one row per route, with its Fix Version, base branch and QA environments', () => {
  for (const { id, name, routes } of contract.bug_routing) {
    for (const { severities, fix_version: fixVersion, base_branch: base } of routes) {
      const row = `| ${name} | ${severities.map((s) => `\`${s}\``).join(', ')} | ${contract.fix_versions[fixVersion]} (\`${fixVersion}\`) | \`${base}\` |`;
      assert.ok(docs.includes(row), `${id}: ${severities}`);
    }
  }
});

test('the version rules say which part each kind of release bumps', () => {
  for (const { part, when } of contract.versioning.bumps) assert.ok(docs.includes(`- ${when}: tăng \`${part}\``), part);
});

test('the WIP, error handling and metric tables have one row per entry', () => {
  for (const { scope, limit } of contract.wip_limits) assert.ok(docs.includes(`| ${scope} | ${limit} |`), scope);
  for (const { situation, action } of contract.error_handling) assert.ok(docs.includes(`| ${situation} | ${action} |`), situation);
  for (const { name, definition } of contract.metrics) assert.ok(docs.includes(`| ${name} | ${definition} |`), name);
});

test('the artifact table has one row per artifact, with its template', () => {
  for (const { name, template } of contract.artifacts) assert.ok(docs.includes(`| ${name} | \`${template}\` |`), name);
});

test('the language rules are listed', () => {
  for (const { what } of contract.language) assert.ok(docs.includes(`| ${what} |`), what);
});

test('the roles table has one row per role', () => {
  for (const { id, name } of contract.roles) assert.ok(docs.includes(`| \`${id}\` | ${name} |`), id);
});

test('each workflow has a Mermaid state diagram with every state and transition', () => {
  for (const [name, workflow] of Object.entries(contract.workflows)) {
    const diagram = diagramOf(name);
    const node = (state) => state.replaceAll('-', '_');

    assert.match(diagram, /^```mermaid\nstateDiagram-v2\n/, name);
    assert.ok(diagram.includes(`[*] --> ${node(workflow.initial)}\n`), `${name}: initial`);
    for (const state of Object.keys(workflow.states)) assert.ok(diagram.includes(`state "${state}" as ${node(state)}\n`), `${name}: ${state}`);
    for (const state of workflow.final) assert.ok(diagram.includes(`${node(state)} --> [*]\n`), `${name}: final ${state}`);
    for (const { id, from, to } of workflow.transitions) {
      for (const source of [from].flat()) assert.ok(diagram.includes(`${node(source)} --> ${node(to)}: ${id}\n`), `${name}: ${id} from ${source}`);
    }
  }
});

test('sections follow the order of spec section 2', () => {
  const headings = [
    '## Vai trò',
    '## Giai đoạn và cổng',
    '## Work item',
    '## Workflow',
    '## DoR và DoD',
    '## Môi trường, nhánh và định tuyến bug',
    '## Nhịp làm việc, release, WIP và số liệu',
    '## Xử lý lỗi',
    '## Artifact và template',
  ];
  const order = headings.map((heading) => docs.indexOf(`\n${heading}\n`));

  assert.ok(order.every((index, i) => index > (order[i - 1] ?? 0)), order.join(', '));
});

test('the hierarchy table has one row per work type, with its Jira issue type and workflow', () => {
  for (const { id, concept, jira_issue_type: jira } of contract.work_types) {
    const workflow = Object.keys(contract.workflows).find((name) => contract.workflows[name].applies_to.includes(id));
    assert.ok(docs.includes(`| ${concept} | ${jira} | \`${id}\` | \`${workflow}\` |`), id);
  }
});

test('the field table describes every value of Severity', () => {
  assert.ok(
    docs.includes(
      '| Severity | `bug` | Critical: Mất hoặc sai dữ liệu, lỗ hổng bảo mật, hệ thống hoặc luồng thanh toán ngừng; High: Luồng chính hỏng, không có cách né; Medium: Có cách né; Low: Giao diện, chính tả | ba đề xuất, bạn duyệt |',
    ),
  );
});

test('the DoR table has one row per work type that has a DoR', () => {
  for (const { id, dor } of contract.work_types.filter((type) => type.dor)) assert.ok(docs.includes(`| \`${id}\` | ${dor.join('; ')} |`), id);
});

test('the DoD lists the common criteria, then the criteria of each type', () => {
  for (const criterion of contract.dod_common.criteria) assert.ok(docs.includes(`- ${criterion}\n`), criterion);
  for (const { id, dod } of contract.work_types.filter((type) => type.dod)) assert.ok(docs.includes(`| \`${id}\` | ${dod.join('; ')} |`), id);
});

test('each transition row names who moves it, its conditions, evidence and effects', () => {
  assert.ok(
    docs.includes(
      '| `qa-fail` | `in-qa` → `in-progress` | `qa` | Báo cáo QA mới nhất của item có kết quả FAIL | `tracker` (`qa-report`) | `increment-rework` |',
    ),
  );
});

test('the output uses LF line endings and ends with one newline', () => {
  assert.ok(!docs.includes('\r'));
  assert.ok(docs.endsWith('\n') && !docs.endsWith('\n\n'));
});

test('the committed docs/sdlc.md is up to date with the contract', () => {
  const result = spawnSync(process.execPath, [RENDER_SCRIPT, '--check'], { cwd: ROOT, encoding: 'utf8' });

  assert.equal(result.status, 0, result.stderr);
});

test('rendering twice gives the same file', (t) => {
  const root = makeKit(t, {});
  const out = join(root, 'docs', 'sdlc.md');

  render(root);
  const first = readFileSync(out, 'utf8');
  render(root);

  assert.equal(readFileSync(out, 'utf8'), first);
});

test('render --check passes right after render', (t) => {
  const root = makeKit(t, {});

  render(root);

  assert.equal(render(root, '--check').status, 0);
});

test('render --check fails when docs/sdlc.md was edited by hand', (t) => {
  const root = makeKit(t, {});
  render(root);

  appendFileSync(join(root, 'docs', 'sdlc.md'), 'hand edit\n');
  const result = render(root, '--check');

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /npm run render/);
});

test('render --check fails when the YAML changed and docs were not rendered again', (t) => {
  const root = makeKit(t, {});
  render(root);

  appendFileSync(join(root, 'contract', 'roles.yaml'), '  - id: data\n    name: "Data Engineer"\n    responsibilities: "Pipeline dữ liệu"\n');

  assert.notEqual(render(root, '--check').status, 0);
});
