// src/lib/overlayLayers.ts
//
// Everything about getting the Climate & Regional Impacts overlays onto the
// map: reading each PMTiles archive, adding its fill, switching it on and off,
// and naming the region under the cursor. It lived inside MapParent.astro's
// script, interleaved with the marker layers, and had three problems that were
// hard to see from there and are the reason this file exists.
//
// 1. TOGGLING OFF SOMETIMES DIDN'T. The old sync ran
//    `await map.once("idle")` whenever `map.isStyleLoaded()` was false, then
//    did the add *and* remove pass afterwards. But `isStyleLoaded()` is false
//    while *any* source anywhere in the style still has a tile in flight, and
//    `idle` only fires once every tile has landed, nothing is dirty, and the
//    camera is still. Switch a 21 MB archive on and then off again while its
//    tiles are still streaming — or pan while waiting — and the removal sat
//    behind a promise that wouldn't settle for many seconds, or at all. The
//    layer stayed on screen with its box unchecked.
//
//    Nothing here awaits the map any more. Applying desired state is a
//    synchronous function that runs whenever something changes and again when
//    the style reports itself loaded, so switching a layer off takes effect on
//    the same tick as the click.
//
// 2. IT WAS SLOWER THAN IT NEEDED TO BE, three ways. Each archive's metadata
//    was read through a throwaway `PMTiles` instance, so the header and root
//    directory MapLibre was about to fetch again were paid for twice; the reads
//    ran in a serial `for await` loop, so a second toggle queued behind the
//    first; and every read happened on the critical path of the click. Now one
//    `PMTiles` instance per archive is shared with the protocol that serves its
//    tiles, reads are per-layer and concurrent, and all of them are warmed
//    during idle time after load so the first toggle usually has nothing to
//    wait for.
//
// 3. TOGGLING OFF THREW THE DATA AWAY. `removeLayer` + `removeSource` meant
//    switching a layer back on re-downloaded and re-parsed every tile — about
//    2.5 MB and a couple of seconds for PAD-US, and the tile bucket sends no
//    `Cache-Control`, so not even the browser cache absorbed it. Layers are
//    hidden with `visibility: none` instead, which keeps MapLibre's parsed
//    tiles and makes re-showing one instant. It also keeps what removal was
//    actually buying: a hidden layer's source is `used: false`, so it loads no
//    tiles and drops out of the attribution control, which is what kept each
//    dataset's credit tied to its own toggle.

import maplibregl from 'maplibre-gl';
import { PMTiles, Protocol } from 'pmtiles';
import {
  LAYER_UNAVAILABLE_EVENT,
  MAP_LAYER_META,
  layerIdFor,
  sourceIdFor,
  tileUrlFor,
  type LayerUnavailableDetail,
  type LayerUnavailableReason,
  type MapLayerMeta,
} from '~/data/mapLayers';

const LAYER_BY_ID = new Map(MAP_LAYER_META.map((l) => [l.id, l]));
const LAYER_BY_MAP_LAYER_ID = new Map(
  MAP_LAYER_META.map((l) => [layerIdFor(l.id), l]),
);

// --- PMTiles wiring, shared process-wide ---

let protocol: Protocol | null = null;
const archives = new Map<string, PMTiles>();

function tileProtocol(): Protocol {
  if (!protocol) {
    protocol = new Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);
  }
  return protocol;
}

/**
 * The one `PMTiles` instance for an archive, registered with the protocol.
 *
 * This registration is the point. `Protocol.add` keys instances by URL and
 * `Protocol.tilev4` looks them up by the URL in the `pmtiles://` source, so the
 * header and root directory read here to find the archive's vector layer are
 * the same bytes MapLibre then reuses for every tile request — instead of the
 * two extra round trips a separate instance cost, before a single tile of the
 * layer someone just asked for could even be requested.
 */
function archiveFor(layer: MapLayerMeta): PMTiles {
  const url = tileUrlFor(layer);
  let archive = archives.get(url);
  if (!archive) {
    archive = new PMTiles(url);
    tileProtocol().add(archive);
    archives.set(url, archive);
  }
  return archive;
}

// --- Reading an archive ---

interface PMTilesVectorLayer {
  id: string;
  fields?: Record<string, string>;
}

/** What we need out of an archive before its fill can be added. */
interface ArchiveInfo {
  /** Vector layer inside the archive, for the fill's `source-layer`. */
  sourceLayer: string;
  /** Attribute holding a region's name, or null if the dataset has none. */
  labelField: string | null;
}

/**
 * Attributes that hold a region's name. Matched case-insensitively against what
 * the archive declares, because these exports don't agree on naming: the city
 * boundaries call it `FEATURE_NAME`, the DWSMA export `dws_name`, PAD-US
 * variously `Unit_Nm` or `Loc_Nm`.
 *
 * Deliberately strict, and this is a bug fix. The old version fell back to "the
 * first string-typed field", which is how the protected-lands layer labelled
 * every area on the map `#70a170`: that archive is a KML conversion whose only
 * string attributes are `description` (empty for every feature), `fill`,
 * `stroke` and `styleUrl`. A dataset with no name attribute has no names in it,
 * and the honest thing is to say what the region *is* rather than to read out
 * whichever column happened to be a string — see `regionLabel`.
 */
const NAME_FIELDS = new Set([
  'name',
  'label',
  'unit_nm',
  'loc_nm',
  'gnis_name',
  'ctu_name',
  'city_name',
  'wb_name',
  'feature_name',
  'dws_name',
]);

function pickLabelField(fields?: Record<string, string>): string | null {
  const strings = Object.entries(fields ?? {})
    .filter(([, type]) => type?.toLowerCase() === 'string')
    .map(([field]) => field);

  return (
    strings.find((f) => NAME_FIELDS.has(f.toLowerCase())) ??
    // Same convention under a prefix we haven't seen yet — `*_name` — without
    // opening the door back up to arbitrary string columns.
    strings.find((f) => f.toLowerCase().endsWith('name')) ??
    null
  );
}

async function readArchive(layer: MapLayerMeta): Promise<ArchiveInfo> {
  const metadata = (await archiveFor(layer).getMetadata()) as {
    vector_layers?: PMTilesVectorLayer[];
  } | null;

  const [vectorLayer] = metadata?.vector_layers ?? [];
  if (!vectorLayer?.id) {
    // Readable but declaring no vector layers. There used to be a
    // `fallbackLayerName` per layer for this case; all three were wrong
    // (`padus4_1combined_statemn` for an archive whose layer is
    // `protected-lands`, and so on), so the fallback could only ever have
    // produced a fill against a source-layer that doesn't exist: a checked box
    // over an empty map. Treating it as unreadable is what the registry's own
    // comments say should happen.
    throw new Error('PMTiles archive declares no vector layers');
  }

  return {
    sourceLayer: vectorLayer.id,
    labelField: pickLabelField(vectorLayer.fields),
  };
}

/**
 * A 404/403 is an archive that isn't in the bucket; anything else is a failure
 * to read one that is. pmtiles reports the status in its message, and a miss
 * here just falls through to the more cautious of the two.
 */
function unavailableReason(error: unknown): LayerUnavailableReason {
  const message = error instanceof Error ? error.message : String(error);
  const status = /response code:\s*(\d+)/i.exec(message)?.[1];
  return status === '404' || status === '403' ? 'missing' : 'unreadable';
}

// --- What we know about each archive ---
//
// Facts about a file, not about the map drawing it, so they sit beside the
// `PMTiles` instances and outlive any one map. An Astro client-side navigation
// tears the map down and builds a fresh controller; `PMTiles.getMetadata()`
// re-fetches its bytes on every call, so per-controller caches would mean
// re-reading all four archives on every such navigation.
const archiveInfo = new Map<string, ArchiveInfo>();
const archiveReads = new Map<string, Promise<ArchiveInfo | null>>();
const unavailableArchives = new Map<string, LayerUnavailableReason>();

/** Reads one archive, at most once per page load however many ask for it. */
function readArchiveOnce(layer: MapLayerMeta): Promise<ArchiveInfo | null> {
  const pending = archiveReads.get(layer.id);
  if (pending) return pending;

  const promise = readArchive(layer).then(
    (archive) => {
      archiveInfo.set(layer.id, archive);
      if (import.meta.env.DEV) {
        console.log(
          `[overlay] "${layer.id}" → source-layer "${archive.sourceLayer}", label field ${archive.labelField ?? '(none — regions are unnamed in this dataset)'}`,
        );
      }
      return archive;
    },
    (error) => {
      const reason = unavailableReason(error);
      unavailableArchives.set(layer.id, reason);
      // A missing archive is a known gap (the co-op territories aren't uploaded
      // yet), so it isn't an error; a readable-but-broken one is.
      const log = reason === 'missing' ? console.warn : console.error;
      log(`[overlay] "${layer.id}" is unavailable (${reason})`, error);
      return null;
    },
  );

  archiveReads.set(layer.id, promise);
  return promise;
}

// --- The controller ---

export interface OverlayLayersOptions {
  /**
   * The map's own layer ids, bottom-first. Overlay fills are inserted beneath
   * the lowest one that exists, so a fill never paints over a marker or its
   * warning halo.
   */
  layersAbove: string[];
}

export interface OverlayLayers {
  /**
   * Call once the map's style is loaded, and again after every basemap swap —
   * `setStyle` discards sources and layers, and this is what puts the switched
   * on overlays back.
   */
  attachToStyle(): void;
  /** Call before `setStyle`, so nothing is applied to a style being replaced. */
  detachFromStyle(): void;
  /** Switch a layer on or off. Off takes effect immediately. */
  setVisible(id: string, visible: boolean): void;
  /** Read each archive's metadata ahead of the first toggle. */
  warmArchives(): void;
  /** Map layer ids currently on the map and visible, for hit-testing. */
  visibleLayerIds(): string[];
  /** What to call the overlay region a queried feature belongs to. */
  regionLabel(feature: maplibregl.MapGeoJSONFeature): string | null;
}

export function createOverlayLayers(
  map: maplibregl.Map,
  { layersAbove }: OverlayLayersOptions,
): OverlayLayers {
  tileProtocol();

  /** Switched on in the sidebar, whether or not it's on the map yet. */
  const wanted = new Set<string>();

  let styleReady = false;
  /** Memoized `visibleLayerIds()`, dropped by every `apply()`. */
  let visibleIds: string[] | null = null;

  /**
   * The layer a new fill goes under: the next overlay in registry order that's
   * already on the map, else the lowest map layer. Keeps stacking in the order
   * mapLayers.ts declares rather than the order the visitor happened to click,
   * which is what it was before — the fills are translucent and overlap, so
   * that order is visible.
   */
  const insertBefore = (index: number): string | undefined =>
    MAP_LAYER_META.slice(index + 1)
      .map((l) => layerIdFor(l.id))
      .find((id) => map.getLayer(id)) ??
    layersAbove.find((id) => map.getLayer(id));

  const addFill = (
    layer: MapLayerMeta,
    archive: ArchiveInfo,
    index: number,
  ): void => {
    const sourceId = sourceIdFor(layer.id);

    if (!map.getSource(sourceId)) {
      if (import.meta.env.DEV && !layer.attribution) {
        console.warn(
          `[overlay] Layer "${layer.id}" has no attribution set. Add one in ~/data/mapLayers.ts before shipping it — these datasets carry credit requirements.`,
        );
      }
      map.addSource(sourceId, {
        type: 'vector',
        url: `pmtiles://${tileUrlFor(layer)}`,
        // Carried by the source, not the control, so MapLibre lists the credit
        // only while this layer is actually showing.
        attribution: layer.attribution,
      });
    }

    map.addLayer(
      {
        id: layerIdFor(layer.id),
        type: 'fill',
        source: sourceId,
        'source-layer': archive.sourceLayer,
        layout: { visibility: 'visible' },
        paint: {
          'fill-color': layer.hex,
          'fill-opacity': layer.fillOpacity,
          'fill-outline-color': layer.outlineHex,
        },
      },
      insertBefore(index),
    );
  };

  /**
   * Bring the map in line with `wanted`. Synchronous and idempotent: it adds
   * what it can, hides what it must, and skips anything whose archive hasn't
   * been read yet — the read calls it again when it lands. Nothing here awaits,
   * which is what makes switching a layer off immediate.
   */
  const apply = (): void => {
    if (!styleReady) return;
    visibleIds = null;

    for (const [index, layer] of MAP_LAYER_META.entries()) {
      const layerId = layerIdFor(layer.id);
      const onMap = Boolean(map.getLayer(layerId));

      if (!wanted.has(layer.id)) {
        if (onMap) map.setLayoutProperty(layerId, 'visibility', 'none');
        continue;
      }

      const archive = archiveInfo.get(layer.id);
      if (!archive) continue;

      if (onMap) map.setLayoutProperty(layerId, 'visibility', 'visible');
      else addFill(layer, archive, index);
    }
  };

  /**
   * Reads an archive if it hasn't been read, then brings this map in line with
   * the result: the fill goes on, or the row is told to stop offering a toggle
   * it can't honour.
   *
   * The announcement happens per controller, not once per archive, because the
   * sidebar it's aimed at is re-rendered by client-side navigation while the
   * read is remembered. Announcing only on the first read would leave a
   * freshly-rendered row offering a toggle over a dataset that isn't there.
   */
  const readAndApply = (id: string): Promise<void> => {
    const layer = LAYER_BY_ID.get(id);
    if (!layer) return Promise.resolve();

    return readArchiveOnce(layer).then((archive) => {
      if (archive) {
        apply();
        return;
      }

      wanted.delete(layer.id);
      apply();
      document.dispatchEvent(
        new CustomEvent<LayerUnavailableDetail>(LAYER_UNAVAILABLE_EVENT, {
          detail: {
            id: layer.id,
            reason: unavailableArchives.get(layer.id) ?? 'unreadable',
          },
        }),
      );
    });
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

    setVisible: (id, visible) => {
      if (unavailableArchives.has(id) || wanted.has(id) === visible) return;

      if (visible) wanted.add(id);
      else wanted.delete(id);

      // Switching off is nothing but a visibility flag, so it lands here.
      // Switching on lands here too if the archive is already read — which,
      // thanks to `warmArchives`, is the usual case.
      apply();
      if (visible && !archiveInfo.has(id)) void readAndApply(id);
    },

    warmArchives: () => {
      // One range request per archive, for bytes MapLibre needs anyway, taking
      // the round trip off the critical path of the first toggle. Deferred to
      // idle so it can't compete with the basemap's first paint. It also means
      // an archive that isn't published yet disables its own toggle up front
      // rather than after someone clicks and waits.
      const warm = () => {
        for (const layer of MAP_LAYER_META) void readAndApply(layer.id);
      };
      // Safari only grew `requestIdleCallback` recently, so there's a timer
      // fallback — the point is just to be after first paint, not exact.
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(warm, { timeout: 4000 });
      } else {
        window.setTimeout(warm, 1200);
      }
    },

    // Empty while no style is attached, not merely un-memoized: this array is
    // handed straight to `queryRenderedFeatures`, which fires an error and
    // returns nothing if one id isn't in the style. Naming a layer that belongs
    // to a style being swapped out would take the marker hit-test down with it.
    visibleLayerIds: () =>
      styleReady
        ? (visibleIds ??= MAP_LAYER_META.filter(
            (l) => wanted.has(l.id) && map.getLayer(layerIdFor(l.id)),
          ).map((l) => layerIdFor(l.id)))
        : [],

    regionLabel: (feature) => {
      const layer = LAYER_BY_MAP_LAYER_ID.get(feature.layer.id);
      if (!layer) return null;

      const field = archiveInfo.get(layer.id)?.labelField;
      const value = field ? feature.properties?.[field] : null;
      const name = typeof value === 'string' ? value.trim() : '';
      // No name attribute in this dataset, or none on this feature: say what
      // the region is. Naming it after some other column would be inventing a
      // fact about a place.
      return name || layer.label;
    },
  };
}
