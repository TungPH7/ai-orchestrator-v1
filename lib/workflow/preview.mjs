// The pure part of /ao-preview (human-loop spec 4.3): the project's .ai-orchestrator/preview.yaml, which apps to start
// and where they answer, whether the packages must be installed again, and the files of a preview that runs. ao-step
// starts and stops the processes.
import { createHash } from 'node:crypto';
import { parse } from 'yaml';
import { matchesGlob } from '../quality/glob.mjs';
import { isSteeringPath } from './review-tree.mjs';

export const PREVIEW_FILE = '.ai-orchestrator/preview.yaml';
// What /ao-preview prints when the project has no preview.yaml: the apps of ao-sample, as an example.
export const PREVIEW_SAMPLE = `# The apps /ao-preview starts, in order. B1 moves this into the project's config.
apps:
  api:
    command: npm run start:dev -w apps/api
    url: http://localhost:3001/health
  web:
    command: npm run dev -w apps/web
    url: http://localhost:3000/
    env: { API_URL: "http://localhost:3001" }`;

const NAME = /^[a-z][a-z0-9-]*$/;
const LOCAL = new Set(['localhost', '127.0.0.1']);
// A command runs with no shell (Semgrep's spawn-shell-true, found by the sast job of ao-sample PR #21): npm or node, then
// words split on spaces. Quotes, pipes, redirections and variables would need a shell, so they are refused.
const TOOLS = ['npm', 'node'];
const SHELL_CHARS = /["'`$|&;<>(){}*?\\]/;

// Why a command cannot start an app with no shell, or null: one line, npm or node, then plain words. project.yaml uses
// it for the dev command of each app (project-scaffold spec 2.1).
export function commandProblem(command) {
  if (typeof command !== 'string' || command.trim() === '' || /[\r\n]/.test(command)) return 'one line, the command that starts the app';
  const [tool] = command.trim().split(/\s+/);
  if (!TOOLS.includes(tool) || SHELL_CHARS.test(command)) return 'npm or node and plain words, run with no shell, such as npm run dev -w apps/web';
  return null;
}

// The apps of preview.yaml, in order: [{ name, command, argv, url, port, env }]. Throws with every problem when the file
// is wrong. A command is npm or node and its words, which ao-step runs with no shell; a URL is on this machine, with
// its port.
export function readPreviewConfig(text) {
  let data;
  try {
    data = parse(text);
  } catch (error) {
    throw new Error(`${PREVIEW_FILE} is not YAML: ${error.message.split('\n')[0]}`);
  }
  const problems = [];
  const apps = Object.entries(data?.apps ?? {});
  if (apps.length === 0) problems.push('it lists no app under apps');
  const read = apps.map(([name, app]) => {
    const where = `apps.${name}`;
    if (!NAME.test(name)) problems.push(`${where}: a name is lower-case letters, digits and hyphens`);
    const argv = typeof app?.command === 'string' ? app.command.trim().split(/\s+/) : [];
    const wrong = commandProblem(app?.command);
    if (wrong) problems.push(`${where}.command: ${wrong}`);
    let url = null;
    try {
      url = new URL(app?.url);
    } catch {
      problems.push(`${where}.url: the URL where the app answers when it is up, such as http://localhost:3000/`);
    }
    if (url && (!['http:', 'https:'].includes(url.protocol) || !LOCAL.has(url.hostname) || !url.port)) problems.push(`${where}.url: http://localhost with a port, not ${app.url}`);
    const env = app?.env ?? {};
    if (typeof env !== 'object' || Array.isArray(env) || Object.values(env).some((value) => typeof value !== 'string')) problems.push(`${where}.env: names and text values`);
    return { name, command: app?.command, argv, url: app?.url, port: url ? Number(url.port) : null, env };
  });
  if (problems.length > 0) throw new Error(`${PREVIEW_FILE}: ${problems.join('; ')}`);
  return read;
}

// The environment of the apps of a preview, which run code nobody reviewed (review of ao-sample PR #21): without the
// variables an agent run clears (`cleared`, lib/agents/launch.mjs), and without any whose name says it holds a secret,
// such as ATLASSIAN_AGENT_TOKEN, GH_TOKEN, AO_DEV_APP_KEY_FILE or a password.
const SECRET_NAME = /TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL|PRIVATE|_KEY$|_KEY_FILE$|^ATLASSIAN_|^AO_ENV_AUTH$/i;
export function previewEnv(env, cleared = []) {
  return Object.fromEntries(Object.entries(env).filter(([name]) => !cleared.includes(name) && !SECRET_NAME.test(name)));
}

// The hash of a package-lock.json, to know whether the packages installed are those of the head.
export const lockHash = (text) => createHash('sha256').update(text ?? '').digest('hex');

// Whether npm ci must run: the lockfile of the head differs from the one installed last, or none is on record.
export const needsInstall = (lockText, state) => !state?.lock || state.lock !== lockHash(lockText);

// Whether a path of a PR keeps it from a preview: it steers a session in the project folder (review-tree.mjs), or it
// is under a protected path (`globs`, from quality/gates.yaml) in any case, since Windows writes .Claude/ into .claude/
// (review of ao-sample PR #21; live-run-fixes spec 2.7).
export const steersPreview = (path, globs = []) => isSteeringPath(path) || globs.some((glob) => matchesGlob(glob, path, { ignoreCase: true }));

// Up to 8 paths by name, then how many more: a branch from before a kit copy differs in 54 such files (T11 of
// live-run-fixes).
const MAX_NAMED = 8;
export const namePaths = (paths) => (paths.length <= MAX_NAMED ? paths.join(', ') : `${paths.slice(0, MAX_NAMED).join(', ')} and ${paths.length - MAX_NAMED} more`);

// Why a preview does not run a PR that changes such paths.
export const steeringReason = (number, paths) =>
  `PR #${number} changes ${namePaths(paths)}, which steer the kit and the agents: during a preview every /ao-* command, and your own session, would load them. Read those changes in the diff instead`;
