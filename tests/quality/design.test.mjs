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

test('every rule from D1 to D7 has at least one invalid fixture; D8 needs image files, so its tests build them', () => {
  const rules = new Set(readdirSync(join(FIXTURES, 'invalid')).map((name) => name.slice(0, 2).toUpperCase()));
  for (const rule of ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7']) assert.ok(rules.has(rule), rule);
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
