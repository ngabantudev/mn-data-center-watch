// src/data/moratoriums.ts
//
// Where Minnesota towns actually stand on data center moratoriums: who has one
// running, who has one moving through council, and who is watching a project
// advance with nothing in the way of it.
//
// This is the layer that answers the only question a resident can act on
// quickly. A moratorium is not a ban — it is a fixed window during which a
// council cannot accept an application, bought so that staff can write zoning
// rules. That makes it the one item on this map with a *clock*, and the clock
// is the point: a year-long pause adopted in February is a different call to
// action in March than it is the following January.
//
// ---------------------------------------------------------------------------
// SOURCING RULE — read before adding an entry.
// ---------------------------------------------------------------------------
// Same rule the utility registry states, applied to ordinances: an entry exists
// only where a public record — the ordinance itself, a council action, or news
// reporting of the vote — can be linked, and every date here is a date some
// linked source states. Nothing is interpolated. If a town is known to be
// debating a moratorium but no vote or hearing has been reported, it does not
// get a `proposed` row, because "proposed" is a thing a council did, not a
// thing residents want.
//
// `needsMoratorium` is deliberately NOT a field. Whether a town needs one is an
// argument, and putting our conclusion in a data file would launder it into a
// fact. What *is* a fact is the pair of things this file records separately —
// what the council has enacted, and whether a data center is advancing there —
// and `posture()` derives the "exposed" case from exactly that pair, by a rule
// written down below where anyone can check it.
//
// KNOWN GAPS, on purpose:
//   * Counties are not in here. Wright County (Ord. 26-2, adopted 2026-05-19)
//     and others have adopted township-level moratoriums, but a county acts on
//     a polygon, not a point, and rendering one as a dot over its seat would
//     imply the pause covers the seat — which for Wright County is exactly
//     wrong, since its moratorium reaches townships and not the cities inside
//     it. County coverage needs the boundary archive, not this file.
//   * The statewide bill (SF 4298, which would bar permits until a year after a
//     PUC study) is legislation, and lives with the other bills.
//   * This is not every Minnesota town. It is every one whose position we could
//     source. See `MORATORIUM_ISSUE_URL`.

import type { LatLngTuple, PublicRecord } from './dataCenters';
import { indexBy } from '~/lib/collections';

/**
 * What the council has actually done.
 *
 * - `in-effect`  — adopted, and its term has not run out
 * - `proposed`   — formally before the council: a hearing set, a draft ordered
 * - `expired`    — adopted and lapsed without being extended
 * - `none`       — no moratorium; often an explicit decision not to have one
 */
export type MoratoriumStatus = 'in-effect' | 'proposed' | 'expired' | 'none';

/**
 * Whether a data center is moving forward in this town, by the furthest step a
 * public record shows. `unknown` is a real and common answer and is rendered as
 * a gap — a town we have not sourced is not a town with nothing happening.
 */
export type DevelopmentStatus =
  | 'proposed'
  | 'approved'
  | 'denied'
  | 'none'
  | 'unknown';

export interface MoratoriumTimeline {
  /** ISO date of the adopting vote. */
  adoptedOn?: string;
  /** ISO date the ordinance runs out, where the source states a term. */
  expiresOn?: string;
  /** ISO date of a scheduled hearing or vote, for `proposed` rows. */
  hearingOn?: string;
  /** The term as the ordinance puts it — "One year", "Six months". */
  termLabel?: string;
}

export interface Jurisdiction {
  id: string;
  /**
   * Federal GNIS feature id, and the key the map shades this city's boundary
   * by. Required, not optional: the tint matches polygons on this number
   * rather than on `name`, because names repeat across Minnesota counties and
   * a near-match would shade the wrong city with no way for a reader to tell.
   * Every id here was read out of the boundary archive the map draws from —
   * `GNIS_FEATURE_ID` in `convertedCity_Boundaries_in_Minnesota.pmtiles` — so a
   * new entry needs its id looked up there, not guessed.
   */
  gnisFeatureId: number;
  /** Town name as the council uses it. */
  name: string;
  county: string;
  /**
   * The city's centre. Used only to place its name label — it is not city hall
   * and not the site of any project, and nothing is drawn here that would
   * suggest otherwise. The ordinance applies across the whole boundary, which
   * is what the shaded polygon shows.
   */
  coordinates: LatLngTuple;
  status: MoratoriumStatus;
  timeline: MoratoriumTimeline;
  /** What the ordinance actually covers — the exemptions are where the fight is. */
  scope?: string;
  development: DevelopmentStatus;
  /** The project, in one line, where there is one. */
  developmentNote?: string;
  /** Litigation or a threat of it against the ordinance. */
  contest?: string;
  /** At least one. Every date and figure above comes from these. */
  sources: PublicRecord[];
}

export const JURISDICTIONS: Jurisdiction[] = [
  {
    id: 'eagan',
    gnisFeatureId: 2394586,
    name: 'Eagan',
    county: 'Dakota County',
    coordinates: [44.8041, -93.1668],
    status: 'in-effect',
    timeline: {
      adoptedOn: '2026-02-17',
      expiresOn: '2027-02-17',
      termLabel: 'One year',
    },
    scope:
      'Data centers drawing more than 20 MW, or sited within 500 feet of residential property. The first city moratorium of its kind in Minnesota.',
    development: 'unknown',
    contest:
      'A lawsuit asks the court to void the moratorium.',
    sources: [
      {
        title: 'Eagan City Council approves one-year moratorium on new data centers',
        url: 'https://www.hometownsource.com/sun_thisweek/community/dakota_county/eagan-city-council-approves-one-year-moratorium-on-new-data-centers/article_42c178cb-0121-4260-9db5-672a6196a46a.html',
      },
      {
        title: 'Lawsuit filed to lift data center moratorium in Eagan',
        url: 'https://www.datacenterdynamics.com/en/news/lawsuit-filed-to-lift-data-center-moratorium-in-eagan-minnesota/',
      },
    ],
  },
  {
    id: 'carver',
    gnisFeatureId: 2393762,
    name: 'Carver',
    county: 'Carver County',
    coordinates: [44.7639, -93.6294],
    status: 'in-effect',
    timeline: {
      adoptedOn: '2026-04-06',
      expiresOn: '2027-04-06',
      termLabel: 'One year',
    },
    scope:
      'Citywide, adopted unanimously, to study water-system and sound impacts before writing zoning rules. The council may repeal it early.',
    development: 'none',
    developmentNote:
      'No data center application was pending when the council voted — the pause was taken ahead of one, not in response to it.',
    sources: [
      {
        title: 'Carver City Council approves 1-year moratorium',
        url: 'https://www.fox9.com/news/minnesota-data-centers-carver-city-council-1-year-moratorium-april-11',
      },
      {
        title: 'City of Carver — Interim Ordinance, Data Center Moratorium',
        url: 'https://www.cityofcarver.com/DocumentCenter/View/4127/Interim-Ordinance-Data-Center-Moratorium---Proposed',
      },
    ],
  },
  {
    id: 'rosemount',
    gnisFeatureId: 2396433,
    name: 'Rosemount',
    county: 'Dakota County',
    coordinates: [44.7394, -93.1258],
    status: 'in-effect',
    timeline: {
      adoptedOn: '2026-04-21',
      expiresOn: '2027-04-21',
      termLabel: 'One year',
    },
    scope:
      'Data centers are a prohibited use throughout the city for the term of the ordinance, unless the council expressly repeals it earlier.',
    development: 'unknown',
    sources: [
      {
        title: 'City of Rosemount Ordinance No. 2026-03 — Interim Ordinance, Data Centers',
        url: 'https://rosemountmn.gov/DocumentCenter/View/8294/Interim-Ordinance-Data-Centers?bidId=',
      },
      {
        title: 'Rosemount halts new data center discussion with moratorium',
        url: 'https://www.hometownsource.com/sun_thisweek/community/rosemount/rosemount-halts-new-data-center-discussion-with-moratorium/article_59c956b3-230d-4e67-aeeb-57028a66816a.html',
      },
    ],
  },
  {
    id: 'minneapolis',
    gnisFeatureId: 2395345,
    name: 'Minneapolis',
    county: 'Hennepin County',
    coordinates: [44.9778, -93.265],
    status: 'in-effect',
    timeline: {
      adoptedOn: '2026-06-25',
      expiresOn: '2026-11-21',
      termLabel: 'Six months',
    },
    scope:
      'No data center may be established, re-established or expanded — except downtown projects under 350,000 sq ft, which are exempt. Passed 8–5; sponsors had sought a year with no exemptions.',
    development: 'unknown',
    sources: [
      {
        title: 'Minneapolis council approves 6-month moratorium on data centers, downtown exempt',
        url: 'https://www.startribune.com/minneapolis-data-centers-moratorium/601846955',
      },
      {
        title: 'Minneapolis City Council approves six-month moratorium for data centers larger than 350,000 sq ft',
        url: 'https://www.datacenterdynamics.com/en/news/minneapolis-city-council-approves-six-month-moratorium-for-data-centers-larger-than-350000-sq-ft/',
      },
    ],
  },
  {
    id: 'inver-grove-heights',
    gnisFeatureId: 2395429,
    name: 'Inver Grove Heights',
    county: 'Dakota County',
    coordinates: [44.848, -93.0427],
    status: 'in-effect',
    timeline: {
      adoptedOn: '2026-06-26',
      expiresOn: '2027-06-26',
      termLabel: 'One year',
    },
    scope:
      'New data center construction or expansion, and — the contested part — the pending Carmen Avenue proposal along with it. Passed 3–2 on the third and final reading.',
    development: 'proposed',
    developmentNote:
      'A data center proposed at 5842 Carmen Ave. E, which the moratorium expressly covers. Roughly 700 residents petitioned for the pause.',
    contest:
      'The developer has threatened suit, with attorneys hired by the city reporting a claim of $150 million in damages.',
    sources: [
      {
        title: 'Inver Grove Heights approves one-year moratorium on data centers',
        url: 'https://www.mprnews.org/story/2026/06/26/inver-grove-heights-approves-moratorium-data-centers',
      },
      {
        title: 'Council votes to pass data center moratorium despite developer threatening lawsuit',
        url: 'https://www.fox9.com/news/inver-grove-heights-data-center-moratorium-june-26-2026',
      },
    ],
  },
  {
    id: 'apple-valley',
    gnisFeatureId: 2393967,
    name: 'Apple Valley',
    county: 'Dakota County',
    coordinates: [44.7319, -93.2177],
    status: 'in-effect',
    timeline: {
      adoptedOn: '2026-07-09',
      expiresOn: '2027-07-09',
      termLabel: 'One year',
    },
    development: 'unknown',
    sources: [
      {
        title: 'Apple Valley enacts one-year data center moratorium',
        url: 'https://www.hometownsource.com/sun_thisweek/community/apple_valley/apple-valley-enacts-one-year-data-center-moratorium/article_202f77b2-8efe-4be3-aa3c-d514c6bf8885.html',
      },
    ],
  },
  {
    id: 'mankato',
    gnisFeatureId: 2395831,
    name: 'Mankato',
    county: 'Blue Earth County',
    coordinates: [44.1636, -93.9994],
    status: 'in-effect',
    timeline: {
      adoptedOn: '2026-07-13',
      expiresOn: '2027-07-13',
      termLabel: 'One year',
    },
    scope:
      'Data centers and other high-impact utility consumers. No permit application contemplating construction or expansion may be accepted or approved during the term.',
    development: 'unknown',
    sources: [
      {
        title: 'Mankato City Council passes one-year moratorium on data centers',
        url: 'https://www.keyc.com/2026/07/14/mankato-city-council-passes-one-year-moratorium-data-centers/',
      },
      {
        title: 'Mankato rushes to pass data center moratorium',
        url: 'https://www.mankatofreepress.com/news/local_news/mankato-rushes-to-pass-data-center-moratorium/article_b96e2ad3-9beb-46a1-a383-25236add320e.html',
      },
    ],
  },
  {
    id: 'north-mankato',
    gnisFeatureId: 2395257,
    name: 'North Mankato',
    county: 'Nicollet County',
    coordinates: [44.1733, -94.033],
    status: 'proposed',
    timeline: {
      hearingOn: '2026-08-03',
      termLabel: 'One year, if adopted',
    },
    scope:
      'Would define a large-scale data center as one over 250,000 sq ft or using 50,000+ gallons of water a day, and make it a prohibited use while the city studies water, power, noise and siting. The council set the hearing unanimously.',
    development: 'unknown',
    sources: [
      {
        title: 'North Mankato sets public hearing on data center moratorium',
        url: 'https://www.mankatofreepress.com/news/local_news/north-mankato-sets-public-hearing-on-data-center-moratorium/article_87274598-bf10-421b-bd06-235d875d8e98.html',
      },
    ],
  },
  {
    id: 'elk-river',
    gnisFeatureId: 2394650,
    name: 'Elk River',
    county: 'Sherburne County',
    coordinates: [45.3039, -93.5672],
    status: 'proposed',
    timeline: {
      hearingOn: '2026-08-03',
      termLabel: 'One year, if adopted',
    },
    scope:
      'The council unanimously denied the rezoning that would have allowed the project on 2026-07-06 and directed staff to prepare a one-year moratorium; the planning commission heard it on 2026-07-28.',
    development: 'denied',
    developmentNote:
      'Elk River Capital, an affiliate of Swervo Development, sought to convert a 60,000 sq ft industrial building at 19178 Industrial Blvd NW into a 33 MW data center. The enabling ordinance amendment was rejected.',
    sources: [
      {
        title: 'Elk River rejects changing rules to allow data centers',
        url: 'https://www.mprnews.org/story/2026/07/07/elk-river-rejects-changing-rules-to-allow-data-centers',
      },
      {
        title: 'Officials in Elk River deny data center application, consider moratorium',
        url: 'https://www.datacenterdynamics.com/en/news/officials-in-elk-river-minnesota-deny-data-center-application-consider-moratorium/',
      },
    ],
  },
  {
    id: 'farmington',
    gnisFeatureId: 2394747,
    name: 'Farmington',
    county: 'Dakota County',
    coordinates: [44.6402, -93.1436],
    status: 'none',
    timeline: {},
    scope:
      'The city attorney told the council on 2026-05-18 that Farmington would not take up a moratorium as Eagan and Rosemount had, because the Tract project has already advanced further than anything those cities were pausing.',
    development: 'approved',
    developmentNote:
      'Tract holds final plat and planned-unit-development approval for up to 12 buildings across more than 2.5 million sq ft on 340 acres. Residents have sued to stop it.',
    sources: [
      {
        title: 'Farmington city attorney addresses moratorium requests from residents',
        url: 'https://www.hometownsource.com/sun_thisweek/community/farmington/farmington-city-attorney-addresses-moratorium-requests-from-residents/article_c4797e45-6633-4e68-b143-35b6a222ed7b.html',
      },
      {
        title: 'Farmington residents sue to stop data center park',
        url: 'https://www.govtech.com/infrastructure/farmington-minn-residents-sue-to-stop-data-center-park',
      },
    ],
  },
  {
    id: 'monticello',
    gnisFeatureId: 2395385,
    name: 'Monticello',
    county: 'Wright County',
    coordinates: [45.3055, -93.7941],
    status: 'none',
    timeline: {},
    scope:
      'Rather than pause, the council adopted a data center planned-unit-development ordinance on 2026-04-27 in a 4–1 vote, setting conditions a project must meet. Wright County’s own moratorium reaches townships, not the city.',
    development: 'proposed',
    developmentNote:
      'A 547-acre data center proposal at 85th St. NE east of Highway 25; an application was submitted to the city on 2026-07-06.',
    sources: [
      {
        title: 'Data centers face new restrictions as ordinance opens door to building in Monticello',
        url: 'https://www.mprnews.org/story/2026/04/28/monticello-ordinance-data-centers-face-new-restrictions-open-door-to-building',
      },
      {
        title: 'Data center moratorium considered in Wright County as Monticello residents push back',
        url: 'https://www.fox9.com/news/wright-county-considers-data-center-moratorium-monticello-residents-push-back-proposals',
      },
    ],
  },
];

/**
 * What a reader is actually looking at, once the clock and the development
 * record are both taken into account. This — not `status` — is what the map
 * colours by.
 *
 * - `in-effect` — a pause is running today
 * - `proposed`  — one is before the council
 * - `expired`   — one ran and lapsed; the town is open again
 * - `exposed`   — no pause, and a data center is advancing. This is the
 *                 "in need of a moratorium" case, and it is *derived*, never
 *                 asserted: it is exactly "the council has not paused" AND
 *                 "a public record shows a project proposed or approved".
 * - `open`      — no pause, and nothing on record advancing
 */
export type MoratoriumPosture =
  | 'in-effect'
  | 'proposed'
  | 'expired'
  | 'exposed'
  | 'open';

export interface PostureMeta {
  posture: MoratoriumPosture;
  label: string;
  hex: string;
  /** One line on what this posture means for someone deciding where to show up. */
  description: string;
}

// Deliberately distinct from `STATUS_META`'s project palette, which is about
// what a facility is doing. These are about what a council has done, and the
// two are read side by side on the same map — an amber dot must not be
// mistakable for an amber marker.
export const POSTURE_META: PostureMeta[] = [
  {
    posture: 'in-effect',
    label: 'Moratorium in effect',
    hex: '#22c55e',
    description: 'A pause is running. The deadline to write real rules is the fight.',
  },
  {
    posture: 'proposed',
    label: 'Moratorium proposed',
    hex: '#eab308',
    description: 'Before the council now — a hearing or a vote is scheduled.',
  },
  {
    posture: 'exposed',
    label: 'No pause, project advancing',
    hex: '#ef4444',
    description: 'A data center is moving and nothing procedural is holding it.',
  },
  {
    posture: 'expired',
    label: 'Moratorium lapsed',
    hex: '#a855f7',
    description: 'The pause ran out. Applications can be filed again.',
  },
  {
    posture: 'open',
    label: 'No moratorium',
    hex: '#94a3b8',
    description: 'No pause, and no project on record advancing here.',
  },
];

export const POSTURE_BY_ID = indexBy(POSTURE_META, (m) => m.posture, (m) => m);

/** Whether a development record shows something a moratorium would have stopped. */
const IS_ADVANCING: Record<DevelopmentStatus, boolean> = {
  proposed: true,
  approved: true,
  denied: false,
  none: false,
  unknown: false,
};

/**
 * `asOf` is a parameter rather than a `new Date()` inside, because this runs
 * both at build time (the sidebar counts) and in the browser (the map), and the
 * two must agree on the same day. Callers pass one clock.
 */
export function getPosture(
  jurisdiction: Jurisdiction,
  asOf: Date = new Date(),
): MoratoriumPosture {
  const { status, timeline, development } = jurisdiction;

  if (status === 'in-effect') {
    // A term that has run out is not still in effect just because nobody has
    // edited this file. The ordinance expires on its own date, and so does the
    // green shading on the map.
    const expiry = timeline.expiresOn ? Date.parse(`${timeline.expiresOn}T23:59:59Z`) : NaN;
    return Number.isFinite(expiry) && expiry < asOf.getTime() ? 'expired' : 'in-effect';
  }
  if (status === 'proposed') return 'proposed';
  if (status === 'expired') return 'expired';

  return IS_ADVANCING[development] ? 'exposed' : 'open';
}

/** A jurisdiction carrying the posture it holds at a given moment. */
export type PosturedJurisdiction = Jurisdiction & { posture: MoratoriumPosture };

/** Every jurisdiction with the posture it holds on `asOf`, in registry order. */
export function posturedJurisdictions(
  asOf: Date = new Date(),
): PosturedJurisdiction[] {
  return JURISDICTIONS.map((j) => ({ ...j, posture: getPosture(j, asOf) }));
}

/**
 * Dates render as "17 Feb 2026" in UTC. The ordinance dates are calendar days,
 * not instants, so parsing one in the reader's timezone would show a
 * moratorium adopted the day before it was, west of Minnesota.
 */
const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function formatOrdinanceDate(iso: string | undefined): string | null {
  if (!iso) return null;
  const parsed = Date.parse(`${iso}T12:00:00Z`);
  return Number.isFinite(parsed) ? DATE_FORMAT.format(parsed) : null;
}

/**
 * The timeline as one sentence, which is the form it gets read in. Returns null
 * where a row has no dated action at all, so a caller renders nothing rather
 * than an empty label.
 */
export function timelineSentence(jurisdiction: Jurisdiction): string | null {
  const { timeline } = jurisdiction;
  const adopted = formatOrdinanceDate(timeline.adoptedOn);
  const expires = formatOrdinanceDate(timeline.expiresOn);
  const hearing = formatOrdinanceDate(timeline.hearingOn);
  const term = timeline.termLabel;

  if (adopted && expires) {
    return `${term ? `${term}. ` : ''}Adopted ${adopted}, runs through ${expires}.`;
  }
  if (adopted) return `${term ? `${term}. ` : ''}Adopted ${adopted}.`;
  if (hearing) return `${term ? `${term}. ` : ''}Council action set for ${hearing}.`;
  return null;
}

/**
 * Where a reader reports a town this file is missing or has wrong. Points at
 * the issue tracker, like the utility registry does, so the correction lands in
 * public next to the data it changes.
 */
export const MORATORIUM_ISSUE_URL =
  'https://github.com/ngabantudev/mn-data-center-watch/issues/new?title=Moratorium+status+for+a+town&labels=data';

/** Shown under the layer's toggle. This list is sourced, not exhaustive. */
export const MORATORIUM_COVERAGE_NOTE =
  'Every town whose position we could source from a public record. Not every Minnesota town — and counties, which act on townships, are not in here yet.';
