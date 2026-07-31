// src/data/mnCleanGridStandard.ts
//
// Minnesota's carbon-free electricity standard — the statutory deadline the
// rest of this map is arguing against — plus the one published figure for how
// far the state has actually got.
//
// Lives in `data/` for the same reason `mnRatepayerBaseline.ts` does: every
// value here is a *citable claim about Minnesota*, not derived math, and each
// one has to survive being read back in a hearing room. Anything added needs a
// real published source on the line below it, and a vintage.
//
// ---------------------------------------------------------------------------
// TWO NUMBERS THAT ARE NOT THE SAME NUMBER — read before editing either.
// ---------------------------------------------------------------------------
// The commonest error in coverage of this law is to put a *carbon-free share*
// and an *emissions reduction* on the same axis. They measure different things
// and they move at different speeds:
//
//   carbon-free share      what fraction of the electricity came from a
//                          carbon-free source. This is what the statute
//                          counts, and the only thing this file's percentages
//                          are allowed to be.
//
//   emissions reduction    how far CO2 has fallen against a baseline year,
//                          usually 2005. Xcel's widely-quoted "more than 80%
//                          by 2030" is this, measured from 2005 — NOT a claim
//                          that 80% of its electricity will be carbon-free.
//
// A tracker that renders the second as though it were the first would show
// Minnesota comfortably ahead of a deadline it is in fact behind on. Do not
// add an emissions-reduction figure to `MN_CARBON_FREE_SHARE` or to the
// milestone table.
//
// ---------------------------------------------------------------------------
// WHAT THE STATUTE COUNTS vs WHAT THE STATE PUBLISHES
// ---------------------------------------------------------------------------
// The standard is enforced *per utility*, against that utility's retail
// electric sales to its own Minnesota customers. There is no published
// statewide compliance score, because compliance isn't a statewide quantity.
//
// What is published annually is Minnesota's *generation* mix. That is a
// different denominator — the state sits inside MISO and both imports and
// exports power, so electricity generated here isn't the same set of
// electrons as electricity sold here. The generation share is a fair
// indicator of the state's trajectory and it is the best public number there
// is; it is not a compliance percentage, and the UI has to say so rather than
// implying the state has a single score to be graded against.

/** The statutory deadline, and the year every countdown on this widget runs to. */
export const CARBON_FREE_DEADLINE_YEAR = 2040;

/**
 * Minnesota Statutes § 216B.1691, subd. 2g — the carbon-free standard.
 * https://www.revisor.mn.gov/statutes/cite/216B.1691
 *
 * Enacted by Laws of Minnesota 2023, chapter 7 (HF 7 / SF 4), effective
 * 2023-02-08.
 * https://www.house.mn.gov/NewLaws/story/2023/5473
 *
 * NOTE THE 2030 SPLIT. The statute sets two different 2030 targets, and most
 * summaries — including most newsroom write-ups — quote only the 80% one:
 *
 *   (1) 2030   80 percent for public utilities; 60 percent for other
 *              electric utilities
 *   (2) 2035   90 percent for all electric utilities
 *   (3) 2040   100 percent for all electric utilities
 *
 * "Public utility" here means investor-owned — Xcel, Minnesota Power, Otter
 * Tail. "Other electric utilities" is every municipal and every cooperative,
 * which is most of greater Minnesota by area and which serves a good share of
 * the sites on this map. Rendering only the 80% track would tell a co-op
 * member their utility is 20 points behind when the number the law actually
 * holds it to that year is 60%.
 */
export interface CarbonFreeMilestone {
  year: number;
  /** Required share for investor-owned utilities, 0–1. */
  publicUtility: number;
  /**
   * Required share for municipals and cooperatives, 0–1. Equal to
   * `publicUtility` from 2035 on, when the two tracks converge.
   */
  otherUtility: number;
  /** Whether the two tracks differ this year — drives the split rendering. */
  split: boolean;
  /** What this milestone is, in one line a reader can repeat. */
  note: string;
}

export const CARBON_FREE_MILESTONES: CarbonFreeMilestone[] = [
  {
    year: 2030,
    publicUtility: 0.8,
    otherUtility: 0.6,
    split: true,
    note: 'Two tracks: 80% for investor-owned utilities, 60% for municipals and co-ops.',
  },
  {
    year: 2035,
    publicUtility: 0.9,
    otherUtility: 0.9,
    split: false,
    note: 'Tracks converge — 90% for every electric utility in the state.',
  },
  {
    year: CARBON_FREE_DEADLINE_YEAR,
    publicUtility: 1,
    otherUtility: 1,
    split: false,
    note: 'The mandate: 100% carbon-free for every electric utility.',
  },
];

/**
 * The separate *renewable* standard — § 216B.1691, subd. 2a: 55% by 2035.
 *
 * Deliberately not a milestone above. It runs on a different definition:
 * nuclear counts as carbon-free but not as renewable, and Minnesota's two
 * nuclear plants are a large slice of the carbon-free share. Plotting 55%
 * renewable on the carbon-free track would read as a fourth, lower target on
 * the same axis, which is exactly backwards — it is a *harder* test of the
 * same grid, not an easier one.
 */
export const RENEWABLE_STANDARD_2035 = 0.55;

/**
 * Minnesota's carbon-free share of in-state electricity generation.
 *
 * "In 2025, these resources accounted for 55% of total generation, compared
 * with a national average of 43%." — 2026 Minnesota Energy Factsheet, Clean
 * Energy Economy Minnesota with the Business Council for Sustainable Energy
 * and BloombergNEF, published 2026-04-30, using Minnesota Department of
 * Commerce and EIA data.
 * https://www.cleanenergyeconomymn.org/factsheet
 *
 * `dataYear` is the year the measurement describes; `publishedYear` is when it
 * became public. Both are rendered, because the gap between them is the whole
 * reason this reads "as of 2025" rather than "today" — there is no live feed
 * for this figure and pretending otherwise would date the widget silently.
 */
export const MN_CARBON_FREE_SHARE = {
  share: 0.55,
  dataYear: 2025,
  publishedYear: 2026,
  sourceLabel: '2026 Minnesota Energy Factsheet (CEEM / BCSE, from MN Commerce and EIA data)',
  sourceUrl: 'https://www.cleanenergyeconomymn.org/factsheet',
} as const;

/**
 * The renewable slice of that same mix — 33% in 2025, from the same factsheet.
 * Carried so the widget can say what the 55% is *made of* instead of leaving a
 * reader to assume it is all wind and solar; the ~22-point difference between
 * this and the carbon-free share is essentially the two nuclear plants.
 */
export const MN_RENEWABLE_SHARE_2025 = 0.33;

/**
 * The largest utility on the system, tracked separately and stamped with a
 * vintage that is deliberately visible.
 *
 * "Today, the electricity Xcel Energy provides customers in the Upper Midwest
 * is 60% carbon-free." — Xcel Energy, 2023-02-10.
 * https://stories.xcelenergy.com/ArticlePage/?id=Minnesota-sets-new-clean-energy-goals
 *
 * THIS FIGURE IS OLD, AND THAT IS THE POINT OF SHOWING IT. It is the most
 * recent carbon-free *share* Xcel has published for the Upper Midwest system;
 * everything the company has put out since is framed as emissions reduction
 * against 2005 (see the note at the top of this file). So the honest rendering
 * is the number with its date attached and an explicit "not since updated",
 * rather than either a fresher-looking figure we cannot source or a silent
 * omission of the state's biggest utility.
 *
 * Note also that it covers the Upper Midwest system — Minnesota plus parts of
 * the Dakotas, Wisconsin and Michigan — not Minnesota alone. It is not a
 * Minnesota compliance figure and must not be labelled as one.
 */
export const XCEL_UPPER_MIDWEST_CARBON_FREE = {
  share: 0.6,
  asOfYear: 2023,
  sourceLabel: 'Xcel Energy, "Minnesota sets new clean energy goals" (Feb 2023)',
  sourceUrl: 'https://stories.xcelenergy.com/ArticlePage/?id=Minnesota-sets-new-clean-energy-goals',
} as const;

/**
 * The off-ramp — § 216B.1691, subd. 2b.
 *
 * The deadline is not self-executing. The Commission may modify or delay a
 * utility's compliance where it finds doing so is in the public interest,
 * weighing customer cost impacts, system reliability, technical feasibility
 * and transmission constraints, among others. A cost or reliability ground
 * requires a finding that the impact is *significant*.
 *
 * This is the provision a large new load is argued under, which is why it sits
 * in a data center watchdog's grid tracker at all: the risk to 2040 is not
 * that the statute gets repealed, it is that a utility arrives at the
 * Commission with a demand forecast and asks for more time.
 */
export const CARBON_FREE_OFF_RAMP = {
  citation: 'Minn. Stat. § 216B.1691, subd. 2b',
  url: 'https://www.revisor.mn.gov/statutes/cite/216B.1691',
  summary:
    'The Public Utilities Commission may modify or delay a utility’s compliance if it finds that doing so is in the public interest — weighing customer costs, system reliability, technical feasibility and transmission constraints.',
} as const;

/** The statute itself, linked wherever a milestone is cited. */
export const CARBON_FREE_STATUTE = {
  citation: 'Minn. Stat. § 216B.1691, subd. 2g',
  url: 'https://www.revisor.mn.gov/statutes/cite/216B.1691',
  actLabel: 'Laws of Minnesota 2023, ch. 7 (HF 7 / SF 4)',
  actUrl: 'https://www.house.mn.gov/NewLaws/story/2023/5473',
} as const;

/**
 * Xcel's contracted data center pipeline, for the pressure card.
 *
 * "Xcel Energy now has more than 2 GW of contracted data center capacity in
 * queue, and expects to have 6 GW of contracted data centers in queue by
 * 2027." — Utility Dive, reporting Xcel's Q1 2026 earnings call.
 * https://www.utilitydive.com/news/xcel-energy-ceo-google-deal-sets-template-for-large-load-tariff-strategy/819409/
 *
 * Kept alongside — not instead of — the figure the widget computes from this
 * site's own project dataset. They answer different questions: the map knows
 * what has been *proposed and sited* in Minnesota, the queue figure is what
 * one utility has already put under *contract* across its whole service area.
 * Neither substitutes for the other, and quoting only the map's total would
 * understate what is already committed.
 */
export const XCEL_CONTRACTED_QUEUE_GW = {
  nowGW: 2,
  byYear: 2027,
  byYearGW: 6,
  sourceLabel: 'Utility Dive, reporting Xcel Energy’s Q1 2026 earnings call',
  sourceUrl:
    'https://www.utilitydive.com/news/xcel-energy-ceo-google-deal-sets-template-for-large-load-tariff-strategy/819409/',
} as const;
