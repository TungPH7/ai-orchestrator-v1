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
const COMMANDS = { status: '[KEY]', intake: '<rough description>', preview: '<KEY> [--stop]', spec: '<EPIC> [change]', plan: '<EPIC> [change]', request: '<KEY>', build: '<KEY>', review: '<PR>', fix: '<PR> [what to fix]', qa: '<KEY>', release: '[<vX.Y.0> <sha>]', ship: '<vX.Y.Z>', rollback: '<environment> [<sha>]' };
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
  assert.match(text, /This is the one Jira write you make: no transition, no comment, no edit of another item/);
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
