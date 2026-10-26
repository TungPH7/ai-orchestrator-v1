import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readContract } from '../lib/contract.mjs';
import { CONTRACT_DIR, ROOT } from './helpers/kit.mjs';

const TEMPLATE_DIR = join(ROOT, 'templates');
const contract = readContract(CONTRACT_DIR);

// The level-2 sections of each template, in order. spec, plan and adr follow the agent-skills 0.6.13 skills
// spec-driven-development, planning-and-task-breakdown and documentation-and-adrs.
const SECTIONS = {
  'spec.md': [
    'Objective',
    'Tech Stack',
    'Commands',
    'Project Structure',
    'Code Style',
    'Testing Strategy',
    'Boundaries',
    'Success Criteria',
    'Open Questions',
    'Example',
  ],
  'plan.md': ['Overview', 'Architecture Decisions', 'API Contract', 'Task List', 'Risks and Mitigations', 'Open Questions', 'Example'],
  'adr.md': ['Status', 'Date', 'Context', 'Decision', 'Alternatives Considered', 'Consequences', 'Example'],
  'story.md': ['User Story', 'Acceptance Criteria', 'Dependencies', 'Design', 'Sub-tasks', 'Verification', 'Definition of Ready', 'Example'],
  'task.md': ['Goal', 'Technical Checklist', 'Dependencies', 'Verification', 'Definition of Ready', 'Example'],
  'bug.md': ['Steps to Reproduce', 'Actual Result', 'Expected Result', 'Fields', 'Evidence', 'Definition of Ready', 'Example'],
  'pull-request.md': ['Jira', 'What Changed', 'How It Was Tested', 'Acceptance Criteria Coverage', 'Risks', 'Definition of Done', 'Example'],
};

const EPIC_HEADER = ['spec.md', 'plan.md', 'adr.md'];

function read(file) {
  return readFileSync(join(TEMPLATE_DIR, file), 'utf8');
}

// The text of a level-2 section, up to the next level-2 heading.
function section(file, name) {
  const text = read(file);
  const start = text.indexOf(`\n## ${name}\n`);
  const end = text.indexOf('\n## ', start + 1);
  return text.slice(start, end === -1 ? undefined : end);
}

function checklist(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => line.startsWith('- [ ] '))
    .map((line) => line.slice('- [ ] '.length));
}

function workType(id) {
  return contract.work_types.find((type) => type.id === id);
}

// Headings outside fenced code blocks; a fence closes only on a bare marker at least as long as the one that opened it.
function headings(text) {
  const result = [];
  let fence = 0;
  for (const line of text.split(/\r?\n/)) {
    const marker = line.match(/^\s*(`{3,})/)?.[1];
    if (marker) {
      if (fence === 0) fence = marker.length;
      else if (line.trim() === marker && marker.length >= fence) fence = 0;
      continue;
    }
    if (fence === 0 && /^#{1,6} /.test(line)) result.push(line.trim());
  }
  return result;
}

for (const [file, sections] of Object.entries(SECTIONS)) {
  test(`${file} has the sections ${sections.join(', ')}, in order`, () => {
    assert.ok(existsSync(join(TEMPLATE_DIR, file)), `${file} exists`);
    const found = headings(read(file)).filter((heading) => heading.startsWith('## '));

    assert.deepEqual(found, sections.map((section) => `## ${section}`));
  });
}

test('every template has one title, opens with fill-in guidance, and ends with a collapsed example', () => {
  for (const file of readdirSync(TEMPLATE_DIR)) {
    const text = read(file);
    assert.equal(headings(text).filter((heading) => heading.startsWith('# ')).length, 1, `${file}: one title`);
    assert.ok(text.startsWith('<!--'), `${file}: guidance first`);
    const example = text.slice(text.lastIndexOf('\n## Example\n'));
    assert.ok(example.includes('<details>') && example.trimEnd().endsWith('</details>'), `${file}: example last, collapsed`);
  }
});

test('spec, plan and adr start with the Epic key and its Jira link', () => {
  for (const file of EPIC_HEADER) assert.match(read(file), /^> \*\*Epic:\*\* .+ · \*\*Jira:\*\* /m, file);
});

test('the plan has an API contract for Stories with FE and BE, and indexes its Stories and Tasks in Jira', () => {
  assert.match(section('plan.md', 'API Contract'), /FE and BE/);
  assert.match(section('plan.md', 'Task List'), /Jira/);
});

test('the DoR checklists of story, task and bug quote the DoR in contract/work-items.yaml', () => {
  for (const id of ['story', 'task', 'bug']) assert.deepEqual(checklist(section(`${id}.md`, 'Definition of Ready')), workType(id).dor, id);
});

test('the DoD checklist of the PR quotes the common DoD, then the DoD of Story, Task and Bug', () => {
  const { applies_to: types, criteria } = contract.dod_common;

  assert.deepEqual(checklist(section('pull-request.md', 'Definition of Done')), [...criteria, ...types.flatMap((id) => workType(id).dod)]);
});

test('acceptance criteria of a Story are Given/When/Then, and FE and BE work is split into Sub-tasks', () => {
  assert.match(section('story.md', 'Acceptance Criteria'), /Given .+, When .+, Then /);
  assert.match(section('story.md', 'Sub-tasks'), /\| BE \|[\s\S]*\| FE \|/);
});

test('a Bug has the four fields its DoR asks for', () => {
  for (const name of ['Found in', 'Affects Version', 'Severity', 'Fix Version']) {
    assert.ok(contract.work_item_fields.some((field) => field.name === name), `${name} is a contract field`);
    assert.match(section('bug.md', 'Fields'), new RegExp(`^\\| ${name} \\|`, 'm'), name);
  }
});

test('the PR maps each acceptance criterion to the test that covers it', () => {
  assert.match(section('pull-request.md', 'Acceptance Criteria Coverage'), /^\| Acceptance criterion \| Test \|$/m);
});
