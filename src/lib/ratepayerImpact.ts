// src/lib/ratepayerImpact.ts
//
// Turns a facility's nameplate MW into the numbers a ratepayer can actually
// argue with: how much electricity it eats in a year, how many Minnesota
// households that equals, what share of the state's entire retail load it is,
// and — where the serving utility has been sourced — how large it is next to
// that utility's whole customer base.
//
// Pure functions over the constants in `~/data/mnRatepayerBaseline`. No DOM,
// no formatting decisions: `ratepayerWidget.ts` renders this, and both the
// server-rendered first paint and the client-side slider call the same
// `computeRatepayerImpact`, so the two can't drift the way the MW parsing
// once did (see projectMetrics.ts for that story).
//
// The grid-stress class is *not* a new set of thresholds. `sizeTierMeta`
// already buckets capacity by the point at which the fight changes venue —
// municipal grid, substation upgrade, PUC proceeding — which is precisely the
// axis a ratepayer cares about. Reusing it keeps one set of numbers on the
// map, in the filter, and in this widget.

import type { Project } from '~/data/dataCenters';
import { getSizeTier, SIZE_TIER_BY_ID, type SizeTierMeta } from '~/data/sizeTierMeta';
import { getUtility, OWNERSHIP_BY_ID, type UtilityMeta, type UtilityOwnershipMeta } from '~/data/utilities';
import {
  DEFAULT_LOAD_FACTOR,
  HOURS_PER_YEAR,
  MAX_LOAD_FACTOR,
  MIN_LOAD_FACTOR,
  MN_ANNUAL_RETAIL_SALES_MWH,
  MN_CITY_HOUSEHOLDS,
  MN_HOUSEHOLD_MWH_PER_YEAR,
  MN_TOTAL_HOUSEHOLDS,
} from '~/data/mnRatepayerBaseline';
import { parseMW } from './projectMetrics';

export interface RatepayerImpact {
  /** Nameplate capacity used for the calculation. */
  mw: number;
  /** Fraction of nameplate assumed to be drawn continuously, 0–1. */
  loadFactor: number;
  /** Annual consumption at that load factor. */
  annualMWh: number;
  /** Equivalent Minnesota households, rounded. */
  households: number;
  /** Share of Minnesota's total annual retail electricity sales, 0–1. */
  shareOfStateLoad: number;
  /** Equivalent households as a share of every household in the state, 0–1. */
  shareOfStateHouseholds: number;
  /** Plain-language comparison to a real Minnesota city. */
  scaleText: string;
  /** Which grid-stress bucket this lands in — reused from the capacity filter. */
  tier: SizeTierMeta;
  /** Serving utility, or `null` when it hasn't been sourced for this site. */
  utility: UtilityMeta | null;
  /** Ownership metadata for `utility`, or `null` alongside it. */
  ownership: UtilityOwnershipMeta | null;
  /**
   * Households-equivalent expressed against the serving utility's own
   * customer base, 0–1. `null` when the utility is unsourced *or* has no
   * defensible published account count — never estimated.
   */
  shareOfUtilityAccounts: number | null;
}

/** Clamps a load factor into the band the slider exposes. */
export function clampLoadFactor(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_LOAD_FACTOR;
  return Math.min(Math.max(value, MIN_LOAD_FACTOR), MAX_LOAD_FACTOR);
}

/**
 * Renders an equivalent-household count as a place instead of a number.
 *
 * Walks the ascending city table to find the largest city the facility fully
 * covers, so a 1,900 MW site reads as a multiple of Minneapolis rather than
 * "1,479,467 households", and a 5 MW site reads as a fraction of the smallest
 * town rather than as a rounding error against Minneapolis.
 */
export function describeHouseholdScale(households: number): string {
  if (households <= 0) return 'Not enough capacity data to compare.';

  const smallest = MN_CITY_HOUSEHOLDS[0];
  if (households < smallest.households) {
    const pct = Math.round((households / smallest.households) * 100);
    return `About ${Math.max(pct, 1)}% of the households in ${smallest.name}.`;
  }

  // Largest city this facility could power outright.
  let match = smallest;
  for (const city of MN_CITY_HOUSEHOLDS) {
    if (households >= city.households) match = city;
  }

  const multiple = households / match.households;
  // Under ~1.15x reads as "that city", not "1.1 times that city" — the
  // household figures are ACS approximations and don't support that precision.
  if (multiple < 1.15) {
    return `Roughly every household in ${match.name}.`;
  }
  return `Roughly ${multiple.toFixed(1)}× every household in ${match.name}.`;
}

/**
 * The calculator. `mw` is the parsed nameplate; callers that have a `Project`
 * should use `impactForProject` so the "unparseable capacity" fallback stays
 * in one place.
 */
export function computeImpactForMW(
  mw: number,
  servingUtilityId: string | undefined,
  loadFactor: number = DEFAULT_LOAD_FACTOR,
): RatepayerImpact {
  const lf = clampLoadFactor(loadFactor);
  const annualMWh = mw * lf * HOURS_PER_YEAR;
  const households = Math.round(annualMWh / MN_HOUSEHOLD_MWH_PER_YEAR);

  const utility = getUtility(servingUtilityId);
  const ownership = utility ? OWNERSHIP_BY_ID[utility.ownership] : null;

  return {
    mw,
    loadFactor: lf,
    annualMWh,
    households,
    shareOfStateLoad: annualMWh / MN_ANNUAL_RETAIL_SALES_MWH,
    shareOfStateHouseholds: households / MN_TOTAL_HOUSEHOLDS,
    scaleText: describeHouseholdScale(households),
    tier: SIZE_TIER_BY_ID[getSizeTier(mw)],
    utility,
    ownership,
    shareOfUtilityAccounts: utility?.retailAccounts
      ? households / utility.retailAccounts
      : null,
  };
}

/**
 * Same fallback as `toFeatureProps` in projectFilters.ts: a capacity string we
 * can't parse becomes 5 MW rather than zero, so the site still gets a real
 * (if minimal) reading instead of a widget full of dashes.
 */
export function impactForProject(
  project: Project,
  loadFactor: number = DEFAULT_LOAD_FACTOR,
): RatepayerImpact {
  return computeImpactForMW(
    parseMW(project.powerCapacityMW) || 5,
    project.servingUtilityId,
    loadFactor,
  );
}
