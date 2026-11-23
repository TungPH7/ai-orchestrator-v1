import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkDesign, imageInfo, readDesign } from '../../lib/quality/design.mjs';
import { ROOT } from '../helpers/kit.mjs';
import { jpeg, lfs, png } from '../helpers/images.mjs';

const FIXTURES = join(ROOT, 'tests', 'fixtures', 'design');
const valid = readFileSync(join(FIXTURES, 'valid.md'), 'utf8');
const template = readFileSync(join(ROOT, 'templates', 'design.md'), 'utf8');
const figma = readFileSync(join(FIXTURES, 'figma.md'), 'utf8');
// The images of figma.md, as the files of its design/ folder.
const figmaImages = () => new Map([['S1-desktop.png', png(1440, 900)], ['S1-mobile.jpg', jpeg(390, 844)]]);

// The content of the ````markdown fence in the Example section of templates/design.md.
function templateExample() {
  const example = template.slice(template.lastIndexOf('\n## Example\n'));
  return example.slice(example.indexOf('````markdown\n') + '````markdown\n'.length, example.lastIndexOf('\n````'));
}

test('a design with two ASCII screens, a flow and complete YAML has no error', () => {
  assert.deepEqual(checkDesign(valid), []);
});

test('the example of templates/design.md with its sample images, and the template itself without images, have no error', () => {
  const images = new Map([['S2-desktop.png', png(1440, 1100)], ['S2-mobile.png', png(390, 1600)]]);

  assert.deepEqual(checkDesign(templateExample(), { images }), []);
  assert.deepEqual(checkDesign(template), []);
});

test('a design with a Figma screen, its images and an ASCII screen has no error', () => {
  assert.deepEqual(checkDesign(figma, { images: figmaImages() }), []);
});

test('a file with CRLF line ends reads like one with LF', () => {
  assert.deepEqual(checkDesign(valid.replaceAll('\n', '\r\n')), []);
  assert.deepEqual(readDesign(valid.replaceAll('\n', '\r\n')).drawings.map(({ code }) => code), ['S1', 'S2']);
});

test('[ ] and [___] in a drawing are input boxes, not block codes', () => {
  const s1 = readDesign(valid).drawings.find(({ code }) => code === 'S1');
  const numbers = s1.body.flatMap(({ text }) => [...text.matchAll(/\[(\d+)\]/g)].map(([, n]) => Number(n)));

  assert.deepEqual(numbers, [1, 2, 3, 4, 5]);
  assert.ok(s1.body.some(({ text }) => text.includes('[ ]')));
  assert.ok(s1.body.some(({ text }) => text.includes('[___')));
});

test('the parts of the file: drawings by screen code, YAML blocks, the flow and the rows of the screen table', () => {
  const design = readDesign(valid);

  assert.deepEqual(design.drawings.map(({ code, line }) => `${code}@${line}`), ['S1@23', 'S2@60']);
  assert.equal(design.yamls.length, 2);
  assert.equal(design.flows.length, 1);
  assert.deepEqual(design.rows.map(({ code }) => code), ['S1', 'S2']);
  assert.deepEqual(design.images, []);
});

// Each fixture is valid.md with one change; its name starts with the code of the rule it breaks.
for (const file of readdirSync(join(FIXTURES, 'invalid')).filter((name) => /^d\d-/.test(name))) {
  const rule = file.slice(0, 2).toUpperCase();
  test(`${file} breaks ${rule} and nothing else`, () => {
    const errors = checkDesign(readFileSync(join(FIXTURES, 'invalid', file), 'utf8'));

    assert.ok(errors.length > 0, 'at least one error');
    assert.deepEqual([...new Set(errors.map((e) => e.rule))], [rule], JSON.stringify(errors));
    for (const { line, message } of errors) assert.ok(line > 0 && message, `line and message: ${JSON.stringify(errors)}`);
  });
}

test('every rule from D1 to D7, and D9, has at least one invalid fixture; D8 needs image files, so its tests build them', () => {
  const rules = new Set(readdirSync(join(FIXTURES, 'invalid')).map((name) => name.slice(0, 2).toUpperCase()));
  for (const rule of ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D9']) assert.ok(rules.has(rule), rule);
});

test('errors name what is wrong and point to its line', () => {
  const read = (name) => checkDesign(readFileSync(join(FIXTURES, 'invalid', `${name}.md`), 'utf8'));

  assert.deepEqual(read('d2-block-without-yaml'), [{ rule: 'D2', line: 31, message: '[5] of S1 has no entry under blocks in its YAML' }]);
  assert.deepEqual(read('d1-unknown-key'), [
    { rule: 'D1', line: 47, message: "S1.4 has an unknown key 'behaviour'; a block has name, type, content, behavior, validation, states, a11y, ac, figma" },
  ]);
  assert.deepEqual(read('d3-arrow-block'), [{ rule: 'D3', line: 16, message: 'the arrow from S1 names [9], which S1 does not have' }]);
  assert.deepEqual(read('d4-too-wide'), [{ rule: 'D4', line: 63, message: 'a drawing line has 105 columns; the limit is 100' }]);
  assert.match(read('d1-yaml-syntax')[0].message, /^YAML does not parse/);
});

test('check-design prints each error with the file, line and code, and fails; a clean file prints Design OK', () => {
  const run = (file) => spawnSync(process.execPath, [join(ROOT, 'scripts', 'check-design.mjs'), file], { encoding: 'utf8' });
  const bad = run(join(FIXTURES, 'invalid', 'd2-block-without-yaml.md'));

  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /d2-block-without-yaml\.md:31 D2 \[5\] of S1 has no entry under blocks in its YAML/);
  assert.match(bad.stderr, /1 error\(s\)/);

  const good = run(join(FIXTURES, 'valid.md'));
  assert.equal(good.status, 0, good.stderr);
  assert.match(good.stdout, /^Design OK: .*valid\.md/m);
});

test('image headers give the type, the size and the dimensions; an LFS pointer gives the size of its object', () => {
  assert.deepEqual(imageInfo(png(1440, 900)), { kind: 'png', size: png(1440, 900).length, width: 1440, height: 900 });
  assert.deepEqual(imageInfo(jpeg(390, 844)), { kind: 'jpeg', size: jpeg(390, 844).length, width: 390, height: 844 });
  assert.deepEqual(imageInfo(lfs(523000)), { kind: 'lfs', size: 523000 });
  assert.deepEqual(imageInfo(Buffer.from('GIF89a and more')), { kind: null, size: 15 });
});

// D8 reads the files of the design/ folder next to design.md; each case changes one image of figma.md.
const d8 = (images, text = figma) => {
  const errors = checkDesign(text, { images });
  assert.deepEqual([...new Set(errors.map((e) => e.rule))], ['D8'], JSON.stringify(errors));
  return errors.map(({ message }) => message);
};
const withImage = (name, bytes) => new Map([...figmaImages(), [name, bytes]]);

test('D8: an image the file names must exist, and every file in design/ must be named by the file', () => {
  const images = figmaImages();
  images.delete('S1-mobile.jpg');
  assert.deepEqual(d8(images), ['design/S1-mobile.jpg does not exist']);
  assert.deepEqual(d8(withImage('S1-old.png', png(10, 10))), ['design/S1-old.png is in design/ but design.md does not use it']);
});

test('D8: images sit in the design/ folder next to design.md', () => {
  assert.deepEqual(d8(figmaImages(), figma.replace('](design/S1-desktop.png)', '](images/S1-desktop.png)')), [
    'images/S1-desktop.png must be in the design/ folder next to design.md',
    'design/S1-desktop.png is in design/ but design.md does not use it',
  ]);
});

test('D8: an image is a PNG or a JPEG by its content, whatever its name ends with', () => {
  assert.deepEqual(d8(withImage('S1-desktop.png', Buffer.from('GIF89a and more'))), ['design/S1-desktop.png is not a PNG or JPEG file']);
  assert.deepEqual(checkDesign(figma, { images: withImage('S1-desktop.png', jpeg(1440, 900)) }), []);
});

test('D8: an image is at most 1 MB and at most 2,000 px on its long side', () => {
  assert.deepEqual(d8(withImage('S1-desktop.png', png(1440, 900, 1_100_000))), [
    `design/S1-desktop.png is ${png(1440, 900, 1_100_000).length} bytes; the limit is 1 MB (1048576 bytes): export it as JPG`,
  ]);
  assert.deepEqual(d8(withImage('S1-desktop.png', png(1440, 4000))), ['design/S1-desktop.png is 1440×4000 px; the long side is at most 2000 px: export the frame in slices']);
  assert.deepEqual(d8(withImage('S1-mobile.jpg', jpeg(2400, 1200))), ['design/S1-mobile.jpg is 2400×1200 px; the long side is at most 2000 px: export the frame in slices']);
});

test('D8: for a Git LFS pointer only the size it records is checked', () => {
  assert.deepEqual(checkDesign(figma, { images: withImage('S1-desktop.png', lfs(523000)) }), []);
  assert.deepEqual(d8(withImage('S1-desktop.png', lfs(2_500_000))), [
    'design/S1-desktop.png is 2500000 bytes; the limit is 1 MB (1048576 bytes): export it as JPG',
  ]);
});

test('check-design reads the images in the design/ folder next to the file', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'design-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, 'design'));
  writeFileSync(join(dir, 'design.md'), figma);
  for (const [name, bytes] of figmaImages()) writeFileSync(join(dir, 'design', name), bytes);
  const run = () => spawnSync(process.execPath, [join(ROOT, 'scripts', 'check-design.mjs'), join(dir, 'design.md')], { encoding: 'utf8' });

  assert.equal(run().status, 0, run().stderr);
  rmSync(join(dir, 'design', 'S1-mobile.jpg'));
  const failed = run();
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /design\.md:\d+ D8 design\/S1-mobile\.jpg does not exist/);
});

// project-scaffold part 2, spec 2.5: a screen shown by a screenshot or a mockup, with no Figma behind it.
test('an Image screen names where its screenshot comes from, needs no Figma version, and the file has a Design System section', () => {
  const screenshot = figma
    .replace('figma: https://www.figma.com/design/AbCdEf123/Shop?node-id=12-345\n', 'screenshot: ảnh bạn gửi ngày 2026-11-13, chụp trang thanh toán của shop mẫu\n')
    .replace(/^> \*\*Figma version:\*\*.*$/m, '> **Figma version:** none')
    .replace(/^ {4}figma: ".*"\n/gm, '');
  assert.deepEqual(checkDesign(screenshot, { images: figmaImages() }), []);
  const empty = screenshot.replace(/^screenshot: .*$/m, "screenshot: ''");
  assert.deepEqual(checkDesign(empty, { images: figmaImages() }).map(({ rule, message }) => `${rule} ${message}`), ['D7 screenshot of S1 names where the screenshot or mockup comes from, such as the page it was taken of']);
  const neither = screenshot.replace(/^screenshot: .*\n/m, '');
  assert.match(checkDesign(neither, { images: figmaImages() })[0].message, /^S1 is shown by images, so its YAML says where they come from: figma, the link of its frame with node-id, or screenshot/);
  const noSection = screenshot.slice(0, screenshot.indexOf('\n## Design System'));
  assert.deepEqual(checkDesign(noSection, { images: figmaImages() }).map(({ rule }) => rule), ['D9']);
});

// Project screen codes and Claude Design screens (tasks/todo.md item 10, Phiên 35 · Lượt 84–87).
const claude = readFileSync(join(FIXTURES, 'claude-design-screens.md'), 'utf8');
const claudeFiles = () => new Map([['USR-CART01-desktop.png', png(1440, 900)], ['USR-CART01-mobile.png', png(390, 1214)], ['USR-CART01.dc.html', Buffer.from('<x-dc><div>Giỏ hàng</div></x-dc>')]]);
const screensFile = (rows = ['| USR-CART01 | Giỏ hàng | user | /cart | SHOP-120 | dùng |', '| USR-CHK01 | Thanh toán | user | /checkout | SHOP-120 | dùng |']) => [
  '# Mã màn hình', '', '## Apps', '', '| Prefix | App |', '|---|---|', '| USR | user |', '| ADM | admin |', '',
  '## Areas', '', '| Area | Meaning |', '|---|---|', '| CART | Giỏ hàng |', '| CHK | Thanh toán |', '',
  '## Screens', '', '| Code | Name | App | Route | Epic | State |', '|---|---|---|---|---|---|', ...rows, '',
].join('\n');
const rulesOf = (text, more = {}) => checkDesign(text, { images: claudeFiles(), registry: screensFile(), ...more }).map(({ rule, message }) => `${rule} ${message}`);

test('a design with project codes, a Claude Design screen, its images and prototype, and its codes in the registry has no error', () => {
  assert.deepEqual(checkDesign(claude, { images: claudeFiles(), registry: screensFile() }), []);
  const design = readDesign(claude);
  assert.deepEqual(design.rows.map(({ code }) => code), ['USR-CART01', 'USR-CHK01']);
  assert.deepEqual(design.drawings.map(({ code }) => code), ['USR-CHK01']);
  assert.deepEqual(design.images.map(({ code }) => code), ['USR-CART01', 'USR-CART01']);
  assert.equal(design.claudeVersion.value, '1795459699-c1d6');
});

test('D10: one file uses one kind of screen code', () => {
  const mixed = claude.replaceAll('USR-CHK01', 'S2');
  assert.deepEqual(rulesOf(mixed, { registry: undefined }).filter((r) => r.startsWith('D10')), ['D10 the file mixes project screen codes, such as USR-CART01, with codes of one Epic, such as S2: use one kind']);
});

test('D11: a project code is in docs/design-system/screens.md, with the same app and route; the registry itself is valid', () => {
  assert.deepEqual(rulesOf(claude, { registry: screensFile(['| USR-CART01 | Giỏ hàng | user | /cart | SHOP-120 | dùng |']) }), ['D11 USR-CHK01 is not in docs/design-system/screens.md: add its row with its name, app, route, Epic and state']);
  assert.deepEqual(rulesOf(claude, { registry: screensFile(['| USR-CART01 | Giỏ hàng | user | /basket | SHOP-90 | dùng |', '| USR-CHK01 | Thanh toán | user | /checkout | SHOP-120 | dùng |']) }), ['D11 USR-CART01 has the route /basket in docs/design-system/screens.md, but /cart here: one code names one screen']);
  assert.deepEqual(rulesOf(claude, { registry: screensFile(['| USR-CART01 | Giỏ hàng | user | /cart | SHOP-120 | bỏ |', '| USR-CHK01 | Thanh toán | user | /checkout | SHOP-120 | dùng |']) }), ['D11 USR-CART01 is retired (bỏ) in docs/design-system/screens.md: a retired code is never used again']);
  assert.deepEqual(rulesOf(claude.replace('| Claude Design | user |', '| Claude Design | admin |')), ['D11 USR-CART01 is a screen of user in docs/design-system/screens.md, but its App here is admin']);
  assert.deepEqual(rulesOf(claude, { registry: null }), ['D11 the file uses project screen codes, so docs/design-system/screens.md lists them; the project has no such file']);
  assert.deepEqual(rulesOf(claude, { registry: screensFile(['| USR-CART01 | Giỏ hàng | user | /cart | SHOP-120 | dùng |', '| USR-CHK01 | Thanh toán | user | /checkout | SHOP-120 | dùng |', '| USR-CART01 | Khác | user | /x | SHOP-1 | dùng |']) }), ['D11 docs/design-system/screens.md:23 R5 USR-CART01 is listed twice: a code names one screen only']);
  // A design.md of one Epic, S1 and S2, does not read the registry.
  assert.deepEqual(checkDesign(valid, { registry: null }), []);
});

test('D7: a Claude Design screen names its artifact, one source only, and the file names the approved Claude Design version', () => {
  assert.deepEqual(rulesOf(claude.replace('https://claude.ai/artifact/4MHNq6Tk2x3o31S4RVXD5V', 'https://claude.ai/design/p/1c62be76')), ['D7 claude-design of USR-CART01 must be the link of a Claude artifact, such as https://claude.ai/artifact/<id>']);
  assert.deepEqual(rulesOf(claude.replace('prototype:', 'screenshot: ảnh của bạn\nprototype:')), ['D7 USR-CART01 has more than one of figma, claude-design and screenshot: an image screen comes from one of them']);
  assert.deepEqual(rulesOf(claude.replace('1795459699-c1d6', 'none')), ['D7 name the approved Claude Design version: the file has Claude Design screens']);
  assert.deepEqual(rulesOf(claude.replace('>\n> **Claude Design version:** 1795459699-c1d6\n', '')), ['D7 the file has Claude Design screens, so its header needs a "Claude Design version:" line']);
});

test('D8: a prototype sits in design/, is an HTML file of at most 256 KB, and counts as used', () => {
  const files = claudeFiles();
  files.delete('USR-CART01.dc.html');
  assert.deepEqual(rulesOf(claude, { images: files }), ['D8 design/USR-CART01.dc.html does not exist']);
  assert.deepEqual(rulesOf(claude.replace('prototype: design/USR-CART01.dc.html', 'prototype: ../USR-CART01.dc.html')), ['D8 design/USR-CART01.dc.html is in design/ but design.md does not use it', 'D8 ../USR-CART01.dc.html must be an .html file in the design/ folder next to design.md']);
  const big = claudeFiles();
  big.set('USR-CART01.dc.html', Buffer.alloc(300 * 1024, 'a'));
  assert.deepEqual(rulesOf(claude, { images: big }), ['D8 design/USR-CART01.dc.html is 307200 bytes; a prototype is at most 256 KB (262144 bytes)']);
});

test('check-design of docs/specs/<KEY>/design.md reads the registry of its project, and says when there is none', (t) => {
  const project = mkdtempSync(join(tmpdir(), 'design-project-'));
  t.after(() => rmSync(project, { recursive: true, force: true }));
  const dir = join(project, 'docs', 'specs', 'SHOP-120');
  mkdirSync(join(dir, 'design'), { recursive: true });
  writeFileSync(join(dir, 'design.md'), claude);
  for (const [name, bytes] of claudeFiles()) writeFileSync(join(dir, 'design', name), bytes);
  const run = () => spawnSync(process.execPath, [join(ROOT, 'scripts', 'check-design.mjs'), join(dir, 'design.md')], { encoding: 'utf8' });

  const none = run();
  assert.equal(none.status, 1);
  assert.match(none.stderr, /D11 the file uses project screen codes, so docs\/design-system\/screens\.md lists them/);
  mkdirSync(join(project, 'docs', 'design-system'));
  writeFileSync(join(project, 'docs', 'design-system', 'screens.md'), screensFile());
  assert.equal(run().status, 0, run().stderr);
});
