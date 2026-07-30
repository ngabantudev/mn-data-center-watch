// src/lib/protectedLands.ts
//
// One polygon of the Protected Lands overlay, read out of the tile it was drawn
// from, and the two cards that put it on screen.
//
// WHY THERE IS A PARSER HERE. The PAD-US archive in the tile bucket was built by
// running a KML export through tippecanoe, and KML carries attributes in exactly
// one place: a `<description>` balloon of pre-rendered HTML. So every polygon in
// this layer arrives with nine vector-tile attributes, eight of which are KML
// styling — `fill`, `stroke`, `styleUrl`, and friends — and one of which,
// `description`, is a ~6 KB HTML table holding the whole PAD-US record: the
// unit's name, who owns it, what it is designated as, its GAP protection status,
// its public access, its acreage.
//
// None of that was reachable before this file. `~/lib/overlayLayers.ts` looks for
// a name *attribute*, correctly finds none in this archive, and falls back to
// naming the region after the layer — so hovering any of 17,058 distinct
// protected places said "Protected Lands". The facts were in the tiles the whole
// time, one parse away, and for a campaign about where a data center gets sited
// "Thief Lake State Wildlife Management Area, 52,100 acres, managed for
// biodiversity" is the entire reason to switch the layer on.
//
// WHAT IS DELIBERATELY NOT RENDERED. Every field below was checked against 15,002
// features sampled across z5–z9 of the archive, and a column only earns a line in
// a card if it is both populated and legible to a reader:
//
//   * `d_Mang_Nam` and `d_Access`, the decoded manager and access columns, are
//     empty for every feature in this export. Their coded twins (`Mang_Name`,
//     `Pub_Access`) are filled, so access is decoded here from the published
//     PAD-US domain — four codes, all of which appear in this archive — while the
//     manager is dropped: decoding ~30 agency codes from a standard we would be
//     transcribing by hand is a different job from reading a column.
//   * `Loc_Mang`, the local manager, is blank on 10% of features and on the rest
//     is as likely to be "E" or the unit's own name as it is to be "DNR
//     Wildlife". A card that says a place is managed by "E" is worse than a card
//     that doesn't claim to know.
//   * `Comments`, `Agg_Src`, `GIS_Src`, `SHAPE_Leng`, `SHAPE_Area`, `WDPA_Cd` —
//     provenance and geometry bookkeeping for a GIS analyst, not facts about a
//     place.

import type maplibregl from 'maplibre-gl';
import {
  MAP_LAYER_BY_ID,
  PROTECTED_LANDS_LAYER_ID,
  layerIdFor,
} from '~/data/mapLayers';
import { decodeEntities } from '~/lib/htmlEntities';
import { escapeHtml, popupBlock } from '~/lib/popupHtml';
import { nf } from '~/lib/ratepayerWidget';

const LAYER = MAP_LAYER_BY_ID[PROTECTED_LANDS_LAYER_ID];
const FILL_LAYER_ID = layerIdFor(PROTECTED_LANDS_LAYER_ID);

/** The dataset itself. There is no per-record permalink to link a unit to. */
const PADUS_URL =
  'https://www.usgs.gov/programs/gap-analysis-project/science/pad-us-data-overview';

/**
 * How strongly a place's biodiversity is protected, as USGS scores it. The
 * archive ships this as one sentence — "2 - managed for biodiversity -
 * disturbance events suppressed" — so the code and its meaning are split off the
 * one column rather than read from two that could disagree.
 */
interface GapStatus {
  /** 1–4, or null if the sentence ever arrives in a shape we don't recognise. */
  code: string | null;
  summary: string;
}

/** What one polygon of the layer is, as far as its own record says. */
export interface ProtectedLand {
  /**
   * Identity, used only to tell "the pointer is still inside the same polygon"
   * from "it has moved to a different one". `FID` is sequential *within* a
   * PAD-US feature class, so a Fee 171 and an Easement 171 both exist in this
   * combined export and the category has to be part of the key.
   */
  id: string;
  name: string | null;
  /** e.g. "State Wildlife Management Area", "Conservation Easement". */
  designation: string | null;
  /** Fee / Easement / Designation — see `CATEGORY_NOTE`. */
  category: string | null;
  /** Federal, State, Local Government, Private, … */
  ownerType: string | null;
  /** The named owner, e.g. "U.S. Fish and Wildlife Service". */
  owner: string | null;
  acres: number | null;
  access: string | null;
  gap: GapStatus | null;
  /** Year the protection was established, on the third of features that carry it. */
  established: string | null;
  /** Vintage of the boundary itself, as published. */
  sourceDate: string | null;
}

// --- Reading the KML balloon ---

/**
 * Rows of the balloon's attribute table.
 *
 * Two `<td>`s separated by nothing but whitespace is a key/value row, and
 * nothing else in the balloon has that shape: the header cell above the table is
 * a lone `<td>`, and the cell wrapping the table holds markup, which `[^<>]` can
 * never cross. Values are escaped by the exporter (`&amp;` is the only entity
 * that appears in this archive), so they are decoded back to text here and
 * re-escaped at render — a round trip, on purpose, rather than trusting an
 * upstream escape and passing the value through as markup.
 */
const ATTRIBUTE_ROW = /<td>([^<>]*)<\/td>\s*<td>([^<>]*)<\/td>/g;

/**
 * The balloon's HTML. tippecanoe stringifies the KML conversion's nested
 * `description` object, so what arrives is usually `{"@type":"html","value":…}`
 * — but a plain HTML string is the same thing minus a wrapper, and both are
 * handled rather than making the card depend on which converter ran.
 */
function balloonHtml(raw: string): string {
  if (!raw.startsWith('{')) return raw;
  try {
    const parsed: unknown = JSON.parse(raw);
    const value = (parsed as { value?: unknown } | null)?.value;
    return typeof value === 'string' ? value : raw;
  } catch {
    return raw;
  }
}

function attributeTable(raw: string): Record<string, string> {
  const table: Record<string, string> = {};
  for (const [, key, value] of balloonHtml(raw).matchAll(ATTRIBUTE_ROW)) {
    table[key.trim()] = decodeEntities(value).trim();
  }
  return table;
}

/** A field that is present and not blank, or null — "" is a gap, not a value. */
const field = (value: string | undefined): string | null => value || null;

/**
 * Public access, decoded from the PAD-US domain. All four codes in the domain
 * appear in this archive; anything else is left unsaid rather than guessed at.
 */
const ACCESS_LABEL: Record<string, string> = {
  OA: 'Open to the public',
  RA: 'Restricted — seasonal, permit, or designated use only',
  XA: 'Closed to the public',
  UK: 'Not recorded',
};

/**
 * What PAD-US means by its three categories. The distinction matters to this
 * map: an easement is private land under a conservation restriction, and an
 * approved acquisition boundary is not protected land at all — the same shade of
 * green on screen, a very different answer about what a site would displace.
 */
const CATEGORY_NOTE: Record<string, string> = {
  Fee: 'Owned outright by a public agency or land trust.',
  Easement: 'Privately owned, under a recorded conservation easement.',
  Designation: 'A protective designation laid over land held by someone else.',
  'Approved, Proclamation or Extent Boundary':
    'An approved acquisition boundary — not every acre inside it is protected.',
};

function parse(raw: string): ProtectedLand | null {
  const row = attributeTable(raw);

  const name = field(row.Unit_Nm) ?? field(row.Loc_Nm);
  const designation = field(row.d_Des_Tp);
  // Neither a name nor a designation means the balloon wasn't the table we
  // expect. The caller falls back to the layer's own label, which is what the
  // whole map did before this file existed.
  if (!name && !designation) return null;

  const acres = Number(row.GIS_Acres);
  const established = /^\d{4}$/.test(row.Date_Est ?? '') ? row.Date_Est! : null;

  return {
    id: `${row.Category ?? ''}:${row.FID ?? ''}:${name ?? designation}`,
    name,
    designation,
    category: field(row.d_Category),
    ownerType: field(row.d_Own_Type),
    owner: field(row.d_Own_Name),
    acres: Number.isFinite(acres) && acres > 0 ? acres : null,
    access: ACCESS_LABEL[row.Pub_Access ?? ''] ?? null,
    gap: parseGap(field(row.d_GAP_Sts)),
    established,
    sourceDate: field(row.Src_Date),
  };
}

function parseGap(sentence: string | null): GapStatus | null {
  if (!sentence) return null;
  const [, code, summary] = /^(\d)\s*-\s*([\s\S]+)$/.exec(sentence) ?? [];
  return summary ? { code, summary: summary.trim() } : { code: null, summary: sentence };
}

// One entry, which is all the hover path needs: the pointer sits inside a
// polygon for many frames and the hit test hands back that same polygon's
// balloon each time. Keyed on the balloon itself rather than on a parsed id,
// because the id is on the far side of the work being skipped.
let lastRaw: string | null = null;
let lastParsed: ProtectedLand | null = null;

/**
 * The PAD-US record behind a queried feature, or null if it isn't one of ours.
 *
 * Guards on the layer id rather than trusting the caller, so this can be asked
 * about any feature the map's one hit test returns.
 */
export function protectedLandForFeature(
  feature: maplibregl.MapGeoJSONFeature,
): ProtectedLand | null {
  if (feature.layer.id !== FILL_LAYER_ID) return null;

  const raw = feature.properties?.description;
  if (typeof raw !== 'string' || !raw) return null;

  if (raw !== lastRaw) {
    lastRaw = raw;
    lastParsed = parse(raw);
  }
  return lastParsed;
}

// --- The cards ---

/**
 * The layer's own green, which is how the card ties back to the shape under it.
 * The text takes `outlineHex` rather than `hex` for the same reason the sidebar
 * swatches do: the fill green is ~2.5:1 on white and unreadable at this size.
 */
const identityChip = (label: string): string => `
  <span class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
        style="background-color: ${LAYER.hex}1f; color: ${LAYER.outlineHex}">
    <span class="inline-block w-1.5 h-1.5 rounded-full" style="background-color: ${LAYER.hex}"></span>
    ${escapeHtml(label)}
  </span>
`;

const acreLine = (acres: number): string =>
  `${nf.format(Math.round(acres))} acre${Math.round(acres) === 1 ? '' : 's'}`;

/** Heading and sub-heading, shared so the two cards can't drift apart on it. */
function cardHeader(site: ProtectedLand, titleClass: string): string {
  // An unnamed record still has a designation — leading with that beats leading
  // with the layer's label, which is what every polygon used to say.
  const title = site.name ?? site.designation ?? LAYER.label;
  const subtitle = site.name ? site.designation : null;

  return `
    ${identityChip(site.ownerType ?? 'Protected land')}
    <h3 class="font-bold ${titleClass} text-neutral-900 leading-snug mt-1.5 wrap-break-word">${escapeHtml(title)}</h3>
    ${subtitle ? `<p class="text-[10px] text-neutral-400 font-medium">${escapeHtml(subtitle)}</p>` : ''}
  `;
}

/** Hover: what this place is, in one line, and that there is more. */
function buildHoverHtml(site: ProtectedLand): string {
  // The owner reads as its own fact except where PAD-US files private land under
  // the owner name "Private", which is the chip again.
  const owner = site.owner && site.owner !== site.ownerType ? site.owner : null;
  const summary = [site.acres ? acreLine(site.acres) : null, owner]
    .filter(Boolean)
    .join(' · ');

  return `
    <div class="p-0.5 text-neutral-900 font-sans w-56 select-text">
      ${cardHeader(site, 'text-[13px]')}
      ${summary ? `<p class="mt-1 text-[11px] text-neutral-600 leading-snug">${escapeHtml(summary)}</p>` : ''}
      <p class="mt-1.5 text-[9px] font-semibold text-blue-600 uppercase tracking-wide">Click for the full record &rarr;</p>
    </div>
  `;
}

/** Click: the whole record, and where it came from. */
function buildDetailHtml(site: ProtectedLand): string {
  const gap = site.gap
    ? `
      <p class="text-[11px] text-neutral-800 leading-snug">
        ${site.gap.code ? `<span class="font-bold">GAP ${escapeHtml(site.gap.code)}</span> — ` : ''}${escapeHtml(site.gap.summary)}
      </p>
      <p class="mt-1 text-[10px] text-neutral-500 leading-snug">USGS scores biodiversity protection 1 (strongest) to 4 (no mandate).</p>
    `
    : null;

  const ownership = [
    site.owner
      ? `<p class="text-[11px] font-semibold text-neutral-800 leading-snug">${escapeHtml(site.owner)}</p>`
      : null,
    site.category
      ? `<p class="mt-0.5 text-[11px] text-neutral-600 leading-snug">${escapeHtml(site.category)}${
          CATEGORY_NOTE[site.category]
            ? ` — ${escapeHtml(CATEGORY_NOTE[site.category])}`
            : ''
        }</p>`
      : null,
  ]
    .filter(Boolean)
    .join('');

  // Provenance, so a figure on this card can be traced. Every date here is the
  // publisher's, not ours.
  const record = [
    site.established
      ? `<p class="text-[11px] text-neutral-600 leading-snug">Protection established ${escapeHtml(site.established)}.</p>`
      : null,
    site.sourceDate
      ? `<p class="text-[11px] text-neutral-600 leading-snug">Boundary as published ${escapeHtml(site.sourceDate)}.</p>`
      : null,
    `<a href="${PADUS_URL}" target="_blank" rel="noopener noreferrer"
        class="mt-1 inline-block text-[11px] font-medium text-blue-600 hover:underline leading-snug">USGS PAD-US 4.1 &rarr;</a>`,
  ]
    .filter(Boolean)
    .join('');

  return `
    <div class="p-0.5 text-neutral-900 font-sans w-72 select-text">
      ${cardHeader(site, 'text-[15px]')}
      ${popupBlock('Protection', gap)}
      ${popupBlock('Ownership', ownership || null)}
      ${popupBlock('Public Access', site.access ? `<p class="text-[11px] text-neutral-600 leading-snug">${escapeHtml(site.access)}</p>` : null)}
      ${popupBlock('Size', site.acres ? `<p class="text-[11px] font-semibold text-neutral-800">${escapeHtml(acreLine(site.acres))}</p>` : null)}
      ${popupBlock('Record', record)}
    </div>
  `;
}

/**
 * The card for one protected place.
 *
 * Not cached, unlike the moratorium registry's eleven towns: this layer has
 * 17,058 features, so a cache keyed by unit would be an unbounded map of strings
 * nobody asks for twice. The hover path builds a card once per polygon entered —
 * see `hoverCard` in MapParent — and the parse behind it is memoized above.
 */
export function protectedLandPopupHtml(
  site: ProtectedLand,
  variant: 'hover' | 'detail',
): string {
  return variant === 'hover' ? buildHoverHtml(site) : buildDetailHtml(site);
}
