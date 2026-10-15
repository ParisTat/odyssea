import { describe, expect, test } from 'vitest';
import { isThemeId, resolveInitialTheme, THEME_IDS } from './theme';

describe('isThemeId', () => {
  test.each(THEME_IDS)('accepts %s', (id) => {
    expect(isThemeId(id)).toBe(true);
  });

  test.each([null, undefined, '', 'Dark', 'neon', 1])('rejects %s', (value) => {
    expect(isThemeId(value)).toBe(false);
  });
});

describe('resolveInitialTheme', () => {
  test('a stored choice wins over the system preference', () => {
    expect(resolveInitialTheme('wood', true)).toBe('wood');
    expect(resolveInitialTheme('white', true)).toBe('white');
  });

  test('without a stored choice, follows a dark system preference', () => {
    expect(resolveInitialTheme(null, true)).toBe('dark');
  });

  test('without a stored choice, defaults to white', () => {
    expect(resolveInitialTheme(null, false)).toBe('white');
  });

  test('ignores a stored value that is not a theme', () => {
    expect(resolveInitialTheme('neon', true)).toBe('dark');
    expect(resolveInitialTheme('neon', false)).toBe('white');
  });
});
