// The design inbox of an item (tasks/todo.md item 10), for /ao-design in the main session. Run from the project root.
//
//   node .ai-orchestrator/scripts/design-inbox.mjs add <KEY> <folder> --url <artifact link> --version <v> [--title <t>]
//       takes the source files of a Claude artifact the Artifact tool saved in <folder> (project/canvas.json,
//       project/*.dc.html, tokens, README) into .ai/design-inbox/<KEY>/<artifact id>/, and records them in inbox.yaml
//   node .ai-orchestrator/scripts/design-inbox.mjs render <KEY>
//       draws each artboard of each Design with no script, at its width and at 390 px, into .ai/design-inbox/<KEY>/shots/
//   node .ai-orchestrator/scripts/design-inbox.mjs check <KEY> [--link <url>]...
//       prints the screens of the inbox and what is wrong with it; exits 1 when something is
//   node .ai-orchestrator/scripts/design-inbox.mjs codes [--prefix USR --area CART]
//       prints the registry of screen codes and the next free code of an area
import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { INBOX_FILE, artifactId, inboxEntry, inboxProblems, keptFile, readInbox, readableArtboard, stripCanvas, withEntry, writeInbox } from '../lib/quality/design-inbox.mjs';
import { imageInfo } from '../lib/quality/design.mjs';
import { REGISTRY_FILE, codeKind, codeParts, nextCode, readRegistry } from '../lib/quality/screen-codes.mjs';

const PLAYWRIGHT = '@playwright/cli@0.1.22';
const MOBILE = { width: 390, height: 844 };
const MAX_SIDE = 2000;
const KEY = /^[A-Z][A-Z0-9]*-\d+$/;
const project = process.cwd();
const [command, ...rest] = process.argv.slice(2);

const options = (args) => {
  const named = {};
  const plain = [];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i].startsWith('--')) (named[args[i].slice(2)] ??= []).push(args[i + 1]), (i += 1);
    else plain.push(args[i]);
  }
  return { named, plain };
};
const fail = (message) => {
  console.error(`design-inbox: ${message}`);
  process.exit(1);
};
const inboxDir = (key) => {
  if (!KEY.test(key ?? '')) fail(`'${key ?? ''}' is not a Jira key such as SHOP-120`);
  return join(project, '.ai', 'design-inbox', key);
};
const readInboxOf = (dir) => (existsSync(join(dir, INBOX_FILE)) ? readInbox(readFileSync(join(dir, INBOX_FILE), 'utf8')) : null);
const registry = () => (existsSync(join(project, REGISTRY_FILE)) ? readRegistry(readFileSync(join(project, REGISTRY_FILE), 'utf8')) : null);

// Every file under a folder, as a path with / relative to it.
function walk(root, dir = root) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const at = join(dir, entry.name);
    if (entry.isSymbolicLink()) return [];
    return entry.isDirectory() ? walk(root, at) : [relative(root, at).split(sep).join('/')];
  });
}

function add([key, folder, ...more]) {
  const dir = inboxDir(key);
  const { named } = options(more);
  const url = named.url?.[0];
  if (!url || !folder) fail('usage: add <KEY> <folder> --url <artifact link> --version <v> [--title <t>]');
  if (!existsSync(folder)) fail(`${folder} does not exist`);
  const all = walk(resolve(folder));
  const kept = all.filter(keptFile);
  const left = all.filter((path) => !keptFile(path) && path.startsWith('project/'));
  const files = kept.map((path) => ({ path, bytes: readFileSync(join(folder, path)) }));
  const entry = inboxEntry({ url, version: named.version?.[0] ?? null, title: named.title?.[0] ?? null, files });
  if (entry.kind === 'unknown') fail(`${folder} holds no project/canvas.json and no project/tokens.json: it is not a Design or a Design System of Claude`);
  const target = join(dir, artifactId(url));
  for (const { path, bytes } of files) {
    mkdirSync(dirname(join(target, path)), { recursive: true });
    writeFileSync(join(target, path), bytes);
  }
  const inbox = withEntry(readInboxOf(dir) ?? { key, sources: [] }, entry);
  writeFileSync(join(dir, INBOX_FILE), writeInbox(inbox));
  console.log(`Added ${url} (${entry.kind}, version ${entry.version ?? 'unknown'}) to .ai/design-inbox/${key}/: ${files.length} file${files.length === 1 ? '' : 's'}`);
  if (left.length > 0) console.log(`Left out ${left.length} file${left.length === 1 ? '' : 's'} the inbox does not keep: ${left.join(', ')}`);
  for (const screen of entry.screens ?? []) console.log(`  ${screen.code}${screen.variant ? `-${screen.variant}` : ''} · ${screen.name} (${screen.file})`);
}

// Serves only the render folder, on 127.0.0.1, while the browser draws.
function serve(root) {
  const server = createServer((req, res) => {
    const name = decodeURIComponent(new URL(req.url, 'http://local').pathname).replace(/^\/+/, '');
    const path = resolve(root, name);
    if (!path.startsWith(resolve(root) + sep) || !existsSync(path)) return res.writeHead(404).end();
    res.writeHead(200, { 'content-type': path.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' }).end(readFileSync(path));
  });
  return new Promise((done) => server.listen(0, '127.0.0.1', () => done(server)));
}

// npx with no shell, so no argument is read by one (an `eval` with `=>` once wrote a file named after the expression):
// the npx of the npm next to node, as on Windows, where a .cmd needs a shell; else npx on the PATH.
const NPX_CLI = join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js');
const [NPX, NPX_ARGS] = existsSync(NPX_CLI) ? [process.execPath, [NPX_CLI]] : ['npx', []];
function cli(args, cwd) {
  return new Promise((done) => {
    const child = spawn(NPX, [...NPX_ARGS, '-y', PLAYWRIGHT, '-s=ao-design', ...args], { cwd, shell: false });
    let out = '';
    child.stdout.on('data', (chunk) => (out += chunk));
    child.stderr.on('data', (chunk) => (out += chunk));
    child.on('close', (code) => done({ code, out }));
  });
}

async function shoot(page, width, height, file, cwd) {
  await cli(['resize', String(width), String(height)], cwd);
  const measured = Number((await cli(['eval', '() => document.documentElement.scrollHeight'], cwd)).out.match(/### Result\s+(\d+)/)?.[1]);
  const full = Number.isFinite(measured) && measured > 0 ? measured : height;
  await cli(['resize', String(width), String(Math.min(full, MAX_SIDE))], cwd);
  const shot = await cli(['screenshot', '--filename', file], cwd);
  if (!existsSync(join(cwd, file))) throw new Error(`no image for ${page}: ${shot.out.split('\n').slice(0, 3).join(' ')}`);
  return { cut: full > MAX_SIDE, full };
}

async function render([key]) {
  const dir = inboxDir(key);
  const inbox = readInboxOf(dir);
  if (!inbox) fail(`.ai/design-inbox/${key}/${INBOX_FILE} does not exist: add an artifact first`);
  const pages = join(dir, 'render');
  mkdirSync(pages, { recursive: true });
  mkdirSync(join(dir, 'shots'), { recursive: true });
  const server = await serve(pages);
  const base = `http://127.0.0.1:${server.address().port}`;
  const report = [];
  try {
    for (const source of inbox.sources.filter(({ kind }) => kind === 'claude-design')) {
      for (const screen of source.screens ?? []) {
        const id = `${screen.code}${screen.variant ? `-${screen.variant}` : ''}`;
        if (!readableArtboard(source.dir, screen.file) || codeKind(screen.code) !== 'project' || (screen.variant !== null && screen.variant !== undefined && !/^[a-z][a-z0-9-]*$/.test(String(screen.variant)))) {
          report.push(`${id}: ${source.dir}/${screen.file} is not an artboard add wrote; inbox.yaml changed by hand? Take the artifact again with add`);
          continue;
        }
        const { html, dynamic, problem } = stripCanvas(readFileSync(join(dir, source.dir, screen.file), 'utf8'));
        if (!html || dynamic) {
          report.push(`${id}: ${problem ?? 'it binds values or imports another artboard, which only Claude Design draws'}; put a screenshot of it in .ai/design-inbox/${key}/`);
          continue;
        }
        writeFileSync(join(pages, `${id}.html`), html);
        await cli(['open', `${base}/${id}.html`], dir);
        const sizes = screen.variant === 'mobile' || (screen.width && screen.width <= 480) ? [['mobile', MOBILE.width, MOBILE.height]] : [['desktop', screen.width || 1440, screen.height || 900], ['mobile', MOBILE.width, MOBILE.height]];
        screen.shots = [];
        for (const [size, width, height] of sizes) {
          const file = `shots/${id}${screen.variant === 'mobile' ? '' : `-${size}`}.png`;
          const { cut, full } = await shoot(id, width, height, file, dir);
          const info = imageInfo(readFileSync(join(dir, file)));
          screen.shots.push(file);
          report.push(`${id} ${size}: ${file}, ${info.width}×${info.height} px, ${Math.round(info.size / 1024)} KB${cut ? `; the page is ${full} px tall, cut at ${MAX_SIDE} px: put the rest in slices if ux needs it` : ''}${info.size > 1024 * 1024 ? '; over 1 MB: check-design refuses it' : ''}`);
        }
        await cli(['close'], dir);
      }
    }
  } finally {
    server.close();
  }
  writeFileSync(join(dir, INBOX_FILE), writeInbox(inbox));
  console.log([`Rendered the Designs of .ai/design-inbox/${key}/ with no script:`, ...report.map((line) => `  ${line}`)].join('\n'));
}

function check([key, ...more]) {
  const dir = inboxDir(key);
  const inbox = readInboxOf(dir);
  const links = options(more).named.link ?? [];
  if (!inbox) {
    console.log(`.ai/design-inbox/${key}/${INBOX_FILE}: none yet${links.length > 0 ? `; to take: ${links.join(', ')}` : ''}`);
    if (links.length > 0) process.exitCode = 1;
    return;
  }
  const files = new Map(walk(dir).map((path) => [path, readFileSync(join(dir, path))]));
  const lines = [`.ai/design-inbox/${key}/${INBOX_FILE}:`];
  for (const source of inbox.sources) {
    lines.push(`- ${source.kind} ${source.url} version ${source.version ?? 'unknown'}: ${source.title ?? ''}`);
    for (const screen of source.screens ?? []) lines.push(`  - ${screen.code}${screen.variant ? `-${screen.variant}` : ''} · ${screen.name}: ${screen.file}; images ${screen.shots?.length ? screen.shots.join(', ') : 'none'}`);
  }
  const problems = inboxProblems(inbox, { files, registry: registry(), links });
  lines.push(problems.length === 0 ? 'Inbox OK' : `Problems:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);
  console.log(lines.join('\n'));
  if (problems.length > 0) process.exitCode = 1;
}

function codes(args) {
  const read = registry();
  if (!read) return console.log(`${REGISTRY_FILE} does not exist yet: ux writes it with the first project screen code, and you approve it at gate ①`);
  const { named } = options(args);
  const lines = [`${REGISTRY_FILE}: ${read.screens.length} screen${read.screens.length === 1 ? '' : 's'}`];
  lines.push(`Apps: ${read.apps.map(({ prefix, app }) => `${prefix} ${app}`).join(', ') || 'none'}`);
  lines.push(`Areas: ${read.areas.map(({ area, meaning }) => `${area} ${meaning}`).join(', ') || 'none'}`);
  const pairs = new Set(read.screens.map(({ code }) => codeParts(code)).filter(Boolean).map(({ prefix, area }) => `${prefix} ${area}`));
  if (named.prefix && named.area) pairs.add(`${named.prefix[0]} ${named.area[0]}`);
  for (const pair of [...pairs].sort()) {
    const [prefix, area] = pair.split(' ');
    lines.push(`Next ${prefix}-${area}: ${nextCode(read, prefix, area) ?? 'none, the area is full'}`);
  }
  console.log(lines.join('\n'));
}

const commands = { add, render, check, codes };
if (!commands[command]) fail('usage: design-inbox.mjs add|render|check|codes …');
await commands[command](rest);
