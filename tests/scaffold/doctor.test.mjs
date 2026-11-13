import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { doctor, formatDoctor } from '../../lib/scaffold/doctor.mjs';
import { ROOT } from '../helpers/kit.mjs';

// ao-kit doctor (project-scaffold spec 2.5): what a project still lacks, on this machine, in the repo, on GitHub, on
// Jira and in Claude Code, each row with what to do. It reads only, and never prints a secret.
const config = parse(readFileSync(join(ROOT, 'tests/fixtures/scaffold/sample/project.yaml'), 'utf8'));
const SECRETS = { ATLASSIAN_AGENT_TOKEN: 'atl-secret-0001', JIRA_CI_TOKEN: 'ci-secret-0002', AO_ENV_AUTH: 'ao:pass-secret-0003', AO_DEV_APP_KEY_FILE: 'C:/keys/dev.pem', AO_REVIEW_APP_KEY_FILE: 'C:/keys/review.pem' };
// A project where everything is in place; `change` breaks one part.
function facts(change = {}) {
  return {
    config,
    projectProblems: [],
    nodeVersion: '24.17.0',
    versions: { gh: 'gh version 2.103.0 (2026-10-01)', claude: '2.1.330 (Claude Code)', git: 'git version 2.52.0.windows.1' },
    env: { ...SECRETS },
    files: new Set(['C:/keys/dev.pem', 'C:/keys/review.pem']),
    kitDrift: [],
    renderCheck: { status: 0, text: '12 files up to date in .claude/' },
    hooksPath: '.githooks',
    gitignoreMissing: [],
    github: { defaultBranch: 'develop', environments: ['development', 'staging', 'production', 'merge-gate'], secrets: ['JIRA_CI_TOKEN'], envSecrets: ['AO_DEV_APP_KEY'], workflows: 3, ciRuns: 3 },
    apps: { dev: { ok: true }, review: { ok: true } },
    jiraCheck: { status: 0, text: 'AOG matches tracker/jira.yaml' },
    claude: { trusted: true, mcp: ['atlassian', 'chrome-devtools'] },
    ...change,
  };
}
const failed = (rows) => rows.filter(({ ok }) => ok === false).map(({ name }) => name);

test('a project with everything in place passes every row, and the VPS row asks you', () => {
  const rows = doctor(facts());
  assert.deepEqual(failed(rows), []);
  const vps = rows.find(({ group }) => group === 'VPS');
  assert.equal(vps.ok, null);
  assert.match(vps.fix, /- name: sample\n {4}repo: TungPH7\/ao-sample\n {4}space: SMP\n {4}hosts:/);
  assert.ok(rows.length >= 20);
});

test('each part that is missing fails its own row, with what to do', () => {
  const cases = [
    [{ nodeVersion: '22.11.0' }, 'Node 24'],
    [{ versions: { ...facts().versions, gh: 'gh version 2.90.0 (2026-01-01)' } }, 'GitHub CLI 2.102.0 or later'],
    [{ versions: { ...facts().versions, claude: null } }, 'Claude Code'],
    [{ env: { ...SECRETS, ATLASSIAN_AGENT_TOKEN: undefined } }, 'ATLASSIAN_AGENT_TOKEN'],
    [{ files: new Set(['C:/keys/dev.pem']) }, 'AO_REVIEW_APP_KEY_FILE'],
    [{ env: { ...SECRETS, AO_ENV_AUTH: 'no-colon' } }, 'AO_ENV_AUTH'],
    [{ projectProblems: ['C1 apps.api.port: api listens on 3001 in project.yaml and on 8080 in deploy.yaml'] }, 'project.yaml'],
    [{ kitDrift: ['.ai-orchestrator/lib/a.mjs'] }, 'the kit files are those of this clone'],
    [{ renderCheck: { status: 1, text: 'stale: .claude/settings.json' } }, 'settings.json and the agents are rendered'],
    [{ hooksPath: '' }, 'git hooks'],
    [{ github: { ...facts().github, defaultBranch: 'main' } }, 'default branch develop'],
    [{ github: { ...facts().github, environments: ['development'] } }, 'environments'],
    [{ github: { ...facts().github, envSecrets: [] } }, 'secrets'],
    [{ apps: { dev: { ok: true }, review: { ok: false, reason: 'the App is not installed on TungPH7/ao-sample' } } }, 'ao-review installed'],
    [{ github: { ...facts().github, workflows: 0 } }, 'GitHub knows the workflows'],
    [{ github: { ...facts().github, ciRuns: 0 } }, 'CI has run on develop'],
    [{ jiraCheck: { status: 1, text: '5 difference(s) between Jira and tracker/jira.yaml' } }, 'jira:check'],
    [{ claude: { trusted: false, mcp: ['atlassian', 'chrome-devtools'] } }, 'folder trusted'],
    [{ claude: { trusted: true, mcp: ['atlassian'] } }, 'MCP servers'],
  ];
  for (const [change, name] of cases) {
    const rows = doctor(facts(change));
    const bad = rows.filter(({ ok }) => ok === false);
    assert.equal(bad.length, 1, `${name}: ${failed(rows).join(', ')}`);
    assert.match(bad[0].name, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), name);
    assert.ok(bad[0].fix.length > 10, `${name} says what to do`);
  }
});

// T16: Actions was off on a new repo though the API said enabled, and the first push started nothing (Pilot 1, T7).
test('the rows of Actions say where to switch it on, and how to run CI on develop by hand', () => {
  const rows = doctor(facts({ github: { ...facts().github, workflows: 0, ciRuns: 0 } }));
  const fix = (name) => rows.find((row) => row.name.startsWith(name)).fix;
  assert.match(fix('GitHub knows the workflows'), /Actions tab .* Enable Actions on this repository/);
  assert.match(fix('CI has run on develop'), /gh workflow run CI --repo TungPH7\/ao-sample --ref develop/);
});

test('the printout names no secret, only whether it is there and has the right shape', () => {
  const text = formatDoctor(doctor(facts({ env: { ...SECRETS, AO_ENV_AUTH: 'no-colon-secret-0004' } })));
  for (const value of [...Object.values(SECRETS), 'no-colon-secret-0004']) if (!value.includes('/keys/')) assert.ok(!text.includes(value), value);
  assert.match(text, /^✘ Machine: AO_ENV_AUTH/m);
  assert.match(text, /^✔ Machine: Node 24/m);
  assert.match(text, /^\? VPS: /m);
  assert.match(text, /1 row to fix/);
});

// project-scaffold part 2, spec 2.1: a pnpm project needs the pnpm that packageManager names, in its folder.
test('a pnpm project: the pnpm in the project folder is the version packageManager names', () => {
  const pnpm = { ...config, package_manager: 'pnpm' };
  const row = (change) => doctor(facts({ config: pnpm, ...change })).find(({ name }) => name.startsWith('pnpm '));
  assert.equal(doctor(facts()).some(({ name }) => name.startsWith('pnpm ')), false, 'an npm project has no pnpm row');
  assert.equal(row({ versions: { ...facts().versions, pnpm: '11.8.0' }, pnpmWanted: '11.8.0' }).ok, true);
  const old = row({ versions: { ...facts().versions, pnpm: '9.15.0' }, pnpmWanted: '11.8.0' });
  assert.equal(old.ok, false);
  assert.equal(old.name, 'pnpm 11.8.0');
  assert.match(old.fix, /runs pnpm 9\.15\.0: npm install -g pnpm@11\.8\.0, or corepack enable/);
  assert.match(row({ versions: { ...facts().versions, pnpm: null }, pnpmWanted: null }).fix, /Name the pnpm version in packageManager/);
  assert.match(doctor(facts({ config: pnpm, hooksPath: '' })).find(({ name }) => name === 'git hooks are installed').fix, /^pnpm install in the project/);
});

// A public repo keeps its interaction limit (SPEC-project-scaffold-2.md, section 9, question 1).
test('a public repo: the interaction limit runs for 30 days more at least', () => {
  const row = (github) => doctor(facts({ now: '2026-11-13T00:00:00Z', github: { ...facts().github, public: true, ...github } })).find(({ name }) => name.startsWith('a public repo'));
  assert.equal(doctor(facts()).some(({ name }) => name.startsWith('a public repo')), false, 'a private repo has no such row');
  assert.equal(row({ interactionLimit: { limit: 'collaborators_only', expires_at: '2027-05-13T00:00:00Z' } }).ok, true);
  const soon = row({ interactionLimit: { limit: 'collaborators_only', expires_at: '2026-11-30T00:00:00Z' } });
  assert.equal(soon.ok, false);
  assert.match(soon.fix, /^The interaction limit ends in 17 days: ao-kit setup github <dir> sets it again for six months$/);
  assert.match(row({ interactionLimit: {} }).fix, /^No interaction limit runs: /);
});
