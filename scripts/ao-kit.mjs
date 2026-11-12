// ao-kit (project-scaffold spec 2.2): sets a project up with the kit, from the clone of the kit on your machine. It is
// not copied into projects. Each command can run again: what is done already is skipped and said so.
// Usage: node <kit>/scripts/ao-kit.mjs <command> <project dir> [options]
//   init <dir>    an empty folder: the skeleton of --profile (next-nest), project.yaml, the kit, npm ci; a repo that has
//                 code: project.yaml from its workspaces and the kit, and what it still lacks. Options: --name --title
//                 --space --repo <owner/name> --approvers <a,b> --dev-app --dev-app-id --review-app --review-app-id
//                 --kit-peers <owner/name,...>; the App values default to AO_DEV_APP… of your environment
//   sync <dir>    the kit of this clone into the project, on a new branch feature/<KEY>-kit-copy from develop, in one
//                 commit; nothing is pushed. --key <KEY> of the Task; --name <project on the VPS> for a project from
//                 before project-scaffold
//   render <dir>  .claude/settings.json and the agents again, from project.yaml
//   check <dir>   project.yaml against its schema, deploy.yaml, package.json and the folders; writes nothing
//   setup github <dir>   the GitHub side, with your gh login: default branch, branch deletion, Dependabot, the four
//                 environments, JIRA_CI_TOKEN and AO_DEV_APP_KEY (--dev-app-key-file <path>), the ruleset check
//   setup jira <dir>     the space of project.yaml with the schemes of --template (DEMO), its board and filter, then
//                 jira:check; with JIRA_ADMIN_EMAIL and JIRA_ADMIN_CLASSIC_TOKEN. --space-name <name> (the project name)
// Exit: 0 when it did what it says, 1 when the project has a problem it names, 2 on a wrong command line.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { runNpm } from '../lib/quality/npm.mjs';
import { appCredentials, userVariable } from '../lib/quality/github-app.mjs';
import { initProject, syncKit } from '../lib/scaffold/init.mjs';
import { setupGithub } from '../lib/scaffold/setup-github.mjs';
import { setupJira } from '../lib/scaffold/setup-jira.mjs';
import { readMapping } from '../lib/tracker/mapping.mjs';
import { checkProject, PROJECT_FILE, readProjectConfig } from '../lib/scaffold/project-config.mjs';

const USAGE = 'usage: node <kit>/scripts/ao-kit.mjs <init|sync|render|check|setup github|setup jira> <project dir> [options]; see the top of scripts/ao-kit.mjs';
const kitDir = fileURLToPath(new URL('..', import.meta.url));

const git = (args, cwd) => spawnSync('git', args, { cwd, encoding: 'utf8' });
const gh = (args, { input } = {}) => spawnSync('gh', args, { encoding: 'utf8', input });
// A variable of your environment, else of your Windows user, as the hooks read them; its value is never printed.
const secret = (name) => process.env[name] || userVariable(name) || null;
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
// npm, npx and node with no shell; what installs shows its progress.
function run(argv, cwd) {
  const [tool, ...words] = argv;
  if (tool === 'node') return spawnSync(process.execPath, words, { cwd, encoding: 'utf8' });
  if (tool === 'npm') return runNpm(words, { cwd, stdio: 'inherit' });
  if (tool === 'npx') return runNpm(['exec', '--', ...words], { cwd, stdio: 'inherit' });
  throw new Error(`ao-kit runs npm, npx or node only, not ${tool}`);
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
      ? checkProject({ config, deployText: read('.ai-orchestrator/deploy.yaml'), packageJson: packageText ? JSON.parse(packageText) : null, exists: (path) => existsSync(join(dir, path)) })
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

const OPTIONS = {
  profile: { type: 'string' }, name: { type: 'string' }, title: { type: 'string' }, space: { type: 'string' }, repo: { type: 'string' }, approvers: { type: 'string' },
  'dev-app-key-file': { type: 'string' }, template: { type: 'string' }, 'space-name': { type: 'string' }, 'dev-app': { type: 'string' }, 'dev-app-id': { type: 'string' }, 'review-app': { type: 'string' }, 'review-app-id': { type: 'string' }, 'kit-peers': { type: 'string' }, key: { type: 'string' },
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
const options = { profile: v.profile, name: v.name, title: v.title, space: v.space, repo: v.repo, approvers: v.approvers, devApp: v['dev-app'], devAppId: v['dev-app-id'], reviewApp: v['review-app'], reviewAppId: v['review-app-id'], kitPeers: v['kit-peers'], key: v.key };
const COMMANDS = {
  check,
  render,
  init: (dir) => print(initProject({ kitDir, projectDir: dir, options, git, run })),
  sync: (dir) => print(syncKit({ kitDir, projectDir: dir, options, git, run })),
  'setup github': (dir) => {
    const config = projectConfig(dir);
    if (!config) return 1;
    return print(setupGithub({ kitDir, repo: config.github.repo, devAppKeyFile: v['dev-app-key-file'], secret, readFile: (path) => readFileSync(path, 'utf8'), gh, run }));
  },
  'setup jira': async (dir) => {
    const config = projectConfig(dir);
    if (!config) return 1;
    const [email, token] = [secret('JIRA_ADMIN_EMAIL'), secret('JIRA_ADMIN_CLASSIC_TOKEN')];
    if (!email || !token) return print({ ok: false, notes: ['Set JIRA_ADMIN_EMAIL and JIRA_ADMIN_CLASSIC_TOKEN, a classic API token of your Atlassian account, as user variables (docs/getting-started.md)'] });
    const mapping = readMapping(join(kitDir, 'tracker'));
    const auth = `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`;
    const jira = async (method, path, body) => {
      const res = await fetch(`https://${mapping.site}${path}`, { method, headers: { Authorization: auth, Accept: 'application/json', 'Accept-Language': 'en-US', ...(body && { 'Content-Type': 'application/json' }) }, body: body && JSON.stringify(body) });
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
