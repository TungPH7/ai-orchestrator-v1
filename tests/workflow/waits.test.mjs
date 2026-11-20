// C2 spec section 4: every STOP says what it waits for, so the dispatcher /ao-run reads it and never the words of next.
// The source is read, so a stop that no test reaches is checked too.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { WAITS } from '../../lib/workflow/steps.mjs';
import { ROOT } from '../helpers/kit.mjs';

const source = (file) => readFileSync(join(ROOT, 'lib', 'workflow', file), 'utf8');
// stop( on its own or after a spread, not a method such as preview.stop() or a name such as flaggedStop(.
const CALL = /(?<![\w$])(?:(?<=\.\.\.)|(?<!\.))stop\(\s*/g;

test('every stop of decideStep names what it waits for first: one of WAITS, or a variable waits', () => {
  const text = source('steps.mjs');
  const calls = [...text.matchAll(CALL)].map((match) => ({ at: text.slice(0, match.index).split('\n').length, rest: text.slice(match.index + match[0].length, match.index + match[0].length + 40) }));
  // The definition itself is "function stop(waits, …".
  const uses = calls.filter(({ rest }) => !rest.startsWith('waits, reason'));
  assert.ok(uses.length > 100, `found only ${uses.length} stops`);
  const bad = uses.filter(({ rest }) => {
    const literal = rest.match(/^'(\w+)'/);
    return literal ? !WAITS.includes(literal[1]) : !/^waits\b/.test(rest);
  });
  assert.deepEqual(bad.map(({ at, rest }) => `line ${at}: stop(${rest}`), []);
});

test('every stop of the runner goes through halt, which names what it waits for first', () => {
  const text = source('runner.mjs');
  const calls = [...text.matchAll(/(?<![\w$.])halt\(\s*/g)].map((match) => ({ at: text.slice(0, match.index).split('\n').length, rest: text.slice(match.index + match[0].length, match.index + match[0].length + 30) }));
  const uses = calls.filter(({ rest }) => !rest.startsWith('waits, reason'));
  assert.ok(uses.length >= 13, `found only ${uses.length} stops`);
  const bad = uses.filter(({ rest }) => !WAITS.includes(rest.match(/^'(\w+)'/)?.[1]));
  assert.deepEqual(bad.map(({ at, rest }) => `line ${at}: halt(${rest}`), []);
  // No reason set another way, which would leave its waits out.
  assert.doesNotMatch(text, /\breason = /);
});

test('WAITS holds the seven values of the spec', () => {
  assert.deepEqual(WAITS, ['you', 'ci', 'deploy', 'item', 'usage', 'fix', 'next']);
});
