// src/data/mapLayers.ts
//
// The overlay layers, defined once. This registry previously lived in two
// places that had to be edited together: `MapParent.astro` held the PMTiles
// file names and fill paint, `FilterLayer.astro` held the toggle ids, labels,
// and event keys, and `MapParent`'s `handleFilterChange` re-listed all three
// `showX` keys by hand. Adding a fourth layer meant four coordinated edits in
// two files with nothing linking them but matching strings.
//
// Now three sides derive from `MAP_LAYER_META`: this registry, the sidebar
// rows, and `~/lib/overlayLayers.ts`, which owns everything about putting these
// on the map. The only thing the sidebar still owns is its icon and Tailwind
// swatch classes — see FilterLayer.astro for why those can't live here.

/**
 * Which sidebar section an overlay belongs to.
 *
 * Not cosmetic grouping: the two answer different questions. A climate layer
 * says what a site would sit on top of; a politics layer says who decides
 * whether it gets built there and what they have decided so far. Someone
 * looking for the second was previously having to read past four environmental
 * datasets to find "City Boundaries".
 */
export type MapLayerGroup = 'climate' | 'politics';

/**
 * Accordion heading per group. A total `Record` rather than the array-plus-
 * `indexBy` pair the other registries use, because a group carries exactly one
 * field and the map from key to it is the whole registry — and being total over
 * the union means a call site can't be handed an `undefined` to guard against.
 */
export const MAP_LAYER_GROUP_TITLE: Record<MapLayerGroup, string> = {
  climate: 'Climate & Regional Impacts',
  politics: 'Politics',
};

/**
 * A stroked outline drawn per polygon, on its own line layer above the fill.
 *
 * `fill-outline-color` can only ever be a one-pixel hairline at the *tile*
 * resolution, which is why the city boundaries read as a single lilac wash
 * rather than as ~850 separate jurisdictions: at statewide zoom the hairline
 * between two adjacent cities is thinner than the translucent fill either side
 * of it. A real line layer takes a width and scales it with zoom, so every
 * city keeps its own visible edge.
 */
export interface LayerOutline {
  /** Stroke width in px at low zoom; doubles by `~/lib/overlayLayers.ts` at z12. */
  width: number;
  opacity: number;
}

export interface MapLayerMeta {
  /** Stable key. Source/layer ids on the map are derived as `${id}-source|-layer`. */
  id: string;
  /** Which sidebar accordion this layer's toggle appears under. */
  group: MapLayerGroup;
  /** DOM id of the sidebar checkbox. */
  toggleId: string;
  /** Key this layer's toggle sends on the `mapfilterchange` event. */
  apiKey: string;
  label: string;
  /** One line on why this overlay matters to the campaign, shown under the label. */
  description: string;
  /** PMTiles archive in the tile bucket. */
  fileName: string;
  /** Fill colour — layer *identity*, deliberately outside the theme tokens. */
  hex: string;
  fillOpacity: number;
  outlineHex: string;
  /**
   * Draw each polygon's border on its own line layer in `outlineHex`. Without
   * it the layer falls back to `fill-outline-color`, which is the right call
   * for a dataset read as regions (protected land, a recharge area) and the
   * wrong one for a dataset read as *borders*. See `LayerOutline`.
   */
  outline?: LayerOutline;
  /**
   * Credit line for this dataset, shown in the map's attribution control
   * while the layer is switched on. Optional only so a layer can be wired
   * before its archive exists — shipping one without a credit is not an
   * option, and `~/lib/overlayLayers.ts` warns in dev when it's missing.
   */
  attribution?: string;
}

export const MAP_LAYER_META: MapLayerMeta[] = [
  {
    id: 'protected-lands',
    group: 'climate',
    toggleId: 'mf-toggle-protected',
    apiKey: 'showProtectedLands',
    label: 'Protected Lands',
    description: 'Conservation and public land a site would border or displace.',
    fileName: 'PADUS4_1Combined_StateMN.pmtiles',
    hex: '#10b981',
    fillOpacity: 0.4,
    outlineHex: '#047857',
    attribution:
      'Protected areas: <a href="https://www.usgs.gov/programs/gap-analysis-project/science/pad-us-data-overview" target="_blank" rel="noopener">USGS PAD-US 4.1</a>',
  },
  {
    id: 'drinking-water',
    group: 'climate',
    toggleId: 'mf-toggle-drinking',
    apiKey: 'showDrinkingWater',
    label: 'Drinking Water Supply',
    description: 'DWSMA recharge areas — where cooling draw hits the aquifer.',
    fileName: 'Drinking_Water_Supply_Management_Area_(DWSMA).pmtiles',
    hex: '#3b82f6',
    fillOpacity: 0.35,
    outlineHex: '#1d4ed8',
    attribution:
      'Drinking Water Supply Management Areas: <a href="https://gisdata.mn.gov/" target="_blank" rel="noopener">Minnesota Geospatial Commons</a>',
  },
  {
    // The one layer whose *edges* are the data. Every other overlay answers
    // "what is under this site"; this one answers "whose council votes on it",
    // and that question is settled entirely by which line a parcel falls
    // inside of. So it draws a real black border per city and keeps only
    // enough fill to stay hit-testable for the hover label — see `outline` in
    // MapLayerMeta for why the fill's own hairline could never do this.
    id: 'city-boundaries',
    group: 'politics',
    toggleId: 'mf-toggle-cities',
    apiKey: 'showCityBoundaries',
    label: 'City Boundaries',
    description: 'Which council votes on the permit.',
    fileName: 'convertedCity_Boundaries_in_Minnesota.pmtiles',
    hex: '#a855f7',
    // Near-invisible on purpose, and not zero: `queryRenderedFeatures` hits a
    // fill regardless of opacity, so this is what still lets someone hover
    // anywhere inside a city and be told its name. A `fill-opacity` of 0 would
    // work for the hit test too, but a faint tint is what makes it discoverable
    // that the inside of the line is clickable at all.
    fillOpacity: 0.05,
    outlineHex: '#000000',
    outline: { width: 0.8, opacity: 0.85 },
    attribution:
      'City boundaries: <a href="https://gisdata.mn.gov/" target="_blank" rel="noopener">Minnesota Geospatial Commons</a>',
  },
  {
    // Amber, matching the co-op chip in the ratepayer widget — a member
    // should be able to see the shading under a facility and the "Member-Owned
    // Co-op" badge in the drawer as one claim.
    //
    // NOTE: this archive is not in the tile bucket yet. Every candidate bulk
    // source was rejected (see utilities.ts for the evaluation), so the file
    // has to be converted from the state territory shapefile and uploaded.
    // Until then the toggle self-disables — the overlay controller reports the
    // missing archive rather than adding an empty layer that silently renders
    // nothing. Nothing else needs to change when it lands.
    id: 'coop-territories',
    group: 'climate',
    toggleId: 'mf-toggle-coop',
    apiKey: 'showCoopTerritories',
    label: 'Electric Co-op & Utility Territories',
    description: 'Whose ratepayers absorb the grid upgrade a site triggers.',
    fileName: 'Electric_Service_Territories_MN.pmtiles',
    hex: '#f59e0b',
    fillOpacity: 0.22,
    outlineHex: '#b45309',
    // Deliberately unset: the archive doesn't exist yet, so there is no
    // publisher to credit. Crediting a source we haven't actually used would
    // be the same failure as inventing a utility attribution. Set this from
    // the real dataset's terms at the same time the file is uploaded — the
    // dev warning in overlayLayers.ts is there to catch a miss.
  },
];

/**
 * Public R2 bucket holding the PMTiles archives.
 *
 * PERFORMANCE NOTE, and the one remaining cost that can't be fixed in the
 * client: this bucket serves no `Cache-Control` header, so nothing here is
 * cacheable across page loads and every visit re-downloads the tiles it draws.
 * Within a session the map's own tile cache covers it (which is why layers are
 * hidden rather than torn down — see overlayLayers.ts), but a reload pays full
 * price. Fixing it means serving these through a Worker route that sets
 * `immutable` far-future caching, or an R2 custom domain with a cache rule.
 *
 * The other half is upstream of the client entirely: the PAD-US archive is
 * 21 MB, and it was built with `--no-tile-size-limit`, so its z5–z7 tiles are
 * 0.5–1.5 MB each — a second or more of parsing per tile no matter how well
 * this code schedules it. Re-running tippecanoe without that flag is the fix.
 */
const TILE_BASE_URL = 'https://pub-9f0c29be0f0040ee8ff0b8e3bad571d5.r2.dev';

/** Absolute URL of a layer's PMTiles archive. */
export const tileUrlFor = (layer: MapLayerMeta): string =>
  `${TILE_BASE_URL}/${layer.fileName}`;

/** MapLibre source id for a layer. */
export const sourceIdFor = (id: string): string => `${id}-source`;
/** MapLibre layer id for a layer's fill. */
export const layerIdFor = (id: string): string => `${id}-layer`;
/** MapLibre layer id for a layer's per-polygon border, when it declares one. */
export const outlineLayerIdFor = (id: string): string => `${id}-outline`;

/** The overlays in one sidebar section, in registry order. */
export const layersInGroup = (group: MapLayerGroup): MapLayerMeta[] =>
  MAP_LAYER_META.filter((layer) => layer.group === group);

/** Fired on `document` when a layer's archive can't be read. */
export const LAYER_UNAVAILABLE_EVENT = 'maplayerunavailable';

/**
 * Why a layer isn't available. Two different sentences for the visitor: an
 * archive we haven't uploaded yet is a gap in the map, while one we failed to
 * read is a fault they might get past by retrying. Reporting the second as the
 * first would be telling them a dataset doesn't exist when it does.
 */
export type LayerUnavailableReason = 'missing' | 'unreadable';

export interface LayerUnavailableDetail {
  /** `MapLayerMeta.id` of the layer that failed to load. */
  id: string;
  reason: LayerUnavailableReason;
}
