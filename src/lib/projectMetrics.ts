// src/lib/projectMetrics.ts
//
// Single source of truth for turning a project's freeform powerCapacityMW
// string (e.g. "85 MW", "~10-15 MW Aggregate Envelope", "1,900 MW") into a
// comparable number. Used both server-side (sort/max calculations, filter
// props) and client-side (the slider's live filtering and the map's
// geoJSON properties) — previously duplicated with two different regexes
// that disagreed on decimals, which could desync the slider bounds from
// the map's actual filter comparison.

/** Extracts the first numeric value (decimal-aware) from a MW string. */
export function parseMW(val: string | undefined): number {
  if (!val) return 0;
  const cleaned = val.replace(/,/g, "");
  const match = cleaned.match(/\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : 0;
}
