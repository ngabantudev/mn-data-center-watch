// src/lib/moratoriumLayer.ts
//
// The Politics section's second layer: where each town stands on a data center
// moratorium, as a dot on its city centre.
//
// It is deliberately NOT part of `~/lib/overlayLayers.ts`, which every other
// toggle goes through. That controller exists to manage PMTiles archives —
// reading a header, finding a vector layer, reporting an archive that isn't in
// the bucket. None of that applies here: this layer's data is a hand-sourced
// registry compiled into the bundle, it can never be "unavailable", and giving
// it a fake archive lifecycle to reuse the wiring would mean carrying four
// concepts that are meaningless for it. What it does share is the *shape* —
// attach/detach around a basemap swap, synchronous show/hide, and ids handed to
// the map's one hit test — so it reads the same from MapParent.
//
// TWO THINGS ARE DRAWN, and the split is deliberate.
//
//   1. The city's own boundary, shaded in its posture's colour. This is the
//      honest rendering: a moratorium is an ordinance over a jurisdiction, and
//      the jurisdiction is that polygon. It rides on the city-boundaries
//      archive as a "companion" of that layer (see `~/lib/overlayLayers.ts`),
//      so it shares one source with the City Boundaries toggle instead of
//      parsing every tile of a statewide archive twice.
//
//      Matching is on `GNIS_FEATURE_ID`, the federal id, never on the name.
//      Minnesota has repeated city names across counties, and a near-match
//      would shade the wrong city with nothing on screen to reveal it. Every
//      id in the registry was read out of this archive.
//
//   2. A dot with the town's name. It is a *label anchor*, not a location
//      claim — it sits at the city centre, and is neither city hall nor any
//      project site. It stays because a small city's polygon is a few pixels
//      at statewide zoom, which is exactly the zoom someone scans the state at.
//      Both popups say what it is, because an unexplained dot on a map reads
//      as an address.

import maplibregl from 'maplibre-gl';
import { CITY_BOUNDARIES_LAYER_ID, CITY_GNIS_FIELD } from '~/data/mapLayers';
import type { CompanionLayerSpec } from '~/lib/overlayLayers';
import {
  MORATORIUM_ISSUE_URL,
  POSTURE_BY_ID,
  POSTURE_META,
  posturedJurisdictions,
  timelineSentence,
  type DevelopmentStatus,
  type MoratoriumPosture,
  type PosturedJurisdiction,
} from '~/data/moratoriums';

const SOURCE_ID = 'moratoriums';
const CIRCLE_LAYER_ID = 'moratoriums-circles';
const LABEL_LAYER_ID = 'moratoriums-labels';

/**
 * Bottom-first, and the order they stack in — the label rides above the dot.
 * Exported because MapParent stacks the PMTiles fills beneath these.
 */
export const MORATORIUM_LAYER_IDS = [CIRCLE_LAYER_ID, LABEL_LAYER_ID];

/** Key this layer's toggle sends on the `mapfilterchange` event. */
export const MORATORIUM_API_KEY = 'showMoratoriums';

// One clock for the whole page load. `getPosture` takes `asOf` precisely so the
// dots and the sidebar's counts can't disagree about whether a term has run
// out — see the note on that function.
const POSTURED = posturedJurisdictions();

const geoJson = {
  type: 'FeatureCollection' as const,
  features: POSTURED.map((jurisdiction, index) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [jurisdiction.coordinates[1], jurisdiction.coordinates[0]],
    },
    properties: {
      jurisdictionIndex: index,
      name: jurisdiction.name,
      posture: jurisdiction.posture,
    },
  })),
};

// Resolved into a `match` expression rather than baked per feature, so the
// registry stays the only place a posture's colour is written down.
const POSTURE_COLOR: unknown[] = [
  'match',
  ['get', 'posture'],
  ...POSTURE_META.flatMap((m) => [m.posture, m.hex]),
  POSTURE_BY_ID.open.hex,
];

/**
 * The shaded boundary: a fill on the city-boundaries source, restricted to the
 * cities in the registry and coloured by each one's posture.
 *
 * The colour expression is keyed on `GNIS_FEATURE_ID` rather than carrying the
 * posture as a feature property, because these features come out of a tile
 * archive we don't control — there is nowhere to put a property. `match` labels
 * must be unique, and GNIS ids are, which is the second reason not to key on
 * name: two cities called the same thing would be a duplicate-label error at
 * style-load rather than a wrong shade.
 */
const TINT_COLOR: unknown[] = [
  'match',
  ['get', CITY_GNIS_FIELD],
  ...POSTURED.flatMap((j) => [j.gnisFeatureId, POSTURE_BY_ID[j.posture].hex]),
  POSTURE_BY_ID.open.hex,
];

export const MORATORIUM_TINT: CompanionLayerSpec = {
  id: 'moratorium-tint',
  baseId: CITY_BOUNDARIES_LAYER_ID,
  filter: [
    'in',
    ['get', CITY_GNIS_FIELD],
    ['literal', POSTURED.map((j) => j.gnisFeatureId)],
  ],
  paint: {
    'fill-color': TINT_COLOR,
    // Heavy enough to name a colour at a glance across the whole state, light
    // enough that the basemap's roads and water still read through it — this
    // shading is an answer about a place, not a replacement for it.
    'fill-opacity': 0.42,
    // A hairline edge in the same colour, which is all a highlighted polygon
    // needs and costs no extra layer. The city's own border, when that toggle
    // is on, draws over this in the flag's dark blue.
    'fill-outline-color': TINT_COLOR,
  },
};

/**
 * Third-party-safe by default. Nothing in the registry is meant to be markup —
 * unlike a project's `businessImpact`, which is authored as HTML — so a stray
 * angle bracket in an ordinance summary should render as one.
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const escape = (value: string): string =>
  value.replace(/[&<>"']/g, (c) => HTML_ENTITIES[c]!);

/** The posture pill both popups open with. */
const postureChip = (posture: MoratoriumPosture): string => {
  const meta = POSTURE_BY_ID[posture];
  return `
    <span class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
          style="background-color: ${meta.hex}1f; color: ${meta.hex}">
      <span class="inline-block w-1.5 h-1.5 rounded-full" style="background-color: ${meta.hex}"></span>
      ${escape(meta.label)}
    </span>
  `;
};

/** Hover: what it is and that there is more. Popups sit on white — see global.css. */
function buildHoverHtml(jurisdiction: PosturedJurisdiction): string {
  const timeline = timelineSentence(jurisdiction);
  return `
    <div class="p-0.5 text-neutral-900 font-sans w-56 select-text">
      ${postureChip(jurisdiction.posture)}
      <h3 class="font-bold text-[13px] text-neutral-900 leading-snug mt-1.5">${escape(jurisdiction.name)}</h3>
      <p class="text-[10px] text-neutral-400 font-medium">${escape(jurisdiction.county)}</p>
      ${
        timeline
          ? `<p class="mt-1 text-[11px] text-neutral-600 leading-snug">${escape(timeline)}</p>`
          : ''
      }
      <p class="mt-1.5 text-[10px] text-neutral-500 leading-snug">Shaded area = the city this applies across.</p>
      <p class="mt-1 text-[9px] font-semibold text-blue-600 uppercase tracking-wide">Click for the ordinance &rarr;</p>
    </div>
  `;
}

const DEVELOPMENT_LABEL: Record<DevelopmentStatus, string> = {
  proposed: 'Data center proposed',
  approved: 'Data center approved',
  denied: 'Application denied',
  none: 'No data center on record',
  unknown: 'Not sourced yet',
};

/** A labelled block, omitted entirely when there is nothing sourced to put in it. */
const block = (title: string, body: string | null): string =>
  body
    ? `
      <div class="mt-2 pt-2 border-t border-neutral-100">
        <span class="block text-[9px] text-neutral-400 font-bold uppercase tracking-wider mb-1">${title}</span>
        ${body}
      </div>
    `
    : '';

/** Click: the whole record, with the sources every date in it came from. */
function buildDetailHtml(jurisdiction: PosturedJurisdiction): string {
  const timeline = timelineSentence(jurisdiction);

  // An unsourced development record renders as an explicit gap with a way to
  // fill it, the same treatment an unsourced serving utility gets. "We don't
  // know yet" and "there is nothing here" are different facts.
  const development =
    jurisdiction.development === 'unknown'
      ? `<p class="text-[11px] text-neutral-500 leading-snug">Whether a data center is advancing here is not sourced yet.
           <a href="${MORATORIUM_ISSUE_URL}" target="_blank" rel="noopener noreferrer" class="font-semibold text-blue-600 hover:underline">Know? Tell us &rarr;</a></p>`
      : `<p class="text-[11px] font-semibold text-neutral-800">${DEVELOPMENT_LABEL[jurisdiction.development]}</p>
         ${
           jurisdiction.developmentNote
             ? `<p class="mt-0.5 text-[11px] text-neutral-600 leading-snug">${escape(jurisdiction.developmentNote)}</p>`
             : ''
         }`;

  const sources = jurisdiction.sources
    .map(
      (source) => `
        <li>
          <a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer"
             class="text-[11px] font-medium text-blue-600 hover:underline leading-snug">
            ${escape(source.title)} &rarr;
          </a>
        </li>
      `,
    )
    .join('');

  return `
    <div class="p-0.5 text-neutral-900 font-sans w-72 select-text">
      ${postureChip(jurisdiction.posture)}
      <h3 class="font-bold text-[15px] text-neutral-900 leading-snug mt-1.5">${escape(jurisdiction.name)}</h3>
      <p class="text-[10px] text-neutral-400 font-medium">${escape(jurisdiction.county)}</p>

      ${block('Timeline', timeline ? `<p class="text-[11px] font-semibold text-neutral-800 leading-snug">${escape(timeline)}</p>` : null)}
      ${block('What It Covers', jurisdiction.scope ? `<p class="text-[11px] text-neutral-600 leading-snug">${escape(jurisdiction.scope)}</p>` : null)}
      ${block('Development', development)}
      ${block('Contested', jurisdiction.contest ? `<p class="text-[11px] text-neutral-600 leading-snug">${escape(jurisdiction.contest)}</p>` : null)}
      ${block('Sources', `<ul class="flex flex-col gap-1">${sources}</ul>`)}

      <p class="mt-2 pt-2 border-t border-neutral-100 text-[10px] text-neutral-500 leading-snug">
        The shaded boundary is the city the ordinance applies across. This dot
        marks the city centre — it is not city hall, and not a project site.
      </p>
    </div>
  `;
}

/**
 * Rendered cards, keyed `variant:index`. At module scope rather than per
 * controller: the registry these are built from is fixed for the page's
 * lifetime, so a card survives the map being torn down and rebuilt.
 */
const popupCache = new Map<string, string>();

export interface MoratoriumLayerOptions {
  /** Map layer ids this layer must stay beneath, bottom-first. */
  layersAbove: string[];
}

export interface MoratoriumLayer {
  /** Call once the style is loaded, and again after every basemap swap. */
  attachToStyle(): void;
  /** Call before `setStyle` — these layers belong to the style being replaced. */
  detachFromStyle(): void;
  setVisible(visible: boolean): void;
  /** Layer ids currently on the map and visible, for the map's hit test. */
  visibleLayerIds(): string[];
  /** Popup markup for a feature this layer returned from a hit test. */
  popupHtml(
    feature: maplibregl.MapGeoJSONFeature,
    variant: 'hover' | 'detail',
  ): string | null;
}

export function createMoratoriumLayer(
  map: maplibregl.Map,
  { layersAbove }: MoratoriumLayerOptions,
): MoratoriumLayer {
  let wanted = false;
  let styleReady = false;
  /** Memoized `visibleLayerIds()`, dropped by every `apply()`. */
  let visibleIds: string[] | null = null;

  const add = (): void => {
    map.addSource(SOURCE_ID, { type: 'geojson', data: geoJson });

    const before = layersAbove.find((id) => map.getLayer(id));

    map.addLayer(
      {
        id: CIRCLE_LAYER_ID,
        type: 'circle',
        source: SOURCE_ID,
        layout: { visibility: 'visible' },
        paint: {
          'circle-color': POSTURE_COLOR as any,
          // Fixed radius, unlike the project markers: a moratorium has no
          // magnitude to encode. It scales only enough to stay tappable as
          // you zoom in.
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 5, 11, 10],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.92,
        },
      } as maplibregl.CircleLayerSpecification,
      before,
    );

    map.addLayer(
      {
        id: LABEL_LAYER_ID,
        type: 'symbol',
        source: SOURCE_ID,
        layout: {
          visibility: 'visible',
          'text-field': ['get', 'name'],
          'text-font': ['Open Sans Bold'],
          'text-size': 10,
          'text-anchor': 'top',
          'text-offset': [0, 0.9],
          // Town names collide at statewide zoom — Mankato and North Mankato
          // are four miles apart. Letting MapLibre drop one is right for a
          // label and wrong for a dot, which is why only this layer allows it.
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 1.5,
        },
      } as maplibregl.SymbolLayerSpecification,
      before,
    );
  };

  /**
   * Bring the map in line with `wanted`. Synchronous and idempotent, like the
   * overlay controller's — there is nothing to await here, so switching the
   * layer off lands on the same tick as the click.
   */
  const apply = (): void => {
    if (!styleReady) return;
    visibleIds = null;

    // Both layers arrive and leave together, so the circle's presence answers
    // for the pair.
    if (!map.getLayer(CIRCLE_LAYER_ID)) {
      // Nothing to hide, and nothing worth building until it's asked for: a
      // visitor who never opens the Politics section never pays for this
      // source or its two layers.
      if (wanted) add();
      return;
    }

    const visibility = wanted ? 'visible' : 'none';
    for (const id of MORATORIUM_LAYER_IDS) {
      map.setLayoutProperty(id, 'visibility', visibility);
    }
  };

  return {
    attachToStyle: () => {
      styleReady = true;
      apply();
    },
    detachFromStyle: () => {
      styleReady = false;
      visibleIds = null;
    },
    setVisible: (visible) => {
      if (wanted === visible) return;
      wanted = visible;
      apply();
    },
    // Memoized, because the map's hover handler asks once per frame. Empty
    // while detached, for the same reason the overlay controller's is: naming
    // a layer that belongs to a style being swapped out makes
    // `queryRenderedFeatures` error and return nothing, taking the marker hit
    // test down with it.
    visibleLayerIds: () =>
      styleReady && wanted
        ? (visibleIds ??= MORATORIUM_LAYER_IDS.filter((id) => map.getLayer(id)))
        : [],

    popupHtml: (feature, variant) => {
      const index = feature.properties?.jurisdictionIndex;
      const jurisdiction =
        typeof index === 'number' ? POSTURED[index] : undefined;
      if (!jurisdiction) return null;

      // Built at most once per town per variant. The registry is fixed for the
      // page's lifetime, so a card that has been assembled once will never
      // differ — and the hover card is otherwise reassembled on every frame the
      // pointer moves across a dot.
      const key = `${variant}:${index}`;
      let html = popupCache.get(key);
      if (html === undefined) {
        html =
          variant === 'hover'
            ? buildHoverHtml(jurisdiction)
            : buildDetailHtml(jurisdiction);
        popupCache.set(key, html);
      }
      return html;
    },
  };
}
