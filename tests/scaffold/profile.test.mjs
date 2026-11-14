import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { readDeployConfig } from '../../lib/release/deploy-config.mjs';
import { copyProfile, copyStack, findSkill, projectYaml, readProfile, readStack, stackNames } from '../../lib/scaffold/profile.mjs';
import { checkProject, readProjectConfig } from '../../lib/scaffold/project-config.mjs';
import { ROOT } from '../helpers/kit.mjs';

// The profile next-nest (project-scaffold spec 2.6): the skeleton of ao-sample without its notes, pinned in the kit.
const profile = readProfile(ROOT, 'next-nest');
const filesOf = (dir) => readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => relative(dir, join(e.parentPath ?? e.path, e.name)).replaceAll('\\', '/'));
const PROJECT = { name: 'shop', title: 'Shop', space: 'SHOP', repo: 'acme/shop', approvers: ['owner'], apps: { dev: 'acme-ao-dev', dev_id: 11, review: 'acme-ao-review', review_id: 12 } };

test('profile.yaml says the apps, the stack skills, the version of Node and what runs after the copy', () => {
  assert.equal(profile.name, 'next-nest');
  assert.deepEqual(Object.keys(profile.apps), ['web', 'api']);
  assert.deepEqual(profile.skills, { 'fe-dev': ['vercel-react-best-practices'], 'be-dev': ['nestjs-best-practices'] });
  assert.deepEqual(profile.after, [['npm', 'ci'], ['npx', 'playwright', 'install', 'chromium']]);
  assert.equal(profile.node, '>=24.2');
  assert.throws(() => readProfile(ROOT, 'cobol'), /no profile cobol in profiles\/; the kit has base-pnpm, next-nest/);
});

test('the project.yaml of a new project is valid, with the apps of the profile', () => {
  const { config, errors } = readProjectConfig(projectYaml(profile, PROJECT));
  assert.deepEqual(errors, []);
  assert.equal(config.name, 'shop');
  assert.deepEqual(config.apps.web, { repo: 'shop', path: 'apps/web', profile: 'nextjs', dev: 'npm run dev -w apps/web', port: { env: 'PORT', default: 3000 }, health: '/', public: true });
  assert.deepEqual(config.repos, [{ name: 'shop', path: '.' }]);
});

test('the skeleton names no part of ao-sample: no notes, no item of SMP, no ADR of its own', () => {
  const dir = join(ROOT, 'profiles', 'next-nest', 'files');
  for (const path of filesOf(dir).filter((p) => !p.startsWith('.claude/skills/') && !p.endsWith('package-lock.json') && !p.endsWith('.ico'))) {
    assert.doesNotMatch(readFileSync(join(dir, path), 'utf8'), /ao-sample|\bnotes?\b|Ghi chú|SMP-\d|ADR-\d/i, path);
  }
});

// The first CI run of a project scans every file with Semgrep, whose spawn-shell-true rule blocks a process started
// through a shell (T17: scripts/dev.mjs of ao-sample, which the skeleton had copied).
test('the skeleton starts no process through a shell', () => {
  const dir = join(ROOT, 'profiles', 'next-nest', 'files');
  for (const path of filesOf(dir).filter((p) => /\.(m?[jt]s|tsx)$/.test(p) && !p.startsWith('.claude/skills/'))) {
    assert.doesNotMatch(readFileSync(join(dir, path), 'utf8'), /\bshell\s*:/, path);
  }
});

test('a copy into a folder fills the name and title in, keeps binary files as they are, and agrees with ao-kit check', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'profile-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const written = copyProfile({ profile, projectDir: dir, name: 'shop', title: 'Shop' });
  assert.ok(written.length > 30);
  for (const path of filesOf(dir).filter((p) => !p.endsWith('.ico'))) assert.doesNotMatch(readFileSync(join(dir, path), 'utf8'), /__NAME__|__TITLE__/, path);
  assert.equal(JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).name, 'shop');
  assert.equal(JSON.parse(readFileSync(join(dir, 'package-lock.json'), 'utf8')).name, 'shop');
  assert.match(readFileSync(join(dir, 'apps/web/src/app/layout.tsx'), 'utf8'), /title: "Shop"/);
  assert.deepEqual(readFileSync(join(dir, 'apps/web/src/app/favicon.ico')), readFileSync(join(ROOT, 'profiles/next-nest/files/apps/web/src/app/favicon.ico')));
  assert.ok(existsSync(join(dir, '.claude/skills/nestjs-best-practices/SKILL.md')));
  const deployText = readFileSync(join(dir, '.ai-orchestrator/deploy.yaml'), 'utf8');
  assert.deepEqual(readDeployConfig(deployText).errors, []);
  const { config } = readProjectConfig(projectYaml(profile, PROJECT));
  assert.deepEqual(checkProject({ config, deployText, packageJson: JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')), exists: (path) => existsSync(join(dir, path)) }), []);
});

// project-scaffold part 2, spec 2.3: the stacks of ao-kit add, one app each.
test('the kit has the stacks nextjs, react and spring-boot, each with the defaults of its app in project.yaml and its skills', () => {
  assert.deepEqual(stackNames(ROOT), ['nextjs', 'react', 'spring-boot']);
  const nextjs = readStack(ROOT, 'nextjs');
  assert.deepEqual([nextjs.package_manager, nextjs.profile, nextjs.dev_script, nextjs.port, nextjs.health, nextjs.dockerfile], ['pnpm', 'nextjs', 'dev', 3000, '/', 'Dockerfile']);
  assert.deepEqual(nextjs.container_files, ['Dockerfile']);
  const react = readStack(ROOT, 'react');
  assert.deepEqual([react.profile, react.port, react.health], ['react', 5173, '/']);
  assert.deepEqual(react.container_files, ['Dockerfile', 'Caddyfile']);
  assert.deepEqual(react.skills, { 'fe-dev': ['vercel-react-best-practices'] });
  const java = readStack(ROOT, 'spring-boot');
  assert.deepEqual([java.profile, java.port, java.health, java.dev_role, java.requires_template, java.build_context], ['spring-boot', 3001, '/actuator/health', 'be-dev', true, 'app']);
  assert.deepEqual(java.container_files, ['package.json']);
  assert.throws(() => readStack(ROOT, 'angular'), /no stack angular in profiles\/stacks\/; the kit has nextjs, react, spring-boot/);
});

test('copyStack writes the app into apps/<app> with its name, port and the project in place of the placeholders', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'stack-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const written = copyStack({ stack: readStack(ROOT, 'react'), projectDir: dir, app: 'admin', port: 5174, name: 'shop', title: 'Shop' });
  for (const path of ['apps/admin/package.json', 'apps/admin/Dockerfile', 'apps/admin/Caddyfile', 'apps/admin/src/App.tsx', 'apps/admin/vite.config.ts']) assert.ok(written.includes(path), path);
  assert.equal(JSON.parse(readFileSync(join(dir, 'apps/admin/package.json'), 'utf8')).name, 'admin');
  assert.match(readFileSync(join(dir, 'apps/admin/Caddyfile'), 'utf8'), /^:5174 \{$/m);
  assert.match(readFileSync(join(dir, 'apps/admin/Dockerfile'), 'utf8'), /^COPY --from=build \/app\/apps\/admin\/dist\/ \/srv\/$/m);
  assert.match(readFileSync(join(dir, 'apps/admin/index.html'), 'utf8'), /<title>Shop<\/title>/);
  for (const path of written) assert.doesNotMatch(readFileSync(join(dir, path), 'utf8'), /__(APP|PORT|NAME|TITLE)__/, path);

  // Next to the code of a template, only the files of the container.
  const only = copyStack({ stack: readStack(ROOT, 'nextjs'), projectDir: dir, app: 'user', port: 3000, name: 'shop', title: 'Shop', only: ['Dockerfile'] });
  assert.deepEqual(only, ['apps/user/Dockerfile']);
  assert.match(readFileSync(join(dir, 'apps/user/Dockerfile'), 'utf8'), /^CMD \["node", "apps\/user\/server\.js"\]$/m);
  assert.equal(existsSync(join(dir, 'apps/user/package.json')), false);
});

test('a stack skill comes from where the kit keeps it, so it is not copied twice into the kit', () => {
  assert.equal(findSkill(ROOT, 'vercel-react-best-practices'), join(ROOT, 'profiles', 'next-nest', 'files', '.claude', 'skills', 'vercel-react-best-practices'));
  assert.equal(findSkill(ROOT, 'angular-best-practices'), null);
});
