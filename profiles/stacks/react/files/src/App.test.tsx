import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { App } from './App';

test('the home page shows the name of the project as its heading', () => {
  render(<App />);
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('__TITLE__');
});
