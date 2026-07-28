// src/data/organizingChapters.ts
//
// Regional organizing nodes for the statewide data-center campaign. A
// volunteer's ZIP routes them to the node that actually covers their area, so
// a Worthington signup doesn't land in a Minneapolis metro inbox.
//
// Routing is by ZIP *prefix* (the first three digits — the USPS sectional
// center facility), which is coarse but stable: MN's 550–567 range maps onto
// the regions below without shipping a county-level ZIP table in the bundle.

export interface OrganizingChapter {
  id: string;
  /** Chapter name as volunteers should see it. */
  name: string;
  /** One line on what this node actually does, shown back after signup. */
  focus: string;
  /** USPS 3-digit ZIP prefixes this node covers. */
  zipPrefixes: string[];
}

export const ORGANIZING_CHAPTERS: OrganizingChapter[] = [
  {
    id: 'metro',
    name: 'Twin Cities Metro Chapter',
    focus: 'Council and county-board testimony across Hennepin, Ramsey, and the inner suburbs.',
    zipPrefixes: ['550', '551', '553', '554', '555'],
  },
  {
    id: 'metro-fringe',
    name: 'Metro Fringe & Exurban Working Group',
    focus: 'Farmland conversion and substation siting in the fast-growing collar counties.',
    zipPrefixes: ['552', '558'],
  },
  {
    id: 'southeast',
    name: 'Southeast Minnesota Node',
    focus: 'Rochester-area grid siting, aquifer testimony, and Olmsted/Winona permitting.',
    zipPrefixes: ['559'],
  },
  {
    id: 'southwest',
    name: 'Southwest Prairie Node',
    focus: 'Rural water-draw monitoring and township-level moratorium organizing.',
    zipPrefixes: ['560', '561'],
  },
  {
    id: 'central',
    name: 'Central Minnesota Node',
    focus: 'St. Cloud corridor load growth and Xcel rate-case intervention support.',
    zipPrefixes: ['562', '563', '564'],
  },
  {
    id: 'northwest',
    name: 'Northwest & Red River Valley Node',
    focus: 'Moorhead/Fargo-adjacent siting and cross-border transmission review.',
    zipPrefixes: ['565', '566', '567'],
  },
  {
    id: 'northeast',
    name: 'Arrowhead & Iron Range Node',
    focus: 'Duluth and Iron Range water permits, plus mine-site redevelopment proposals.',
    zipPrefixes: ['556', '557'],
  },
];

/**
 * Fallback when a ZIP is valid but outside Minnesota (or inside an MN prefix
 * we haven't staffed yet). Out-of-state supporters still matter for the
 * legislative-lobbying list, so they get a real destination rather than an error.
 */
export const STATEWIDE_CHAPTER: OrganizingChapter = {
  id: 'statewide',
  name: 'Statewide Campaign List',
  focus: 'Legislative alerts, hearing notices, and a hand-off once a node opens near you.',
  zipPrefixes: [],
};

/** True for a 5-digit US ZIP. Deliberately does not accept ZIP+4. */
export function isValidZip(zip: string): boolean {
  return /^\d{5}$/.test(zip);
}

/** Routes a 5-digit ZIP to its organizing node, falling back to the statewide list. */
export function chapterForZip(zip: string): OrganizingChapter {
  if (!isValidZip(zip)) return STATEWIDE_CHAPTER;
  const prefix = zip.slice(0, 3);
  return ORGANIZING_CHAPTERS.find((c) => c.zipPrefixes.includes(prefix)) ?? STATEWIDE_CHAPTER;
}
