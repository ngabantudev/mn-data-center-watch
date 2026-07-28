// src/data/sizeTierMeta.ts
//
// Capacity buckets for the sidebar filter. The thresholds are not arbitrary
// quantiles — they sit on natural gaps in the MN dataset (90→110 MW and
// 180→300 MW) *and* on the points where the opposition fight changes venue:
//
//   < 100 MW  fits existing municipal grid capacity → city-council zoning fight
//   100–299   needs substation / transmission upgrades → county + utility
//   ≥ 300     hyperscale; triggers state PUC and transmission proceedings
//
// Note these buckets drive the *filter* only. Marker radius stays continuous
// (sqrt-scaled on raw MW) so a 1,900 MW outlier still visibly dwarfs a
// 300 MW site instead of collapsing into the same dot.

import { indexBy } from '~/lib/collections';

export type SizeTier = 'small' | 'medium' | 'large';

export interface SizeTierMeta {
  tier: SizeTier;
  /** Inclusive lower bound in MW */
  minMW: number;
  /** Exclusive upper bound in MW, or null for the open-ended top bucket */
  maxMW: number | null;
  label: string;
  /** Capacity range, rendered next to the label */
  rangeLabel: string;
  /** Who you end up organizing against at this scale */
  description: string;
  hex: string;
  /** Relative dot size in the legend, px */
  dotSize: number;
}

export const SIZE_TIER_META: SizeTierMeta[] = [
  {
    tier: 'small',
    minMW: 0,
    maxMW: 100,
    label: 'Small',
    rangeLabel: '< 100 MW',
    description: 'Fits municipal grid — local zoning fight',
    hex: '#38bdf8',
    dotSize: 6,
  },
  {
    tier: 'medium',
    minMW: 100,
    maxMW: 300,
    label: 'Medium',
    rangeLabel: '100–299 MW',
    description: 'Needs substation upgrades — county + utility',
    hex: '#818cf8',
    dotSize: 10,
  },
  {
    tier: 'large',
    minMW: 300,
    maxMW: null,
    label: 'Large',
    rangeLabel: '300+ MW',
    description: 'Hyperscale — state PUC & transmission proceedings',
    hex: '#e879f9',
    dotSize: 15,
  },
];

export const ALL_SIZE_TIERS: SizeTier[] = SIZE_TIER_META.map((m) => m.tier);

export const SIZE_TIER_BY_ID = indexBy(SIZE_TIER_META, (m) => m.tier, (m) => m);

/**
 * Buckets a parsed MW value. Walks highest-first so the open-ended top
 * bucket needs no special case and thresholds are stated exactly once.
 */
export function getSizeTier(mw: number): SizeTier {
  for (let i = SIZE_TIER_META.length - 1; i >= 0; i--) {
    if (mw >= SIZE_TIER_META[i].minMW) return SIZE_TIER_META[i].tier;
  }
  return 'small';
}
