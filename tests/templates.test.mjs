import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './helpers/kit.mjs';

const TEMPLATE_DIR = join(ROOT, 'templates');

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
};

const EPIC_HEADER = ['spec.md', 'plan.md', 'adr.md'];

function read(file) {
  return readFileSync(join(TEMPLATE_DIR, file), 'utf8');
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
  const plan = read('plan.md');
  const section = (name) => plan.slice(plan.indexOf(`## ${name}`), plan.indexOf('\n## ', plan.indexOf(`## ${name}`) + 1));

  assert.match(section('API Contract'), /FE and BE/);
  assert.match(section('Task List'), /Jira/);
});
