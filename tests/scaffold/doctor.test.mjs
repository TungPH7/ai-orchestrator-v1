import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { doctor, formatDoctor } from '../../lib/scaffold/doctor.mjs';
import { ROOT } from '../helpers/kit.mjs';

// ao-kit doctor (project-scaffold spec 2.5): what a project still lacks, on this machine, in the repo, on GitHub, on
// Jira and in Claude Code, each row with what to do. It reads only, and never prints a secret.
const sample = parse(readFileSync(join(ROOT, 'tests/fixtures/scaffold/sample/project.yaml'), 'utf8'));
// With merge-gate's own App (Pilot 3, spec 2.9), as a project set up now has it.
const config = { ...sample, github: { ...sample.github, apps: { ...sample.github.apps, merge: 'tungph7-ao-merge', merge_id: 5756976 } } };
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
    github: { defaultBranch: 'develop', environments: ['development', 'staging', 'production', 'merge-gate'], secrets: ['JIRA_CI_TOKEN'], envSecrets: ['AO_MERGE_APP_KEY'], workflows: 3, ciRuns: 3 },
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

// project-scaffold part 2, spec 2.4: the lines of /etc/ao/deployer.yaml for two public apps, with their hosts.
test('two public apps: doctor prints the hosts of each app for /etc/ao/deployer.yaml', () => {
  const two = { ...config, apps: { ...config.apps, web: { ...config.apps.web, hosts: { development: 'sample-dev.ao.t2g.io.vn', staging: 'sample-staging.ao.t2g.io.vn', production: 'sample.ao.t2g.io.vn' } }, api: { ...config.apps.api, public: true } } };
  const vps = doctor(facts({ config: two })).find(({ group }) => group === 'VPS');
  assert.match(vps.fix, /\n {4}hosts:\n {6}web:\n {8}development: sample-dev\.ao\.t2g\.io\.vn\n {8}staging: sample-staging\.ao\.t2g\.io\.vn\n {8}production: sample\.ao\.t2g\.io\.vn\n {6}api:\n {8}development: sample-api-dev\.<your domain>\n/);
});

// project-scaffold part 3, spec 2.2, 2.6.
test('a project with a Java app: the JDK its pom asks for, and Docker running for its tests and its database', () => {
  const java = (jdk) => [{ app: 'api', want: 21, jdk }];
  const names = (rows) => rows.map(({ name }) => name);
  const ok = doctor(facts({ java: java({ home: 'C:/opt/jdk-21', from: 'next to JAVA_HOME' }), docker: { running: true } }));
  assert.deepEqual(failed(ok), []);
  assert.ok(names(ok).includes('JDK 21 for api') && names(ok).includes('Docker is running'));

  const bad = doctor(facts({ java: java(null), docker: { running: false } }));
  assert.deepEqual(failed(bad), ['JDK 21 for api', 'Docker is running']);
  assert.match(bad.find(({ name }) => name === 'JDK 21 for api').fix, /JDK 21 was not found: install it, or set JAVA_HOME_21/);
  assert.match(bad.find(({ name }) => name === 'Docker is running').fix, /Start Docker Desktop/);

  // No Java app, no such row.
  assert.ok(!names(doctor(facts())).some((name) => /JDK|Docker/.test(name)));
});

// Pilot 3, review of shop PR #13 (spec 2.9): only ao-merge may merge without your approval, so its key lives only in
// the merge-gate environment; and the age identity that opens the backup copies lives off the machine agents run on.
test('a project with ao-merge needs its key in merge-gate; a project without it fails a row that says how to make the App', () => {
  const secrets = doctor(facts()).find(({ name }) => name.includes('of merge-gate'));
  assert.equal(secrets.name, 'secrets JIRA_CI_TOKEN, and AO_MERGE_APP_KEY of merge-gate');
  assert.equal(secrets.ok, true);
  const missing = doctor(facts({ github: { ...facts().github, envSecrets: ['AO_DEV_APP_KEY'] } })).find(({ name }) => name.includes('of merge-gate'));
  assert.equal(missing.ok, false);
  assert.match(missing.fix, /--merge-app-key-file <the key of ao-merge>/);
  const old = doctor(facts({ config: sample }));
  assert.deepEqual(failed(old), ['the ao-merge App, the only one the rulesets let merge without your approval']);
  assert.match(old.find(({ name }) => name.startsWith('the ao-merge App')).fix, /github-app-create\.mjs .*--apps merge/);
});

test('no key of ao-merge and no age identity on this machine: each found file fails its row, by path', () => {
  const rows = doctor(facts({ strayKeys: { merge: ['C:/Users/me/ao-keys/tungph7-ao-merge.pem'], age: ['C:/Users/me/.ao/ao-backup.agekey'] } }));
  assert.deepEqual(failed(rows), ['no key of ao-merge on this machine', 'no age identity of the backups on this machine']);
  assert.match(rows.find(({ name }) => name === 'no key of ao-merge on this machine').fix, /Delete C:\/Users\/me\/ao-keys\/tungph7-ao-merge\.pem/);
  assert.match(rows.find(({ name }) => name.startsWith('no age identity')).fix, /password manager.*decrypt --identity -/);
  assert.deepEqual(failed(doctor(facts({ strayKeys: { merge: [], age: [] } }))), []);
});

test('doctor asks whether ao-deploy is on the repo, since GitHub does not let it read the installs of an App', () => {
  const row = doctor(facts()).find(({ name }) => /ao-deploy/.test(name));
  assert.equal(row.group, 'GitHub');
  assert.equal(row.ok, null);
  assert.match(row.fix, /Installed GitHub Apps → Configure next to the App ao-deploy/);
});

test('a machine that pulls the backup copies: a row for the copies of this project, which fails past 36 hours (Pilot 3, spec 2.4)', () => {
  const name = facts().config.name;
  const none = doctor(facts());
  assert.equal(none.some(({ name: row }) => row.includes('backup copies')), false, 'no row on a machine that does not pull them');
  const fresh = doctor(facts({ backupCopies: [{ project: name, env: 'production', name: 'x', hours: 20 }, { project: 'other', env: 'production', name: 'y', hours: 90 }] }));
  const row = fresh.find(({ name: text }) => text.includes('backup copies'));
  assert.equal(row.ok, true, 'another project does not count');
  const old = doctor(facts({ backupCopies: [{ project: name, env: 'production', name: 'x', hours: 40 }] })).find(({ name: text }) => text.includes('backup copies'));
  assert.equal(old.ok, false);
  assert.match(old.fix, /production: 40 h/);
  assert.match(old.fix, /ao-backup-pull\.mjs pull/);
  const empty = doctor(facts({ backupCopies: [] })).find(({ name: text }) => text.includes('backup copies'));
  assert.equal(empty.ok, false);
  assert.match(empty.fix, /no copy/i);
  // A record of the pull that cannot be read is a row to fix, not a stop (review of shop PR #13).
  const broken = doctor(facts({ backupCopies: { broken: 'C:/Users/me/.ao/backup-pull.json is not JSON' } })).find(({ name: text }) => text.includes('backup copies'));
  assert.equal(broken.ok, false);
  assert.match(broken.fix, /backup-pull\.json is not JSON: run node <kit>\/scripts\/ao-backup-pull\.mjs install/);
});
