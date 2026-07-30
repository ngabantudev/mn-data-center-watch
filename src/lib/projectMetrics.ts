// src/lib/projectMetrics.ts
//
// Single source of truth for turning a project's freeform powerCapacityMW
// string (e.g. "85 MW", "~10-15 MW Aggregate Envelope", "1,900 MW") into a
// comparable number. Used both server-side (sort/max calculations, filter
// props) and client-side (the slider's live filtering and the map's
// geoJSON properties) — previously duplicated with two different regexes
// that disagreed on decimals, which could desync the slider bounds from
// the map's actual filter comparison.

import type { Project } from "~/data/dataCenters";

/**
 * Capacity assumed for a project whose `powerCapacityMW` string can't be
 * parsed. Keeps such a site visible at the smallest marker size, and gives the
 * ratepayer widget a real (if minimal) reading, rather than collapsing it to a
 * zero-radius dot and a column of dashes.
 */
const UNPARSEABLE_MW_FALLBACK = 5;

/** Extracts the first numeric value (decimal-aware) from a MW string. */
export function parseMW(val: string | undefined): number {
  if (!val) return 0;
  const cleaned = val.replace(/,/g, "");
  const match = cleaned.match(/\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : 0;
}

/**
 * A project's capacity for every consumer that needs a usable number: the map
 * features, the sidebar's tier counts, and the ratepayer calculator. The
 * `|| fallback` used to be written out at each of those four call sites, each
 * with its own comment explaining the same 5 — which is exactly how the
 * fallback drifts.
 */
export function projectMW(project: Project): number {
  return parseMW(project.powerCapacityMW) || UNPARSEABLE_MW_FALLBACK;
}
