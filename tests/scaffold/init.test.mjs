import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse } from 'yaml';
import { initProject, syncKit } from '../../lib/scaffold/init.mjs';
import { readProjectConfig } from '../../lib/scaffold/project-config.mjs';
import { ROOT } from '../helpers/kit.mjs';

// ao-kit init and sync (project-scaffold spec 2.2, 2.3; plan, decision 6), on real folders with git and the commands
// they run given as fakes: no package is installed and no branch is made.
const SAMPLE = join(ROOT, 'tests/fixtures/scaffold/sample');
const OPTIONS = { profile: 'next-nest', name: 'shop', title: 'Shop', space: 'SHOP', repo: 'acme/shop', approvers: 'owner', devApp: 'acme-ao-dev', devAppId: '11', reviewApp: 'acme-ao-review', reviewAppId: '12' };
const temp = (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'init-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
};
const write = (dir, path, text) => {
  mkdirSync(join(dir, path, '..'), { recursive: true });
  writeFileSync(join(dir, path), text);
};
// git and the commands a project runs. git answers from `answers`, by words the command holds.
function effects({ answers = {} } = {}) {
  const calls = { git: [], run: [] };
  return {
    calls,
    git: (args) => {
      calls.git.push(args.join(' '));
      const key = Object.keys(answers).find((k) => args.join(' ').includes(k));
      return key ? answers[key] : { status: 0, stdout: '', stderr: '' };
    },
    run: (argv, cwd) => (calls.run.push([argv.join(' '), cwd]), { status: 0, stdout: '', stderr: '' }),
  };
}

test('init in an empty folder: the skeleton of the profile, project.yaml, the kit, then the render and what the profile runs after', (t) => {
  const dir = temp(t);
  mkdirSync(join(dir, '.git'));
  const fx = effects();
  const { notes, ok } = initProject({ kitDir: ROOT, projectDir: dir, options: OPTIONS, ...fx });
  assert.equal(ok, true, notes.join('\n'));
  for (const path of ['apps/web/src/app/page.tsx', 'apps/api/src/main.ts', '.ai-orchestrator/deploy.yaml', '.ai-orchestrator/scripts/ao-step.mjs', '.claude/hooks/gh-guard.mjs', '.claude/skills/nestjs-best-practices/SKILL.md']) {
    assert.ok(existsSync(join(dir, path)), path);
  }
  const { config, errors } = readProjectConfig(readFileSync(join(dir, '.ai-orchestrator/project.yaml'), 'utf8'));
  assert.deepEqual(errors, []);
  assert.deepEqual([config.name, config.jira.space, config.github.repo, config.github.apps.dev_id], ['shop', 'SHOP', 'acme/shop', 11]);
  assert.deepEqual(parse(readFileSync(join(dir, '.ai-orchestrator/roster.local.yaml'), 'utf8')).roles['be-dev'].skills, ['nestjs-best-practices']);
  assert.match(readFileSync(join(dir, '.gitignore'), 'utf8'), /^\.ai\/$/m);
  assert.equal(JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).scripts.prepare, 'node .ai-orchestrator/scripts/install-hooks.mjs');
  assert.deepEqual(fx.calls.run.map(([argv]) => argv), ['node .ai-orchestrator/scripts/render-agents.mjs --project .', 'npm ci', 'npx playwright install chromium']);
  assert.ok(fx.calls.run.every(([, cwd]) => cwd === dir));
  assert.match(notes.join('\n'), /Next: open claude in the folder/);
});

test('init with no App values leaves them as TODO, renders nothing, and says what to fill', (t) => {
  const dir = temp(t);
  const fx = effects();
  const { ok, notes } = initProject({ kitDir: ROOT, projectDir: dir, options: { ...OPTIONS, devApp: undefined, devAppId: undefined }, env: {}, ...fx });
  assert.equal(ok, false);
  assert.match(notes.join('\n'), /Fill in .ai-orchestrator\/project\.yaml: github\.apps\.dev, github\.apps\.dev_id/);
  assert.equal(fx.calls.run.length, 0);
  assert.match(readFileSync(join(dir, '.ai-orchestrator/project.yaml'), 'utf8'), /dev: TODO/);
});

test('init takes the App values from your environment, as the hooks do, when the command line has none', (t) => {
  const dir = temp(t);
  const env = { AO_DEV_APP: 'env-dev', AO_DEV_APP_ID: '21', AO_REVIEW_APP: 'env-review', AO_REVIEW_APP_ID: '22' };
  const { ok } = initProject({ kitDir: ROOT, projectDir: dir, options: { ...OPTIONS, devApp: undefined, devAppId: undefined, reviewApp: undefined, reviewAppId: undefined }, env, ...effects() });
  assert.equal(ok, true);
  assert.equal(parse(readFileSync(join(dir, '.ai-orchestrator/project.yaml'), 'utf8')).github.apps.review, 'env-review');
});

test('init a second time changes nothing and points to sync', (t) => {
  const dir = temp(t);
  initProject({ kitDir: ROOT, projectDir: dir, options: OPTIONS, ...effects() });
  const before = readFileSync(join(dir, '.ai-orchestrator/project.yaml'), 'utf8');
  const fx = effects();
  const again = initProject({ kitDir: ROOT, projectDir: dir, options: { ...OPTIONS, name: 'other' }, ...fx });
  assert.equal(again.ok, true);
  assert.match(again.notes[0], /has a project\.yaml already: ao-kit init does nothing; ao-kit sync updates the kit/);
  assert.equal(readFileSync(join(dir, '.ai-orchestrator/project.yaml'), 'utf8'), before);
  assert.deepEqual(fx.calls.run, []);
});

// An app that grew without the kit: two workspaces, a root package.json with lint and build only, no E2E, no Docker.
function existing(t) {
  const dir = temp(t);
  write(dir, 'package.json', JSON.stringify({ name: 'shop', private: true, workspaces: ['apps/*'], scripts: { lint: 'npm run lint --workspaces', build: 'npm run build --workspaces' } }, null, 2));
  write(dir, 'apps/store/package.json', JSON.stringify({ name: 'store', scripts: { dev: 'next dev' }, dependencies: { next: '16.4.3' } }));
  write(dir, 'apps/store/src/app/page.tsx', 'export default function Page() { return null; }\n');
  write(dir, 'apps/server/package.json', JSON.stringify({ name: 'server', scripts: { 'start:dev': 'nest start --watch' }, dependencies: { '@nestjs/core': '12.0.11' } }));
  return dir;
}

test('init in a repo that has code: no app file changes, a draft project.yaml from the workspaces, and what is missing', (t) => {
  const dir = existing(t);
  const page = readFileSync(join(dir, 'apps/store/src/app/page.tsx'), 'utf8');
  const fx = effects({ answers: { 'branch --list': { status: 0, stdout: '* main\n', stderr: '' } } });
  const { notes } = initProject({ kitDir: ROOT, projectDir: dir, options: OPTIONS, ...fx });
  assert.equal(readFileSync(join(dir, 'apps/store/src/app/page.tsx'), 'utf8'), page);
  assert.equal(existsSync(join(dir, 'apps/web')), false, 'no skeleton in a repo that has code');
  const config = parse(readFileSync(join(dir, '.ai-orchestrator/project.yaml'), 'utf8'));
  assert.deepEqual(config.apps.store, { repo: 'shop', path: 'apps/store', profile: 'nextjs', dev: 'npm run dev -w apps/store', port: { env: 'PORT', default: 3000 }, health: '/' });
  assert.deepEqual(config.apps.server, { repo: 'shop', path: 'apps/server', profile: 'nestjs', dev: 'npm run start:dev -w apps/server', port: { env: 'PORT', default: 3001 }, health: '/health' });
  const text = notes.join('\n');
  assert.match(text, /guessed: check the port and health of server, store/);
  assert.match(text, /package\.json has no typecheck, test:coverage script/);
  assert.match(text, /no playwright\.config/);
  assert.match(text, /no \.ai-orchestrator\/deploy\.yaml/);
  assert.match(text, /no develop branch/);
  assert.match(text, /commit header/);
  assert.equal(fx.calls.run.some(([argv]) => argv.startsWith('npm')), false, 'nothing is installed in a repo that has code');
});

test('sync: a branch from develop for the Task of the copy, the kit, the render, and one commit; nothing is pushed', (t) => {
  const dir = temp(t);
  initProject({ kitDir: ROOT, projectDir: dir, options: OPTIONS, ...effects() });
  write(dir, '.ai-orchestrator/lib/gone.mjs', 'old\n');
  const fx = effects({ answers: { 'rev-parse HEAD': { status: 0, stdout: 'abcdef1234567890\n', stderr: '' } } });
  const { ok, notes } = syncKit({ kitDir: ROOT, projectDir: dir, options: { key: 'SHOP-5' }, ...fx });
  assert.equal(ok, true, notes.join('\n'));
  assert.equal(existsSync(join(dir, '.ai-orchestrator/lib/gone.mjs')), false);
  assert.deepEqual(fx.calls.git.filter((c) => !c.startsWith('-C')), ['status --porcelain', 'fetch --quiet origin', 'switch --quiet --no-track -c feature/SHOP-5-kit-copy origin/develop', 'add --all', 'commit --quiet -m chore(kit): copy the kit at abcdef12 (SHOP-5)']);
  assert.deepEqual(fx.calls.run.map(([argv]) => argv), ['node .ai-orchestrator/scripts/render-agents.mjs --project .']);
  assert.equal(fx.calls.git.some((c) => c.startsWith('push')), false);
  assert.match(notes.at(-1), /Push feature\/SHOP-5-kit-copy and open its PR/);
});

test('sync stops on changes not committed, without the key of a Task, and on a key outside the space', (t) => {
  const dir = temp(t);
  initProject({ kitDir: ROOT, projectDir: dir, options: OPTIONS, ...effects() });
  const dirty = syncKit({ kitDir: ROOT, projectDir: dir, options: { key: 'SHOP-5' }, ...effects({ answers: { 'status --porcelain': { status: 0, stdout: ' M apps/web/x.ts\n', stderr: '' } } }) });
  assert.deepEqual([dirty.ok, dirty.notes[0]], [false, 'The project has changes not committed (1 files): commit or put them aside first']);
  assert.match(syncKit({ kitDir: ROOT, projectDir: dir, options: {}, ...effects() }).notes[0], /--key <KEY>: the Task the copy is made for/);
  assert.match(syncKit({ kitDir: ROOT, projectDir: dir, options: { key: 'OTHER-5' }, ...effects() }).notes[0], /OTHER-5 is not an item of SHOP/);
});

// ao-sample before project-scaffold, as T20 will copy the kit into it.
function oldProject(t) {
  const dir = temp(t);
  write(dir, '.claude/settings.json', readFileSync(join(SAMPLE, 'settings.json'), 'utf8'));
  write(dir, '.ai-orchestrator/preview.yaml', readFileSync(join(SAMPLE, 'preview.yaml'), 'utf8'));
  write(dir, '.ai-orchestrator/deploy.yaml', readFileSync(join(SAMPLE, 'deploy.yaml'), 'utf8'));
  cpSync(join(SAMPLE, 'package.json'), join(dir, 'package.json'));
  write(dir, 'apps/web/package.json', JSON.stringify({ dependencies: { next: '16.4.3' } }));
  write(dir, 'apps/api/package.json', JSON.stringify({ dependencies: { '@nestjs/core': '12.0.11' } }));
  return dir;
}
const remote = { 'remote get-url origin': { status: 0, stdout: 'https://github.com/TungPH7/ao-sample.git\n', stderr: '' } };

test('sync moves a project from before project-scaffold to project.yaml, given the name of the project on the VPS', (t) => {
  const dir = oldProject(t);
  const { ok, notes } = syncKit({ kitDir: ROOT, projectDir: dir, options: { key: 'SMP-30', name: 'sample' }, ...effects({ answers: remote }) });
  assert.equal(ok, true, notes.join('\n'));
  assert.equal(existsSync(join(dir, '.ai-orchestrator/preview.yaml')), false);
  assert.deepEqual(parse(readFileSync(join(dir, '.ai-orchestrator/project.yaml'), 'utf8')), parse(readFileSync(join(SAMPLE, 'project.yaml'), 'utf8')));
  assert.match(notes.join('\n'), /Wrote .ai-orchestrator\/project\.yaml from \.claude\/settings\.json, \.ai-orchestrator\/preview\.yaml and deploy\.yaml, and removed preview\.yaml/);
});

test('without the name, sync writes nothing and makes no branch: it says what it needs', (t) => {
  const dir = oldProject(t);
  const fx = effects({ answers: remote });
  const { ok, notes } = syncKit({ kitDir: ROOT, projectDir: dir, options: { key: 'SMP-30' }, ...fx });
  assert.equal(ok, false);
  assert.match(notes[0], /project\.yaml needs values the old files do not have: name\. Run again with --name <the name of the project on the VPS>/);
  assert.equal(fx.calls.git.some((c) => c.startsWith('switch')), false);
  assert.ok(existsSync(join(dir, '.ai-orchestrator/preview.yaml')));
});
