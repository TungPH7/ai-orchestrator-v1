import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT } from '../helpers/kit.mjs';

// scripts/ao-kit.mjs, run as you run it: node <kit>/scripts/ao-kit.mjs <command> <dir> (project-scaffold spec 2.2).
const SAMPLE = join(ROOT, 'tests/fixtures/scaffold/sample');
const aoKit = (...args) => spawnSync(process.execPath, [join(ROOT, 'scripts', 'ao-kit.mjs'), ...args], { encoding: 'utf8' });

// A project folder shaped like ao-sample: project.yaml and deploy.yaml in .ai-orchestrator/, package.json and its
// lockfile, the apps.
function sampleProject(t, { apps = ['apps/web', 'apps/api'] } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'ao-kit-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, '.ai-orchestrator'));
  cpSync(join(SAMPLE, 'project.yaml'), join(dir, '.ai-orchestrator', 'project.yaml'));
  cpSync(join(SAMPLE, 'deploy.yaml'), join(dir, '.ai-orchestrator', 'deploy.yaml'));
  cpSync(join(SAMPLE, 'package.json'), join(dir, 'package.json'));
  // The lockfile of npm, which project.yaml names by not naming another (rule C4).
  writeFileSync(join(dir, 'package-lock.json'), '{}\n');
  for (const app of apps) mkdirSync(join(dir, app), { recursive: true });
  return dir;
}

test('ao-kit check: a project that agrees with itself passes', (t) => {
  const run = aoKit('check', sampleProject(t));
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /project\.yaml OK: 2 apps \(web, api\), space SMP, repo TungPH7\/ao-sample/);
});

test('ao-kit check: each problem on a line with its rule, and exit 1', (t) => {
  const run = aoKit('check', sampleProject(t, { apps: ['apps/web'] }));
  assert.equal(run.status, 1);
  assert.match(run.stdout, /^C3 apps\.api\.path: apps\/api is not in the repo$/m);
  const none = aoKit('check', mkdtempSync(join(tmpdir(), 'ao-kit-empty-')));
  assert.equal(none.status, 1);
  assert.match(none.stdout, /no \.ai-orchestrator\/project\.yaml in /);
  const wrong = aoKit('dance', '.');
  assert.equal(wrong.status, 2);
  assert.match(wrong.stderr, /^usage: node <kit>\/scripts\/ao-kit\.mjs/);
});
