// Runs one git command in a project checkout as the devops agent would (dev-workflow spec 2.3; release-workflow plan
// decision 6): author and committer are the ao-dev bot, and git gets its push token from the kit's credential helper for
// the role devops. No token reaches the command line. Usage: node bot-git.mjs <kit> <project> <git args...>
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [kit, project, ...args] = process.argv.slice(2);
const imp = (p) => import(pathToFileURL(join(kit, p)).href);
const { appCredentials, botIdentity, installationToken } = await imp('lib/quality/github-app.mjs');
const { credentialHelper, READ_PERMISSIONS, CLEARED_ENV } = await imp('lib/agents/launch.mjs');

const settings = JSON.parse(readFileSync(join(project, '.claude', 'settings.json'), 'utf8')).env ?? {};
const apps = Object.fromEntries(['AO_DEV_APP', 'AO_DEV_APP_ID', 'AO_REVIEW_APP', 'AO_REVIEW_APP_ID'].map((name) => [name, settings[name]]));
const env = { ...process.env, ...apps, AO_KIT_DIR: kit };
for (const name of CLEARED_ENV) delete env[name];
const repo = 'TungPH7/ao-pilot';
const { token } = await installationToken({ ...appCredentials('review', { env }), repo, permissions: READ_PERMISSIONS });
const bot = await botIdentity({ slug: apps.AO_DEV_APP, token });
const config = [
  ['credential.helper', ''],
  ['credential.helper', `!${credentialHelper(kit)} devops ${repo}`],
  ['credential.useHttpPath', 'true'],
  ['user.name', bot.name],
  ['user.email', bot.email],
];
Object.assign(env, {
  GIT_TERMINAL_PROMPT: '0',
  GIT_CONFIG_COUNT: String(config.length),
  ...Object.fromEntries(config.flatMap(([key, value], n) => [[`GIT_CONFIG_KEY_${n}`, key], [`GIT_CONFIG_VALUE_${n}`, value]])),
});
const result = spawnSync('git', args, { cwd: project, env, stdio: 'inherit' });
process.exit(result.status ?? 1);
