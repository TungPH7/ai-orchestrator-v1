import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { launchPlan } from '../../lib/agents/launch.mjs';
import { readRoster } from '../../lib/agents/roster.mjs';
import { ROOT } from '../helpers/kit.mjs';

const roster = readRoster(join(ROOT, 'agents'));
const PROJECT = 'D:\\work\\shop';
const skillDir = (name) => join(PROJECT, '.claude', 'skills', name);
// The SKILL.md of every vendored skill and of one stack skill, as the script reads them from .claude/skills/.
const skills = new Map([...roster.vendored_skills.map(({ name }) => name), 'vercel-react-best-practices'].map((name) => [name, { dir: skillDir(name), text: `---\nname: ${name}\ndescription: d\n---\n\n# ${name}\n` }]));
const plan = (role, args = [], options = {}) => launchPlan({ role, roster, args, skills, projectDir: PROJECT, ...options });

test('an interactive run: claude --agent <role> with the effort of the roster and the skills file (spec 2.5)', () => {
  const { command, args, skillsFile } = plan('ba');

  assert.equal(command, 'claude');
  assert.equal(skillsFile.path, join(PROJECT, '.ai', 'agents', 'ba.skills.md'));
  assert.deepEqual(args, ['--agent', 'ba', '--effort', 'xhigh', '--append-system-prompt-file', skillsFile.path]);
  assert.match(skillsFile.text, /^## Session\n\nYou work with the human directly in this session/);
});

test('an unattended run with -p keeps the caller\'s arguments, and adds --max-turns only when the roster has max_turns', () => {
  const caller = ['-p', 'Review PR #12', '--output-format', 'json'];
  const { args, skillsFile } = plan('reviewer', caller);

  const limit = String(roster.roles.reviewer.max_turns);
  assert.deepEqual(args, ['--agent', 'reviewer', '--effort', 'xhigh', '--append-system-prompt-file', skillsFile.path, '--max-turns', limit, ...caller]);
  assert.match(skillsFile.text, /^## Session\n\nYou run unattended/);
  assert.ok(!plan('reviewer', []).args.includes('--max-turns'), 'not for an interactive run');
  assert.deepEqual(plan('reviewer', ['--print', 'x']).args.slice(6, 8), ['--max-turns', limit], '--print is -p');

  const unlimited = structuredClone(roster);
  delete unlimited.roles.reviewer.max_turns;
  assert.ok(!plan('reviewer', caller, { roster: unlimited }).args.includes('--max-turns'), 'not without max_turns');
});

test('the caller\'s own --effort or --max-turns replaces the roster\'s', () => {
  const limited = structuredClone(roster);
  limited.roles.qa.max_turns = 40;
  const { args } = plan('qa', ['-p', 'x', '--effort', 'max', '--max-turns', '5'], { roster: limited });

  assert.equal(args.filter((a) => a === '--effort').length, 1);
  assert.equal(args.filter((a) => a === '--max-turns').length, 1);
  assert.deepEqual(args.slice(-6), ['-p', 'x', '--effort', 'max', '--max-turns', '5']);
});

test('the skills file holds each preloaded skill in roster order, each after the folder it lives in', () => {
  const { skillsFile } = plan('fe-dev');
  const order = [...skillsFile.text.matchAll(/^## Skill: (.+)$/gm)].map(([, name]) => name);

  assert.deepEqual(order, roster.roles['fe-dev'].skills);
  assert.ok(skillsFile.text.includes(`## Skill: test-driven-development\n\nThe files of this skill are in ${skillDir('test-driven-development')}.\n\n---\nname: test-driven-development`));
  assert.ok(!skillsFile.text.includes('\r'));
});

test('a role without skills gets a skills file with only the session', () => {
  assert.equal(plan('pm', ['-p', 'x']).skillsFile.text, '## Session\n\nYou run unattended (claude -p): nobody answers questions in this session. Write them where your instructions say, then stop.\n');
});

test('a stack skill added by roster.local.yaml is loaded too; a missing SKILL.md or an unknown role is an error', () => {
  const local = structuredClone(roster);
  local.roles['fe-dev'].skills.push('vercel-react-best-practices');
  assert.match(launchPlan({ role: 'fe-dev', roster: local, args: [], skills, projectDir: PROJECT }).skillsFile.text, /^## Skill: vercel-react-best-practices$/m);

  assert.throws(() => plan('fe-dev', [], { skills: new Map() }), /skill test-driven-development of fe-dev has no SKILL\.md in \.claude\/skills\/test-driven-development/);
  assert.throws(() => plan('qa-lead'), /qa-lead is not a role of agents\/roster\.yaml/);
});
