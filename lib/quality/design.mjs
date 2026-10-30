// Checks a design.md (agent-roster spec 2.8): the Mermaid flow, each screen drawn in ASCII or shown as Figma images,
// and the YAML under it. Pure: scripts/check-design.mjs reads the file. Errors are { rule, line, message }, line 1-based.
import { parse } from 'yaml';

const SCREEN_KEYS = ['screen', 'route', 'figma', 'blocks'];
const BLOCK_KEYS = ['name', 'type', 'content', 'behavior', 'validation', 'states', 'a11y', 'ac', 'figma'];
const MAX_COLUMNS = 100;
// Unicode box drawing and block elements, and emoji. ASCII frames use + - | [ ] _ only (rule 2).
const NOT_ASCII_ART = /[─-▟]|\p{Extended_Pictographic}/u;
const SCREEN = /^S\d+$/;
const BLOCK_REF = /\[(\d+)\]/g;
const ARROW = /\b(S\d+)\s*(?:-{2,}>|-\.+->|={2,}>)\s*(?:\|([^|]*)\|\s*)?(?=(S\d+)\b)/g;
// A node's shape and text, such as S1[S1 Đăng nhập], so only its code is left.
const NODE_SHAPE = /\b(S\d+)\s*(\[\[[^\]]*\]\]|\[[^\]]*\]|\(\([^)]*\)\)|\([^)]*\)|\{[^}]*\})/g;

// Splits the file into what the rules look at. Fenced blocks are read whole; images and table rows only count outside
// them, so the Example of templates/design.md, inside a ````markdown fence, is not part of the template itself.
export function readDesign(text) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const design = { drawings: [], images: [], yamls: [], flows: [], rows: [] };
  let fence = null;
  lines.forEach((line, index) => {
    const number = index + 1;
    const marker = line.match(/^\s*(`{3,}|~{3,})\s*([\w-]*)/);
    if (fence) {
      if (marker && line.trim() === marker[1] && marker[1][0] === fence.marker[0] && marker[1].length >= fence.marker.length) {
        addFence(design, fence);
        fence = null;
      } else fence.body.push({ text: line, line: number });
      return;
    }
    if (marker) {
      fence = { marker: marker[1], lang: marker[2].toLowerCase(), line: number, body: [] };
      return;
    }
    for (const [, alt, src] of line.matchAll(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      design.images.push({ alt, src, code: alt.match(/^(S\d+)\b/)?.[1] ?? null, line: number });
    }
    const row = line.match(/^\|\s*(S\d+)\s*\|/);
    if (row) design.rows.push({ code: row[1], line: number });
  });
  if (fence) addFence(design, fence);
  return design;
}

function addFence(design, fence) {
  const { lang, line, body } = fence;
  if (lang === 'yaml' || lang === 'yml') design.yamls.push({ line, body });
  else if (lang === 'mermaid') design.flows.push({ line, body });
  else if (lang === 'text' && /^S\d+\b/.test(body[0]?.text ?? '')) {
    design.drawings.push({ code: body[0].text.match(/^(S\d+)/)[1], line, body });
  }
}

export function checkDesign(text) {
  const design = readDesign(text);
  const errors = [];
  const error = (rule, line, message) => errors.push({ rule, line, message });
  const screens = readScreens(design, error);

  checkDrawings(design, screens, error);
  checkFlow(design, screens, error);
  checkKinds(design, screens, error);
  for (const code of duplicates(design.rows.map(({ code }) => code))) {
    error('D5', design.rows.filter((row) => row.code === code)[1].line, `the screen table lists ${code} twice`);
  }
  return errors.sort((a, b) => a.line - b.line);
}

// D1 and D5 on the YAML blocks. Returns the screens the YAML declares: code → { line, blocks: Map number → line }.
function readScreens(design, error) {
  const screens = new Map();
  for (const yaml of design.yamls) {
    const lineOf = (pattern) => yaml.body.find(({ text }) => pattern.test(text))?.line ?? yaml.line;
    let data;
    try {
      data = parse(yaml.body.map(({ text }) => text).join('\n'));
    } catch (cause) {
      error('D1', cause.linePos?.[0]?.line ? yaml.line + cause.linePos[0].line : yaml.line, `YAML does not parse: ${cause.message.split('\n')[0]}`);
      // Keep the screen, with its blocks unknown, so the error does not repeat as D2, D3 or D6.
      const code = yaml.body.map(({ text }) => text.match(/^screen\s*:\s*(S\d+)\s*$/)?.[1]).find(Boolean);
      if (code && !screens.has(code)) screens.set(code, { line: lineOf(/^screen\s*:/), blocks: null });
      continue;
    }
    if (!isMap(data)) {
      error('D1', yaml.line, 'the YAML of a screen must be a mapping with screen, route and blocks');
      continue;
    }
    for (const key of Object.keys(data).filter((k) => !SCREEN_KEYS.includes(k))) {
      error('D1', lineOf(new RegExp(`^${escape(key)}\\s*:`)), `unknown key '${key}'; a screen has ${SCREEN_KEYS.join(', ')}`);
    }
    if (typeof data.screen !== 'string' || !SCREEN.test(data.screen)) {
      error('D1', lineOf(/^screen\s*:/), `screen must be a code such as S1, not '${data.screen ?? ''}'`);
      continue;
    }
    const blocks = new Map();
    if (!isMap(data.blocks) || Object.keys(data.blocks).length === 0) error('D1', lineOf(/^blocks\s*:/), `${data.screen} has no blocks`);
    for (const [key, block] of Object.entries(isMap(data.blocks) ? data.blocks : {})) {
      const line = lineOf(new RegExp(`^\\s+${escape(key)}\\s*:`));
      if (!/^[1-9]\d*$/.test(key)) {
        error('D1', line, `block key '${key}' of ${data.screen} must be a number, such as 4 for [4]`);
        continue;
      }
      blocks.set(Number(key), line);
      checkBlock(`${data.screen}.${key}`, block, line, error);
    }
    if (screens.has(data.screen)) error('D5', lineOf(/^screen\s*:/), `${data.screen} has two YAML blocks`);
    else screens.set(data.screen, { line: lineOf(/^screen\s*:/), blocks });
  }
  return screens;
}

function checkBlock(id, block, line, error) {
  if (!isMap(block)) {
    error('D1', line, `${id} must be a mapping with at least name and type`);
    return;
  }
  for (const key of Object.keys(block).filter((k) => !BLOCK_KEYS.includes(k))) {
    error('D1', line, `${id} has an unknown key '${key}'; a block has ${BLOCK_KEYS.join(', ')}`);
  }
  for (const key of ['name', 'type'].filter((k) => block[k] === undefined || block[k] === null || block[k] === '')) {
    error('D1', line, `${id} has no ${key}`);
  }
  if (block.ac !== undefined && !(Array.isArray(block.ac) && block.ac.length > 0 && block.ac.every((ac) => /^AC\d+$/.test(ac)))) {
    error('D1', line, `ac of ${id} must list criterion codes such as [AC1, AC2]`);
  }
}

// D2 and D4 on the ASCII drawings.
function checkDrawings(design, screens, error) {
  const drawn = new Map();
  for (const { code, body } of design.drawings) {
    const [title, ...frame] = body;
    if (!/^S\d+ · [^·]+ · [^·]+$/.test(title.text)) error('D4', title.line, 'the first line of a drawing must read "S<n> · <name> · <screen size>"');
    for (const { text, line } of body) {
      if (NOT_ASCII_ART.test(text)) error('D4', line, 'a drawing uses only + - | [ ] _ and text, no Unicode box characters or emoji');
      if ([...text].length > MAX_COLUMNS) error('D4', line, `a drawing line has ${[...text].length} columns; the limit is ${MAX_COLUMNS}`);
    }
    // A screen may have several drawings, one per screen size; each block appears once in each of them.
    const blocks = screens.get(code)?.blocks;
    const seen = new Set();
    for (const { text, line } of frame) {
      for (const number of [...text.matchAll(BLOCK_REF)].map(([, n]) => Number(n))) {
        if (seen.has(number)) error('D2', line, `[${number}] appears twice in the drawing of ${code}`);
        if (blocks && !blocks.has(number)) error('D2', line, `[${number}] of ${code} has no entry under blocks in its YAML`);
        seen.add(number);
      }
    }
    drawn.set(code, new Set([...(drawn.get(code) ?? []), ...seen]));
  }
  for (const [code, numbers] of drawn) {
    for (const [number, line] of screens.get(code)?.blocks ?? []) {
      if (!numbers.has(number)) error('D2', line, `block ${number} of ${code} is not drawn as [${number}]`);
    }
  }
}

// D3: the Mermaid flow names every screen, and only screens; a block on an arrow belongs to the screen it leaves.
function checkFlow(design, screens, error) {
  if (design.flows.length === 0) {
    if (screens.size > 0) error('D3', 1, 'the file has no Mermaid flow of its screens');
    return;
  }
  const nodes = new Map();
  for (const { body } of design.flows) {
    for (const { text, line } of body) {
      if (/^\s*(flowchart|graph)\b|^\s*%%/.test(text)) continue;
      const cleaned = text.replace(NODE_SHAPE, '$1');
      for (const [, code] of cleaned.replace(/\|[^|]*\|/g, ' ').matchAll(/\b(S\d+)\b/g)) if (!nodes.has(code)) nodes.set(code, line);
      for (const [, from, label = ''] of cleaned.matchAll(ARROW)) {
        const blocks = screens.get(from)?.blocks;
        if (!blocks) continue;
        for (const [, number] of label.matchAll(BLOCK_REF)) {
          if (!blocks.has(Number(number))) error('D3', line, `the arrow from ${from} names [${number}], which ${from} does not have`);
        }
      }
    }
  }
  for (const [code, line] of nodes) if (!screens.has(code)) error('D3', line, `the flow has ${code}, but no screen ${code} has YAML`);
  for (const [code, { line }] of screens) if (!nodes.has(code)) error('D3', line, `${code} is not in the Mermaid flow`);
}

// D6: each screen is either drawn in ASCII or shown as images, and every drawing or image belongs to a screen.
function checkKinds(design, screens, error) {
  for (const [code, { line }] of screens) {
    const drawn = design.drawings.some((d) => d.code === code);
    const shown = design.images.some((i) => i.code === code);
    if (drawn && shown) error('D6', line, `${code} has both an ASCII drawing and images; keep one kind`);
    if (!drawn && !shown) error('D6', line, `${code} has neither an ASCII drawing nor an image`);
  }
  for (const { code, line } of [...design.drawings, ...design.images.filter((i) => i.code)]) {
    if (!screens.has(code)) error('D6', line, `${code} is drawn or shown, but has no YAML block`);
  }
}

function duplicates(list) {
  return [...new Set(list.filter((item, index) => list.indexOf(item) !== index))];
}

function isMap(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function escape(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
