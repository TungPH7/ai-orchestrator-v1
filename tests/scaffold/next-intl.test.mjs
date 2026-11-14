import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextIntlHealth } from '../../lib/scaffold/next-intl.mjs';

// ao-kit add --stack nextjs (project-scaffold part 3, spec 2.6): with next-intl and localePrefix 'always', / answers
// with a redirect to /<defaultLocale>, and the smoke test does not follow a redirect, so health is /<defaultLocale>.
// read(path) gives a file of the app folder, or null.
const files = (map) => (path) => map[path] ?? null;
const PKG = JSON.stringify({ dependencies: { next: '16.0.0', 'next-intl': '4.13.0' } });

test('an app without next-intl keeps the health path of the stack', () => {
  assert.equal(nextIntlHealth(files({ 'package.json': JSON.stringify({ dependencies: { next: '16.0.0' } }) })), null);
  assert.equal(nextIntlHealth(files({})), null);
});

test('a defaultLocale written in defineRouting, with the default localePrefix (always), gives /<locale>', () => {
  const read = files({
    'package.json': PKG,
    'src/i18n/routing.ts': "import { defineRouting } from 'next-intl/routing';\nexport const routing = defineRouting({ locales: ['vi', 'en'], defaultLocale: 'vi' });\n",
  });
  assert.deepEqual(nextIntlHealth(read), { health: '/vi', file: 'src/i18n/routing.ts' });
});

test('a defaultLocale imported from another file, as in the user app of shop, is read there', () => {
  const read = files({
    'package.json': PKG,
    'src/i18n/routing.ts': "import { defineRouting } from 'next-intl/routing';\n\nimport { defaultLocale, locales } from '~/config/i18n';\n\nexport const routing = defineRouting({\n  locales,\n  defaultLocale,\n});\n",
    'src/config/i18n.ts': "export const locales = ['en', 'vi'] as const;\nexport type Locale = (typeof locales)[number];\nexport const defaultLocale: Locale = 'en';\n",
  });
  assert.deepEqual(nextIntlHealth(read), { health: '/en', file: 'src/i18n/routing.ts' });
  const relative = files({
    'package.json': PKG,
    'i18n/routing.js': "import { defineRouting } from 'next-intl/routing';\nimport { defaultLocale } from './locales';\nexport const routing = defineRouting({ locales: ['de'], defaultLocale, localePrefix: 'always' });\n",
    'i18n/locales.js': "export const defaultLocale = 'de';\n",
  });
  assert.deepEqual(nextIntlHealth(relative), { health: '/de', file: 'i18n/routing.js' });
});

test('localePrefix as-needed or never serves / itself, so the health path of the stack stays', () => {
  for (const prefix of ["'as-needed'", "'never'", "{ mode: 'as-needed' }"]) {
    const read = files({
      'package.json': PKG,
      'src/i18n/routing.ts': `export const routing = defineRouting({ locales: ['en'], defaultLocale: 'en', localePrefix: ${prefix} });\n`,
    });
    assert.equal(nextIntlHealth(read), null, prefix);
  }
  const always = files({ 'package.json': PKG, 'src/i18n/routing.ts': "defineRouting({ locales: ['en'], defaultLocale: 'en', localePrefix: { mode: 'always' } })\n" });
  assert.deepEqual(nextIntlHealth(always), { health: '/en', file: 'src/i18n/routing.ts' });
});

test('next-intl whose routing cannot be read is reported, not guessed', () => {
  const none = nextIntlHealth(files({ 'package.json': PKG }));
  assert.match(none.problem, /uses next-intl, and ao-kit add found no defineRouting/);
  const unknown = nextIntlHealth(files({ 'package.json': PKG, 'src/i18n/routing.ts': "import { cfg } from 'some-package';\nexport const routing = defineRouting(cfg);\n" }));
  assert.match(unknown.problem, /could not read the defaultLocale of src\/i18n\/routing\.ts/);
});
