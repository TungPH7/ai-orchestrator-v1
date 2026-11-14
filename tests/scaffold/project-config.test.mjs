import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse, stringify } from 'yaml';
import { checkProject, readProjectConfig } from '../../lib/scaffold/project-config.mjs';
import { ROOT } from '../helpers/kit.mjs';

// .ai-orchestrator/project.yaml (project-scaffold spec 2.1), with ao-sample as the sample.
const SAMPLE = join(ROOT, 'tests/fixtures/scaffold/sample');
const text = readFileSync(join(SAMPLE, 'project.yaml'), 'utf8');
const deployText = readFileSync(join(SAMPLE, 'deploy.yaml'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(SAMPLE, 'package.json'), 'utf8'));
// The sample after `change` edits a copy of it.
const edited = (change) => {
  const data = parse(text);
  change(data);
  return readProjectConfig(stringify(data));
};
// An npm repo: every path is there but the lockfile of pnpm.
const npmRepo = (path) => path !== 'pnpm-lock.yaml';
const rules = ({ errors }) => errors.map(({ rule, path }) => `${rule} ${path}`);

test('the project.yaml of ao-sample reads with no error', () => {
  const { config, errors } = readProjectConfig(text);
  assert.deepEqual(errors, []);
  assert.equal(config.jira.space, 'SMP');
  assert.deepEqual(Object.keys(config.apps), ['web', 'api']);
  assert.deepEqual(config.apps.api.port, { env: 'PORT', default: 3001 });
});

test('P1: the schema, with the path of each problem', () => {
  assert.deepEqual(rules(edited((d) => delete d.jira.space)), ['P1 jira.space']);
  assert.deepEqual(rules(edited((d) => (d.colour = 'blue'))), ['P1 colour']);
  assert.deepEqual(rules(edited((d) => (d.name = 'Sample App'))), ['P1 name']);
  assert.deepEqual(rules(edited((d) => (d.apps.api.port.default = 70000))), ['P1 apps.api.port.default']);
  assert.deepEqual(rules(edited((d) => (d.apps.web.profile = 'angular'))), ['P1 apps.web.profile']);
  assert.deepEqual(rules(edited((d) => (d.github.apps.dev_id = 'TODO'))), ['P1 github.apps.dev_id']);
  assert.match(readProjectConfig('apps: [').errors[0].message, /is not YAML/);
  assert.match(readProjectConfig('').errors[0].message, /is empty/);
});

test('P2–P4: one repo for now, each app in a repo of the file, and paths inside the repo', () => {
  assert.deepEqual(rules(edited((d) => d.repos.push({ name: 'ao-api', path: '../ao-api' }))), ['P2 repos']);
  assert.deepEqual(rules(edited((d) => (d.apps.api.repo = 'ao-api'))), ['P3 apps.api.repo']);
  assert.deepEqual(rules(edited((d) => (d.apps.api.path = '../api'))), ['P4 apps.api.path']);
  assert.deepEqual(rules(edited((d) => (d.apps.api.path = 'C:/work/api'))), ['P4 apps.api.path']);
  assert.match(edited((d) => d.repos.push({ name: 'ao-api', path: '../ao-api' })).errors[0].message, /exactly one repo/);
});

test('P5–P7: optional roles the kit has, dev commands with no shell, and one port for each app', () => {
  assert.deepEqual(rules(edited((d) => (d.roles.optional = ['seo']))), ['P5 roles.optional[0]']);
  assert.deepEqual(readProjectConfig(stringify({ ...parse(text), roles: { optional: ['seo'] } }), { optionalRoles: ['seo'] }).errors, []);
  assert.deepEqual(rules(edited((d) => (d.apps.web.dev = 'npm run dev -w apps/web && rm -rf .'))), ['P6 apps.web.dev']);
  assert.deepEqual(rules(edited((d) => (d.apps.web.dev = 'next dev'))), ['P6 apps.web.dev']);
  // pnpm starts an app with plain words too (project-scaffold part 2, spec 2.1).
  assert.deepEqual(rules(edited((d) => (d.apps.web.dev = 'pnpm --filter ./apps/web run dev'))), []);
  assert.deepEqual(rules(edited((d) => (d.apps.web.dev = 'pnpm --filter ./apps/web run dev; rm -rf .'))), ['P6 apps.web.dev']);
  assert.deepEqual(rules(edited((d) => (d.apps.api.port.default = 3000))), ['P7 apps.api.port.default']);
});

test('checkProject: ao-sample agrees with its deploy.yaml, its package.json and its folders', () => {
  const { config } = readProjectConfig(text);
  assert.deepEqual(checkProject({ config, deployText, packageJson, exists: npmRepo }), []);
});

test('checkProject: what differs from deploy.yaml, package.json or the folders, by rule', () => {
  const { config } = readProjectConfig(text);
  const check = (more) => checkProject({ config, deployText, packageJson, exists: npmRepo, ...more }).map(({ rule, path }) => `${rule} ${path}`);
  assert.deepEqual(check({ deployText: deployText.replace('port: 3001', 'port: 8080') }), ['C1 apps.api.port']);
  assert.deepEqual(check({ deployText: deployText.replace('health: /health', 'health: /healthz') }), ['C1 apps.api.health']);
  assert.deepEqual(check({ deployText: deployText.replace(/\n {4}public: true/, '').replace('health: /health\n', 'health: /health\n    public: true\n') }), ['C1 apps.web.public', 'C1 apps.api.public']);
  assert.deepEqual(check({ deployText: deployText.replace('apps:\n', 'apps:\n  worker:\n    dockerfile: apps/worker/Dockerfile\n    port: 3002\n    health: /health\n') }), ['C1 apps.worker']);
  const noScripts = { ...packageJson, scripts: { lint: 'x', build: 'y' } };
  assert.deepEqual(check({ packageJson: noScripts }), ['C2 scripts.typecheck', 'C2 scripts.test:coverage']);
  assert.deepEqual(check({ packageJson: { ...packageJson, workspaces: ['packages/*'] } }), ['C2 apps.web.path', 'C2 apps.api.path']);
  assert.deepEqual(check({ exists: (path) => npmRepo(path) && path !== 'apps/api' }), ['C3 apps.api.path']);
  // A project with no deploy.yaml yet is checked without it.
  assert.deepEqual(check({ deployText: null }), []);
  assert.match(checkProject({ config, deployText: 'apps: [', packageJson, exists: npmRepo })[0].message, /deploy\.yaml/);
});

test('package_manager is npm or pnpm, and may be left out', () => {
  assert.deepEqual(rules(edited((d) => (d.package_manager = 'pnpm'))), []);
  assert.deepEqual(rules(edited((d) => (d.package_manager = 'yarn'))), ['P1 package_manager']);
});

test('checkProject C4: the lockfile at the root is the one of package_manager, and pnpm names its version', () => {
  const { config } = readProjectConfig(text);
  const check = (more) => checkProject({ config, deployText, packageJson, exists: npmRepo, ...more }).map(({ rule, path }) => `${rule} ${path}`);
  assert.deepEqual(check({ exists: (path) => path !== 'pnpm-lock.yaml' && path !== 'package-lock.json' }), ['C4 package_manager']);
  assert.deepEqual(check({ exists: () => true }), ['C4 package_manager']);
  assert.match(checkProject({ config, deployText, packageJson, exists: () => true })[0].message, /pnpm-lock\.yaml, the lockfile of pnpm/);

  // A pnpm project: its apps are the packages of pnpm-workspace.yaml, and package.json pins pnpm.
  const pnpm = { ...config, package_manager: 'pnpm' };
  const pnpmRepo = (path) => path !== 'package-lock.json';
  const pnpmJson = { ...packageJson, workspaces: undefined, packageManager: 'pnpm@11.8.0' };
  const workspaceText = 'packages:\n  - apps/*\nallowBuilds:\n  sharp: true\n';
  const checkPnpm = (more) => checkProject({ config: pnpm, deployText, packageJson: pnpmJson, workspaceText, exists: pnpmRepo, ...more }).map(({ rule, path }) => `${rule} ${path}`);
  assert.deepEqual(checkPnpm({}), []);
  assert.deepEqual(checkPnpm({ packageJson: { ...pnpmJson, packageManager: undefined } }), ['C4 packageManager']);
  assert.deepEqual(checkPnpm({ exists: npmRepo }), ['C4 package_manager', 'C4 package_manager']);
  assert.deepEqual(checkPnpm({ workspaceText: null }), ['C2 apps.web.path', 'C2 apps.api.path']);
  assert.deepEqual(checkPnpm({ workspaceText: 'packages: [' }), ['C2 apps.web.path', 'C2 apps.api.path']);
  assert.match(checkProject({ config: pnpm, deployText, packageJson: pnpmJson, workspaceText: null, exists: pnpmRepo })[0].message, /workspace of pnpm-workspace\.yaml/);
});

// project-scaffold part 2, spec 2.4: the hosts of public apps.
test('hosts: only a public app has them, no host twice, and each public app names them once two or more are public', () => {
  const HOSTS = { development: 'shop-dev.ao.t2g.io.vn', staging: 'shop-staging.ao.t2g.io.vn', production: 'shop.ao.t2g.io.vn' };
  assert.deepEqual(rules(edited((d) => (d.apps.web.hosts = HOSTS))), []);
  assert.deepEqual(rules(edited((d) => (d.apps.api.hosts = HOSTS))), ['P8 apps.api.hosts']);
  assert.deepEqual(rules(edited((d) => (d.apps.web.hosts = { ...HOSTS, staging: 'not a host' }))), ['P1 apps.web.hosts.staging']);
  assert.deepEqual(rules(edited((d) => { d.apps.api.public = true; d.apps.web.hosts = HOSTS; d.apps.api.hosts = { ...HOSTS, development: 'api-dev.ao.t2g.io.vn', staging: 'api-staging.ao.t2g.io.vn' }; })), ['P9 apps.api.hosts.production']);

  // C5: two public apps, one without hosts.
  const two = parse(text);
  two.apps.api.public = true;
  two.apps.web.hosts = HOSTS;
  const { config, errors } = readProjectConfig(stringify(two));
  assert.deepEqual(errors, []);
  const twoDeploy = deployText.replace('health: /health\n', 'health: /health\n    public: true\n');
  assert.deepEqual(checkProject({ config, deployText: twoDeploy, packageJson, exists: npmRepo }).map(({ rule, path }) => `${rule} ${path}`), ['C5 apps.api.hosts']);
  // One public app needs none: the hosts of its project on the VPS serve it, as before.
  assert.deepEqual(checkProject({ config: readProjectConfig(text).config, deployText, packageJson, exists: npmRepo }), []);
});

// project-scaffold part 3, spec 2.3: the globs an app leaves out of the coverage of changed lines, inside its folder.
test('coverage_exclude of an app holds globs inside the app folder', () => {
  const withExclude = (globs) => {
    const data = parse(text);
    data.apps.api.coverage_exclude = globs;
    return readProjectConfig(stringify(data));
  };
  assert.deepEqual(withExclude(['src/main/java/**/dto/**', '**/*Properties.java']).errors, []);
  for (const bad of ['/etc/passwd', '../web/src/**', 'src/../../x', '\\server\\share']) {
    assert.ok(withExclude([bad]).errors.some(({ path }) => /coverage_exclude/.test(path)), bad);
  }
});
