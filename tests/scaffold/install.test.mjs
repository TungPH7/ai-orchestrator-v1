import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { parse } from 'yaml';
import { readGates } from '../../lib/quality/gates.mjs';
import { matchesGlob } from '../../lib/quality/glob.mjs';
import { codeownersText, draftFromOldConfig, ensureCodeowners, ensureGitignore, ensurePrepare, gitignoreMissing, installKit, kitDrift, KIT_ONLY_SCRIPTS, PROJECT_SCRIPTS } from '../../lib/scaffold/install.mjs';
import { readProjectConfig } from '../../lib/scaffold/project-config.mjs';
import { ROOT } from '../helpers/kit.mjs';

// The copy of the kit in a project (project-scaffold spec 2.2; plan, decisions 4 and 5), on real folders.
const SAMPLE = join(ROOT, 'tests/fixtures/scaffold/sample');
const gates = readGates(join(ROOT, 'quality'));
const temp = (t, prefix) => {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
};
const write = (dir, path, text) => {
  mkdirSync(join(dir, path, '..'), { recursive: true });
  writeFileSync(join(dir, path), text);
};
const files = (dir, under = '') => (existsSync(join(dir, under)) ? readdirSync(join(dir, under), { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => relative(dir, join(e.parentPath ?? e.path, e.name)).replaceAll('\\', '/')) : []);

test('every script of the kit is either copied into projects or kept in the kit, so a new one must be placed', () => {
  const scripts = readdirSync(join(ROOT, 'scripts')).filter((name) => name.endsWith('.mjs')).sort();
  assert.deepEqual([...PROJECT_SCRIPTS, ...KIT_ONLY_SCRIPTS].sort(), scripts);
  assert.equal(PROJECT_SCRIPTS.some((name) => KIT_ONLY_SCRIPTS.includes(name)), false);
  for (const name of ['ao-step.mjs', 'render-agents.mjs', 'install-hooks.mjs']) assert.ok(PROJECT_SCRIPTS.includes(name), name);
  for (const name of ['ao-kit.mjs', 'ao-deploy.mjs', 'gh-protect.mjs']) assert.ok(KIT_ONLY_SCRIPTS.includes(name), name);
});

test('a copy into an empty folder holds the kit files of gates.yaml, and nothing that is rendered or the project\'s', (t) => {
  const dir = temp(t, 'install-');
  installKit({ kitDir: ROOT, projectDir: dir });
  const copied = files(dir);
  const same = [...gates.kit_copy.same, ...gates.kit_copy.same_when_changed];
  for (const path of copied) assert.ok(same.some((glob) => matchesGlob(glob, path)), `${path} is a kit file`);
  for (const glob of gates.kit_copy.same) assert.ok(copied.some((path) => matchesGlob(glob, path)), `something matches ${glob}`);
  assert.deepEqual(files(dir, '.ai-orchestrator/scripts').map((p) => p.split('/').pop()).sort(), [...PROJECT_SCRIPTS].sort());
  assert.deepEqual(files(dir, '.ai-orchestrator/docs'), ['.ai-orchestrator/docs/sdlc.md']);
  assert.equal(existsSync(join(dir, '.github/workflows/audit.yml')), false, 'a project deploys through the deployer, not audit.yml');
  for (const rendered of ['.claude/settings.json', '.claude/agents/qa.md', '.claude/rules/ai-orchestrator.md']) assert.equal(existsSync(join(dir, rendered)), false, rendered);
  assert.equal(readFileSync(join(dir, '.ai-orchestrator/lib/scaffold/project.schema.json'), 'utf8'), readFileSync(join(ROOT, 'lib/scaffold/project.schema.json'), 'utf8'));
});

test('a copy over an older one drops what the kit no longer has, and keeps every file of the project', (t) => {
  const dir = temp(t, 'install-');
  const own = {
    '.ai-orchestrator/project.yaml': 'name: sample\n',
    '.ai-orchestrator/deploy.yaml': 'apps: {}\n',
    '.ai-orchestrator/roster.local.yaml': 'roles: {}\n',
    '.claude/settings.local.json': '{}\n',
    '.claude/skills/nestjs-best-practices/SKILL.md': 'stack skill\n',
    '.github/workflows/deploy.yml': 'name: deploy\n',
    'apps/api/src/main.ts': 'listen()\n',
  };
  const old = { '.ai-orchestrator/lib/gone.mjs': 'old\n', '.claude/skills/playwright-cli/old-reference.md': 'old\n', '.claude/hooks/old-hook.mjs': 'old\n' };
  for (const [path, text] of Object.entries({ ...own, ...old })) write(dir, path, text);
  const { removed } = installKit({ kitDir: ROOT, projectDir: dir });
  for (const [path, text] of Object.entries(own)) assert.equal(readFileSync(join(dir, path), 'utf8'), text, path);
  for (const path of Object.keys(old)) assert.equal(existsSync(join(dir, path)), false, path);
  assert.deepEqual([...removed].sort(), Object.keys(old).sort());
  assert.ok(existsSync(join(dir, '.claude/skills/playwright-cli/SKILL.md')), 'the kit skill is there, new');
});

test('.gitignore gets the lines the kit needs, once, and keeps the project\'s own', (t) => {
  const dir = temp(t, 'install-');
  assert.deepEqual(ensureGitignore(dir), ['Added to .gitignore: .ai-orchestrator/node_modules/, .claude/settings.local.json, .ai/, .playwright-cli/']);
  write(dir, '.gitignore', 'node_modules/\n.ai/\n');
  assert.deepEqual(ensureGitignore(dir), ['Added to .gitignore: .ai-orchestrator/node_modules/, .claude/settings.local.json, .playwright-cli/']);
  assert.equal(readFileSync(join(dir, '.gitignore'), 'utf8'), 'node_modules/\n.ai/\n.ai-orchestrator/node_modules/\n.claude/settings.local.json\n.playwright-cli/\n');
  assert.deepEqual(ensureGitignore(dir), []);
});

// Pilot 3, review of shop PR #13 (spec 2.9): the rulesets count only the approval of a code owner, so no App with write
// access approves a PR in your place; .github/CODEOWNERS names your logins.
test('.github/CODEOWNERS names every approver as owner of every file; written when missing or different, else left', (t) => {
  const dir = temp(t, 'install-');
  assert.equal(codeownersText(['TungPH7']).split('\n').filter((line) => line && !line.startsWith('#')).join('\n'), '* @TungPH7');
  assert.match(codeownersText(['a', 'b']), /^\* @a @b$/m);
  assert.deepEqual(ensureCodeowners(dir, ['TungPH7']), ['Wrote .github/CODEOWNERS: * @TungPH7, so the rulesets count only your approval']);
  assert.equal(readFileSync(join(dir, '.github', 'CODEOWNERS'), 'utf8'), codeownersText(['TungPH7']));
  assert.deepEqual(ensureCodeowners(dir, ['TungPH7']), []);
  write(dir, '.github/CODEOWNERS', '* @someone-else\n');
  assert.deepEqual(ensureCodeowners(dir, ['TungPH7']), ['Wrote .github/CODEOWNERS: * @TungPH7, so the rulesets count only your approval']);
  assert.throws(() => codeownersText([]), /at least one approver/);
});

test('package.json gets the prepare script that installs the git hooks; another prepare is left alone and named', (t) => {
  const dir = temp(t, 'install-');
  write(dir, 'package.json', '{\n  "name": "shop",\n  "scripts": {\n    "build": "next build"\n  }\n}\n');
  assert.deepEqual(ensurePrepare(dir), ['Added the prepare script of package.json: node .ai-orchestrator/scripts/install-hooks.mjs']);
  assert.equal(JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).scripts.prepare, 'node .ai-orchestrator/scripts/install-hooks.mjs');
  assert.deepEqual(ensurePrepare(dir), []);
  write(dir, 'package.json', '{ "scripts": { "prepare": "husky" } }\n');
  assert.deepEqual(ensurePrepare(dir), ['package.json has its own prepare script (husky): add node .ai-orchestrator/scripts/install-hooks.mjs to it, so npm install installs the git hooks of the kit']);
});

// ao-sample before project-scaffold: settings.json with its env, preview.yaml, deploy.yaml, and the package.json of
// each app, which names its stack.
function oldProject(t) {
  const dir = temp(t, 'old-');
  cpSync(join(SAMPLE, 'settings.json'), join(dir, '.claude/settings.json'));
  cpSync(join(SAMPLE, 'preview.yaml'), join(dir, '.ai-orchestrator/preview.yaml'));
  cpSync(join(SAMPLE, 'deploy.yaml'), join(dir, '.ai-orchestrator/deploy.yaml'));
  cpSync(join(SAMPLE, 'package.json'), join(dir, 'package.json'));
  write(dir, 'apps/web/package.json', JSON.stringify({ dependencies: { next: '16.4.3', react: '19.2.0' } }));
  write(dir, 'apps/api/package.json', JSON.stringify({ dependencies: { '@nestjs/core': '12.0.11' } }));
  return dir;
}

test('a project from before project-scaffold gets a project.yaml from its settings.json, preview.yaml and deploy.yaml', (t) => {
  const dir = oldProject(t);
  const { text, todo } = draftFromOldConfig({ projectDir: dir, name: 'sample', repo: 'TungPH7/ao-sample' });
  assert.deepEqual(todo, []);
  const { config, errors } = readProjectConfig(text);
  assert.deepEqual(errors, []);
  assert.deepEqual(config, parse(readFileSync(join(SAMPLE, 'project.yaml'), 'utf8')));
  assert.deepEqual(Object.keys(config.apps), ['api', 'web'], 'in the order of preview.yaml, the order the preview starts them');
});

test('what the old files do not say is left as TODO and named, so the project fills it in', (t) => {
  const dir = oldProject(t);
  rmSync(join(dir, 'apps/api/package.json'));
  const { text, todo } = draftFromOldConfig({ projectDir: dir, name: null, repo: null });
  assert.deepEqual(todo, ['name', 'github.repo', 'repos[0].name', 'apps.api.repo', 'apps.api.profile', 'apps.web.repo']);
  assert.match(text, /^name: TODO/m);
  assert.notDeepEqual(readProjectConfig(text).errors, []);
});

// ao-kit doctor reads these (project-scaffold spec 2.5).
test('kitDrift names the kit files that differ from the clone, a missing one too; line ends do not count', (t) => {
  const dir = temp(t, 'install-');
  installKit({ kitDir: ROOT, projectDir: dir });
  assert.deepEqual(kitDrift({ kitDir: ROOT, projectDir: dir }), []);
  const file = join(dir, '.ai-orchestrator/lib/scaffold/install.mjs');
  writeFileSync(file, readFileSync(file, 'utf8').replaceAll('\n', '\r\n'));
  assert.deepEqual(kitDrift({ kitDir: ROOT, projectDir: dir }), [], 'a checkout on Windows writes CRLF');
  write(dir, '.ai-orchestrator/lib/scaffold/install.mjs', 'changed\n');
  rmSync(join(dir, '.mcp.json'));
  assert.deepEqual(kitDrift({ kitDir: ROOT, projectDir: dir }).sort(), ['.ai-orchestrator/lib/scaffold/install.mjs', '.mcp.json']);
  assert.deepEqual(gitignoreMissing(dir), ['.ai-orchestrator/node_modules/', '.claude/settings.local.json', '.ai/', '.playwright-cli/']);
});
