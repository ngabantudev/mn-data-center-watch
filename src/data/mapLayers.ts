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

export interface MapLayerMeta {
  /** Stable key. Source/layer ids on the map are derived as `${id}-source|-layer`. */
  id: string;
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
    id: 'city-boundaries',
    toggleId: 'mf-toggle-cities',
    apiKey: 'showCityBoundaries',
    label: 'City Boundaries',
    description: 'Which council votes on the permit.',
    fileName: 'convertedCity_Boundaries_in_Minnesota.pmtiles',
    hex: '#a855f7',
    fillOpacity: 0.15,
    outlineHex: '#7e22ce',
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
export const TILE_BASE_URL = 'https://pub-9f0c29be0f0040ee8ff0b8e3bad571d5.r2.dev';

/** Absolute URL of a layer's PMTiles archive. */
export const tileUrlFor = (layer: MapLayerMeta): string =>
  `${TILE_BASE_URL}/${layer.fileName}`;

/** MapLibre source id for a layer. */
export const sourceIdFor = (id: string): string => `${id}-source`;
/** MapLibre layer id for a layer. */
export const layerIdFor = (id: string): string => `${id}-layer`;

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
