// ao-kit (project-scaffold spec 2.2): sets a project up with the kit, from the clone of the kit on your machine. It is
// not copied into projects. Each command can run again: what is done already is skipped and said so.
// Usage: node <kit>/scripts/ao-kit.mjs <command> <project dir> [options]
//   init <dir>    an empty folder: the skeleton of --profile (next-nest), project.yaml, the kit, npm ci; with
//                 --package-manager pnpm, the root of a pnpm project (base-pnpm) and no app yet; a repo that has
//                 code: project.yaml from its workspaces and the kit, and what it still lacks. Options: --name --title
//                 --space --repo <owner/name> --approvers <a,b> --dev-app --dev-app-id --review-app --review-app-id
//                 --kit-peers <owner/name,...>; the App values default to AO_DEV_APP… of your environment
//   add <dir> <app>   one app more in a pnpm project: --stack nextjs|react|spring-boot, its skeleton (not spring-boot), or --from <template>
//                 (--ref <branch or tag>, its HEAD otherwise) with what the kit replaces left out (--exclude <path>, again for each path); --public; then pnpm install,
//                 the render, and what the code of the app still has to change
//   sync <dir>    the kit of this clone into the project, on a new branch feature/<KEY>-kit-copy from develop, in one
//                 commit; nothing is pushed. --key <KEY> of the Task; --name <project on the VPS> for a project from
//                 before project-scaffold
//   render <dir>  .claude/settings.json and the agents again, from project.yaml
//   check <dir>   project.yaml against its schema, deploy.yaml, package.json and the folders; writes nothing
//   setup github <dir>   the GitHub side, with your gh login: default branch, branch deletion, Dependabot, the four
//                 environments, JIRA_CI_TOKEN and AO_DEV_APP_KEY (--dev-app-key-file <path>), the ruleset check
//   doctor <dir>  what the project still lacks, on this machine, in the repo, on GitHub, on Jira and in Claude Code, row
//                 by row with what to do; reads only, and prints no secret
//   setup jira <dir>     the space of project.yaml with the schemes of --template (DEMO), its board and filter, then
//                 jira:check; with JIRA_ADMIN_EMAIL and JIRA_ADMIN_CLASSIC_TOKEN. --space-name <name> (the project name)
// Exit: 0 when it did what it says, 1 when the project has a problem it names, 2 on a wrong command line.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { DOCKER_INFO, dockerAnswered, findJdk, javaVersionOf } from '../lib/quality/maven.mjs';
import { runNpm } from '../lib/quality/npm.mjs';
import { managerOf, pnpmVersion, runManager } from '../lib/quality/package-manager.mjs';
import { homedir } from 'node:os';
import { appCredentials, installationToken, userSecret } from '../lib/quality/github-app.mjs';
import { pulledCopyAges } from '../lib/release/backup-pull.mjs';
import { doctor, formatDoctor } from '../lib/scaffold/doctor.mjs';
import { gitignoreMissing, kitDrift } from '../lib/scaffold/install.mjs';
import { addApp } from '../lib/scaffold/add.mjs';
import { initProject, syncKit } from '../lib/scaffold/init.mjs';
import { setupGithub } from '../lib/scaffold/setup-github.mjs';
import { setupJira } from '../lib/scaffold/setup-jira.mjs';
import { readMapping } from '../lib/tracker/mapping.mjs';
import { checkProject, PROJECT_FILE, readProjectConfig } from '../lib/scaffold/project-config.mjs';

const USAGE = 'usage: node <kit>/scripts/ao-kit.mjs <init|add|sync|render|check|doctor|setup github|setup jira> <project dir> [options]; see the top of scripts/ao-kit.mjs';
const kitDir = fileURLToPath(new URL('..', import.meta.url));

const git = (args, cwd) => spawnSync('git', args, { cwd, encoding: 'utf8' });
const gh = (args, { input } = {}) => spawnSync('gh', args, { encoding: 'utf8', input });
// A token or password of yours: your Windows user variable first, else the environment (Pilot 3, T2); never printed.
const secret = (name) => userSecret(name) ?? null;
// The project.yaml of a project, read and valid, or null after printing why.
function projectConfig(dir) {
  const file = join(dir, PROJECT_FILE);
  if (!existsSync(file)) {
    console.log(`no ${PROJECT_FILE} in ${dir}: run ao-kit init first`);
    return null;
  }
  const { config, errors } = readProjectConfig(readFileSync(file, 'utf8'));
  for (const { rule, path, message } of errors) console.log(`${rule} ${path}: ${message}`);
  return errors.length > 0 ? null : config;
}
// npm, npx, pnpm and node with no shell; what installs shows its progress.
function run(argv, cwd) {
  const [tool, ...words] = argv;
  if (tool === 'node') return spawnSync(process.execPath, words, { cwd, encoding: 'utf8' });
  if (tool === 'npm') return runNpm(words, { cwd, stdio: 'inherit' });
  if (tool === 'npx') return runNpm(['exec', '--', ...words], { cwd, stdio: 'inherit' });
  if (tool === 'pnpm') return runManager('pnpm', words, { cwd, stdio: 'inherit' });
  throw new Error(`ao-kit runs npm, npx, pnpm or node only, not ${tool}`);
}
const print = ({ ok, notes }) => {
  for (const note of notes) console.log(`- ${note}`);
  return ok ? 0 : 1;
};

function check(dir) {
  const file = join(dir, PROJECT_FILE);
  if (!existsSync(file)) {
    console.log(`no ${PROJECT_FILE} in ${dir}: write it as SPEC-project-scaffold.md 2.1 shows`);
    return 1;
  }
  const { config, errors } = readProjectConfig(readFileSync(file, 'utf8'));
  const read = (path) => (existsSync(join(dir, path)) ? readFileSync(join(dir, path), 'utf8') : null);
  const packageText = read('package.json');
  const problems = [
    ...errors,
    ...(config && errors.length === 0
      ? checkProject({ config, deployText: read('.ai-orchestrator/deploy.yaml'), packageJson: packageText ? JSON.parse(packageText) : null, workspaceText: read('pnpm-workspace.yaml'), exists: (path) => existsSync(join(dir, path)) })
      : []),
  ];
  for (const { rule, path, message } of problems) console.log(`${rule} ${path}: ${message}`);
  if (problems.length > 0) return 1;
  const apps = Object.keys(config.apps);
  console.log(`project.yaml OK: ${apps.length} app${apps.length === 1 ? '' : 's'} (${apps.join(', ')}), space ${config.jira.space}, repo ${config.github.repo}`);
  return 0;
}

function render(dir) {
  const done = run(['node', '.ai-orchestrator/scripts/render-agents.mjs', '--project', '.'], dir);
  process.stdout.write(done.stdout ?? '');
  process.stderr.write(done.stderr ?? '');
  return done.status === 0 ? 0 : 1;
}

// The facts of ao-kit doctor, read on this machine, from GitHub with your gh login, from the two Apps, and from Jira
// with jira:check. Reading only; a secret is passed on as a value to judge, never printed.
async function doctorFacts(dir, config) {
  // The pnpm a command runs in the project folder: corepack gives the version of packageManager there.
  const pnpmOnMachine = () => {
    if (managerOf(config) !== 'pnpm') return null;
    const done = runManager('pnpm', ['--version'], { cwd: dir, encoding: 'utf8' });
    return done.status === 0 ? done.stdout.trim() : null;
  };
  const version = (tool, args) => {
    // claude may be a .cmd on Windows, which starts only through a shell: whether it is on the PATH is enough.
    const done = tool === 'git' ? git(args, dir) : tool === 'claude' ? spawnSync(process.platform === 'win32' ? 'where' : 'which', ['claude'], { encoding: 'utf8' }) : spawnSync(tool, args, { encoding: 'utf8' });
    return done.status === 0 ? done.stdout.trim() : null;
  };
  const names = ['ATLASSIAN_AGENT_TOKEN', 'JIRA_CI_TOKEN', 'AO_ENV_AUTH', 'AO_DEV_APP_KEY_FILE', 'AO_REVIEW_APP_KEY_FILE'];
  const env = Object.fromEntries(names.map((name) => [name, secret(name) ?? undefined]));
  const files = new Set(['AO_DEV_APP_KEY_FILE', 'AO_REVIEW_APP_KEY_FILE'].map((name) => env[name]).filter((path) => path && existsSync(path)));
  const projectFile = readFileSync(join(dir, PROJECT_FILE), 'utf8');
  const { errors } = readProjectConfig(projectFile);
  const read = (path) => (existsSync(join(dir, path)) ? readFileSync(join(dir, path), 'utf8') : null);
  const problems = errors.length > 0 ? errors : checkProject({ config, deployText: read('.ai-orchestrator/deploy.yaml'), packageJson: read('package.json') ? JSON.parse(read('package.json')) : null, workspaceText: read('pnpm-workspace.yaml'), exists: (path) => existsSync(join(dir, path)) });
  const render = run(['node', '.ai-orchestrator/scripts/render-agents.mjs', '--check', '--project', '.'], dir);
  const repo = config.github.repo;
  const ghJson = (args) => {
    const done = gh(args);
    try {
      return done.status === 0 ? JSON.parse(done.stdout || 'null') : null;
    } catch {
      return null;
    }
  };
  const repoInfo = ghJson(['api', `repos/${repo}`]);
  const app = async (kind) => {
    const appEnv = { ...process.env, [`AO_${kind.toUpperCase()}_APP`]: config.github.apps[kind], [`AO_${kind.toUpperCase()}_APP_ID`]: String(config.github.apps[`${kind}_id`]) };
    try {
      await installationToken({ ...appCredentials(kind, { env: appEnv }), repo, permissions: { metadata: 'read' } });
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: error.message.split('\n')[0].slice(0, 200) };
    }
  };
  // jira-check reads the contract of the kit from the folder it runs in.
  const jiraCheck = run(['node', join(kitDir, 'scripts', 'jira-check.mjs'), '--space', config.jira.space], kitDir);
  let trusted = null;
  try {
    const projects = JSON.parse(readFileSync(join(homedir(), '.claude.json'), 'utf8')).projects ?? {};
    trusted = projects[dir.replaceAll('\\', '/')]?.hasTrustDialogAccepted === true;
  } catch {
    trusted = false;
  }
  const local = read('.claude/settings.local.json');
  const localSettings = local ? JSON.parse(local) : {};
  // project-scaffold part 3, spec 2.2: the JDK each Java app asks for, found as mvnw.mjs finds it; Docker only then.
  const java = Object.entries(config.apps ?? {}).filter(([, app]) => app.profile === 'spring-boot').map(([app, spec]) => {
    const pom = read(`${spec.path}/pom.xml`);
    const want = pom ? javaVersionOf(pom) : null;
    return { app, want: want ?? '?', jdk: want ? findJdk({ want, readFile: (file) => readFileSync(file, 'utf8'), listDir: (folder) => readdirSync(folder) }) : null };
  });
  const docker = java.length > 0 ? { running: dockerAnswered(spawnSync('docker', DOCKER_INFO, { encoding: 'utf8', timeout: 20000 })) } : null;
  return {
    config,
    java,
    docker,
    projectProblems: problems.map(({ rule, path, message }) => `${rule} ${path}: ${message}`),
    nodeVersion: process.versions.node,
    versions: { gh: version('gh', ['--version']), claude: version('claude', ['--version']), git: version('git', ['--version']), pnpm: pnpmOnMachine() },
    pnpmWanted: pnpmVersion(read('package.json') ? JSON.parse(read('package.json')) : null),
    env,
    files,
    kitDrift: kitDrift({ kitDir, projectDir: dir }),
    renderCheck: { status: render.status, text: `${render.stdout ?? ''}${render.stderr ?? ''}`.trim() },
    hooksPath: git(['config', 'core.hooksPath'], dir).stdout.trim(),
    gitignoreMissing: gitignoreMissing(dir),
    now: new Date().toISOString(),
    // The backup copies this machine pulls, or null when it does not (Pilot 3, spec 2.4).
    backupCopies: pulledCopyAges(),
    github: {
      defaultBranch: repoInfo?.default_branch ?? null,
      public: repoInfo?.private === false,
      // {} when no limit runs.
      interactionLimit: ghJson(['api', `repos/${repo}/interaction-limits`]),
      environments: (ghJson(['api', `repos/${repo}/environments`])?.environments ?? []).map(({ name }) => name),
      secrets: (ghJson(['secret', 'list', '--repo', repo, '--json', 'name']) ?? []).map(({ name }) => name),
      envSecrets: (ghJson(['secret', 'list', '--env', 'merge-gate', '--repo', repo, '--json', 'name']) ?? []).map(({ name }) => name),
      workflows: ghJson(['api', `repos/${repo}/actions/workflows`])?.total_count ?? 0,
      ciRuns: (ghJson(['run', 'list', '--repo', repo, '--workflow', 'CI', '--branch', 'develop', '--limit', '1', '--json', 'databaseId']) ?? []).length,
    },
    apps: { dev: await app('dev'), review: await app('review') },
    jiraCheck: { status: jiraCheck.status, text: `${jiraCheck.stdout ?? ''}${jiraCheck.stderr ?? ''}`.trim() },
    claude: { trusted, mcp: localSettings.enableAllProjectMcpServers ? ['atlassian', 'chrome-devtools'] : (localSettings.enabledMcpjsonServers ?? []) },
  };
}

const OPTIONS = {
  profile: { type: 'string' }, 'package-manager': { type: 'string' }, name: { type: 'string' }, title: { type: 'string' }, space: { type: 'string' }, repo: { type: 'string' }, approvers: { type: 'string' },
  'dev-app-key-file': { type: 'string' }, template: { type: 'string' }, 'space-name': { type: 'string' }, 'dev-app': { type: 'string' }, 'dev-app-id': { type: 'string' }, 'review-app': { type: 'string' }, 'review-app-id': { type: 'string' }, 'kit-peers': { type: 'string' }, key: { type: 'string' },
  stack: { type: 'string' }, from: { type: 'string' }, ref: { type: 'string' }, exclude: { type: 'string', multiple: true }, public: { type: 'boolean' },
};
let parsed;
try {
  parsed = parseArgs({ allowPositionals: true, options: OPTIONS });
} catch (error) {
  console.error(`${error.message}\n${USAGE}`);
  process.exit(2);
}
// setup takes a part first: ao-kit setup github <dir>.
const [first, ...rest] = parsed.positionals;
const command = first === 'setup' ? `setup ${rest.shift() ?? ''}` : first;
const [dirArg] = rest;
const v = parsed.values;
const options = { profile: v.profile, packageManager: v['package-manager'], name: v.name, title: v.title, space: v.space, repo: v.repo, approvers: v.approvers, devApp: v['dev-app'], devAppId: v['dev-app-id'], reviewApp: v['review-app'], reviewAppId: v['review-app-id'], kitPeers: v['kit-peers'], key: v.key };
const COMMANDS = {
  check,
  render,
  init: (dir) => print(initProject({ kitDir, projectDir: dir, options, git, run })),
  add: (dir) => print(addApp({ kitDir, projectDir: dir, app: rest[1], options: { stack: v.stack, from: v.from, ref: v.ref, exclude: v.exclude ?? [], public: v.public === true, title: v.title }, git, run })),
  sync: (dir) => print(syncKit({ kitDir, projectDir: dir, options, git, run })),
  'setup github': (dir) => {
    const config = projectConfig(dir);
    if (!config) return 1;
    return print(setupGithub({ kitDir, repo: config.github.repo, devAppKeyFile: v['dev-app-key-file'], secret, readFile: (path) => readFileSync(path, 'utf8'), gh, run }));
  },
  doctor: async (dir) => {
    const config = projectConfig(dir);
    if (!config) return 1;
    const rows = doctor(await doctorFacts(dir, config));
    console.log(formatDoctor(rows));
    return rows.some(({ ok }) => ok === false) ? 1 : 0;
  },
  'setup jira': async (dir) => {
    const config = projectConfig(dir);
    if (!config) return 1;
    const [email, token] = [secret('JIRA_ADMIN_EMAIL'), secret('JIRA_ADMIN_CLASSIC_TOKEN')];
    if (!email || !token) return print({ ok: false, notes: ['Set JIRA_ADMIN_EMAIL and JIRA_ADMIN_CLASSIC_TOKEN, a classic API token of your Atlassian account, as user variables (docs/getting-started.md)'] });
    const mapping = readMapping(join(kitDir, 'tracker'));
    const auth = `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`;
    // A call that hangs ends after 30 s, and setupJira reports it as a network error (project-scaffold part 3, 2.6).
    const jira = async (method, path, body) => {
      const res = await fetch(`https://${mapping.site}${path}`, { method, headers: { Authorization: auth, Accept: 'application/json', 'Accept-Language': 'en-US', ...(body && { 'Content-Type': 'application/json' }) }, body: body && JSON.stringify(body), signal: AbortSignal.timeout(30_000) });
      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }
      return { status: res.status, json };
    };
    return print(await setupJira({ kitDir, space: config.jira.space, name: v['space-name'] ?? config.name, template: v.template ?? 'DEMO', mapping, jira, run }));
  },
};
if (!COMMANDS[command] || !dirArg) {
  console.error(USAGE);
  process.exit(2);
}
const dir = resolve(dirArg);
if (!existsSync(dir)) {
  console.error(`${dir} does not exist: make the folder first`);
  process.exit(2);
}
process.exitCode = await COMMANDS[command](dir);
