// src/data/utilities.ts
//
// Which utility actually serves a site — the question that decides *whose*
// bill pays for the substation, and in which room that gets argued.
//
// Shaped like the other registries (`mapStatusMeta`, `legalStatusMeta`,
// `sizeTierMeta`): a metadata array, an `indexBy` lookup, and a normalizing
// getter, so the ratepayer widget consumes it the same way the filters
// consume those.
//
// ---------------------------------------------------------------------------
// SOURCING RULE — read before adding an entry.
// ---------------------------------------------------------------------------
// A facility gets a `servingUtilityId` only when the attribution is backed by
// a public record we can link. Electric service territory in Minnesota is not
// a matter of city limits: a site inside a city's boundary is routinely served
// by a rural cooperative, and the reverse happens just as often. Guessing from
// the mailing address would put a co-op's name next to a project it has no
// relationship with, on a map organizers hand to county boards.
//
// So an unsourced site carries NO utility rather than a plausible one. The
// widget renders that gap as an explicit "not yet sourced" state with a link
// to report it — a missing attribution is a request for help, not an error to
// paper over. See `UNSOURCED_UTILITY_ISSUE_URL`.
//
// The federal HIFLD "Electric Retail Service Territories" layer was evaluated
// as a bulk source and rejected: it returns two features for the entire
// Minnesota bounding box. The MN Geospatial Commons CKAN API that used to
// serve the state territory layer has been retired in favour of an ArcGIS Hub
// front end. Until a territory archive is published to the tile bucket (see
// `mapLayers.ts`, `coop-territories`), attribution stays hand-sourced.

import { indexBy } from '~/lib/collections';

/**
 * Who owns the utility — which is really "who do you have to convince, and
 * what leverage do you have over them".
 */
export type UtilityOwnership = 'cooperative' | 'municipal' | 'investor-owned';

export interface UtilityOwnershipMeta {
  ownership: UtilityOwnership;
  label: string;
  hex: string;
  /** Who sets the rates, and therefore where a rate challenge is filed. */
  rateAuthority: string;
  /** The one-line ratepayer argument this ownership model opens up. */
  leverage: string;
}

const UTILITY_OWNERSHIP_META: UtilityOwnershipMeta[] = [
  {
    ownership: 'cooperative',
    label: 'Member-Owned Co-op',
    // Amber, matching the co-op territory overlay's fill so the chip in the
    // drawer and the shaded region on the map read as the same thing.
    hex: '#f59e0b',
    rateAuthority:
      'Rates are set by an elected member board, not the Public Utilities Commission.',
    leverage:
      'You are an owner, not a customer. Board seats are elected by members and the vote is usually decided by a few hundred ballots.',
  },
  {
    ownership: 'municipal',
    label: 'Municipal Utility',
    hex: '#38bdf8',
    rateAuthority: 'Rates are set by the city council or its utilities commission.',
    leverage:
      'The rate-setting body is the same council that votes on the conditional use permit — one room, both decisions.',
  },
  {
    ownership: 'investor-owned',
    label: 'Investor-Owned',
    hex: '#e879f9',
    rateAuthority: 'Rates are set by the Minnesota Public Utilities Commission in a rate case.',
    leverage:
      'Cost allocation is contestable in the rate case and in the certificate-of-need docket; intervenors can and do move who pays.',
  },
];

export const OWNERSHIP_BY_ID = indexBy(
  UTILITY_OWNERSHIP_META,
  (m) => m.ownership,
  (m) => m,
);

export interface SourceRef {
  title: string;
  url: string;
}

export interface UtilityMeta {
  id: string;
  name: string;
  ownership: UtilityOwnership;
  /**
   * Retail customer/member accounts served in Minnesota. Optional on purpose:
   * a utility with no defensible published count is listed without one, and
   * the widget then omits the "share of the member base" line rather than
   * dividing by a number nobody can check.
   */
  retailAccounts?: number;
  /** Required whenever `retailAccounts` is present. */
  accountsSource?: SourceRef;
}

const UTILITY_META: UtilityMeta[] = [
  {
    id: 'xcel-mn',
    name: 'Xcel Energy (Northern States Power – Minnesota)',
    ownership: 'investor-owned',
    // ~1.3 million Minnesota electric customers.
    retailAccounts: 1_300_000,
    accountsSource: {
      title: 'Xcel Energy — Company Profile',
      url: 'https://www.xcelenergy.com/company/about_us',
    },
  },
  {
    id: 'elk-river-municipal',
    name: 'Elk River Municipal Utilities',
    ownership: 'municipal',
    // No customer count listed: ERMU publishes service-area material but not a
    // figure stable enough to divide by here. Per the sourcing rule above, the
    // widget drops the share line rather than estimating one.
  },
];

const UTILITY_BY_ID = indexBy(UTILITY_META, (m) => m.id, (m) => m);

/**
 * Where a reader reports a missing or wrong utility attribution. Pointed at
 * the repository's issue tracker rather than an inbox so the correction and
 * its source land in public, next to the data they change.
 */
export const UNSOURCED_UTILITY_ISSUE_URL =
  'https://github.com/ngabantudev/mn-data-center-watch/issues/new?title=Serving+utility+for+a+facility&labels=data';

/** Resolves a project's utility, or `null` when it has not been sourced yet. */
export function getUtility(servingUtilityId: string | undefined): UtilityMeta | null {
  if (!servingUtilityId) return null;
  return UTILITY_BY_ID[servingUtilityId] ?? null;
}
