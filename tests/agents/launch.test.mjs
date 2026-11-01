import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { CLEARED_ENV, READ_PERMISSIONS, credentialHelper, launchPlan } from '../../lib/agents/launch.mjs';
import { readRoster } from '../../lib/agents/roster.mjs';
import { ROOT } from '../helpers/kit.mjs';

const roster = readRoster(join(ROOT, 'agents'));
const PROJECT = 'D:\\work\\shop';
const skillDir = (name) => join(PROJECT, '.claude', 'skills', name);
// The SKILL.md of every vendored skill and of one stack skill, as the script reads them from .claude/skills/.
const skills = new Map([...roster.vendored_skills.map(({ name }) => name), 'vercel-react-best-practices'].map((name) => [name, { dir: skillDir(name), text: `---\nname: ${name}\ndescription: d\n---\n\n# ${name}\n` }]));
// What ao-agent.mjs resolves before the session starts (dev-workflow spec 2.3). The token is a marker to look for.
const TOKEN = 'ghs_READ_TOKEN_MARKER';
const identity = {
  repo: 'TungPH7/ao-pilot',
  readToken: TOKEN,
  helper: 'node "D:/work/shop/.ai-orchestrator/scripts/ao-git-credential.mjs"',
  bot: { name: 'tungph7-ao-dev[bot]', email: '349476619+tungph7-ao-dev[bot]@users.noreply.github.com' },
};
const plan = (role, args = [], options = {}) => launchPlan({ role, roster, args, skills, projectDir: PROJECT, identity, ...options });
// The git settings of GIT_CONFIG_*, in order, as [key, value].
const gitConfig = (env) => Array.from({ length: Number(env.GIT_CONFIG_COUNT) }, (_, n) => [env[`GIT_CONFIG_KEY_${n}`], env[`GIT_CONFIG_VALUE_${n}`]]);

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
  assert.match(launchPlan({ role: 'fe-dev', roster: local, args: [], skills, projectDir: PROJECT, identity }).skillsFile.text, /^## Skill: vercel-react-best-practices$/m);

  assert.throws(() => plan('fe-dev', [], { skills: new Map() }), /skill test-driven-development of fe-dev has no SKILL\.md in \.claude\/skills\/test-driven-development/);
  assert.throws(() => plan('qa-lead'), /qa-lead is not a role of agents\/roster\.yaml/);
});

test('every agent session reads GitHub with the read-only token and runs git with the bot, never your login (dev-workflow spec 2.3)', () => {
  const { env, clear } = plan('fe-dev', ['-p', 'Build DEMO-12']);

  assert.equal(env.GH_TOKEN, TOKEN);
  assert.equal(env.GH_PROMPT_DISABLED, '1');
  assert.equal(env.GIT_TERMINAL_PROMPT, '0', 'git fails at once instead of asking for a password');
  assert.deepEqual(gitConfig(env), [
    ['credential.helper', ''],
    ['credential.helper', '!node "D:/work/shop/.ai-orchestrator/scripts/ao-git-credential.mjs" fe-dev TungPH7/ao-pilot'],
    ['credential.useHttpPath', 'true'],
    ['user.name', 'tungph7-ao-dev[bot]'],
    ['user.email', '349476619+tungph7-ao-dev[bot]@users.noreply.github.com'],
  ]);
  assert.deepEqual(clear, CLEARED_ENV);
  for (const name of ['GIT_CONFIG_PARAMETERS', 'GIT_ASKPASS', 'SSH_ASKPASS', 'GITHUB_TOKEN']) assert.ok(clear.includes(name), name);
  assert.deepEqual(READ_PERMISSIONS, { contents: 'read', pull_requests: 'read', actions: 'read', checks: 'read' });
});

test('the role is in the value of credential.helper, for every role: the helper decides what each role gets', () => {
  for (const role of Object.keys(roster.roles)) {
    const helpers = gitConfig(plan(role).env).filter(([key]) => key === 'credential.helper');
    assert.deepEqual(helpers.map(([, value]) => value), ['', `!${identity.helper} ${role} TungPH7/ao-pilot`], role);
  }
});

test('the token is only in the environment: not in the arguments of claude nor in the skills file', () => {
  for (const role of Object.keys(roster.roles)) {
    const { args, skillsFile, env } = plan(role, ['-p', 'x']);
    assert.ok(!args.some((arg) => arg.includes(TOKEN)), `${role} args`);
    assert.ok(!skillsFile.text.includes(TOKEN), `${role} skills file`);
    assert.deepEqual(Object.entries(env).filter(([, value]) => value.includes(TOKEN)).map(([name]) => name), ['GH_TOKEN'], role);
  }
});

test('a session never starts without the App identity', () => {
  assert.throws(() => plan('fe-dev', [], { identity: undefined }), /GitHub App identity/);
  assert.throws(() => plan('fe-dev', [], { identity: { ...identity, repo: 'TungPH7/ao-pilot; rm -rf /' } }), /owner\/name/);
});

test('the helper command quotes the kit folder with forward slashes, and refuses a folder the shell would read', () => {
  assert.equal(credentialHelper('D:\\Document\\My Projects\\shop\\.ai-orchestrator'), 'node "D:/Document/My Projects/shop/.ai-orchestrator/scripts/ao-git-credential.mjs"');
  for (const dir of ['D:\\a"b', 'D:\\$HOME', 'D:\\`x`', 'D:\\a\nb']) assert.throws(() => credentialHelper(dir), /cannot be quoted/, dir);
});
