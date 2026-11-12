import { expect, test } from '@playwright/test';

// The first E2E tests of the project: the web answers, and the API is up. The name of each test of a feature starts
// with the code of its criterion, such as `AC3 applies a valid coupon`.
test('the home page shows the name of the project', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: '__TITLE__' })).toBeVisible();
});

// @local: only the apps of an environment reach its API, so this test runs on the apps Playwright starts here.
test('the API reports that it is up', { tag: '@local' }, async ({ request }) => {
  const response = await request.get('http://localhost:3001/health');
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: 'ok' });
});
