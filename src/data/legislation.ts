// src/data/legislation.ts
//
// The statewide campaign's legislative demands and the PUC proceedings we're
// asking residents to comment on.
//
// The *demands* are hand-written here because "what we're fighting for" is an
// editorial decision, not something an API knows. The *status* of each bill is
// fetched live from Open States (see ~/pages/api/legislation.ts) so the banner
// never claims a bill is moving when it died in committee months ago.

/** Open States accepts either the OCD id or the plain state name in the bill
 *  path; the name avoids embedding encoded slashes in a path segment. */
export const MN_JURISDICTION = "Minnesota";

/** The MN *state* government, as distinct from the US Congress — `people.geo`
 *  returns both for any point, and only the former legislates in St. Paul. */
export const MN_STATE_JURISDICTION_ID =
  "ocd-jurisdiction/country:us/state:mn/government";

/**
 * Open States' free tier is 500 requests/day for the whole deployment. Six
 * hours of staleness on a bill status costs nothing; exhausting the quota by
 * mid-morning costs everything.
 */
export const LEGISLATION_MAX_AGE = 3600;
export const LEGISLATION_S_MAX_AGE = 21600;

/** District boundaries change only when the state is redistricted. */
export const LEGISLATOR_MAX_AGE = 3600;
export const LEGISLATOR_S_MAX_AGE = 86400;

export interface TrackedBill {
  /** Bill identifier as Open States spells it, e.g. "HF 4888". */
  identifier: string;
  /** Open States session identifier, e.g. "2025-2026". */
  session: string;
  /** Our own one-line framing — why this bill is on the map. */
  demand: string;
}

/**
 * Bills the campaign is actively tracking, all verified live in the 2025-2026
 * regular session. `session` must match the Open States session identifier
 * exactly or the lookup 404s and the bill degrades to "status unavailable" —
 * check https://v3.openstates.org/jurisdictions/Minnesota before adding one.
 */
export const TRACKED_BILLS: TrackedBill[] = [
  {
    identifier: "HF 4888",
    session: "2025-2026",
    demand:
      "Moratorium on new data centers until the PUC reports back on what they cost the grid and ratepayers.",
    },
  {
    identifier: "SF 4298",
    session: "2025-2026",
    demand:
      "Senate companion to HF 4888 — same moratorium and PUC report, in Energy, Utilities, Environment, and Climate.",
  },
  {
    identifier: "HF 4512",
    session: "2025-2026",
    demand:
      "Require public hearings and disclosure before any data center development is approved.",
  },
];

export interface PucDocket {
  /** The PUC's own year-number docket format. */
  docket: string;
  title: string;
  /** What a resident's comment actually bears on. */
  ask: string;
}

/** Live MN PUC proceedings where comment is open to anyone — you do not need
 *  to be a party to the case to file. */
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
