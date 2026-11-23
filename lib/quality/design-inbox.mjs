// The design inbox of an item (tasks/todo.md item 10): .ai/design-inbox/<KEY>/ holds what the main session took from a
// Claude artifact, a Design or a Design System, with inbox.yaml naming each source, its version, the hash of each file
// and the screens of a Design. ux reads it; it never opens a link itself. Pure: scripts/design-inbox.mjs reads and
// writes the files.
import { createHash } from 'node:crypto';
import { parse, stringify } from 'yaml';
import { PROJECT_CODE, codeKind } from './screen-codes.mjs';

export const INBOX_FILE = 'inbox.yaml';
const ARTIFACT = 'https://claude\\.ai/(?:artifact/[A-Za-z0-9]{10,40}|code/artifact/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})';
const ARTIFACT_LINK = new RegExp(`^${ARTIFACT}$`);
const BOARD_FILE = new RegExp(`^(${PROJECT_CODE})(?:-([a-z][a-z0-9-]*))?\\.dc\\.html$`);
const SAFE_PATH = /^[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/;
// Names Claude Code reads as instructions when an agent reads a file next to them (on Windows whatever their case,
// as tests/fixtures/design/claude.md showed): an artifact never brings one into the project.
const INSTRUCTION_NAME = /(^|\/)(claude(\.local)?\.md|agents\.md|\.claude|\.mcp\.json)(\/|$)/i;

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

// The links of Claude artifacts in a text, such as the description of an Epic, each once, in order.
export function artifactLinks(text) {
  const found = String(text ?? '').match(new RegExp(`${ARTIFACT}(?![A-Za-z0-9/-])`, 'g')) ?? [];
  return [...new Set(found)];
}

export const artifactId = (url) => url.split('/').at(-1);

// The files of an artifact the inbox keeps: the source of a Design (its canvas, artboards and the tokens it copied)
// or of a Design System (its tokens, README and record), never the code of the artifact type or a file Claude Code
// would read as instructions. path: the published path, such as project/canvas.json.
export function keptFile(path) {
  if (!SAFE_PATH.test(path) || path.split('/').includes('..') || INSTRUCTION_NAME.test(path)) return false;
  return /^project\/(canvas\.json|design-system\.json|tokens\.json|README\.md|[^/]+\.dc\.html|ds\/[^/]+\/tokens\.json|components\/[^/]+\/preview\.html)$/.test(path);
}

// 'design' for an artifact with a canvas, 'design-system' for one with design-system.json, else null.
export function sourceKind(paths) {
  if (paths.includes('project/canvas.json')) return 'design';
  if (paths.includes('project/design-system.json') || paths.includes('project/tokens.json')) return 'design-system';
  return null;
}

// The screens of a Design, from its canvas.json: one per artboard, its code from the file name (USR-CART01.dc.html, or
// USR-CART01-mobile.dc.html for a variant), its name from the title after "<code> · ". Problems say what to fix in
// Claude Design. { screens: [{ code, variant, name, file, width, height }], systems: [{ title, url }], problems }.
export function boardsOf(canvasText) {
  const problems = [];
  let canvas;
  try {
    canvas = JSON.parse(canvasText);
  } catch (cause) {
    return { screens: [], systems: [], problems: [`canvas.json does not parse: ${cause.message}`] };
  }
  const boards = canvas?.boards && typeof canvas.boards === 'object' ? canvas.boards : {};
  const order = Array.isArray(canvas?.order) ? canvas.order.filter((file) => file in boards) : [];
  const files = [...order, ...Object.keys(boards).filter((file) => !order.includes(file))];
  const screens = [];
  for (const file of files) {
    const board = boards[file] ?? {};
    const base = file.split('/').at(-1);
    if (!SAFE_PATH.test(file) || file.split('/').includes('..')) {
      problems.push(`the artboard file '${file}' has a name the inbox does not take: letters, digits, dot, hyphen and underscore only`);
      continue;
    }
    const found = BOARD_FILE.exec(base);
    if (!found) {
      problems.push(`the artboard ${file} has no screen code in its file name: name it after its code, such as USR-CART01.dc.html, or USR-CART01-mobile.dc.html for a variant`);
      continue;
    }
    const [, code, variant = null] = found;
    const title = String(board.title ?? '');
    const prefix = `${code} · `;
    if (!title.startsWith(prefix) || title.length === prefix.length) problems.push(`the title of the artboard ${file} is "${title}": it starts with "${prefix}" and the name of the screen`);
    screens.push({ code, variant, name: title.startsWith(prefix) ? title.slice(prefix.length).trim() : title, file: `project/${file}`, width: Number(board.w) || null, height: Number(board.h) || null });
  }
  const seen = new Map();
  for (const { code, variant, file } of screens) {
    const id = `${code}${variant ? `-${variant}` : ''}`;
    if (seen.has(id)) problems.push(`${id} is the code of two artboards, ${seen.get(id)} and ${file}`);
    seen.set(id, file);
  }
  const systems = (Array.isArray(canvas?.designSystems) ? canvas.designSystems : []).map(({ title, artifact }) => ({ title: String(title ?? ''), url: String(artifact ?? '') }));
  return { screens, systems, problems };
}

// A page a browser renders with no script: the artboard of a Claude Design without its canvas runtime. The content of
// <helmet> goes to <head>; every script, event handler, frame and refresh goes; a Content-Security-Policy lets in only
// inline styles, Google Fonts and images of the local server. dynamic: the artboard binds values or imports another
// ({{ }}, sc-if, sc-for, dc-import), which only the runtime draws, so its image comes from the human.
export const RENDER_POLICY = "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:";
export function stripCanvas(html) {
  const text = String(html ?? '');
  const lang = text.match(/<html[^>]*\blang="([A-Za-z-]{2,12})"/i)?.[1] ?? 'en';
  const inner = text.match(/<x-dc>([\s\S]*?)<\/x-dc>/i)?.[1];
  if (inner === undefined) return { html: null, dynamic: false, problem: 'the file has no <x-dc> element: it is not an artboard of Claude Design' };
  const helmet = inner.match(/<helmet>([\s\S]*?)<\/helmet>/i)?.[1] ?? '';
  const body = inner.replace(/<helmet>[\s\S]*?<\/helmet>/i, '');
  const dynamic = /\{\{|<sc-(if|for)\b|<dc-import\b/i.test(body);
  const clean = (part) => part
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<(iframe|object|embed|frame|frameset|base|form)\b[\s\S]*?(<\/\1\s*>|\/?>)/gi, '')
    .replace(/<meta\b[^>]*http-equiv[^>]*>/gi, '')
    .replace(/<link\b[^>]*>/gi, (tag) => (/\bhref\s*=\s*("|')https:\/\/fonts\.googleapis\.com\/[^"']*\1/i.test(tag) && /\brel\s*=\s*("|')stylesheet\1/i.test(tag) ? tag : ''))
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src|action)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1="#"');
  const page = `<!doctype html>\n<html lang="${lang}">\n<head>\n<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="${RENDER_POLICY}">\n${clean(helmet)}\n</head>\n<body>\n${clean(body)}\n</body>\n</html>\n`;
  return { html: page, dynamic };
}

// Whether an artboard named in inbox.yaml may be read: its folder an artifact id, its file a kept artboard. inbox.yaml
// sits in .ai/, which agents write, so render reads only what add could have written (threat model of item 10).
export const readableArtboard = (dir, file) => /^[A-Za-z0-9-]{10,40}$/.test(dir ?? '') && /^project\/[^/]+\.dc\.html$/.test(file ?? '') && keptFile(file);

// The entry of inbox.yaml for one artifact. files: [{ path, bytes }] of the kept files.
export function inboxEntry({ url, version, title, files, now }) {
  const paths = files.map(({ path }) => path);
  const kind = sourceKind(paths);
  const entry = {
    kind: kind === 'design' ? 'claude-design' : kind === 'design-system' ? 'claude-design-system' : 'unknown',
    url,
    version: version ?? null,
    title: title ?? null,
    dir: artifactId(url),
    added: new Date(now ?? Date.now()).toISOString(),
    files: files.map(({ path, bytes }) => ({ path, sha256: sha256(bytes) })),
  };
  if (kind === 'design') {
    const canvas = files.find(({ path }) => path === 'project/canvas.json');
    const { screens, systems } = boardsOf(canvas.bytes.toString('utf8'));
    entry.screens = screens.map((screen) => ({ ...screen, shots: [] }));
    entry.design_systems = systems;
  }
  return entry;
}

// Reads inbox.yaml: { key, sources: [entry] }, or throws with what is wrong.
export function readInbox(text) {
  const data = parse(String(text ?? '')) ?? {};
  if (!Array.isArray(data.sources)) throw new Error(`${INBOX_FILE} has no list sources`);
  return { key: data.key ?? null, sources: data.sources };
}

export function writeInbox({ key, sources }) {
  return `# Written by node .ai-orchestrator/scripts/design-inbox.mjs (tasks/todo.md item 10); do not edit by hand.\n${stringify({ key, sources })}`;
}

// The inbox with the entry of a link replaced, or added at the end.
export function withEntry(inbox, entry) {
  const sources = inbox.sources.filter(({ url }) => url !== entry.url);
  return { ...inbox, sources: [...sources, entry] };
}

// What check prints: problems with the inbox of KEY. files: Map of path in the inbox folder → bytes; registry: the
// output of readRegistry, or null. Problems are sentences; an empty list means the inbox is ready for ux.
export function inboxProblems(inbox, { files, registry, links = [] }) {
  const problems = [];
  for (const link of links.filter((url) => !inbox.sources.some((source) => source.url === url))) problems.push(`${link} is linked from the item but not in the inbox: /ao-design takes it`);
  for (const source of inbox.sources) {
    if (!ARTIFACT_LINK.test(source.url ?? '')) problems.push(`${source.url} is not the link of a Claude artifact`);
    if (!/^[A-Za-z0-9-]{10,40}$/.test(source.dir ?? '')) problems.push(`the folder of ${source.url} is not a name the inbox takes`);
    for (const { path, sha256: hash } of source.files ?? []) {
      const at = `${source.dir}/${path}`;
      if (!keptFile(path)) problems.push(`${at} is not a file the inbox keeps`);
      else if (!files.has(at)) problems.push(`${at} is missing`);
      else if (sha256(files.get(at)) !== hash) problems.push(`${at} changed after it was taken: take the artifact again with /ao-design`);
    }
    if (source.kind !== 'claude-design') continue;
    const canvas = files.get(`${source.dir}/project/canvas.json`);
    if (canvas) problems.push(...boardsOf(canvas.toString('utf8')).problems.map((problem) => `${source.title ?? source.url}: ${problem}`));
    for (const { code, name, file, shots = [] } of source.screens ?? []) {
      if (codeKind(code) !== 'project') continue;
      const known = registry?.screens.find((screen) => screen.code === code);
      if (known?.state === 'bỏ') problems.push(`${code} is retired in docs/design-system/screens.md: give ${file} a new code`);
      if (shots.length === 0) problems.push(`${code} (${name}) has no image yet: run render, or put a screenshot of it in the inbox`);
    }
  }
  return problems;
}
