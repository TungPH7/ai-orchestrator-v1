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
  assert.deepEqual(rules(edited((d) => (d.apps.api.port.default = 3000))), ['P7 apps.api.port.default']);
});

test('checkProject: ao-sample agrees with its deploy.yaml, its package.json and its folders', () => {
  const { config } = readProjectConfig(text);
  assert.deepEqual(checkProject({ config, deployText, packageJson, exists: () => true }), []);
});

test('checkProject: what differs from deploy.yaml, package.json or the folders, by rule', () => {
  const { config } = readProjectConfig(text);
  const check = (more) => checkProject({ config, deployText, packageJson, exists: () => true, ...more }).map(({ rule, path }) => `${rule} ${path}`);
  assert.deepEqual(check({ deployText: deployText.replace('port: 3001', 'port: 8080') }), ['C1 apps.api.port']);
  assert.deepEqual(check({ deployText: deployText.replace('health: /health', 'health: /healthz') }), ['C1 apps.api.health']);
  assert.deepEqual(check({ deployText: deployText.replace(/\n {4}public: true/, '').replace('health: /health\n', 'health: /health\n    public: true\n') }), ['C1 apps.web.public', 'C1 apps.api.public']);
  assert.deepEqual(check({ deployText: deployText.replace('apps:\n', 'apps:\n  worker:\n    dockerfile: apps/worker/Dockerfile\n    port: 3002\n    health: /health\n') }), ['C1 apps.worker']);
  const noScripts = { ...packageJson, scripts: { lint: 'x', build: 'y' } };
  assert.deepEqual(check({ packageJson: noScripts }), ['C2 scripts.typecheck', 'C2 scripts.test:coverage']);
  assert.deepEqual(check({ packageJson: { ...packageJson, workspaces: ['packages/*'] } }), ['C2 apps.web.path', 'C2 apps.api.path']);
  assert.deepEqual(check({ exists: (path) => path !== 'apps/api' }), ['C3 apps.api.path']);
  // A project with no deploy.yaml yet is checked without it.
  assert.deepEqual(check({ deployText: null }), []);
  assert.match(checkProject({ config, deployText: 'apps: [', packageJson, exists: () => true })[0].message, /deploy\.yaml/);
});
