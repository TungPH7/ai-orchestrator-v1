// The deployer on the VPS (release-workflow spec 2.3): systemd runs `tick` every minute as user aodeploy, from the kit
// pinned in /opt/ao/kit, never from the project's own copy. The logic is lib/release/deployer.mjs; this file reads the
// configuration, builds the clients and keeps the record of each project.
// Usage: node scripts/ao-deploy.mjs tick [--dry-run] [--config <file>]
//        node scripts/ao-deploy.mjs baseline <project> [--confirm] [--config <file>]
// The configuration is /etc/ao/deployer.yaml unless --config names another (vps/deployer.example.yaml, T9). git and
// docker run with a bare environment: the installation token reaches git only as a header in its environment, and a
// container gets only the variables its app names. --dry-run decides and prints, and writes nothing: no deployment on
// GitHub, no container, no record. `baseline` prints today's heads, and with --confirm records them as audited.
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, promisify } from 'node:util';
import { parse } from 'yaml';
import { readContract } from '../lib/contract.mjs';
import { auditRange } from '../lib/quality/audit.mjs';
import { gatePassage } from '../lib/quality/docs-pr.mjs';
import { readGates } from '../lib/quality/gates.mjs';
import { installationToken } from '../lib/quality/github-app.mjs';
import { createInstaller, gitAuthEnv, readHeads, tick } from '../lib/release/deployer.mjs';
import { baseline, hasBaseline, readState, stateText } from '../lib/release/record.mjs';
import { createGitHubClient } from '../lib/tracker/github-client.mjs';
import { bearerAuth, createJiraClient } from '../lib/tracker/jira-client.mjs';
import { readMapping } from '../lib/tracker/mapping.mjs';

const run = promisify(execFile);
const kit = fileURLToPath(new URL('..', import.meta.url));
const USAGE = 'usage: ao-deploy.mjs tick [--dry-run] [--config <file>] | ao-deploy.mjs baseline <project> [--confirm] [--config <file>]';
const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const OUTPUT = 64 * 1024 * 1024; // docker build prints a lot

// Only what git and docker need to run; nothing of the deployer's own environment.
const BARE = Object.fromEntries(['PATH', 'Path', 'HOME', 'USERPROFILE', 'SystemRoot', 'TEMP', 'TMP'].filter((name) => process.env[name]).map((name) => [name, process.env[name]]));
const execute = (command, args, env = {}) => run(command, args, { env: { ...BARE, LANG: 'C.UTF-8', ...env }, maxBuffer: OUTPUT }).then(({ stdout }) => stdout);

function readConfig(file) {
  const config = parse(readFileSync(file, 'utf8'));
  for (const key of ['state_dir', 'secrets_dir', 'app', 'apps', 'approvers', 'projects']) if (!config?.[key]) throw new Error(`${file} has no ${key}`);
  for (const project of config.projects) {
    if (!/^[a-z][a-z0-9-]*$/.test(project.name ?? '') || !REPO.test(project.repo ?? '')) throw new Error(`${file}: a project needs a name like pilot and a repo like owner/name`);
  }
  return config;
}

// The clients of one project, with its installation token, and the mirror cloned when it is not there yet.
async function connect(config, project, { dryRun }) {
  const dir = join(config.state_dir, project.name);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const mirror = join(dir, 'mirror.git');
  const { token } = await installationToken({ appId: config.app.id, privateKey: readFileSync(config.app.key_file, 'utf8'), repo: project.repo });
  if (!existsSync(mirror)) await execute('git', ['clone', '--mirror', '--quiet', `https://github.com/${project.repo}.git`, mirror], gitAuthEnv(token));
  const git = (args, options = {}) => execute('git', ['--git-dir', mirror, ...args], options.env);
  const stateFile = join(dir, 'state.json');
  return {
    dir,
    token,
    git,
    stateFile,
    state: readState(existsSync(stateFile) ? readFileSync(stateFile, 'utf8') : ''),
    github: createGitHubClient({ repo: project.repo, token, write: !dryRun }),
    reader: createGitHubClient({ repo: project.repo, token }),
  };
}

// Written whole, then renamed over the old file, so a tick cut short never leaves half a record.
function saveState(file, state) {
  const temporary = `${file}.tmp`;
  writeFileSync(temporary, stateText(state), { mode: 0o600 });
  renameSync(temporary, file);
}

async function tickAll(config, { dryRun }) {
  const gates = readGates(join(kit, 'quality'));
  const mapping = readMapping(join(kit, 'tracker'));
  // The merge of a docs PR passes on the Epic's state (dev-workflow spec 2.4), read with the read-only Jira token.
  const docs = config.jira_token_file
    ? { jira: createJiraClient({ cloudId: mapping.cloud_id, authorization: bearerAuth(readFileSync(config.jira_token_file, 'utf8').trim()) }), passage: gatePassage(readContract(join(kit, 'contract')), mapping, gates.docs_pull_requests.gate) }
    : undefined;
  let failed = false;
  for (const project of config.projects) {
    const log = (line) => console.log(`${project.name}: ${line}`);
    try {
      const c = await connect(config, project, { dryRun });
      const urls = Object.fromEntries(Object.entries(project.hosts ?? {}).map(([env, host]) => [env, `https://${host}`]));
      const docker = (args, options = {}) => execute('docker', args, options.env);
      await tick({
        project: { ...project, urls },
        state: c.state,
        save: async (state) => saveState(c.stateFile, state),
        git: c.git,
        token: c.token,
        github: c.github,
        audit: ({ since, head, branch }) => auditRange({ git: c.git, github: c.reader, docs, since, head, branch, gates, apps: config.apps, approvers: config.approvers, space: project.space }),
        installer: createInstaller({ project: { ...project, urls }, git: c.git, docker, workDir: join(c.dir, 'work'), readSecrets: (env) => readFile(join(config.secrets_dir, project.name, `${env}.env`), 'utf8') }),
        approvers: config.approvers,
        log,
        dryRun,
      });
    } catch (error) {
      failed = true;
      log(`the tick stopped: ${error.message}`);
    }
  }
  if (failed) process.exitCode = 1;
}

async function baselineOne(config, name, { confirm }) {
  const project = config.projects.find((p) => p.name === name);
  if (!project) throw new Error(`no project ${name} in the configuration`);
  const c = await connect(config, project, { dryRun: !confirm });
  await c.git(['fetch', '--prune', '--quiet', 'origin'], { env: gitAuthEnv(c.token) });
  const heads = await readHeads(c.git);
  console.log(`${name}: develop ${heads.develop}`);
  console.log(`${name}: main ${heads.main}`);
  for (const [branch, sha] of Object.entries(heads.releases)) console.log(`${name}: ${branch} ${sha}`);
  if (!confirm) {
    console.log(`${name}: ${hasBaseline(c.state) ? 'has a baseline already; ' : ''}run again with --confirm to record these heads as audited`);
    return;
  }
  saveState(c.stateFile, baseline(c.state, heads));
  console.log(`${name}: baseline recorded; the deployer starts from the next commit of each branch`);
}

try {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { 'dry-run': { type: 'boolean', default: false }, confirm: { type: 'boolean', default: false }, config: { type: 'string', default: '/etc/ao/deployer.yaml' } } });
  const config = readConfig(values.config);
  const [command, name] = positionals;
  if (command === 'tick') await tickAll(config, { dryRun: values['dry-run'] });
  else if (command === 'baseline' && name) await baselineOne(config, name, { confirm: values.confirm });
  else throw new Error(USAGE);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
