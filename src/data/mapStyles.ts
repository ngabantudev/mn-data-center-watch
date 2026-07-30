// src/data/mapStyles.ts
import { getStoredTheme, type SiteTheme } from '~/lib/siteTheme';

export interface MapStyleOption {
  id: string;
  label: string;
  url: string;
}

export const MAP_STYLE_OPTIONS: MapStyleOption[] = [
  { id: 'fiord', label: 'Fiord (Muted)', url: 'https://tiles.openfreemap.org/styles/fiord' },
  { id: 'liberty', label: 'Liberty (Google Maps)', url: 'https://tiles.openfreemap.org/styles/liberty' },
  { id: 'positron', label: 'Light Minimal', url: 'https://tiles.openfreemap.org/styles/positron' },
  { id: 'dark', label: 'Dark Mode', url: 'https://tiles.openfreemap.org/styles/dark' },
];

/**
 * Basemap paired with each site theme. Switching the site theme always
 * switches the basemap to its partner here — the two are treated as one
 * decision, so the chrome and the map can't end up mismatched. The user can
 * still pick any basemap afterwards; that choice sticks until the next time
 * they change theme.
 *
 * Light pairs with Liberty. Fiord, which it used to pair with, is a muted
 * *dark* basemap — its background is #45516E — so under the mn.gov off-white
 * chrome the light theme opened onto a dark map. Liberty's #f8f4f0 sits under
 * that chrome as one surface, and it keeps roads and place names detailed
 * enough to place a site by, which is what these overlays are read against.
 * Positron stays in the list for anyone who wants the minimal light basemap.
 */
export const THEME_BASEMAP: Record<SiteTheme, string> = {
  light: 'liberty',
  dark: 'dark',
};

/**
 * Set only when the user picks a basemap by hand. Its absence is meaningful:
 * it's what lets the theme pairing above apply, and once it's set the pairing
 * stops overriding the choice.
 */
export const MAP_STYLE_STORAGE_KEY = 'mapStyleId';

/** The user's explicit basemap choice, or null if they haven't made one. */
export function getStoredMapStyleId(): string | null {
  try {
    const stored = localStorage.getItem(MAP_STYLE_STORAGE_KEY);
    if (stored && MAP_STYLE_OPTIONS.some((o) => o.id === stored)) return stored;
  } catch {}
  return null;
}

export function storeMapStyleId(id: string): void {
  try {
    localStorage.setItem(MAP_STYLE_STORAGE_KEY, id);
  } catch {}
}

export function getMapStyleUrlById(id: string): string {
  return (
    MAP_STYLE_OPTIONS.find((option) => option.id === id)?.url ??
    MAP_STYLE_OPTIONS[0].url
  );
}

/** Default basemap id for a theme, for callers that haven't got a stored choice. */
export function getMapStyleIdForTheme(theme: SiteTheme): string {
  return THEME_BASEMAP[theme];
}

/**
 * Basemap to open with: an explicit past choice wins, otherwise the one
 * paired with the stored site theme. Client-side only — it reads
 * localStorage, so don't call it from component frontmatter.
 */
export function getInitialMapStyleId(): string {
  return getStoredMapStyleId() ?? getMapStyleIdForTheme(getStoredTheme());
}
