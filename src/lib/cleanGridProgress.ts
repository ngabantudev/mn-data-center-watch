// src/lib/cleanGridProgress.ts
//
// The math behind the 2040 clean grid tracker: where the state's published
// carbon-free share sits against each statutory milestone, how long is left,
// and how much load the data centers on this map would add to the system that
// has to get there.
//
// Pure functions over `~/data/mnCleanGridStandard` and the constants the
// ratepayer calculator already uses. No DOM and no formatting — the component
// renders these, and the one client-side script re-runs `yearsUntilDeadline`
// against the reader's own clock (see CleanGridTracker.astro for why).

import { clientProjects, type Project } from '~/data/dataCenters';
import {
  CARBON_FREE_DEADLINE_YEAR,
  CARBON_FREE_MILESTONES,
  MN_CARBON_FREE_SHARE,
  type CarbonFreeMilestone,
} from '~/data/mnCleanGridStandard';
import {
  DEFAULT_LOAD_FACTOR,
  HOURS_PER_YEAR,
  MN_ANNUAL_RETAIL_SALES_MWH,
} from '~/data/mnRatepayerBaseline';
import { parseMW } from './projectMetrics';

/**
 * Years from `fromYear` to the 2040 mandate, floored at zero.
 *
 * Whole years, deliberately. The statute reads "by the end of the year
 * indicated", so a countdown in days would imply a precision the deadline
 * doesn't have — and would need a live clock on a page that is prerendered.
 */
export function yearsUntilDeadline(fromYear: number): number {
  return Math.max(CARBON_FREE_DEADLINE_YEAR - fromYear, 0);
}

/**
 * The next milestone still ahead of `fromYear`, or `null` once 2040 has
 * passed. `null` is a real state the UI has to render rather than a bug: this
 * widget outlives the deadline it tracks, and on 2041-01-01 it should say the
 * mandate is due, not count down to a date behind it.
 */
export function nextMilestone(fromYear: number): CarbonFreeMilestone | null {
  return CARBON_FREE_MILESTONES.find((m) => m.year >= fromYear) ?? null;
}

/**
 * Percentage points between the published carbon-free share and a required
 * one. Points, not percent — the difference between 55% and 80% is 25 points,
 * and calling it "a 45% shortfall" (25/55) would be a different, larger-looking
 * claim about the same gap.
 */
export function pointsBehind(current: number, required: number): number {
  return Math.round((required - current) * 100);
}

export interface DataCenterLoadPressure {
  /** Sites counted — proposed, under construction, and operating. */
  projectCount: number;
  /** Their combined nameplate capacity, MW. */
  totalMW: number;
  /** Same figure in GW, the unit the rail's header already reports. */
  totalGW: number;
  /** Annual consumption at the default utilisation assumption, MWh. */
  annualMWh: number;
  /** That draw as a share of Minnesota's total annual retail sales, 0–1. */
  shareOfStateLoad: number;
  /** The utilisation assumption used, 0–1, so the UI can state it. */
  loadFactor: number;
}

/**
 * What the buildout on this map would add to the grid that has to decarbonise.
 *
 * Two things are deliberately inherited rather than re-derived:
 *
 *   `parseMW` (not `projectMW`) and the rejected-project exclusion, so this
 *   total is the same number FilterHeader.astro prints as "Total Power" a few
 *   inches up the same rail. Two totals for one dataset on one screen is the
 *   bug this shares a codebase to avoid.
 *
 *   `DEFAULT_LOAD_FACTOR` from the ratepayer baseline, so the site makes one
 *   assumption about how hard a data center runs and states it in both places.
 *
 * This is a *load* figure and nothing more. It says how much electricity the
 * buildout wants; it does not claim that electricity is fossil-fired, and the
 * component must not imply it does. Whether new load is served cleanly is
 * precisely what is contested — asserting the answer here would concede the
 * argument the map exists to have.
 */
export function dataCenterLoadPressure(
  projects: readonly Project[] = clientProjects,
  loadFactor: number = DEFAULT_LOAD_FACTOR,
): DataCenterLoadPressure {
  // A cancelled site adds nothing to the grid, so it is out of the totals —
  // matching FilterHeader's `validProjects` for the same reason.
  const counted = projects.filter((p) => p.status !== 'rejected');
  const totalMW = counted.reduce((sum, p) => sum + parseMW(p.powerCapacityMW), 0);
  const annualMWh = totalMW * loadFactor * HOURS_PER_YEAR;

  return {
    projectCount: counted.length,
    totalMW,
    totalGW: totalMW / 1000,
    annualMWh,
    shareOfStateLoad: annualMWh / MN_ANNUAL_RETAIL_SALES_MWH,
    loadFactor,
  };
}

/**
 * Everything on this readout is a function of the year asked about. That is
 * the whole membership rule, and it is why `share` and `dataYear` are not here
 * even though they were: both are `MN_CARBON_FREE_SHARE` copied through
 * unchanged, no consumer ever read them from here, and a widget that can reach
 * the same figure by two routes is a widget that can render it two ways.
 * CleanGridTracker.astro imports the constant directly.
 */
export interface CleanGridProgress {
  /** Years from `asOfYear` to 2040. */
  yearsLeft: number;
  /** The next milestone still ahead, or `null` once 2040 has passed. */
  next: CarbonFreeMilestone | null;
  /** Points from the published share to the 100% mandate. */
  pointsToMandate: number;
}

/**
 * The whole readout for a given year. `asOfYear` is the reader's current year,
 * which is *not* the same as `MN_CARBON_FREE_SHARE.dataYear` — the countdown
 * runs on today's clock while the share is stamped with the year it measures.
 * Collapsing the two would either freeze the countdown at the data vintage or
 * imply the 55% is a live reading.
 */
export function cleanGridProgress(asOfYear: number): CleanGridProgress {
  return {
    yearsLeft: yearsUntilDeadline(asOfYear),
    next: nextMilestone(asOfYear),
    pointsToMandate: pointsBehind(MN_CARBON_FREE_SHARE.share, 1),
  };
}
