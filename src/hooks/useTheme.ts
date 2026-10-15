import { useCallback, useEffect, useRef, useState } from 'react';
import { isThemeId, resolveInitialTheme, THEME_FADE_MS, THEME_STORAGE_KEY, type ThemeId } from '@/domain/theme';

// The theme lives on <html data-theme>, so the CSS tokens in index.css switch with it.
// localStorage can be blocked (private mode, strict settings); then the choice lasts for this visit only.

export function readStoredTheme(): string | null {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeTheme(id: ThemeId): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {
    // Storage is blocked: the theme still applies, it just isn't remembered.
  }
}

export function prefersDarkScheme(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyTheme(id: ThemeId): void {
  document.documentElement.dataset.theme = id;
}

function currentTheme(): ThemeId {
  const applied = document.documentElement.dataset.theme;
  return isThemeId(applied) ? applied : resolveInitialTheme(readStoredTheme(), prefersDarkScheme());
}

/** The active theme and a setter that applies it with the slow cross-fade and remembers it. */
export function useTheme(): [ThemeId, (id: ThemeId) => void] {
  const [theme, setThemeState] = useState<ThemeId>(currentTheme);
  const fadeTimer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      // Unmounting mid-fade must not leave the flag behind: it switches off every hover transition.
      window.clearTimeout(fadeTimer.current);
      delete document.documentElement.dataset.themeFading;
    },
    [],
  );

  const setTheme = useCallback((id: ThemeId) => {
    const root = document.documentElement;
    if (root.dataset.theme === id) return;
    window.clearTimeout(fadeTimer.current);
    // Set together with data-theme so this one change uses the long fade; ordinary hovers stay quick.
    root.dataset.themeFading = '';
    applyTheme(id);
    storeTheme(id);
    setThemeState(id);
    fadeTimer.current = window.setTimeout(() => {
      delete root.dataset.themeFading;
    }, THEME_FADE_MS + 50);
  }, []);

  return [theme, setTheme];
}
