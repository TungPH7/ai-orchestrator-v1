import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkDesign, readDesign } from '../../lib/quality/design.mjs';
import { ROOT } from '../helpers/kit.mjs';

const FIXTURES = join(ROOT, 'tests', 'fixtures', 'design');
const valid = readFileSync(join(FIXTURES, 'valid.md'), 'utf8');
const template = readFileSync(join(ROOT, 'templates', 'design.md'), 'utf8');

// The content of the ````markdown fence in the Example section of templates/design.md.
function templateExample() {
  const example = template.slice(template.lastIndexOf('\n## Example\n'));
  return example.slice(example.indexOf('````markdown\n') + '````markdown\n'.length, example.lastIndexOf('\n````'));
}

test('a design with two ASCII screens, a flow and complete YAML has no error', () => {
  assert.deepEqual(checkDesign(valid), []);
});

test('the example of templates/design.md, and the template itself, have no error', () => {
  assert.deepEqual(checkDesign(templateExample()), []);
  assert.deepEqual(checkDesign(template), []);
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

test('every rule from D1 to D6 has at least one invalid fixture', () => {
  const rules = new Set(readdirSync(join(FIXTURES, 'invalid')).map((name) => name.slice(0, 2).toUpperCase()));
  for (const rule of ['D1', 'D2', 'D3', 'D4', 'D5', 'D6']) assert.ok(rules.has(rule), rule);
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
