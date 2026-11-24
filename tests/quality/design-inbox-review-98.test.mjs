// The findings of the review of shop PR #98, the kit copy of item 10 (tasks/todo.md item 12), each with the input that
// showed it: reviewer and security, 4 Medium and 6 Low.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RENDER_POLICY, artifactLinks, boardsOf, cliConfig, cliEnv, isArtifactLink, normalLink, readInbox, renderedPageProblems, stripCanvas } from '../../lib/quality/design-inbox.mjs';
import { checkDesign } from '../../lib/quality/design.mjs';
import { ROOT } from '../helpers/kit.mjs';

const artboard = (body, helmet) => `<!doctype html><html lang="vi"><head><script src="./support.js"></script></head><body><x-dc><helmet>${helmet}</helmet>${body}</x-dc></body></html>`;
const tags = (html) => [...html.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9-]*)/g)].map(([, name]) => name.toLowerCase());
const png = (width, height) => {
  const bytes = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes);
  bytes.write('IHDR', 12, 'latin1');
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
};

test('Medium 1: the style text of the helmet never closes its block in <head>, however its halves are cut', () => {
  const refresh = '<meta http-equiv="refresh" content="0;url=https://evil.example/CLAUDE.md">';
  for (const trick of [`</sty</stylele>${refresh}`, `</<stylestyle>${refresh}`, `</sty<stylele/>${refresh}`, `</sty<style>le>${refresh}`, 'a::after{content:"<b>"}']) {
    const { html, dynamic } = stripCanvas(artboard('<div>Hero</div>', `<style>body{color:red}${trick}</style>`));
    assert.equal(dynamic, false);
    const head = html.slice(0, html.indexOf('</head>'));
    const styles = [...head.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(([, css]) => css);
    for (const css of styles) assert.ok(!css.includes('<'), `${trick} → ${css}`);
    const outside = head.replace(/<style>[\s\S]*?<\/style>/g, '');
    assert.deepEqual(tags(outside).sort(), ['head', 'html', 'meta', 'meta'], `${trick} → ${head}`);
    assert.deepEqual(renderedPageProblems(html), [], trick);
  }
  // CSS reads \3c as < in a string, so the text of a design stays as it was.
  assert.match(stripCanvas(artboard('<p>x</p>', '<style>a::after{content:"<b>"}</style>')).html, /content:"\\3c b>"/);
});

test('Medium 2 (reviewer): a link with a slash at its end counts, without the slash; a longer path does not', () => {
  const ID = 'https://claude.ai/artifact/KBBSLaVz8cHnCY9Vo57rj6';
  assert.deepEqual(artifactLinks(`Thiết kế: ${ID}/ và ${ID}/?tab=files, https://claude.ai/code/artifact/93305d92-b3b9-4969-8bd0-2708e02d255d/`), [ID, 'https://claude.ai/code/artifact/93305d92-b3b9-4969-8bd0-2708e02d255d']);
  assert.deepEqual(artifactLinks(JSON.stringify({ attrs: { url: `${ID}/` } })), [ID]);
  for (const other of [`${ID}/other`, `${ID}//`, `${ID}-x/`]) assert.deepEqual(artifactLinks(other), [], other);
  assert.equal(normalLink(`${ID}/`), ID);
  assert.equal(normalLink(ID), ID);
  assert.equal(isArtifactLink(normalLink(`${ID}/x`)), false);
});

test('Medium 2 (security): the browser runs in a folder of its own with the config of the kit, and the variables of the CLI are not read', () => {
  const work = join(tmpdir(), 'ao-design-x');
  assert.deepEqual(cliConfig({ base: 'http://127.0.0.1:5000', work }), {
    browser: { isolated: true, contextOptions: { acceptDownloads: false } },
    outputDir: join(work, 'out'),
    outputMode: 'file',
    network: { allowedOrigins: ['http://127.0.0.1:5000', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'] },
  });
  assert.deepEqual(cliEnv({ PATH: 'p', PLAYWRIGHT_MCP_CONFIG: 'x', PLAYWRIGHT_MCP_INIT_SCRIPT: 'y', PWTEST_CLI_GLOBAL_CONFIG: 'z', NODE_OPTIONS: '--require x' }, work), { PATH: 'p', PWTEST_CLI_GLOBAL_CONFIG: work });
});

// A project with the artifact "Landing page hero" in its inbox, taken by add.
function inboxProject(t, board = '<div>Hero</div>') {
  const project = mkdtempSync(join(tmpdir(), 'inbox98-project-'));
  const outside = mkdtempSync(join(tmpdir(), 'inbox98-outside-'));
  t.after(() => [project, outside].forEach((dir) => rmSync(dir, { recursive: true, force: true })));
  mkdirSync(join(outside, 'download', 'project'), { recursive: true });
  writeFileSync(join(outside, 'download', 'project', 'canvas.json'), JSON.stringify({ boards: { 'USR-HOME01.dc.html': { w: 1440, h: 760, title: 'USR-HOME01 · Hero' } }, order: ['USR-HOME01.dc.html'] }));
  writeFileSync(join(outside, 'download', 'project', 'USR-HOME01.dc.html'), artboard(board, '<style>body{margin:0}</style>'));
  const run = (...args) => spawnSync(process.execPath, [join(ROOT, 'scripts', 'design-inbox.mjs'), ...args], { cwd: project, encoding: 'utf8' });
  const added = run('add', 'SHOP-1', join(outside, 'download'), '--url', 'https://claude.ai/artifact/KBBSLaVz8cHnCY9Vo57rj6/', '--version', '1-a');
  assert.equal(added.status, 0, added.stderr);
  return { project, outside, run, inbox: join(project, '.ai', 'design-inbox', 'SHOP-1') };
}

test('Medium 2 (reviewer): add takes a link with a slash at its end, and records it without', (t) => {
  const { inbox } = inboxProject(t);
  assert.deepEqual(readInbox(readFileSync(join(inbox, 'inbox.yaml'), 'utf8')).sources.map(({ url }) => url), ['https://claude.ai/artifact/KBBSLaVz8cHnCY9Vo57rj6']);
});

test('Medium 2 (security): render writes no folder of the inbox that is a link, and copies no screenshot that is one', (t) => {
  const { outside, run, inbox } = inboxProject(t);
  const elsewhere = join(outside, 'elsewhere');
  mkdirSync(elsewhere);
  // A junction for shots/: render stops before it writes anything.
  symlinkSync(elsewhere, join(inbox, 'shots'), 'junction');
  writeFileSync(join(inbox, 'USR-HOME01-desktop.png'), png(1440, 760));
  const stopped = run('render', 'SHOP-1');
  assert.equal(stopped.status, 1, stopped.stdout);
  assert.match(stopped.stderr, /\.ai\/design-inbox\/SHOP-1\/shots is a link/);
  assert.deepEqual(readdirSync(elsewhere), []);
  rmSync(join(inbox, 'shots'));
  // A screenshot that is a hard link to another file is not copied: its bytes could be any file of yours.
  rmSync(join(inbox, 'USR-HOME01-desktop.png'));
  writeFileSync(join(outside, 'secret.png'), png(1440, 760));
  linkSync(join(outside, 'secret.png'), join(inbox, 'USR-HOME01-desktop.png'));
  const linked = run('render', 'SHOP-1');
  assert.equal(linked.status, 0, linked.stderr);
  assert.match(linked.stdout, /USR-HOME01-desktop\.png is a link to another file/);
  assert.equal(existsSync(join(inbox, 'shots', 'USR-HOME01-desktop.png')), false);
});

test('Medium 2 (security): inbox.yaml that is a link is never written through, and an artboard changed after add is not drawn', (t) => {
  const { outside, run, inbox } = inboxProject(t);
  const kept = readFileSync(join(inbox, 'inbox.yaml'), 'utf8');
  writeFileSync(join(outside, 'rules.md'), kept);
  rmSync(join(inbox, 'inbox.yaml'));
  linkSync(join(outside, 'rules.md'), join(inbox, 'inbox.yaml'));
  const skipped = run('skip', 'SHOP-1', '--url', 'https://claude.ai/artifact/QQQVYhD9JLSGfbzL6r8d3s', '--why', 'ghi chú');
  assert.equal(skipped.status, 1, skipped.stdout);
  assert.match(skipped.stderr, /inbox\.yaml is a link/);
  assert.equal(readFileSync(join(outside, 'rules.md'), 'utf8'), kept);
  rmSync(join(inbox, 'inbox.yaml'));
  writeFileSync(join(inbox, 'inbox.yaml'), kept);
  const board = join(inbox, 'KBBSLaVz8cHnCY9Vo57rj6', 'project', 'USR-HOME01.dc.html');
  writeFileSync(board, readFileSync(board, 'utf8').replace('Hero', 'Hero<meta http-equiv="refresh" content="0;url=https://evil.example/">'));
  const changed = run('render', 'SHOP-1');
  assert.equal(changed.status, 0, changed.stderr);
  assert.match(changed.stdout, /USR-HOME01: .*USR-HOME01\.dc\.html changed after it was taken/);
  assert.equal(existsSync(join(inbox, 'render', 'USR-HOME01.html')), false);
});

test('Low (security): render keeps a page with no script of every artboard, a dynamic one too, for ux to read', (t) => {
  const { run, inbox } = inboxProject(t, '<div>{{ title }}</div><script>alert(1)</script>');
  const rendered = run('render', 'SHOP-1');
  assert.equal(rendered.status, 0, rendered.stderr);
  assert.match(rendered.stdout, /USR-HOME01: it binds values/);
  const page = readFileSync(join(inbox, 'render', 'USR-HOME01.html'), 'utf8');
  assert.deepEqual(renderedPageProblems(page), []);
  assert.ok(!tags(page).includes('script'));
});

// The design of tests/fixtures/design, with its prototype a page render wrote.
const claude = readFileSync(join(ROOT, 'tests', 'fixtures', 'design', 'claude-design-screens.md'), 'utf8');
const registry = (rows = ['| USR-CART01 | Giỏ hàng | user | /cart | SHOP-120 | dùng |', '| USR-CHK01 | Thanh toán | user | /checkout | SHOP-120 | dùng |']) => [
  '## Apps', '', '| Prefix | App |', '|---|---|', '| USR | user |', '',
  '## Areas', '', '| Area | Meaning |', '|---|---|', '| CART | Giỏ hàng |', '| CHK | Thanh toán |', '',
  '## Screens', '', '| Code | Name | App | Route | Epic | State |', '|---|---|---|---|---|---|', ...rows, '',
].join('\n');
const page = stripCanvas(artboard('<div>Giỏ hàng</div>', '<style>body{margin:0}</style>')).html;
const files = (prototype = page) => new Map([['USR-CART01-desktop.png', png(1440, 900)], ['USR-CART01-mobile.png', png(390, 1214)], ['USR-CART01.html', Buffer.from(prototype)]]);
const rulesOf = (more = {}) => checkDesign(claude, { images: files(), registry: registry(), ...more }).map(({ rule, message }) => `${rule} ${message}`);

test('Low (security): a prototype is a page render wrote, with the CSP of the kit and no script, never the artboard itself', () => {
  assert.deepEqual(rulesOf(), []);
  const raw = artboard('<div>Giỏ hàng</div>', '<style>body{margin:0}</style>');
  assert.deepEqual(rulesOf({ images: files(raw) }), ['D8 design/USR-CART01.html is not a page that render of /ao-design wrote: copy .ai/design-inbox/<EPIC-KEY>/render/USR-CART01.html, which has no script']);
  for (const added of ['<script>alert(1)</script>', '<meta http-equiv="refresh" content="0;url=https://evil.example/">', '<iframe src="https://evil.example/"></iframe>']) {
    assert.ok(renderedPageProblems(page.replace('<div>Giỏ hàng</div>', `<div>Giỏ hàng</div>${added}`)).length > 0, added);
    assert.ok(renderedPageProblems(page.replace('<style>', `${added}<style>`)).length > 0, added);
  }
  assert.ok(renderedPageProblems(page.replace(RENDER_POLICY, "default-src *")).length > 0);
});

test('Low 1 (reviewer): the problems of the registry are listed once, not again by each design.md', () => {
  const twice = registry(['| USR-CART01 | Giỏ hàng | user | /cart | SHOP-120 | dùng |', '| USR-CHK01 | Thanh toán | user | /checkout | SHOP-120 | dùng |', '| USR-CART01 | Khác | user | /x | SHOP-1 | dùng |']);
  const errors = checkDesign(claude, { images: files(), registry: twice });
  assert.deepEqual(errors.map(({ rule, message }) => `${rule} ${message}`), ['D11 docs/design-system/screens.md has 1 problem: node .ai-orchestrator/scripts/design-inbox.mjs codes lists it']);
  assert.equal(errors[0].registry, true);
  const project = mkdtempSync(join(tmpdir(), 'codes98-'));
  try {
    mkdirSync(join(project, 'docs', 'design-system'), { recursive: true });
    writeFileSync(join(project, 'docs', 'design-system', 'screens.md'), twice);
    const codes = spawnSync(process.execPath, [join(ROOT, 'scripts', 'design-inbox.mjs'), 'codes'], { cwd: project, encoding: 'utf8' });
    assert.equal(codes.status, 1);
    assert.match(codes.stdout, /Problems:\n {2}- docs\/design-system\/screens\.md:\d+ R5 USR-CART01 is listed twice/);
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

test('Low 2 (reviewer): a PR that changes only the registry checks every design.md with project codes, and lists the registry once', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'policy98-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const git = (...args) => spawnSync('git', ['-c', 'user.email=t@example.com', '-c', 'user.name=t', ...args], { cwd: dir, encoding: 'utf8' });
  git('init', '-q', '-b', 'develop');
  mkdirSync(join(dir, 'docs', 'design-system'), { recursive: true });
  writeFileSync(join(dir, 'docs', 'design-system', 'screens.md'), registry());
  for (const key of ['SHOP-120', 'SHOP-121']) {
    mkdirSync(join(dir, 'docs', 'specs', key, 'design'), { recursive: true });
    writeFileSync(join(dir, 'docs', 'specs', key, 'design.md'), claude);
    for (const [name, bytes] of files()) writeFileSync(join(dir, 'docs', 'specs', key, 'design', name), bytes);
  }
  git('add', '.');
  git('commit', '-q', '-m', 'docs(design): start (DEMO-1)');
  git('checkout', '-q', '-b', 'feature/DEMO-3-retire');
  writeFileSync(join(dir, 'docs', 'design-system', 'screens.md'), registry(['| USR-CART01 | Giỏ hàng | user | /cart | SHOP-120 | bỏ |', '| USR-CHK01 | Thanh toán | user | /checkout | SHOP-120 | dùng |', '| USR-CHK01 | Khác | user | /x | SHOP-1 | dùng |']));
  git('commit', '-q', '-am', 'docs(design): retire USR-CART01 (DEMO-3)');
  const policy = spawnSync(process.execPath, [join(ROOT, 'scripts', 'check-policy.mjs'), '--base', 'develop', '--title', 'docs(design): retire USR-CART01 (DEMO-3)'], { cwd: dir, encoding: 'utf8', env: { ...process.env, GITHUB_STEP_SUMMARY: '' } });
  assert.equal(policy.status, 1, policy.stdout + policy.stderr);
  const design = policy.stdout.slice(policy.stdout.indexOf('FAIL  Design'));
  assert.equal(design.match(/R5 USR-CHK01 is listed twice/g)?.length, 1, design);
  assert.match(design, /docs\/specs\/SHOP-120\/design\.md:\d+ D11 USR-CART01 is retired/);
  assert.match(design, /docs\/specs\/SHOP-121\/design\.md:\d+ D11 USR-CART01 is retired/);
  assert.doesNotMatch(design, /has \d+ problems?: node/);
});

test('Low 3 (reviewer): check-design and /ao-design take the same links as the link of a Claude artifact', () => {
  for (const url of ['https://claude.ai/artifact/4MHNq6Tk2x3o31S4RVXD5V', 'https://claude.ai/code/artifact/93305d92-b3b9-4969-8bd0-2708e02d255d', 'https://claude.ai/artifact/4MHNq6Tk2x3o31S4RVXD5V/', 'https://claude.ai/design/p/1c62be76', 'https://claude.ai/artifact/short']) {
    const d7 = checkDesign(claude.replace('https://claude.ai/artifact/4MHNq6Tk2x3o31S4RVXD5V', url), { images: files(), registry: registry() }).some(({ rule }) => rule === 'D7');
    assert.equal(d7, !isArtifactLink(url), url);
  }
});

test('Low 5 (reviewer): the artifact Thiết kế màn hình names the prototypes of Claude Design screens', () => {
  const rules = readFileSync(join(ROOT, 'kit', '.claude', 'rules', 'ai-orchestrator.md'), 'utf8');
  const row = rules.split('\n').find((line) => line.startsWith('| Thiết kế màn hình |'));
  assert.match(row, /prototype/);
  assert.match(row, /Claude Design/);
});

test('Low (security): ux reads the pages render wrote, never an artboard, and commits one as the prototype', () => {
  const ux = readFileSync(join(ROOT, 'agents', 'prompts', 'ux.md'), 'utf8').replace(/\s+/g, ' ');
  assert.match(ux, /render\/<code>\.html/);
  assert.match(ux, /design\/<code>\.html/);
  assert.doesNotMatch(ux, /design\/<code>\.dc\.html/);
  const fe = readFileSync(join(ROOT, 'agents', 'prompts', 'fe-dev.md'), 'utf8');
  assert.doesNotMatch(fe, /dc\.html/);
});

// The independent pass over the fixes of item 12 (2026-11-24): 7 Low and 1 note, each with the input that showed it.
test('pass Low: check reads no file of the inbox through a link and prints none of its text; a link with a slash is the one taken', (t) => {
  const { outside, run, inbox } = inboxProject(t);
  const canvas = join(inbox, 'KBBSLaVz8cHnCY9Vo57rj6', 'project', 'canvas.json');
  writeFileSync(join(outside, 'secret.txt'), 'notjson SECRET-TOKEN-123');
  rmSync(canvas);
  linkSync(join(outside, 'secret.txt'), canvas);
  const checked = run('check', 'SHOP-1', '--link', 'https://claude.ai/artifact/KBBSLaVz8cHnCY9Vo57rj6/');
  assert.equal(checked.status, 1);
  assert.match(checked.stdout, /KBBSLaVz8cHnCY9Vo57rj6\/project\/canvas\.json is a link to another file/);
  assert.doesNotMatch(checked.stdout + checked.stderr, /SECRET|notjson|not in the inbox/);
});

test('pass Low: an artboard that is a link stops its screen only; render still writes inbox.yaml and exits', (t) => {
  const { outside, run, inbox } = inboxProject(t);
  const board = join(inbox, 'KBBSLaVz8cHnCY9Vo57rj6', 'project', 'USR-HOME01.dc.html');
  writeFileSync(join(outside, 'board.html'), readFileSync(board));
  rmSync(board);
  linkSync(join(outside, 'board.html'), board);
  writeFileSync(join(inbox, 'inbox.yaml'), readFileSync(join(inbox, 'inbox.yaml'), 'utf8').replace('shots: []', 'shots: [old]'));
  const rendered = run('render', 'SHOP-1');
  assert.equal(rendered.status, 0, rendered.stderr);
  assert.match(rendered.stdout, /USR-HOME01: .*USR-HOME01\.dc\.html is a link to another file/);
  assert.doesNotMatch(readFileSync(join(inbox, 'inbox.yaml'), 'utf8'), /shots: \[old\]|- old/);
});

test('pass Low: canvas.json that does not parse is named, not quoted', () => {
  assert.deepEqual(boardsOf('notjson SECRET-TOKEN-123').problems, ['canvas.json does not parse as JSON']);
});

test('pass note: a handler glued to a slash or a quote is stripped too, and a fenced frame is escaped', () => {
  for (const trick of ['<img/onerror=alert(1) src=x>', '<img src="x"onerror="alert(1)">', "<img src='x'onerror=alert(1)>", '<fencedframe src="https://evil.example/"></fencedframe>']) {
    const body = stripCanvas(artboard(`<div>${trick}</div>`, '<style>body{margin:0}</style>')).html.split('<body>')[1];
    assert.doesNotMatch(body, /onerror/i, trick);
    assert.ok(!tags(body).includes('fencedframe'), trick);
  }
});

test('pass Low: a PR that deletes or renames the registry checks every design.md with project codes', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'policy98-gone-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const git = (...args) => spawnSync('git', ['-c', 'user.email=t@example.com', '-c', 'user.name=t', ...args], { cwd: dir, encoding: 'utf8' });
  git('init', '-q', '-b', 'develop');
  mkdirSync(join(dir, 'docs', 'design-system'), { recursive: true });
  writeFileSync(join(dir, 'docs', 'design-system', 'screens.md'), registry());
  mkdirSync(join(dir, 'docs', 'specs', 'SHOP-120', 'design'), { recursive: true });
  writeFileSync(join(dir, 'docs', 'specs', 'SHOP-120', 'design.md'), claude);
  for (const [name, bytes] of files()) writeFileSync(join(dir, 'docs', 'specs', 'SHOP-120', 'design', name), bytes);
  git('add', '.');
  git('commit', '-q', '-m', 'docs(design): start (DEMO-1)');
  git('checkout', '-q', '-b', 'feature/DEMO-4-move');
  git('mv', 'docs/design-system/screens.md', 'docs/design-system/codes.md');
  git('commit', '-q', '-m', 'docs(design): rename the registry (DEMO-4)');
  const policy = spawnSync(process.execPath, [join(ROOT, 'scripts', 'check-policy.mjs'), '--base', 'develop', '--title', 'docs(design): rename the registry (DEMO-4)'], { cwd: dir, encoding: 'utf8', env: { ...process.env, GITHUB_STEP_SUMMARY: '' } });
  assert.equal(policy.status, 1, policy.stdout + policy.stderr);
  assert.match(policy.stdout, /docs\/specs\/SHOP-120\/design\.md:\d+ D11 the file uses project screen codes, so docs\/design-system\/screens\.md lists them; the project has no such file/);
});
