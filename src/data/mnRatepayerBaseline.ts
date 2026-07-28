// src/data/mnRatepayerBaseline.ts
//
// The statewide denominators the ratepayer calculator divides by. Kept in
// `data/` (not `lib/`) for the same reason the status and legal registries
// are: these are *citable claims about Minnesota*, not derived math, and
// every one of them has to survive a community fact-check. Anything added
// here needs a real published source on the line below it.
//
// Deliberately NOT here: dollar figures. Translating a facility's MW draw
// into "$N on your monthly bill" requires the utility's rate case, its cost
// -allocation settlement, and the interconnection agreement for that
// specific site — none of which are public for most projects on this map.
// Inventing that number would be the fastest way to lose the argument in a
// hearing room. The calculator therefore reports *load*, *share*, and *who
// decides who pays* — all of which are defensible from public record.

/** Hours in a non-leap year. Used to turn a MW nameplate into annual MWh. */
export const HOURS_PER_YEAR = 8760;

/**
 * Annual electricity use of the average Minnesota household, in MWh.
 *
 * EIA Electric Power Annual, Table 5.a (MN residential sales ÷ residential
 * customers) lands at roughly 9,000 kWh/yr — about 750 kWh/month.
 * https://www.eia.gov/electricity/state/minnesota/
 */
export const MN_HOUSEHOLD_MWH_PER_YEAR = 9;

/**
 * Total retail electricity sales in Minnesota across all sectors, MWh/yr.
 * Roughly 69 million MWh (69 TWh).
 * https://www.eia.gov/electricity/state/minnesota/
 */
export const MN_ANNUAL_RETAIL_SALES_MWH = 69_000_000;

/**
 * Occupied housing units in Minnesota — the denominator behind "X% of every
 * household in the state". U.S. Census ACS 5-year estimates, ~2.29 million.
 * https://data.census.gov/
 */
export const MN_TOTAL_HOUSEHOLDS = 2_290_000;

/**
 * Occupied-household counts for a spread of Minnesota cities, used to render
 * a facility's draw as a place a reader has actually been ("about every
 * household in Duluth") rather than a bare six-digit number.
 *
 * Approximate, from U.S. Census ACS 5-year estimates, and labelled as such
 * wherever they surface in the UI. Ordered ascending — `describeHouseholdScale`
 * relies on that to find the closest comparison without re-sorting.
 * https://data.census.gov/
 */
export interface CityHouseholds {
  name: string;
  households: number;
}

export const MN_CITY_HOUSEHOLDS: CityHouseholds[] = [
  { name: 'Pine Island', households: 1_400 },
  { name: 'Cannon Falls', households: 1_800 },
  { name: 'Monticello', households: 5_600 },
  { name: 'Bemidji', households: 6_500 },
  { name: 'Faribault', households: 9_000 },
  { name: 'Winona', households: 10_500 },
  { name: 'Moorhead', households: 16_000 },
  { name: 'Mankato', households: 17_000 },
  { name: 'St. Cloud', households: 28_000 },
  { name: 'Bloomington', households: 37_000 },
  { name: 'Duluth', households: 38_000 },
  { name: 'Rochester', households: 52_000 },
  { name: 'St. Paul', households: 124_000 },
  { name: 'Minneapolis', households: 184_000 },
];

/**
 * How hard a data center runs, as a fraction of its nameplate MW. Unlike a
 * factory or an office park, a data center's whole economics depend on the
 * racks never going idle, so the realistic band is high and narrow — but the
 * exact figure is one of the most-contested numbers in a siting fight, which
 * is why the widget hands the reader the slider instead of asserting one.
 */
export const DEFAULT_LOAD_FACTOR = 0.8;
export const MIN_LOAD_FACTOR = 0.4;
export const MAX_LOAD_FACTOR = 1;
