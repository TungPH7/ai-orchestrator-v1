import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse } from 'yaml';
import { addApp } from '../../lib/scaffold/add.mjs';
import { initProject } from '../../lib/scaffold/init.mjs';
import { readDeployConfig } from '../../lib/release/deploy-config.mjs';
import { readProjectConfig } from '../../lib/scaffold/project-config.mjs';
import { ROOT } from '../helpers/kit.mjs';

// ao-kit add (project-scaffold part 2, spec 2.2, 2.3) on real folders and a real git, with the commands it runs given
// as fakes: no package is installed.
const realGit = (args, cwd) => spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8' });
const OPTIONS = { packageManager: 'pnpm', name: 'shop', title: 'Shop', space: 'SHOP', repo: 'acme/shop', approvers: 'owner', devApp: 'acme-ao-dev', devAppId: '11', reviewApp: 'acme-ao-review', reviewAppId: '12' };
const temp = (t, prefix) => {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
};
const write = (dir, path, text) => {
  mkdirSync(join(dir, path, '..'), { recursive: true });
  writeFileSync(join(dir, path), text);
};

// A pnpm project made by ao-kit init --package-manager pnpm, and the commands add runs.
function pnpmProject(t) {
  const dir = temp(t, 'add-');
  mkdirSync(join(dir, '.git'));
  const quiet = { git: (args) => ({ status: args[0] === 'remote' ? 2 : 0, stdout: '', stderr: '' }), run: () => ({ status: 0, stdout: '', stderr: '' }) };
  assert.equal(initProject({ kitDir: ROOT, projectDir: dir, options: OPTIONS, ...quiet }).ok, true);
  const runs = [];
  return { dir, runs, run: (argv, cwd) => (runs.push([argv.join(' '), cwd]), { status: 0, stdout: '', stderr: '' }) };
}
const read = (dir, path) => readFileSync(join(dir, path), 'utf8');

test('add from the skeleton of a stack: the app, its place in project.yaml, deploy.yaml and roster.local.yaml, then pnpm install and the render', (t) => {
  const p = pnpmProject(t);
  const result = addApp({ kitDir: ROOT, projectDir: p.dir, app: 'user', options: { stack: 'nextjs', public: true }, git: realGit, run: p.run });
  assert.equal(result.ok, true, result.notes.join('\n'));
  for (const path of ['apps/user/package.json', 'apps/user/Dockerfile', 'apps/user/src/app/page.tsx', '.claude/skills/vercel-react-best-practices/SKILL.md']) assert.ok(existsSync(join(p.dir, path)), path);
  const { config, errors } = readProjectConfig(read(p.dir, '.ai-orchestrator/project.yaml'));
  assert.deepEqual(errors, []);
  assert.deepEqual(config.apps.user, { repo: 'shop', path: 'apps/user', profile: 'nextjs', dev: 'pnpm --filter ./apps/user run dev', port: { env: 'PORT', default: 3000 }, health: '/', public: true });
  // Block style, one key a line, as people write it.
  assert.match(read(p.dir, '.ai-orchestrator/project.yaml'), /^apps:\n {2}user:\n {4}repo: shop\n/m);
  const deploy = readDeployConfig(read(p.dir, '.ai-orchestrator/deploy.yaml'));
  assert.deepEqual(deploy.errors, []);
  assert.deepEqual(deploy.config.apps.user, { dockerfile: 'apps/user/Dockerfile', port: 3000, health: '/', public: true });
  assert.deepEqual(deploy.config.smoke, [{ app: 'user', path: '/', expect_status: 200, expect_text: '<html' }]);
  assert.deepEqual(parse(read(p.dir, '.ai-orchestrator/roster.local.yaml')).roles, { 'fe-dev': { skills: ['vercel-react-best-practices'] } });
  assert.deepEqual(p.runs.map(([argv]) => argv), ['pnpm install', 'node .ai-orchestrator/scripts/render-agents.mjs --project .']);
  assert.ok(p.runs.every(([, cwd]) => cwd === p.dir));
  // The skeleton runs with the kit as it is: nothing to change.
  assert.doesNotMatch(result.notes.join('\n'), /still has to change/);

  // A second app of the same stack takes the next port; the files of the first stay.
  const admin = addApp({ kitDir: ROOT, projectDir: p.dir, app: 'shop-web', options: { stack: 'nextjs' }, git: realGit, run: p.run });
  assert.equal(admin.ok, true, admin.notes.join('\n'));
  assert.equal(readProjectConfig(read(p.dir, '.ai-orchestrator/project.yaml')).config.apps['shop-web'].port.default, 3001);
  assert.match(read(p.dir, 'apps/shop-web/Dockerfile'), /^EXPOSE 3001$/m);
  assert.deepEqual(readDeployConfig(read(p.dir, '.ai-orchestrator/deploy.yaml')).config.smoke.map(({ app }) => app), ['user', 'shop-web']);
});

test('add from a template: its code without what the kit replaces, the files of the container it lacks, its skill, and what its code still has to change', (t) => {
  const p = pnpmProject(t);
  const from = temp(t, 'tpl-');
  realGit(['init', '--quiet'], from);
  write(from, 'package.json', JSON.stringify({ name: 'tpl', scripts: { dev: 'vite', build: 'vite build', lint: 'eslint .', typecheck: 'tsc -b', 'test:coverage': 'vitest run --coverage', prepare: 'husky' }, devDependencies: { husky: '9.1.7', vite: '8.0.16' } }));
  write(from, 'vite.config.ts', "export default { server: { port: 5173 } };\n");
  write(from, 'vitest.config.ts', "export default { test: { coverage: { provider: 'v8' } } };\n");
  write(from, '.env.example', 'VITE_API_URL=http://localhost:3000\nVITE_SENTRY_DSN=\n');
  write(from, 'CLAUDE.md', '# Role\n\nReact admin.\n');
  write(from, '.husky/pre-commit', 'pnpm lint-staged\n');
  write(from, 'src/main.tsx', 'x\n');
  realGit(['add', '-A'], from);
  realGit(['commit', '--quiet', '-m', 'template'], from);

  const result = addApp({ kitDir: ROOT, projectDir: p.dir, app: 'admin', options: { stack: 'react', from, public: true }, git: realGit, run: p.run });
  assert.equal(result.ok, true, result.notes.join('\n'));
  const text = result.notes.join('\n');
  assert.match(text, /Copied Dockerfile and Caddyfile of the stack react, which the template has not/);
  assert.match(read(p.dir, 'apps/admin/Caddyfile'), /^:5173 \{$/m);
  assert.equal(existsSync(join(p.dir, 'apps/admin/.husky')), false);
  assert.deepEqual(parse(read(p.dir, '.ai-orchestrator/roster.local.yaml')).roles['fe-dev'].skills, ['vercel-react-best-practices', 'admin-conventions']);
  assert.ok(existsSync(join(p.dir, '.claude/skills/admin-conventions/SKILL.md')));
  assert.match(text, /The code of admin still has to change, through a Task and a PR/);
  assert.match(text, /apps\/admin\/vitest\.config\.ts writes no lcov/);
  assert.match(text, /apps\/admin\/vite\.config\.ts does not take its port from PORT/);
  assert.match(text, /apps\/admin\/vite\.config\.ts has no proxy for \/api/);
  assert.match(text, /apps\/admin\/\.env\.example names VITE_API_URL, VITE_SENTRY_DSN, which the build writes into the code/);
});

test('add refuses an npm project, a bad name, an app that is there, and a stack the kit has not, and changes nothing', (t) => {
  const p = pnpmProject(t);
  const add = (app, options, dir = p.dir) => addApp({ kitDir: ROOT, projectDir: dir, app, options, git: realGit, run: p.run });
  assert.match(add('Admin', { stack: 'react' }).notes[0], /the app name "Admin" must be lower-case letters/);
  assert.match(add('admin', {}).notes[0], /ao-kit add needs --stack, one of nextjs, react/);
  assert.match(add('admin', { stack: 'angular' }).notes[0], /no stack angular in profiles\/stacks\//);
  assert.equal(add('admin', { stack: 'react' }).ok, true);
  const before = read(p.dir, '.ai-orchestrator/project.yaml');
  assert.match(add('admin', { stack: 'react' }).notes[0], /admin is an app of \.ai-orchestrator\/project\.yaml already/);
  assert.equal(read(p.dir, '.ai-orchestrator/project.yaml'), before);

  const npm = temp(t, 'npm-');
  write(npm, '.ai-orchestrator/project.yaml', read(p.dir, '.ai-orchestrator/project.yaml').replace('package_manager: pnpm\n', ''));
  assert.match(add('web', { stack: 'nextjs' }, npm).notes[0], /ao-kit add takes a pnpm project, and \.ai-orchestrator\/project\.yaml says npm/);
  assert.match(add('web', { stack: 'nextjs' }, temp(t, 'none-')).notes[0], /has no \.ai-orchestrator\/project\.yaml: run ao-kit init <dir> --package-manager pnpm first/);
});
