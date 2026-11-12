// The part of /ao-preview that acts on this machine (human-loop spec 4.3): what it reads before deciding, starting the
// apps of preview.yaml on the PR branch, and stopping them. Moved out of scripts/ao-step.mjs with every effect as a
// parameter, so its paths are tested without git, npm or processes (live-run-fixes spec 2.6).
import { connect } from 'node:net';
import { join } from 'node:path';
import { lockHash, needsInstall, PREVIEW_FILE, previewEnv, readPreviewConfig } from './preview.mjs';

// The files of a preview: the apps that run (active.json), and the lockfile installed last (state.json).
export function previewPaths(projectDir) {
  const dir = join(projectDir, '.ai', 'preview');
  return { dir, active: join(dir, 'active.json'), state: join(dir, 'state.json') };
}

// Whether something answers on the port, on IPv4 or IPv6.
export async function portBusy(port) {
  const tryHost = (host) => new Promise((done) => {
    const socket = connect({ host, port });
    const end = (busy) => {
      socket.destroy();
      done(busy);
    };
    socket.setTimeout(1000, () => end(false));
    socket.once('connect', () => end(true));
    socket.once('error', () => end(false));
  });
  return (await tryHost('127.0.0.1')) || (await tryHost('::1'));
}

// Whether the URL answers 2xx or 3xx within `ms`.
export async function answers(url, ms) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try {
      const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(5000) });
      if (res.status < 400) return true;
    } catch {
      // not up yet
    }
    await new Promise((done) => setTimeout(done, 2000));
  }
  return false;
}

// The effects, given by ao-step:
//   projectDir
//   git(...args)              git in the project folder: { status, stdout, stderr }
//   checkout({ branch, from, pull })   puts the folder on a branch, as before a run: { ok, reason }
//   npm(args, options)        runNpm of lib/quality/npm.mjs: { status, stderr, error }
//   spawn(file, args, options) starts one app apart from ao-step: { pid, unref() }
//   fs                        { existsSync, readFileSync, writeFileSync, rmSync, mkdirSync, openSync }
//   portBusy(port), answers(url, ms), killTree(pid), sleep(ms)
//   env, execPath, npmCli()   the environment and the node of ao-step, and the path of npm-cli.js or null
//   cleared                   the variables an agent run clears (CLEARED_ENV of lib/agents/launch.mjs)
//   agentRunning()            the live holder of the lock of the runs, other than this process, or null
//   now()
export function previewRunner({ projectDir, git, checkout, npm, spawn, fs, portBusy: busy, answers: answering, killTree, sleep, env, execPath, npmCli, cleared = [], agentRunning, now = Date.now }) {
  const paths = previewPaths(projectDir);
  const readJson = (file) => {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      return null;
    }
  };
  const at = () => new Date(now()).toISOString();
  const readLock = () => {
    const file = join(projectDir, 'package-lock.json');
    return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  };
  const install = () => npm(['ci', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: projectDir, env: previewEnv(env, cleared), encoding: 'utf8' });
  const installed = (lock) => fs.writeFileSync(paths.state, `${JSON.stringify({ lock: lockHash(lock), at: at() }, null, 2)}\n`);

  // What /ao-preview reads on this machine. `install` is a forecast from the head of the PR when git has it already;
  // start decides again once the folder is on the branch.
  async function facts(stopping, pr) {
    let config = null;
    let configError = null;
    if (fs.existsSync(join(projectDir, PREVIEW_FILE))) {
      try {
        config = readPreviewConfig(fs.readFileSync(join(projectDir, PREVIEW_FILE), 'utf8'));
      } catch (error) {
        configError = error.message;
      }
    }
    const dirty = git('status', '--porcelain', '--untracked-files=no').stdout.trim().split('\n').filter(Boolean).length;
    const taken = [];
    for (const { port } of config ?? []) if (await busy(port)) taken.push(port);
    const lock = pr?.headSha ? git('show', `${pr.headSha}:package-lock.json`) : null;
    return {
      stop: stopping,
      config,
      configError,
      active: readJson(paths.active),
      agentRunning: agentRunning(),
      dirty,
      busy: taken,
      install: lock?.status === 0 ? needsInstall(lock.stdout, readJson(paths.state)) : true,
    };
  }

  // /ao-preview <KEY> --go: the folder on the PR branch, the packages of its lockfile, then each app of preview.yaml in
  // order, apart from ao-step, with its log in .ai/preview/ and no secret in its environment. An app that does not
  // answer in 2 minutes stops them all and puts the folder back on develop.
  async function start({ key, number, branch, head: checked }) {
    const config = readPreviewConfig(fs.readFileSync(join(projectDir, PREVIEW_FILE), 'utf8'));
    const moved = checkout({ branch, pull: true });
    if (!moved.ok) {
      // The switch may have happened before the step that failed, such as a fast-forward: the folder goes back first.
      const on = git('branch', '--show-current').stdout.trim();
      const home = on === branch ? checkout({ branch: 'develop', pull: true }) : { ok: true };
      throw new Error(`${moved.reason}${on === branch ? (home.ok ? '; the folder is back on develop' : `; the folder stays on ${branch}: ${home.reason}`) : ''}`);
    }
    const head = git('rev-parse', 'HEAD').stdout.trim();
    // No secret of your session reaches code nobody reviewed (review of ao-sample PR #21).
    const appEnv = previewEnv(env, cleared);
    const notes = [`The project folder is on ${branch} at ${head.slice(0, 8)}.`];
    fs.mkdirSync(paths.dir, { recursive: true });
    const back = (reason) => {
      const home = checkout({ branch: 'develop', pull: true });
      return new Error(`${reason}${home.ok ? '; the folder is back on develop' : `; the folder stays on ${branch}: ${home.reason}`}`);
    };
    // The head decidePreview checked for protected paths and instruction files, or nothing runs (review of PR #21).
    if (checked && head !== checked) throw back(`${branch} is at ${head.slice(0, 8)}, not ${checked.slice(0, 8)}, the head that was checked: a push came in between. Run /ao-preview ${key} again`);
    const lock = readLock();
    if (needsInstall(lock, readJson(paths.state))) {
      const done = install();
      if (done.status !== 0) throw back(`npm ci failed: ${(done.stderr || done.error?.message || '').trim().slice(-500)}`);
      installed(lock);
      notes.push('Ran npm ci --ignore-scripts, since package-lock.json differs from the one installed before.');
    }
    const apps = [];
    const record = () => fs.writeFileSync(paths.active, `${JSON.stringify({ key, pr: number, branch, head, apps, startedAt: at() }, null, 2)}\n`);
    for (const app of config) {
      const log = fs.openSync(join(paths.dir, `${app.name}.log`), 'w');
      // npm or node and its words, with no shell: npm through npm-cli.js next to node, as runNpm does.
      const [tool, ...words] = app.argv;
      const cli = tool === 'npm' ? npmCli() : null;
      const [file, args] = tool === 'node' ? [execPath, words] : cli ? [execPath, [cli, ...words]] : ['npm', words];
      const child = spawn(file, args, { cwd: projectDir, env: { ...appEnv, ...app.env }, detached: true, windowsHide: true, stdio: ['ignore', log, log] });
      child.unref();
      apps.push({ name: app.name, url: app.url, port: app.port, pid: child.pid });
      record();
      if (!(await answering(app.url, 120000))) {
        await stopApps(apps);
        fs.rmSync(paths.active, { force: true });
        throw back(`${app.name} did not answer at ${app.url} within 2 minutes: read .ai/preview/${app.name}.log`);
      }
    }
    notes.push(...apps.map(({ name, url }) => `${name}: ${url}`), `Stop it with /ao-preview ${key} --stop: the apps stop and the folder goes back to develop. /ao-fix and /ao-review stop it too.`);
    return notes;
  }

  // Stops each app with its whole tree (lib/workflow/agent-process.mjs), then says which port still answers.
  async function stopApps(apps) {
    for (const { pid } of apps) killTree(pid);
    await sleep(3000);
    const still = [];
    for (const { name, port } of apps) if (await busy(port)) still.push(`${name} (port ${port})`);
    return still;
  }

  // /ao-preview <KEY> --stop, and the first step of a command that runs agents during a preview. The record of the
  // preview goes only once the folder is back on develop: otherwise it stays, with no app, so no command runs from the PR
  // branch (review of ao-sample PR #21). Back on develop, the packages of develop are installed again when the preview
  // installed those of the PR. Resolves { home, notes }.
  async function stop() {
    const active = readJson(paths.active);
    if (!active) return { home: true, notes: ['No preview runs.'] };
    const still = await stopApps(active.apps ?? []);
    const notes = [`Stopped the preview of ${active.key}: ${(active.apps ?? []).map(({ name }) => name).join(', ') || 'no app ran'}.${still.length > 0 ? ` Still answering: ${still.join(', ')}; stop it yourself.` : ''}`];
    const home = checkout({ branch: 'develop', pull: true });
    if (!home.ok) {
      fs.writeFileSync(paths.active, `${JSON.stringify({ ...active, apps: [], stoppedAt: at() }, null, 2)}\n`);
      return { home: false, notes: [...notes, `The project folder stays on ${active.branch}: ${home.reason}`] };
    }
    fs.rmSync(paths.active, { force: true });
    notes.push('The project folder is back on develop.');
    const lock = readLock();
    if (needsInstall(lock, readJson(paths.state))) {
      const done = install();
      if (done.status === 0) {
        installed(lock);
        notes.push('Ran npm ci --ignore-scripts again, for the packages of develop.');
      } else notes.push(`npm ci for develop failed: ${(done.stderr || done.error?.message || '').trim().slice(-300)}. Run npm ci yourself before a test or a build.`);
    }
    return { home: true, notes };
  }

  return { paths, facts, start, stop };
}
