import { isValidElement, type ReactElement } from 'react';
import { expect, test } from 'vitest';
import Home from './page';

test('the home page shows the name of the project as its heading', () => {
  const main = Home();
  expect(isValidElement(main)).toBe(true);
  const heading = (main.props as { children: ReactElement<{ children: string }> }).children;
  expect(heading.type).toBe('h1');
  expect(heading.props.children).toBe('__TITLE__');
});
