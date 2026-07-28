// src/pages/api/legislators.ts
//
// Resolves a point to the state legislators who represent it, so the campaign
// banner can offer "email your own rep" rather than a generic directory link.
// Runs per-request on the Cloudflare adapter, like ~/pages/api/news.ts.

import type { APIRoute } from "astro";
import {
  LEGISLATOR_MAX_AGE,
  LEGISLATOR_S_MAX_AGE,
  MN_STATE_JURISDICTION_ID,
} from "~/data/legislation";
import {
  isMailAddress,
  type Chamber,
  type LegislatorView,
  type LegislatorsPayload,
} from "~/lib/legislation";
import {
  fetchLegislatorsByPoint,
  openStatesKey,
  type OpenStatesPerson,
} from "~/lib/openStates";

export const prerender = false;

// Legislative districts are large, so ~1km precision is plenty and collapses
// every household on a block onto one cached upstream call. It also means an
// exact position is never forwarded to a third-party API — we only ever need
// to know which district someone is in, not where they live.
const COORD_PRECISION = 2;

/** Roughly the state's bounding box; anything outside it can't be in a MN
 *  district, so we reject it before spending an upstream call. */
const MN_BOUNDS = { minLat: 43.0, maxLat: 49.5, minLng: -97.5, maxLng: -89.0 };

function coerceCoord(raw: string | null): number | null {
  // `Number(null)` is 0, which is a finite number and a real coordinate, so a
  // missing param has to be rejected explicitly before parsing.
  if (raw === null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Number(n.toFixed(COORD_PRECISION));
}

function toView(person: OpenStatesPerson): LegislatorView | null {
  // people.geo returns the US Congressional delegation for the same point, and
  // Congress uses the same upper/lower classification as the legislature — so
  // chamber alone cannot tell them apart. Filtering on the state jurisdiction
  // is what keeps a campaign aimed at St. Paul from pointing a resident at a
  // US Senator over a state moratorium bill.
  if (person.jurisdiction?.id !== MN_STATE_JURISDICTION_ID) return null;

  const chamber = person.current_role?.org_classification;
  if (chamber !== "upper" && chamber !== "lower") return null;
  if (!person.id || !person.name) return null;

  const district = person.current_role?.district;
  const contact = person.email?.trim() || "";
  const contactUrl =
    !isMailAddress(contact) && contact.startsWith("http") ? contact : null;

  return {
    id: person.id,
    name: person.name,
    party: person.party ?? null,
    chamber: chamber as Chamber,
    title:
      person.current_role?.title ??
      (chamber === "upper" ? "Senator" : "Representative"),
    district: district === undefined || district === "" ? null : String(district),
    email: isMailAddress(contact) ? contact : null,
    contactUrl,
    url: person.openstates_url ?? null,
  };
}

function json(payload: LegislatorsPayload, sMaxAge: number) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=${LEGISLATOR_MAX_AGE}, s-maxage=${sMaxAge}`,
    },
  });
}

export const GET: APIRoute = async ({ url }) => {
  const lat = coerceCoord(url.searchParams.get("lat"));
  const lng = coerceCoord(url.searchParams.get("lng"));

  if (
    lat === null ||
    lng === null ||
    lat < MN_BOUNDS.minLat ||
    lat > MN_BOUNDS.maxLat ||
    lng < MN_BOUNDS.minLng ||
    lng > MN_BOUNDS.maxLng
  ) {
    // Not an error: someone outside Minnesota has no state legislators to
    // email, and the banner falls back to the public directory.
    return json({ legislators: [], source: "live" }, LEGISLATOR_S_MAX_AGE);
  }

  const key = openStatesKey();
  if (!key) return json({ legislators: [], source: "unlinked" }, 60);

  const people = await fetchLegislatorsByPoint(key, lat, lng).catch(() => null);
  if (!people) return json({ legislators: [], source: "degraded" }, 60);

  const legislators = people
    .map(toView)
    .filter((l): l is LegislatorView => l !== null)
    // Senate first, then House — the order MN legislators are usually listed.
    .sort((a, b) => (a.chamber === b.chamber ? 0 : a.chamber === "upper" ? -1 : 1));

  return json({ legislators, source: "live" }, LEGISLATOR_S_MAX_AGE);
};
