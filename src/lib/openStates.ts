// src/lib/openStates.ts
//
// Server-side client for the Open States v3 API (open.pluralpolicy.com).
//
// Import this only from ~/pages/api/* — it reads the API key, and pulling it
// into a client island would ship that path to the browser.
//
// Secrets come from `cloudflare:workers`, not process.env. Note that
// `Astro.locals.runtime.env` was REMOVED in Astro v6 and now throws — the
// adapter points explicitly at this import instead.

import { env } from "cloudflare:workers";

const BASE = "https://v3.openstates.org";

export interface OpenStatesBill {
  id?: string;
  identifier?: string;
  title?: string;
  session?: string;
  subject?: string[];
  openstates_url?: string;
  first_action_date?: string;
  latest_action_description?: string;
  latest_action_date?: string;
  latest_passage_date?: string;
  from_organization?: { name?: string; classification?: string };
  sponsorships?: OpenStatesSponsorship[];
}

export interface OpenStatesSponsorship {
  name?: string;
  entity_type?: string;
  primary?: boolean;
  classification?: string;
  person?: {
    id?: string;
    name?: string;
    party?: string;
    current_role?: { title?: string; district?: string | number };
  };
}

export interface OpenStatesSession {
  identifier?: string;
  name?: string;
  classification?: string;
  start_date?: string;
  end_date?: string;
}

export interface OpenStatesPerson {
  id?: string;
  name?: string;
  party?: string;
  /** Not always an address — Open States stores a contact-form URL here for
   *  many members. Callers must validate before building a mailto. */
  email?: string;
  openstates_url?: string;
  jurisdiction?: { id?: string; name?: string; classification?: string };
  current_role?: {
    title?: string;
    org_classification?: string;
    district?: string | number;
  };
}

interface PeopleGeoResponse {
  results?: OpenStatesPerson[];
}

export interface Pagination {
  per_page: number;
  page: number;
  max_page: number;
  total_items: number;
}

interface BillsResponse {
  results?: OpenStatesBill[];
  pagination?: Pagination;
}

interface JurisdictionResponse {
  legislative_sessions?: OpenStatesSession[];
}

/**
 * Reads the Worker secret, falling back to Astro's build-time env so a plain
 * `.env` works in dev without a `.dev.vars` file.
 *
 * Returns null when unset rather than throwing — the banner has to render for
 * every visitor whether or not this deployment has a key, so callers surface
 * a missing key as an "unlinked" state in the payload.
 */
export function openStatesKey(): string | null {
  const fromWorker = (env as Record<string, unknown> | undefined)
    ?.OPENSTATES_API_KEY;
  const key =
    (typeof fromWorker === "string" ? fromWorker : undefined) ??
    import.meta.env.OPENSTATES_API_KEY;
  return typeof key === "string" && key.trim() ? key.trim() : null;
}

/**
 * Why a call failed, when it did.
 *
 * `rateLimited` is separated out because it is the one failure worth reacting
 * to differently: Open States allows 10 requests/min and answers the eleventh
 * with `429 {"detail":"exceeded limit of 10/min"}`. Retrying into that window
 * only deepens the hole, so callers back off to cached data instead.
 */
export type Outcome<T> =
  | { ok: true; data: T }
  | { ok: false; status: number | null; rateLimited: boolean };

/**
 * Wall-clock ceiling on a single upstream call.
 *
 * Not arbitrary: a `q=` search combined with `sort=` and no `session=` filter
 * makes Open States search-then-sort the whole state corpus, which I clocked
 * at 27 seconds cold — long enough that their own gateway gives up and returns
 * `502 Bad Gateway`. Our query is session-scoped and answers in ~1s, but a
 * route that can hang for half a minute on somebody else's slow day is a route
 * that will eventually hang.
 */
const TIMEOUT_MS = 8000;

function buildUrl(path: string, params: Record<string, string>): URL {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return url;
}

/**
 * One GET, with a timeout and an honest account of how it went.
 *
 * Caching deliberately does NOT live here. It sits one level up around the
 * whole composed payload (see `withCache` in ~/lib/edgeCache.ts), which is a
 * single cache entry to reason about instead of four, and which is what lets a
 * failed refresh fall back to the last good bill list rather than to nothing.
 *
 * `cf.cacheTtl` stays as a free extra layer where a zone cache exists. It is
 * silently ignored elsewhere, so it's a bonus and never load-bearing. The API
 * key travels in a header, never the query string, so it stays out of access
 * logs and out of any intermediary cache key.
 */
async function get<T>(
  key: string,
  path: string,
  params: Record<string, string>,
  ttl: number,
): Promise<Outcome<T>> {
  const url = buildUrl(path, params);

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "X-API-KEY": key, Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // Ignored outside the Cloudflare runtime, and on deployments with no
      // zone in front of the Worker. Harmless either way.
      cf: { cacheTtl: ttl, cacheEverything: true },
    } as RequestInit);
  } catch {
    // Timeout or network failure. Indistinguishable from here and treated the
    // same by every caller: fall back, don't invent.
    return { ok: false, status: null, rateLimited: false };
  }

  if (!res.ok) {
    return { ok: false, status: res.status, rateLimited: res.status === 429 };
  }

  try {
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, status: res.status, rateLimited: false };
  }
}

/**
 * Every legislative session Open States knows about for a jurisdiction, so the
 * tracker can ask "which session is on right now" instead of carrying a
 * hardcoded identifier that silently starts returning an empty list the day
 * the biennium turns over.
 */
export async function fetchSessions(
  key: string,
  jurisdiction: string,
  ttl: number,
): Promise<Outcome<OpenStatesSession[]>> {
  const res = await get<JurisdictionResponse>(
    key,
    `/jurisdictions/${encodeURIComponent(jurisdiction)}`,
    { include: "legislative_sessions" },
    ttl,
  );
  if (!res.ok) return res;
  return { ok: true, data: res.data.legislative_sessions ?? [] };
}

/**
 * One page of a bill search.
 *
 * `include=sponsorships` is free — it rides along on the same request — and
 * it's what makes the authorship signals possible without a second call per
 * bill. At 40-odd bills, a call each would be 40 requests against a 10/min
 * ceiling: four minutes of stalling to render one panel.
 *
 * `session` is REQUIRED and not merely a filter. Measured, on this exact query:
 *
 *   session + q + sort   ->  ~1.0s
 *   q + sort, no session -> 17-27s, and 502 Bad Gateway when their gateway
 *                           gives up first
 *
 * `sort` is what makes the corpus-wide version pathological, and it's also
 * worth keeping: the page walk is capped, so ordering by most-recent-action
 * upstream guarantees a truncated walk keeps the bills that are actually
 * moving rather than an arbitrary slice. Keep both, or neither.
 */
export async function searchBills(
  key: string,
  opts: {
    jurisdiction: string;
    session: string;
    query: string;
    page: number;
    perPage: number;
    ttl: number;
  },
): Promise<Outcome<{ results: OpenStatesBill[]; pagination: Pagination | null }>> {
  const res = await get<BillsResponse>(
    key,
    "/bills",
    {
      jurisdiction: opts.jurisdiction,
      session: opts.session,
      q: opts.query,
      sort: "latest_action_desc",
      per_page: String(opts.perPage),
      page: String(opts.page),
      include: "sponsorships",
    },
    opts.ttl,
  );
  if (!res.ok) return res;
  return {
    ok: true,
    data: {
      results: res.data.results ?? [],
      pagination: res.data.pagination ?? null,
    },
  };
}

/** Legislators whose districts contain the given point. */
export async function fetchLegislatorsByPoint(
  key: string,
  lat: number,
  lng: number,
): Promise<Outcome<OpenStatesPerson[]>> {
  const res = await get<PeopleGeoResponse>(
    key,
    "/people.geo",
    { lat: String(lat), lng: String(lng) },
    86400,
  );
  if (!res.ok) return res;
  return { ok: true, data: res.data.results ?? [] };
}
