// The three looks of design B ("Carte postale"). White is the base palette in src/index.css;
// Wood and Dark override the same tokens through <html data-theme="…">.
export const THEME_IDS = ['white', 'wood', 'dark'] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export const THEME_STORAGE_KEY = 'odyssea.theme';

// Length of the cross-fade when the theme changes. Keep in sync with the
// html[data-theme-fading] rule in src/index.css.
export const THEME_FADE_MS = 650;

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEME_IDS as readonly string[]).includes(value);
}

/** A saved choice wins; otherwise follow the system's light/dark setting. */
export function resolveInitialTheme(stored: string | null, prefersDark: boolean): ThemeId {
  if (isThemeId(stored)) return stored;
  return prefersDark ? 'dark' : 'white';
}
