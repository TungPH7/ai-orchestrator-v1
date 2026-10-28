import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchesGlob } from '../../lib/quality/glob.mjs';

test('* stays within one name and ** crosses folders', () => {
  assert.ok(matchesGlob('release/*', 'release/v1.0.0'));
  assert.ok(!matchesGlob('release/*', 'release/v1/hotfix'));
  assert.ok(matchesGlob('.github/workflows/**', '.github/workflows/ci.yml'));
  assert.ok(matchesGlob('.github/workflows/**', '.github/workflows/sub/deploy.yml'));
  assert.ok(!matchesGlob('.github/workflows/**', 'docs/.github/workflows/ci.yml'));
});

test('**/ also matches the top folder, and braces give alternatives', () => {
  assert.ok(matchesGlob('**/*.{ts,tsx}', 'app.ts'));
  assert.ok(matchesGlob('**/*.{ts,tsx}', 'apps/web/app/page.tsx'));
  assert.ok(!matchesGlob('**/*.{ts,tsx}', 'apps/web/app/page.js'));
  assert.ok(matchesGlob('**/*.{test,spec}.*', 'apps/api/src/auth.spec.ts'));
  assert.ok(matchesGlob('**/migrations/**', 'apps/api/src/migrations/1700-init.ts'));
  assert.ok(matchesGlob('**/*.config.*', 'next.config.mjs'));
});

test('dots and other regex characters are literal', () => {
  assert.ok(!matchesGlob('**/*.d.ts', 'apps/web/indexXdXts'));
  assert.ok(matchesGlob('apps/(web)/a+b.ts', 'apps/(web)/a+b.ts'));
});
