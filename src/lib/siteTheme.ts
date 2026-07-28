// src/lib/siteTheme.ts
//
// Single source of truth for the site's light/dark chrome theme. The actual
// colors live in global.css (:root vs .dark); this module only decides which
// of those two is active and tells the rest of the app when it changes.
//
// Note the split of responsibilities with mapStyles.ts: this picks the *UI
// chrome* theme, mapStyles.ts picks the *basemap*. They're paired on first
// load (see THEME_BASEMAP) so a fresh visitor gets a coherent light or dark
// map, but a user who then picks a specific basemap keeps it — switching the
// site theme afterwards won't stomp that choice.

export type SiteTheme = 'light' | 'dark';

export const SITE_THEME_STORAGE_KEY = 'siteTheme';
export const DEFAULT_SITE_THEME: SiteTheme = 'light';

/** Fired on `document` whenever the theme changes, with `{ theme }`. */
export const SITE_THEME_EVENT = 'sitethemechange';

/** `<meta name="theme-color">` value per theme, so mobile browser chrome matches. */
export const THEME_COLOR: Record<SiteTheme, string> = {
  light: '#003865',
  dark: '#131314',
};

export function isSiteTheme(value: unknown): value is SiteTheme {
  return value === 'light' || value === 'dark';
}

/** Reads the persisted theme, falling back to the default. Never throws. */
export function getStoredTheme(): SiteTheme {
  try {
    const stored = localStorage.getItem(SITE_THEME_STORAGE_KEY);
    if (isSiteTheme(stored)) return stored;
  } catch {}
  return DEFAULT_SITE_THEME;
}

/** The theme currently applied to the document, regardless of what's stored. */
export function getActiveTheme(): SiteTheme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/**
 * Applies `theme` to <html>, persists it, and notifies listeners. The class
 * toggle is what actually swaps every token in global.css, so this one call
 * restyles the whole UI.
 */
export function setTheme(theme: SiteTheme): void {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');

  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', THEME_COLOR[theme]);

  try {
    localStorage.setItem(SITE_THEME_STORAGE_KEY, theme);
  } catch {}

  document.dispatchEvent(
    new CustomEvent<{ theme: SiteTheme }>(SITE_THEME_EVENT, { detail: { theme } }),
  );
}
