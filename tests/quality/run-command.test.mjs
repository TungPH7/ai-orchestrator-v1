import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runPlan, summarize } from '../../lib/quality/run-command.mjs';

// The kit followups before C1, batch 2 (Phiên 33 · Lượt 59–61): one command runs the tests of an app, so an agent stops
// guessing how to run Maven or pnpm on Windows (SHOP-44, SHOP-21 of shop, Pilot 3).

test('a Java app runs through the Maven wrapper of the kit, with what follows -- given to Maven as it is', () => {
  assert.deepEqual(runPlan({ app: 'api', script: 'test', extra: ['-Dtest=ProductServiceTest'], hasPom: true, manager: 'pnpm' }), {
    tool: 'kit-script',
    args: ['mvnw.mjs', 'apps/api', 'test', '-Dtest=ProductServiceTest'],
  });
});

test('a JS app runs its script with the package manager of the project: pnpm by --filter, npm by --workspace', () => {
  assert.deepEqual(runPlan({ app: 'user', script: 'test', extra: ['product-card'], hasPom: false, manager: 'pnpm' }), {
    tool: 'pnpm',
    args: ['--filter', './apps/user', 'run', 'test', '--', 'product-card'],
  });
  assert.deepEqual(runPlan({ app: 'admin', script: 'lint', extra: [], hasPom: false, manager: 'pnpm' }), { tool: 'pnpm', args: ['--filter', './apps/admin', 'run', 'lint'] });
  assert.deepEqual(runPlan({ app: 'web', script: 'test', extra: ['-t', 'AC3'], hasPom: false, manager: 'npm' }), {
    tool: 'npm',
    args: ['--workspace', 'apps/web', 'run', 'test', '--', '-t', 'AC3'],
  });
  // A project of one app at its root, as ao-green.
  assert.deepEqual(runPlan({ app: '.', script: 'test', extra: [], hasPom: false, manager: 'npm' }), { tool: 'npm', args: ['run', 'test'] });
});

test('an app or a script that is not a plain name is refused, so nothing reaches a shell', () => {
  for (const app of ['../x', 'apps/user', 'a b', '', 'x;rm']) assert.throws(() => runPlan({ app, script: 'test', extra: [], hasPom: false, manager: 'pnpm' }), /app/, app);
  for (const script of ['', 'a b', 'test;x']) assert.throws(() => runPlan({ app: 'user', script, extra: [], hasPom: false, manager: 'pnpm' }), /script/, script);
});

test('the summary keeps the counts of vitest, Playwright and Maven, and the first failure, without the ANSI colours', () => {
  const vitest = [
    '\u001b[32m✓\u001b[39m src/a.test.ts (3 tests) 12ms',
    ' FAIL  src/b.test.ts > shows the price',
    'AssertionError: expected "1.250.000 ₫" to be "1.250.000 đ"',
    '    at src/b.test.ts:12:5',
    ' Test Files  1 failed | 4 passed (5)',
    '      Tests  1 failed | 41 passed (42)',
  ].join('\n');
  const one = summarize(vitest);
  assert.ok(one.includes(' Test Files  1 failed | 4 passed (5)'), one.join('\n'));
  assert.ok(one.includes('      Tests  1 failed | 41 passed (42)'));
  assert.ok(one.includes('First failure:'));
  assert.ok(one.some((line) => line.includes('FAIL  src/b.test.ts > shows the price')));
  assert.ok(one.some((line) => line.includes('AssertionError')));
  assert.ok(!one.some((line) => line.includes('\u001b')), 'no ANSI colour codes');

  const maven = ['[INFO] Tests run: 9, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 3.9 s -- in com.x.ATest', '[INFO] Results:', '[INFO] Tests run: 381, Failures: 0, Errors: 0, Skipped: 0', '[INFO] BUILD SUCCESS'].join('\n');
  const two = summarize(maven);
  assert.deepEqual(two, ['[INFO] Tests run: 381, Failures: 0, Errors: 0, Skipped: 0', '[INFO] BUILD SUCCESS'], 'the total of Maven, not the line of each class');

  const playwright = ['Running 140 tests using 1 worker', '  ✘  12 [user] › e2e/products.spec.ts:30:3 › AC21 load more', '  134 passed (2.1m)', '  6 skipped', '  1 failed'].join('\n');
  const three = summarize(playwright);
  for (const line of ['  134 passed (2.1m)', '  6 skipped', '  1 failed']) assert.ok(three.includes(line), line);
  assert.ok(three.some((line) => line.includes('AC21 load more')));

  // tsc and pnpm, as run.mjs user typecheck printed them on shop.
  const tsc = ["src/a.ts(27,13): error TS2769: No overload matches this call.", '[ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL] user@0.1.0 typecheck: `tsc --noEmit`'].join('\n');
  const four = summarize(tsc);
  assert.equal(four[0], 'First failure:');
  assert.ok(four.some((line) => line.includes('error TS2769')));
  assert.ok(summarize('npm ERR! code ELIFECYCLE').some((line) => line.includes('npm ERR!')));

  const long = summarize(['FAIL x', ...Array.from({ length: 100 }, (_, i) => `line ${i}`)].join('\n'), { max: 10 });
  assert.equal(long.filter((line) => line.startsWith('line ')).length, 9, 'the failure is cut at max lines');
  assert.deepEqual(summarize('all quiet\n'), [], 'nothing to say: the caller says the exit code');
});
