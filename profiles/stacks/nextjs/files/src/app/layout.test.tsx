import { isValidElement } from 'react';
import { expect, test } from 'vitest';
import RootLayout, { metadata } from './layout';

test('the tab is named after the project', () => {
  expect(metadata.title).toBe('__TITLE__');
});

test('the page is marked as Vietnamese', () => {
  const html = RootLayout({ children: null, params: Promise.resolve({}) });
  expect(isValidElement(html)).toBe(true);
  expect((html.props as { lang?: string }).lang).toBe('vi');
});
