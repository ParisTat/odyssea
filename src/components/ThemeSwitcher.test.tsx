import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { THEME_FADE_MS, THEME_STORAGE_KEY } from '@/domain/theme';
import ThemeSwitcher from './ThemeSwitcher';

const root = document.documentElement;

beforeEach(() => {
  delete root.dataset.theme;
  delete root.dataset.themeFading;
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('ThemeSwitcher', () => {
  test('offers the three themes and marks the applied one as pressed', () => {
    root.dataset.theme = 'wood';
    render(<ThemeSwitcher />);

    const group = screen.getByRole('group', { name: 'Theme' });
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['White', 'Wood', 'Dark']);
    expect(screen.getByRole('button', { name: 'Wood' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'White' })).toHaveAttribute('aria-pressed', 'false');
  });

  test('switching applies the theme, remembers it and fades only for a moment', () => {
    vi.useFakeTimers();
    render(<ThemeSwitcher />);

    fireEvent.click(screen.getByRole('button', { name: 'Dark' }));

    expect(root.dataset.theme).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true');
    expect(root).toHaveAttribute('data-theme-fading');

    act(() => {
      vi.advanceTimersByTime(THEME_FADE_MS + 50);
    });
    expect(root).not.toHaveAttribute('data-theme-fading');
  });

  test('rapid switches keep fading until the last one has finished', () => {
    vi.useFakeTimers();
    render(<ThemeSwitcher />);

    fireEvent.click(screen.getByRole('button', { name: 'Dark' }));
    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Wood' }));
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(root).toHaveAttribute('data-theme-fading');

    act(() => {
      vi.advanceTimersByTime(THEME_FADE_MS);
    });
    expect(root).not.toHaveAttribute('data-theme-fading');
    expect(root.dataset.theme).toBe('wood');
  });

  test('unmounting mid-fade leaves no fading flag behind', () => {
    const { unmount } = render(<ThemeSwitcher />);

    fireEvent.click(screen.getByRole('button', { name: 'Dark' }));
    unmount();

    expect(root).not.toHaveAttribute('data-theme-fading');
  });

  test('picking the theme that is already active does nothing', () => {
    root.dataset.theme = 'wood';
    render(<ThemeSwitcher />);

    fireEvent.click(screen.getByRole('button', { name: 'Wood' }));

    expect(root).not.toHaveAttribute('data-theme-fading');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  test('still switches when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<ThemeSwitcher />);

    fireEvent.click(screen.getByRole('button', { name: 'Wood' }));

    expect(root.dataset.theme).toBe('wood');
  });

  test('uses the stored theme when none is applied yet', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'wood');
    render(<ThemeSwitcher />);

    expect(screen.getByRole('button', { name: 'Wood' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('falls back to the system preference when nothing is stored', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    render(<ThemeSwitcher />);

    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('defaults to white when storage cannot be read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<ThemeSwitcher />);

    expect(screen.getByRole('button', { name: 'White' })).toHaveAttribute('aria-pressed', 'true');
  });
});
