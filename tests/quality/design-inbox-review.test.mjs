// The findings of the independent review of item 10, before its kit PR (2026-11-24), each with the input that showed it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { artifactId, boardsOf, descriptionLinks, inboxProblems, isArtifactLink, readInbox, shotPlan, stripCanvas, writeInbox } from '../../lib/quality/design-inbox.mjs';
import { checkRegistry, readRegistry } from '../../lib/quality/screen-codes.mjs';
import { ROOT } from '../helpers/kit.mjs';

const artboard = (body, helmet = '<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;display=swap" rel="stylesheet"><style>body{margin:0}</style>') => `<!doctype html><html lang="vi"><head><script src="./support.js"></script></head><body><x-dc><helmet>${helmet}</helmet>${body}</x-dc></body></html>`;
// The tags a page can be made of, outside the escaped text: < then a letter, as the HTML tokenizer starts a tag.
const tags = (html) => [...html.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9-]*)/g)].map(([, name]) => name.toLowerCase());
const LIVE = ['script', 'iframe', 'object', 'embed', 'frame', 'frameset', 'base', 'form', 'template', 'portal', 'applet', 'noscript'];

test('High 1: no refresh, base, link or script comes back through the strip, whatever quotes or halves it is made of', () => {
  const tricks = [
    '<meta name="a>b" http-equiv="refresh" content="0;url=https://evil.example/">',
    '<me<meta http-equiv>ta http-equiv="refresh" content="0;url=https://evil.example/">',
    '<me onx=""ta http-equiv="refresh" content="0;url=https://evil.example/">',
    '<ba<base>se href="https://evil.example/">',
    '<li<link>nk rel="stylesheet" href="https://evil.example/x.css">',
    '<link data-x=\'href="https://fonts.googleapis.com/css2?family=X" rel="stylesheet"\' href="https://evil.example/y.css" rel="stylesheet">',
    '<scr<script>ipt>alert(1)</script>',
    '<svg><script>alert(1)</script></svg>',
    '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
  ];
  for (const trick of tricks) {
    const { html } = stripCanvas(artboard(`<div>${trick}</div>`));
    const body = html.slice(html.indexOf('<body>'));
    const found = tags(body);
    for (const name of ['meta', 'link', ...LIVE]) assert.ok(!found.includes(name), `${trick} → <${name}> in ${body}`);
  }
  // The head is built: the CSP, the stylesheet of Google Fonts rebuilt from its URL, and the style text.
  const { html } = stripCanvas(artboard('<p>x</p>', '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&amp;display=swap" rel="stylesheet"><link rel="stylesheet" href="https://evil.example/z.css"><meta http-equiv="refresh" content="0;url=https://evil.example/"><style>p{color:red}</style>'));
  const head = html.slice(0, html.indexOf('</head>'));
  assert.deepEqual(tags(head).filter((name) => name === 'link' || name === 'meta').length, 3, head);
  assert.match(head, /<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/css2\?family=Inter:wght@400;500&display=swap">/);
  assert.match(head, /<style>p\{color:red\}<\/style>/);
  assert.doesNotMatch(head, /evil\.example|refresh/);
  // Icons drawn with inline SVG stay.
  assert.match(stripCanvas(artboard('<svg width="20"><circle r="4"></circle></svg>')).html, /<svg width="20"><circle r="4"><\/circle><\/svg>/);
});

test('High 2: only the link of a Claude artifact names a folder, and add refuses anything else before it writes', (t) => {
  for (const bad of ['https://claude.ai/artifact/x\\..\\..\\..\\..\\.claude\\rules', 'https://claude.ai/artifact/..', 'https://claude.ai/artifact/abc/../../x', 'https://evil.example/artifact/4MHNq6Tk2x3o31S4RVXD5V']) {
    assert.equal(isArtifactLink(bad), false, bad);
    assert.equal(artifactId(bad), null, bad);
  }
  assert.equal(artifactId('https://claude.ai/artifact/4MHNq6Tk2x3o31S4RVXD5V'), '4MHNq6Tk2x3o31S4RVXD5V');
  const project = mkdtempSync(join(tmpdir(), 'inbox-project-'));
  const outside = mkdtempSync(join(tmpdir(), 'inbox-download-'));
  t.after(() => [project, outside].forEach((dir) => rmSync(dir, { recursive: true, force: true })));
  mkdirSync(join(outside, 'project'), { recursive: true });
  writeFileSync(join(outside, 'project', 'README.md'), '# x');
  writeFileSync(join(outside, 'project', 'tokens.json'), '{}');
  const add = (folder, url) => spawnSync(process.execPath, [join(ROOT, 'scripts', 'design-inbox.mjs'), 'add', 'SHOP-1', folder, '--url', url], { cwd: project, encoding: 'utf8' });
  const refused = add(outside, 'https://claude.ai/artifact/x\\..\\..\\..\\..\\.claude\\rules');
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /is not the link of a Claude artifact/);
  assert.equal(existsSync(join(project, '.claude')), false);
  // A folder inside the project is refused: the download stays outside it, unfiltered.
  mkdirSync(join(project, 'download', 'project'), { recursive: true });
  writeFileSync(join(project, 'download', 'project', 'tokens.json'), '{}');
  assert.match(add(join(project, 'download'), 'https://claude.ai/artifact/KBBSLaVz8cHnCY9Vo57rj6').stderr, /is inside the project/);
  const added = add(outside, 'https://claude.ai/artifact/KBBSLaVz8cHnCY9Vo57rj6');
  assert.equal(added.status, 0, added.stderr);
  assert.ok(existsSync(join(project, '.ai', 'design-inbox', 'SHOP-1', 'KBBSLaVz8cHnCY9Vo57rj6', 'project', 'README.md')));
});

test('Medium 3: an artboard -mobile draws the phone of its screen, so the base artboard has a desktop image only', () => {
  const base = { code: 'USR-CART01', variant: null, width: 1440, height: 900 };
  const mobile = { code: 'USR-CART01', variant: 'mobile', width: 390, height: 844 };
  assert.deepEqual(shotPlan(base, [base, mobile]).map(({ file }) => file), ['shots/USR-CART01-desktop.png']);
  assert.deepEqual(shotPlan(mobile, [base, mobile]).map(({ file }) => file), ['shots/USR-CART01-mobile.png']);
  assert.deepEqual(shotPlan(base, [base]).map(({ file }) => file), ['shots/USR-CART01-desktop.png', 'shots/USR-CART01-mobile.png']);
  assert.deepEqual(shotPlan({ code: 'USR-CART01', variant: 'empty', width: 1440 }).map(({ file }) => file), ['shots/USR-CART01-empty-desktop.png', 'shots/USR-CART01-empty-mobile.png']);
  // Low 10: a width that is no whole number falls back; a wide board is drawn at 2,000 px at most.
  assert.equal(shotPlan({ code: 'USR-CART01', width: 2560 })[0].width, 2000);
  assert.equal(shotPlan({ code: 'USR-CART01', width: '1e9' })[0].width, 1440);
});

test('Medium 4: links in smart links and link marks count, and a link the human says is no design stops nothing', () => {
  const adf = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'inlineCard', attrs: { url: 'https://claude.ai/artifact/4MHNq6Tk2x3o31S4RVXD5V' } }, { type: 'text', text: 'Design System', marks: [{ type: 'link', attrs: { href: 'https://claude.ai/code/artifact/93305d92-b3b9-4969-8bd0-2708e02d255d' } }] }] }] };
  assert.deepEqual(descriptionLinks(adf), ['https://claude.ai/artifact/4MHNq6Tk2x3o31S4RVXD5V', 'https://claude.ai/code/artifact/93305d92-b3b9-4969-8bd0-2708e02d255d']);
  const inbox = readInbox(writeInbox({ key: 'SHOP-1', sources: [{ kind: 'not-design', url: 'https://claude.ai/artifact/QQQVYhD9JLSGfbzL6r8d3s', why: 'bản ghi chú của Epic' }] }));
  assert.deepEqual(inboxProblems(inbox, { files: new Map(), registry: null, links: ['https://claude.ai/artifact/QQQVYhD9JLSGfbzL6r8d3s'] }), []);
});

test('Low 9: odd canvas.json and inbox.yaml entries are left out, not thrown on', () => {
  assert.deepEqual(boardsOf('{"boards":{"1":{}},"order":[1]}').screens, []);
  assert.deepEqual(boardsOf('{"boards":[],"order":"x","designSystems":[null,1]}'), { screens: [], systems: [], problems: [] });
  const inbox = readInbox('sources:\n  - null\n  - 3\n  - kind: claude-design\n    url: https://claude.ai/artifact/4MHNq6Tk2x3o31S4RVXD5V\n    dir: 4MHNq6Tk2x3o31S4RVXD5V\n    files: [null]\n    screens: [null, {code: USR-HOME01, name: Hero, shots: [1]}]\n');
  assert.equal(inbox.sources.length, 1);
  assert.deepEqual(inbox.sources[0].files, []);
  assert.deepEqual(inbox.sources[0].screens.map(({ code, shots }) => `${code} ${shots.length}`), ['USR-HOME01 0']);
  assert.doesNotThrow(() => inboxProblems(inbox, { files: new Map(), registry: null }));
});

test('Low 11: the registry reads no table in a comment or a fence, keeps an escaped bar in its cell, and codes checks its options', () => {
  const text = [
    '<!--', '## Apps', '', '| Prefix | App |', '|---|---|', '| XXX | x |', '-->',
    '## Apps', '', '| Prefix | App |', '|---|---|', '| USR | user |', '',
    '## Areas', '', '| Area | Meaning |', '|---|---|', '| CART | Giỏ \\| túi |', '',
    '## Screens', '', '| Code | Name | App | Route | Epic | State |', '|---|---|---|---|---|---|', '| USR-CART01 | Giỏ \\| túi | user | /cart | SHOP-1 | dùng |', '',
  ].join('\n');
  const read = readRegistry(text);
  assert.deepEqual(read.apps.map(({ prefix }) => prefix), ['USR']);
  assert.equal(read.screens[0].name, 'Giỏ | túi');
  assert.deepEqual(checkRegistry(read), []);
  const codes = (...args) => spawnSync(process.execPath, [join(ROOT, 'scripts', 'design-inbox.mjs'), 'codes', ...args], { cwd: tmpdir(), encoding: 'utf8' });
  assert.match(codes('--prefix', 'usr', '--area', 'cart').stderr, /--prefix takes 3 capitals and --area 2 to 4 capitals/);
  assert.match(codes('--prefix').stderr, /--prefix takes 3 capitals/);
});

test('the skill and the prompt say what the code does: screenshots by name, skip, a download outside the project, the column headers', () => {
  const skill = readFileSync(join(ROOT, 'kit', '.claude', 'skills', 'ao-design', 'SKILL.md'), 'utf8').replace(/\s+/g, ' ');
  assert.match(skill, /named <code>-desktop\.png or <code>-mobile\.png/);
  assert.ok(skill.includes('node .ai-orchestrator/scripts/design-inbox.mjs skip $0'));
  assert.match(skill, /outside the project/);
  assert.doesNotMatch(skill, /put its folder in `\.ai\/design-inbox/);
  const ux = readFileSync(join(ROOT, 'agents', 'prompts', 'ux.md'), 'utf8');
  assert.ok(ux.includes('`| Prefix | App |`') && ux.includes('`| Area | Meaning |`') && ux.includes('`| Code | Name | App | Route | Epic | State |`'));
  assert.match(ux, /Codes are fixed once the SPEC is approved/);
});
