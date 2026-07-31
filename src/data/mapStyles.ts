// src/data/mapStyles.ts
import { DEFAULT_SITE_THEME, getStoredTheme, type SiteTheme } from '~/lib/siteTheme';
import { readStored, removeStored, writeStored } from '~/lib/storage';

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
 *
 * DELIBERATELY A NEW KEY. The old one, `mapStyleId`, was also written every time
 * someone switched *theme* — the selector persisted the paired basemap as if it
 * were a hand-pick — so a stored value there cannot be told apart from a
 * deliberate choice. Which made the pairing above unchangeable in practice:
 * every visitor who had ever clicked "Light" had `fiord` pinned, so repointing
 * light at Liberty did nothing for them. Renaming the key drops those ambiguous
 * values exactly once. From here the key means only what this comment says, and
 * changing a pairing takes effect for everyone who hasn't overridden it.
 */
export const MAP_STYLE_STORAGE_KEY = 'mapBasemapChoice';

const isKnownStyleId = (value: string): value is string =>
  MAP_STYLE_OPTIONS.some((o) => o.id === value);

/** The user's explicit basemap choice, or null if they haven't made one. */
function getStoredMapStyleId(): string | null {
  const stored = readStored(MAP_STYLE_STORAGE_KEY);
  return stored !== null && isKnownStyleId(stored) ? stored : null;
}

export function storeMapStyleId(id: string): void {
  writeStored(MAP_STYLE_STORAGE_KEY, id);
}

/**
 * Drops a hand-picked basemap, handing control back to the theme pairing.
 * What a theme switch does instead of persisting the pairing it just applied:
 * the pairing is already recoverable from the stored *theme*, so writing it here
 * as well only made a later change to `THEME_BASEMAP` unreachable.
 */
export function clearStoredMapStyleId(): void {
  removeStored(MAP_STYLE_STORAGE_KEY);
}

/** Basemap for an id we don't recognise: the one the default theme pairs with. */
const DEFAULT_MAP_STYLE_ID = THEME_BASEMAP[DEFAULT_SITE_THEME];

export function getMapStyleUrlById(id: string): string {
  const byId = (wanted: string) =>
    MAP_STYLE_OPTIONS.find((option) => option.id === wanted)?.url;
  // Was `MAP_STYLE_OPTIONS[0].url`, which tied the fallback to array order and
  // so resolved to Fiord — a *dark* basemap — for a site whose default theme is
  // light. Reordering the picker menu would silently have changed it, too.
  return byId(id) ?? byId(DEFAULT_MAP_STYLE_ID) ?? MAP_STYLE_OPTIONS[0].url;
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
