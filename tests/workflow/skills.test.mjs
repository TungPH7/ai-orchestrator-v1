import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { KIT_SKILL_PREFIX, readRoster, validateRoster } from '../../lib/agents/roster.mjs';
import { readContract } from '../../lib/contract.mjs';
import { readGates } from '../../lib/quality/gates.mjs';
import { CONTRACT_DIR, ROOT } from '../helpers/kit.mjs';

const SKILLS = join(ROOT, 'kit', '.claude', 'skills');
const COMMANDS = { status: '[KEY]', intake: '<rough description>', preview: '<KEY> [--stop]', spec: '<EPIC> [change | seo | no-seo [reason]]', plan: '<EPIC> [change]', request: '<KEY>', build: '<KEY> [be: … fe: …]', review: '<PR> [full]', fix: '<PR> [what to fix]', qa: '<KEY> [fail: <defect, steps, expected result>] [retest]', release: '[<vX.Y.0> <sha>]', ship: '<vX.Y.Z>', rollback: '<environment> [<sha>]' };
// The positional arguments each check passes on: /ao-release and /ao-rollback take two (release-workflow T17), and
// /ao-intake none: its description stays in the chat (human-loop spec 3.1).
const ARGS = { release: '$0 $1', rollback: '$0 $1', intake: '' };
const args = (command) => ARGS[command] ?? '$0';
const checkLine = (command) => ['node .ai-orchestrator/scripts/ao-step.mjs', command, args(command)].filter(Boolean).join(' ');
// The commands that run no agent: /ao-status reads, and the main session does /ao-intake with you.
const NO_RUN = ['status', 'intake'];
// /ao-preview runs a script step in the foreground, with no agent: its apps keep running after it ends (spec 4.3).
const SCRIPT_ONLY = ['preview'];
const read = (command) => readFileSync(join(SKILLS, `ao-${command}`, 'SKILL.md'), 'utf8');
const frontmatter = (text) => parse(text.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1]);

test('the kit has the /ao-* commands as skills, and no other ao- folder', () => {
  const folders = readdirSync(SKILLS).filter((name) => name.startsWith(KIT_SKILL_PREFIX));
  assert.deepEqual(folders.sort(), Object.keys(COMMANDS).map((c) => `ao-${c}`).sort());
});

test('each skill runs only when you type it, and says what it takes (dev-workflow spec 2.1, T1)', () => {
  for (const [command, hint] of Object.entries(COMMANDS)) {
    const meta = frontmatter(read(command));
    assert.equal(meta.name, `ao-${command}`);
    assert.equal(meta['disable-model-invocation'], true, command);
    assert.equal(meta['argument-hint'], hint, command);
    assert.ok(meta.description?.length > 20, command);
  }
});

test('the check line calls ao-step.mjs for its command with its positional arguments only; free text never reaches a shell line', () => {
  for (const command of Object.keys(COMMANDS)) {
    const text = read(command);
    const bang = text.split('\n').filter((line) => line.startsWith('!`'));
    assert.deepEqual(bang, [`!\`${checkLine(command)}\``], command);
    const beyond = ARGS[command] === '' ? /\$ARGUMENTS|\$0|\$1/ : ARGS[command] ? /\$ARGUMENTS|\$2/ : /\$ARGUMENTS|\$1/;
    for (const line of text.split('\n').filter((l) => l.includes('ao-step.mjs'))) assert.doesNotMatch(line, beyond, `${command}: ${line}`);
  }
});

test('every command that runs agents runs --go in the background with a 2-hour timeout, and leaves agents to ao-step', () => {
  for (const command of Object.keys(COMMANDS).filter((c) => !NO_RUN.includes(c) && !SCRIPT_ONLY.includes(c))) {
    const text = read(command).replace(/\s+/g, ' ');
    assert.ok(text.includes(`${checkLine(command)} --go`), command);
    assert.match(text, /in the background, with a timeout of 7200000 ms/, command);
    assert.match(text, /Do not run any agent yourself, and do not change Jira or GitHub yourself/, command);
    assert.match(text, /\.ai\/runs\/<KEY>\/last\.md/, command);
  }
  for (const command of NO_RUN) assert.doesNotMatch(read(command), /--go/, command);
});

test('/ao-preview runs its script step and --stop in the foreground, and warns that the apps run code nobody reviewed (spec 4.3)', () => {
  const text = read('preview').replace(/\s+/g, ' ');
  assert.ok(text.includes(`${checkLine('preview')} --go`));
  assert.ok(text.includes(`${checkLine('preview')} --stop --go`));
  assert.match(text, /with a timeout of 600000 ms/);
  assert.doesNotMatch(text, /in the background/);
  assert.match(text, /code no reviewer has read yet, on this machine/);
});

test('/ao-intake writes one Jira item, only after your OK, and never a Story (human-loop spec 3.1)', () => {
  const text = read('intake').replace(/\s+/g, ' ');
  assert.match(text, /## What the human wrote \$ARGUMENTS/);
  assert.match(text, /Only after the human's OK, create the item once with the createJiraIssue tool/);
  // C1 spec 6.6: the item, and the comment "Cần seo:" of its draft when nobody wrote its SEO part.
  assert.match(text, /These are the only Jira writes you make: the item, and that comment when there is one; no transition, no other comment, no edit of another item/);
  assert.match(text, /gets the label `ao-seo`/);
  assert.match(text, /add it as one comment on the item with addOrEditJiraIssueComment, word for word as in the draft, starting with `Cần seo:`/);
  assert.match(text, /needs no `Cần seo:`: its draft points to that section/);
  // C1 spec 6.7: what the workflow that writes posts (D2) needs of an Epic of a blog.
  assert.match(text, /posts in draft that only the admin sees, a preview link that people outside cannot open, and a tool that publishes a post through the API of the admin/);
  assert.match(text, /You never make a Story/);
  assert.match(text, /\.ai\/intake\//);
  assert.match(text, /do not run its script/);
});

test('answers and the text after the argument go through files, as --answers and --note', () => {
  for (const command of ['spec', 'plan']) {
    const text = read(command).replace(/\s+/g, ' ');
    assert.match(text, /\.ai\/runs\/<KEY>\/answers\.md/, command);
    assert.match(text, /Never put the answers in a shell command/, command);
  }
  // The change you ask for before gate ① or ②, and what you ask /ao-fix to fix (human-loop spec 3.2).
  for (const command of ['spec', 'plan', 'fix']) {
    const text = read(command).replace(/\s+/g, ' ');
    assert.match(text, /## What the human wrote \$ARGUMENTS/, command);
    assert.match(text, /--note \.ai\/runs\/<KEY>\/note\.md/, command);
    assert.match(text, /Never put that text in a shell command/, command);
  }
});

test('the kit settings allow the check line, and nothing else (spec 2.1)', () => {
  const settings = JSON.parse(readFileSync(join(ROOT, 'kit', '.claude', 'settings.json'), 'utf8'));
  assert.deepEqual(settings.permissions, { allow: ['Bash(node .ai-orchestrator/scripts/ao-step.mjs:*)'] });
});

test('skills:vendor and rule A4 leave the ao- folders alone: they are not vendored skills, and no vendored skill may take the prefix', () => {
  const roster = readRoster(join(ROOT, 'agents'));
  assert.ok(roster.vendored_skills.every(({ name }) => !name.startsWith(KIT_SKILL_PREFIX)));
  const skills = new Map(readdirSync(SKILLS).map((name) => [name, readFileSync(join(SKILLS, name, 'SKILL.md'), 'utf8')]));
  assert.ok([...skills.keys()].some((name) => name.startsWith(KIT_SKILL_PREFIX)));
  const errors = validateRoster(roster, readContract(CONTRACT_DIR), { gates: readGates(join(ROOT, 'quality')), skills });
  assert.deepEqual(errors, []);
});

test('every folder of kit/.claude/skills/ is a kit command, a vendored skill or an adapted skill (D3)', () => {
  const roster = readRoster(join(ROOT, 'agents'));
  const known = new Set([...roster.vendored_skills.map(({ name }) => name), ...roster.adapted_skills]);
  assert.deepEqual(readdirSync(SKILLS).filter((name) => !name.startsWith(KIT_SKILL_PREFIX) && !known.has(name)), []);
});

// The originals, read in full at these commits before the kit rewrote them (C1 T17).
const ORIGINALS = {
  'seo-content-brief': { repo: 'AgriciDaniel/claude-seo', path: 'skills/seo-content-brief', commit: '5ae8eec73f030719247eea21741d012f3d8ea0b6', license: 'MIT', copyright: 'Copyright (c) 2026 puneetindersingh (the skill); Copyright (c) 2026 agricidaniel (the repository)' },
  'blog-schema': { repo: 'AgriciDaniel/claude-blog', path: 'skills/blog-schema', commit: '4f9c2cb8fd17f594e868d6c2ce0e8fb2c971f987', license: 'MIT', copyright: 'Copyright (c) 2025-2026 AgriciDaniel' },
  'blog-taxonomy': { repo: 'AgriciDaniel/claude-blog', path: 'skills/blog-taxonomy', commit: '4f9c2cb8fd17f594e868d6c2ce0e8fb2c971f987', license: 'MIT', copyright: 'Copyright (c) 2025-2026 AgriciDaniel' },
};
// What C1 spec 6.5 drops from each original: the parts a run of seo must not follow by mistake.
const DROPPED = {
  'seo-content-brief': /Improve mode|DataForSEO|Ahrefs|X\/40|Competitor Analysis/,
  'blog-schema': /blog_render\.py|"@type": "FAQPage"|CLAUDE_SKILL_DIR/,
  'blog-taxonomy': /wp-json|articleUpdate|CMS_API_KEY|Sanity|CLAUDE_SKILL_DIR/,
};

test('the adapted skills of seo: adapted_from names the original, the license comes along, and the dropped parts stay out (C1 spec 6.5)', () => {
  const roster = readRoster(join(ROOT, 'agents'));
  for (const name of roster.adapted_skills) {
    const text = readFileSync(join(SKILLS, name, 'SKILL.md'), 'utf8');
    const meta = frontmatter(text);
    assert.equal(meta.name, name);
    assert.ok(meta.description.length > 50, name);
    // A plain YAML value ends at " #": the description of seo-content-brief once stopped at "into the section".
    assert.ok(meta.description.endsWith('.'), `${name}: the description is whole: ${meta.description}`);
    assert.deepEqual(meta.adapted_from, ORIGINALS[name], name);
    assert.ok(readdirSync(join(SKILLS, name)).some((file) => /^LICEN[CS]E/.test(file)), `${name} keeps the MIT notice of its original`);
    assert.doesNotMatch(text, DROPPED[name], name);
    // Loaded into every run of seo: each stays under its original, which has 1,660 to 2,200 words counted this way.
    const words = text.split(/\s+/).filter(Boolean).length;
    assert.ok(words < 1400, `${name}: ${words} words`);
  }
});

test('seo-content-brief writes into the section ## SEO of the SPEC, in vi and en, with keywords from the human only (C1 spec 6.2, 6.5)', () => {
  const text = readFileSync(join(SKILLS, 'seo-content-brief', 'SKILL.md'), 'utf8');
  assert.match(text, /## SEO/);
  assert.match(text, /\| vi \| en \|/);
  assert.match(text, /chưa có số liệu/);
  assert.match(text, /WebSearch/);
  assert.match(text, /WebFetch/);
});
