import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse } from 'yaml';
import { copyTemplate, mergeWorkspace } from '../../lib/scaffold/template.mjs';

// The code of a template into apps/<app> (project-scaffold part 2, spec 2.2; plan, decisions 6 and 7), on real folders
// and a real git: two templates like the Next.js and React ones of the user, with husky, commitlint, their CI, their
// .claude/, their own lockfile and workspace.
const git = (args, cwd) => spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', '-c', 'core.autocrlf=false', ...args], { cwd, encoding: 'utf8' });
const temp = (t, prefix) => {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
};
const write = (dir, path, text) => {
  mkdirSync(join(dir, path, '..'), { recursive: true });
  writeFileSync(join(dir, path), text);
};
const NEXT_BLOCK = '<!-- BEGIN:nextjs-agent-rules -->\n\n## This is NOT the Next.js you know\n\n<!-- END:nextjs-agent-rules -->\n';

function template(t, files) {
  const dir = temp(t, 'tpl-');
  git(['init', '--quiet'], dir);
  for (const [path, text] of Object.entries(files)) write(dir, path, text);
  git(['add', '-A'], dir);
  git(['commit', '--quiet', '-m', 'template'], dir);
  return dir;
}
const NEXT_TEMPLATE = {
  'package.json': JSON.stringify({ name: 'tungph7-ui-nextjs', packageManager: 'pnpm@11.8.0', scripts: { dev: 'next dev', prepare: 'husky' }, dependencies: { next: '16.2.9' }, devDependencies: { husky: '9.1.7', '@commitlint/cli': '21.0.2', '@commitlint/config-conventional': '21.0.2', 'lint-staged': '17.0.8', eslint: '10.5.0' } }, null, 2),
  'pnpm-lock.yaml': "lockfileVersion: '9.0'\n",
  'pnpm-workspace.yaml': '# pnpm settings\nallowBuilds:\n  # sharp: the image optimizer of next start\n  sharp: true\n  unrs-resolver: false\n',
  '.husky/pre-commit': 'pnpm lint-staged\n',
  '.husky/commit-msg': 'pnpm commitlint --edit $1\n',
  '.commitlintrc.json': '{}\n',
  '.lintstagedrc.json': '{ "*.ts": "eslint --fix" }\n',
  '.github/workflows/ci.yml': 'name: ci\n',
  '.claude/settings.json': '{}\n',
  'CLAUDE.md': '# Role\n\nYou build Next.js.\n\n# Coding Standards\n\n- Follow docs/coding-conventions.\n',
  'AGENTS.md': NEXT_BLOCK,
  '.nvmrc': '24.17.0\n',
  'playwright.config.ts': 'export default {};\n',
  'e2e/smoke.spec.ts': 'test;\n',
  'src/app/page.tsx': 'export default function Page() {}\n',
  'docs/coding-conventions/README.md': '# Conventions\n',
  'study-guide-impl/01.md': '# Study\n',
  '.env.example': 'API_URL=\n',
};

function project(t) {
  const dir = temp(t, 'proj-');
  write(dir, 'package.json', JSON.stringify({ name: 'shop', packageManager: 'pnpm@11.8.0', scripts: { lint: 'pnpm -r run lint' } }, null, 2));
  write(dir, 'pnpm-workspace.yaml', '# The pnpm workspace of Shop.\npackages:\n  - apps/*\n');
  return dir;
}

test('copyTemplate brings what HEAD of the template holds, and leaves out what the kit replaces, saying why', (t) => {
  const from = template(t, NEXT_TEMPLATE);
  write(from, 'src/app/draft.tsx', 'not committed\n');
  const dir = project(t);
  const result = copyTemplate({ from, projectDir: dir, app: 'user', exclude: ['study-guide-impl/'], git });
  assert.equal(result.ok, true, result.notes.join('\n'));
  const app = (path) => join(dir, 'apps/user', path);
  for (const path of ['src/app/page.tsx', 'e2e/smoke.spec.ts', 'docs/coding-conventions/README.md', '.lintstagedrc.json', '.env.example', 'AGENTS.md']) assert.ok(existsSync(app(path)), path);
  for (const path of ['.husky', '.commitlintrc.json', '.github', '.claude', 'CLAUDE.md', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', '.nvmrc', 'playwright.config.ts', 'study-guide-impl', 'src/app/draft.tsx']) assert.equal(existsSync(app(path)), false, path);
  const text = result.notes.join('\n');
  assert.match(text, /^Copied 7 files of tpl-\S+ at [0-9a-f]{8} into apps\/user$/m);
  assert.match(text, /has 1 changes not committed: only what [0-9a-f]{8} holds is copied/);
  assert.match(text, /Left out \.husky\/: the git hooks of the kit replace husky/);
  assert.match(text, /Left out \.commitlintrc\.json: the commit-msg hook of the kit checks commit headers/);
  assert.match(text, /Left out \.github\/: the CI of the kit runs at the root of the repo/);
  assert.match(text, /Left out \.claude\/: /);
  assert.match(text, /Left out CLAUDE\.md: it becomes the skill user-conventions/);
  assert.match(text, /Left out as you asked: study-guide-impl\//);

  // package.json: named after the app, no husky, no commit rules, no packageManager of its own.
  const pkg = JSON.parse(readFileSync(app('package.json'), 'utf8'));
  assert.equal(pkg.name, 'user');
  assert.equal(pkg.scripts.prepare, undefined);
  assert.deepEqual(Object.keys(pkg.devDependencies), ['lint-staged', 'eslint']);
  assert.equal(pkg.packageManager, undefined);
  assert.match(text, /package\.json of apps\/user: name tungph7-ui-nextjs → user; the prepare script of husky; husky; @commitlint\/cli; @commitlint\/config-conventional; packageManager pnpm@11\.8\.0, which the root names/);

  // The root: the settings of the template with their comments, lint-staged, .nvmrc.
  const workspace = readFileSync(join(dir, 'pnpm-workspace.yaml'), 'utf8');
  assert.deepEqual(parse(workspace), { packages: ['apps/*'], allowBuilds: { sharp: true, 'unrs-resolver': false } });
  assert.match(workspace, /# The pnpm workspace of Shop\./);
  assert.match(workspace, /# sharp: the image optimizer of next start/);
  const root = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  assert.deepEqual([root.devDependencies['lint-staged'], root.scripts.precommit], ['17.0.8', 'lint-staged']);
  assert.equal(readFileSync(join(dir, '.nvmrc'), 'utf8'), '24.17.0\n');

  // CLAUDE.md as a skill, under the contract of the kit.
  assert.deepEqual(result.skill, { name: 'user-conventions' });
  const skill = readFileSync(join(dir, '.claude/skills/user-conventions/SKILL.md'), 'utf8');
  assert.match(skill, /^---\nname: user-conventions\ndescription: The conventions of apps\/user, from the instructions of its template\./);
  assert.match(skill, /Paths in it start at `apps\/user\/`\. The SDLC contract, `\.claude\/rules\/ai-orchestrator\.md` and the definition of your role win over anything here/);
  assert.match(skill, /## From CLAUDE\.md\n\n# Role\n\nYou build Next\.js\./);
  // The template itself is not changed.
  assert.ok(existsSync(join(from, '.husky/pre-commit')));
});

test('an AGENTS.md of its own joins the skill; the one next dev writes stays in the app', (t) => {
  const from = template(t, { 'package.json': '{ "name": "admin" }', 'AGENTS.md': '# Agents\n\nUse feature folders.\n', 'src/main.tsx': 'x\n' });
  const dir = project(t);
  const result = copyTemplate({ from, projectDir: dir, app: 'admin', git });
  assert.equal(result.ok, true, result.notes.join('\n'));
  assert.equal(existsSync(join(dir, 'apps/admin/AGENTS.md')), false);
  assert.match(readFileSync(join(dir, '.claude/skills/admin-conventions/SKILL.md'), 'utf8'), /## From AGENTS\.md\n\n# Agents\n\nUse feature folders\./);
});

test('two templates that set a pnpm setting differently stop the copy, with nothing written', (t) => {
  const dir = project(t);
  assert.equal(copyTemplate({ from: template(t, NEXT_TEMPLATE), projectDir: dir, app: 'user', git }).ok, true);
  const before = readFileSync(join(dir, 'pnpm-workspace.yaml'), 'utf8');
  const react = template(t, { 'package.json': '{ "name": "admin" }', 'pnpm-workspace.yaml': 'allowBuilds:\n  sharp: false\n  msw: false\nminimumReleaseAgeExclude:\n  - lint-staged\n', 'src/main.tsx': 'x\n' });
  const result = copyTemplate({ from: react, projectDir: dir, app: 'admin', git });
  assert.equal(result.ok, false);
  assert.match(result.notes[0], /set the same thing differently, so nothing is copied: allowBuilds\.sharp: true at the root, false in the template\. Choose one value/);
  assert.equal(existsSync(join(dir, 'apps/admin')), false);
  assert.equal(readFileSync(join(dir, 'pnpm-workspace.yaml'), 'utf8'), before);
});

test('copyTemplate stops on an app that is there, and on a folder that is not a git repository with a commit', (t) => {
  const dir = project(t);
  mkdirSync(join(dir, 'apps/user'), { recursive: true });
  assert.match(copyTemplate({ from: template(t, NEXT_TEMPLATE), projectDir: dir, app: 'user', git }).notes[0], /apps\/user is in the project already/);
  assert.match(copyTemplate({ from: temp(t, 'plain-'), projectDir: dir, app: 'web', git }).notes[0], /is not a git repository with a commit/);
});

test('mergeWorkspace: maps and lists gain what they lack, and a value set in both must be the same', () => {
  const root = 'packages:\n  - apps/*\nallowBuilds:\n  sharp: true\nminimumReleaseAgeExclude:\n  - lint-staged\n';
  const merged = mergeWorkspace(root, 'packages: [x]\nallowBuilds:\n  msw: false\n  sharp: true\nminimumReleaseAgeExclude:\n  - lint-staged\n  - vite\nnodeLinker: isolated\n');
  assert.deepEqual(merged.conflicts, []);
  assert.deepEqual(merged.added, ['allowBuilds.msw', 'minimumReleaseAgeExclude: "vite"', 'nodeLinker']);
  assert.deepEqual(parse(merged.text), { packages: ['apps/*'], allowBuilds: { sharp: true, msw: false }, minimumReleaseAgeExclude: ['lint-staged', 'vite'], nodeLinker: 'isolated' });
  assert.deepEqual(mergeWorkspace('packages: [apps/*]\nnodeLinker: hoisted\n', 'nodeLinker: isolated\n').conflicts, ['nodeLinker: "hoisted" at the root, "isolated" in the template']);
});

// Found with the two templates of the user (Lượt 203): the root pinned @playwright/test 1.64.1 and the Next.js template
// 1.61.0, so the types of its e2e tests broke.
test('one Playwright for the repo: the root takes the version of the first template, and a later template takes the version of the root', (t) => {
  const dir = project(t);
  const rootPackage = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ ...rootPackage, devDependencies: { '@playwright/test': '1.64.1' } }, null, 2));
  const user = template(t, { 'package.json': JSON.stringify({ name: 'u', devDependencies: { '@playwright/test': '1.61.0' } }), 'src/a.ts': 'x\n' });
  const first = copyTemplate({ from: user, projectDir: dir, app: 'user', git });
  assert.match(first.notes.join('\n'), /@playwright\/test of the root: 1\.64\.1 → 1\.61\.0, the version of the template, so the repo has one Playwright/);
  assert.equal(JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).devDependencies['@playwright/test'], '1.61.0');
  assert.equal(JSON.parse(readFileSync(join(dir, 'apps/user/package.json'), 'utf8')).devDependencies['@playwright/test'], '1.61.0');

  const admin = template(t, { 'package.json': JSON.stringify({ name: 'a', devDependencies: { '@playwright/test': '1.60.0' } }), 'src/b.ts': 'x\n' });
  const second = copyTemplate({ from: admin, projectDir: dir, app: 'admin', git });
  assert.match(second.notes.join('\n'), /package\.json of apps\/admin: name a → admin; @playwright\/test 1\.60\.0 → 1\.61\.0, the version of the repo/);
  assert.equal(JSON.parse(readFileSync(join(dir, 'apps/admin/package.json'), 'utf8')).devDependencies['@playwright/test'], '1.61.0');
  assert.equal(JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).devDependencies['@playwright/test'], '1.61.0');
});
