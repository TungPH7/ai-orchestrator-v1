import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mergeLocal, readRoster } from '../../lib/agents/roster.mjs';
import { ROOT } from '../helpers/kit.mjs';

const roster = readRoster(join(ROOT, 'agents'));
const have = new Set(['vercel-react-best-practices']);
const merge = (local) => mergeLocal(roster, local, { skillExists: (name) => have.has(name) });

test('roster.local.yaml adds skills to a role, after its own (spec 2.7)', () => {
  const { roster: merged, errors } = merge({ roles: { 'fe-dev': { skills: ['vercel-react-best-practices'] } } });

  assert.deepEqual(errors, []);
  assert.deepEqual(merged.roles['fe-dev'].skills, [...roster.roles['fe-dev'].skills, 'vercel-react-best-practices']);
  assert.deepEqual(merged.roles['be-dev'], roster.roles['be-dev']);
  assert.deepEqual(roster.roles['fe-dev'].skills.includes('vercel-react-best-practices'), false, 'the roster itself is not changed');
  assert.deepEqual(merge(undefined), { roster, errors: [] });
});

test('roster.local.yaml may not name an unknown role or skill, nor change model, effort or tools', () => {
  const messages = (local) => merge(local).errors;

  assert.deepEqual(messages({ roles: { 'qa-lead': { skills: ['vercel-react-best-practices'] } } }), ["roster.local.yaml: 'qa-lead' is not a role of agents/roster.yaml"]);
  assert.deepEqual(messages({ roles: { 'fe-dev': { skills: ['nextjs-magic'] } } }), ["roster.local.yaml: skill 'nextjs-magic' of fe-dev is not in .claude/skills/"]);
  assert.deepEqual(messages({ roles: { 'fe-dev': { model: 'sonnet', effort: 'max', tools: ['WebFetch'] } } }), [
    'roster.local.yaml: roles.fe-dev.model cannot be set here; the file only adds skills',
    'roster.local.yaml: roles.fe-dev.effort cannot be set here; the file only adds skills',
    'roster.local.yaml: roles.fe-dev.tools cannot be set here; the file only adds skills',
  ]);
  assert.deepEqual(messages({ models: {} }), ['roster.local.yaml: models cannot be set here; the file only has roles']);
});

// A project with the kit copy in .ai-orchestrator/, the vendored skills and one stack skill in .claude/skills/.
function project(t, { local, space = 'DEMO' } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'project-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const part of ['agents', 'contract', 'quality', 'tracker']) cpSync(join(ROOT, part), join(dir, '.ai-orchestrator', part), { recursive: true });
  cpSync(join(ROOT, 'kit', '.claude', 'skills'), join(dir, '.claude', 'skills'), { recursive: true });
  mkdirSync(join(dir, '.claude', 'skills', 'vercel-react-best-practices'), { recursive: true });
  writeFileSync(join(dir, '.claude', 'skills', 'vercel-react-best-practices', 'SKILL.md'), '---\nname: vercel-react-best-practices\ndescription: d\n---\n');
  writeFileSync(join(dir, '.claude', 'settings.json'), JSON.stringify({ env: { AO_JIRA_SPACE: space } }));
  if (local) writeFileSync(join(dir, '.ai-orchestrator', 'roster.local.yaml'), local);
  return dir;
}
const render = (dir, ...flags) => spawnSync(process.execPath, [join(ROOT, 'scripts', 'render-agents.mjs'), '--project', dir, ...flags], { encoding: 'utf8' });

test('--project renders into the project\'s .claude/, with its space key and its stack skills (spec 2.1)', (t) => {
  const dir = project(t, { local: 'roles:\n  fe-dev:\n    skills: [vercel-react-best-practices]\n' });

  const result = render(dir);
  assert.equal(result.status, 0, result.stderr);
  const feDev = readFileSync(join(dir, '.claude', 'agents', 'fe-dev.md'), 'utf8');
  assert.match(feDev, /^skills:\n(?: {2}- .+\n)* {2}- vercel-react-best-practices\n---\n/m);
  assert.match(readFileSync(join(dir, '.claude', 'rules', 'ai-orchestrator.md'), 'utf8'), /space `DEMO`/);
  assert.equal(render(dir, '--check').status, 0, 'up to date right after');

  writeFileSync(join(dir, '.ai-orchestrator', 'roster.local.yaml'), 'roles:\n  fe-dev:\n    skills: []\n');
  assert.equal(render(dir, '--check').status, 1, 'stale once the local file changes');
});

// kit-copy-review: ao-step needs the files render-agents writes, to refuse any other file among the rendered ones.
test('--list prints the files render-agents writes in the project, and writes nothing', (t) => {
  const dir = project(t);
  const result = render(dir, '--list');
  assert.equal(result.status, 0, result.stderr);
  const listed = result.stdout.trim().split('\n');
  assert.ok(listed.includes('.claude/agents/security.md'));
  assert.ok(listed.includes('.claude/rules/ai-orchestrator.md'));
  assert.equal(listed.length, readdirSync(join(ROOT, 'agents', 'prompts')).length + 1);
  assert.throws(() => readFileSync(join(dir, '.claude', 'agents', 'security.md')), 'nothing written');
});

test('--project stops on an error of roster.local.yaml and writes nothing', (t) => {
  const dir = project(t, { local: 'roles:\n  fe-dev:\n    model: sonnet\n' });

  const result = render(dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /roster\.local\.yaml: roles\.fe-dev\.model cannot be set here/);
  assert.throws(() => readFileSync(join(dir, '.claude', 'agents', 'fe-dev.md')));
});

test('without AO_JIRA_SPACE, or with the placeholder, the space stays <KEY>', (t) => {
  const dir = project(t, { space: '<KEY>' });
  assert.equal(render(dir).status, 0);
  assert.match(readFileSync(join(dir, '.claude', 'rules', 'ai-orchestrator.md'), 'utf8'), /space `<KEY>`/);
});

test('ao-agent.mjs --ao-dry-run writes the skills file and prints the claude command it would run', (t) => {
  const dir = project(t, { local: 'roles:\n  fe-dev:\n    skills: [vercel-react-best-practices]\n' });
  const result = spawnSync(process.execPath, [join(ROOT, 'scripts', 'ao-agent.mjs'), 'fe-dev', '--ao-dry-run', '-p', 'Build DEMO-12'], { cwd: dir, encoding: 'utf8', env: { ...process.env, AO_KIT_DIR: join(dir, '.ai-orchestrator') } });

  assert.equal(result.status, 0, result.stderr);
  const file = join(dir, '.ai', 'agents', 'fe-dev.skills.md');
  const limit = roster.roles['fe-dev'].max_turns;
  assert.match(result.stdout, new RegExp(`^claude --agent fe-dev --effort high --append-system-prompt-file .*fe-dev\\.skills\\.md --max-turns ${limit} -p "Build DEMO-12"$`, 'm'));
  assert.match(readFileSync(file, 'utf8'), /^## Skill: vercel-react-best-practices$/m);
  // The folder is no GitHub clone, so there is no App identity: the dry run says so, and shows the variables anyway.
  assert.match(result.stderr, /no GitHub App identity \(the origin remote is not a GitHub repository: none\); a real run stops here/);
  assert.match(result.stdout, /^ {2}GH_TOKEN=<read-only token of ao-review>$/m);
  assert.match(result.stdout, /^ {2}GIT_CONFIG_VALUE_1=!node ".*\/\.ai-orchestrator\/scripts\/ao-git-credential\.mjs" fe-dev owner\/name$/m);
  assert.match(result.stdout, /^ {2}unset GIT_CONFIG_PARAMETERS GIT_ASKPASS/m);
});

test('ao-agent.mjs does not start an agent without the GitHub App identity', (t) => {
  const dir = project(t);
  const result = spawnSync(process.execPath, [join(ROOT, 'scripts', 'ao-agent.mjs'), 'reviewer', '-p', 'Review PR #12.'], { cwd: dir, encoding: 'utf8', env: { ...process.env, AO_KIT_DIR: join(dir, '.ai-orchestrator') } });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /^ao-agent: no GitHub App identity for the agent, so it does not start: the origin remote is not a GitHub repository/);
});
