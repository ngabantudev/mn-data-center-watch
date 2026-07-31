// src/data/legislation.ts
//
// Configuration for the statewide legislative tracker, plus the PUC
// proceedings we're asking residents to comment on.
//
// There is deliberately NO list of bills in this file. Which bills exist, what
// they say, where they are and who authored them is all discovered live from
// Open States at request time (see ~/pages/api/legislation.ts) — a hand-kept
// list goes stale the week it's written and quietly starts lying about the
// legislature. What lives here is the *query* that finds them and the
// campaign's *opinion* of the handful we're actively fighting over, which is
// an editorial position no API can hold for us.

/** Open States accepts either the OCD id or the plain state name in the bill
 *  path; the name avoids embedding encoded slashes in a path segment. */
export const MN_JURISDICTION = "Minnesota";

/** The MN *state* government, as distinct from the US Congress — `people.geo`
 *  returns both for any point, and only the former legislates in St. Paul. */
export const MN_STATE_JURISDICTION_ID =
  "ocd-jurisdiction/country:us/state:mn/government";

/**
 * The search phrase, quoted.
 *
 * The quotes are load-bearing. Open States' `q` treats an unquoted `data
 * center` as loose tokens and returns gun bills, child care bills and anything
 * else containing "data" or "center" — 222 results of mostly noise. Quoted, it
 * matches the phrase and the top of the list is genuinely about data centers.
 */
export const BILL_QUERY = '"data center"';

/**
 * Human-readable version of the above, shown in the UI. Anyone reading the
 * banner should be able to see exactly what was asked of the API, because the
 * query IS the editorial choice about what counts as a data center bill.
 */
export const BILL_QUERY_LABEL = "data center";

/**
 * Open States caps `per_page` at 20 for /bills — asking for more is a 400.
 */
export const BILLS_PER_PAGE = 20;

/**
 * Hard ceiling on pages walked per refresh, so an unexpectedly broad result
 * set can't quietly turn one refresh into a hundred upstream calls.
 *
 * Scoped to a single session the phrase currently returns 43 bills across 3
 * pages, so this is roughly double the real cost. When it does bite, the
 * payload says so (`truncated`) and the UI admits the list is partial rather
 * than presenting it as the whole legislature.
 */
export const MAX_BILL_PAGES = 6;

/**
 * THE REAL RATE LIMIT: 10 requests per minute.
 *
 * Measured, not assumed — 30 back-to-back calls returned 13 × 200 and
 * 17 × `429 {"detail":"exceeded limit of 10/min"}`, and the window recovers
 * fully after about a minute's idle. An earlier version of this file said "500
 * requests/day", which is the wrong shape of limit entirely: the constraint is
 * burst concurrency, not daily volume, and it bites in seconds rather than by
 * mid-morning.
 *
 * One cold refresh spends 4 of those 10 (session list + three pages), so the
 * thing to prevent is several refreshes overlapping. That is handled by
 * single-flight and a last-good fallback in ~/lib/edgeCache.ts, not by these
 * numbers — but these numbers are what keep a refresh rare in the first place.
 */
export const LEGISLATION_MAX_AGE = 3600;
export const LEGISLATION_S_MAX_AGE = 21600;

/** How long a fetched bill list is served without contacting the API. Six
 *  hours; the legislature does not move faster than that. */
export const LEGISLATION_FRESH_TTL = 21600;

/**
 * How long a bill list is retained as a fallback for when a refresh fails —
 * two weeks, far beyond its freshness.
 *
 * Not a contradiction. Fresh means "serve without asking"; kept means "still
 * better than nothing". A fortnight-old list stamped with its own date is a
 * true statement about the record as of that date. An empty list would read as
 * "no data center bills before the legislature", which is false.
 */
export const LEGISLATION_KEEP_TTL = 1209600;

/** Per-request TTL hint passed to the subrequest cache where one exists. */
export const BILLS_CACHE_TTL = 21600;

/** The list of sessions changes when a session is gavelled in or out — a few
 *  times a year at most. */
export const SESSIONS_CACHE_TTL = 86400;

/** Cache key for the composed payload. Version it: a change to the payload
 *  shape must not be served from an entry written by the old code. */
export const LEGISLATION_CACHE_KEY = "legislation:mn-data-centers:v1";

/** District boundaries change only when the state is redistricted. */
export const LEGISLATOR_MAX_AGE = 3600;
export const LEGISLATOR_S_MAX_AGE = 86400;

export type StancePosition = "support" | "oppose";

export interface CampaignStance {
  position: StancePosition;
  /** Our own one-line framing — why this bill is worth a resident's attention.
   *  Not a description of the bill; the live title already does that. */
  demand: string;
}

/**
 * The campaign's position on specific bills.
 *
 * This is opinion, not data — it is the one thing in the tracker that Open
 * States cannot tell us and that we would not want it to. A bill with an entry
 * here is badged as a campaign priority and sorted to the top; every other
 * bill still renders in full from live data, so forgetting to add an entry
 * hides nothing and invents nothing.
 *
 * Keys are matched loosely (case and spacing are normalised), so "HF 4888" and
 * "HF4888" both resolve. An entry for a bill that no longer exists is inert.
 */
const CAMPAIGN_STANCES: Record<string, CampaignStance> = {
  "HF 4888": {
    position: "support",
    demand:
      "Moratorium on new data centers until the PUC reports back on what they cost the grid and ratepayers.",
  },
  "SF 4298": {
    position: "support",
    demand:
      "Senate companion to HF 4888 — same moratorium and PUC report, in Energy, Utilities, Environment, and Climate.",
  },
  "HF 4512": {
    position: "support",
    demand:
      "Require public hearings and disclosure before any data center development is approved.",
  },
};

/** Normalises a bill identifier for stance lookup: "hf4888" -> "HF 4888". */
export function stanceFor(identifier: string): CampaignStance | null {
  const compact = identifier.replace(/\s+/g, "").toUpperCase();
  for (const [key, stance] of Object.entries(CAMPAIGN_STANCES)) {
    if (key.replace(/\s+/g, "").toUpperCase() === compact) return stance;
  }
  return null;
}

export interface PucDocket {
  /** The PUC's own year-number docket format. */
  docket: string;
  title: string;
  /** What a resident's comment actually bears on. */
  ask: string;
}

/**
 * Live MN PUC proceedings where comment is open to anyone — you do not need
 * to be a party to the case to file.
 *
 * Still hand-kept, unlike the bills above: the Commission's eDockets system
 * publishes no JSON API to read this from, so there is nothing live to point
 * at yet. Worth revisiting if that ever changes.
 */
export const PUC_DOCKETS: PucDocket[] = [
  {
    docket: "26-126",
    title: "Minnesota Power — data center tariff and very-large-customer class",
    ask: "Demand that data center load pays its own way, with cost-of-service and water disclosure in the record.",
  },
];

export const PUC_COMMENT_URL = "https://mn.gov/puc/get-involved/public-comments/";
export const PUC_EDOCKETS_URL = "https://www.edockets.state.mn.us/EFiling/";
export const MN_LEG_DIRECTORY_URL = "https://www.leg.mn.gov/leg/legdir";
export const MN_REVISOR_SEARCH_URL =
  "https://www.revisor.mn.gov/bills/status_search.php";
