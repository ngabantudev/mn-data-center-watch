// src/pages/api/legislation.ts
//
// Live discovery of Minnesota data center legislation. Runs per-request on the
// Cloudflare adapter, like ~/pages/api/news.ts.
//
// Nothing about the bills is stored in this repo. Each refresh asks Open
// States which session is running, searches that session for the phrase, and
// tiers whatever comes back — so a bill introduced this morning appears
// without a deploy, and a bill that was never real never appears at all.
//
// The other half of the design is not making that expensive. Open States allows
// 10 requests/minute and a cold refresh spends 4 of them, so the shape to avoid
// is refreshes overlapping. `withCache` handles that with single-flight and a
// last-good fallback; this route's job is to build a payload or return null,
// and to never overwrite a good list with an empty one.

import type { APIRoute } from "astro";
import {
  BILLS_CACHE_TTL,
  BILLS_PER_PAGE,
  BILL_QUERY,
  BILL_QUERY_LABEL,
  LEGISLATION_CACHE_KEY,
  LEGISLATION_FRESH_TTL,
  LEGISLATION_KEEP_TTL,
  LEGISLATION_MAX_AGE,
  LEGISLATION_S_MAX_AGE,
  MAX_BILL_PAGES,
  MN_JURISDICTION,
  PUC_DOCKETS,
  SESSIONS_CACHE_TTL,
} from "~/data/legislation";
import {
  dedupe,
  pickSession,
  sortCore,
  sortMentions,
  toLiveBill,
} from "~/lib/billClassify";
import { withCache } from "~/lib/edgeCache";
import { jsonResponse } from "~/lib/jsonResponse";
import type { LegislationPayload, LiveBill } from "~/lib/legislation";
import { fetchSessions, openStatesKey, searchBills } from "~/lib/openStates";

export const prerender = false;

/** What the cache stores: everything the route computed, minus the fields that
 *  describe *this* response rather than the data. */
type CachedLegislation = Omit<LegislationPayload, "source" | "fetchedAt">;

/** The shape every empty return shares: our own content, no live data. */
function empty(source: LegislationPayload["source"]): LegislationPayload {
  return {
    session: null,
    core: [],
    mentions: [],
    dockets: PUC_DOCKETS,
    query: BILL_QUERY_LABEL,
    totalMatched: 0,
    truncated: false,
    source,
    fetchedAt: null,
  };
}

/**
 * One full refresh, or null.
 *
 * Null is a load-bearing return value, not an error swallowed for tidiness:
 * `withCache` reads it as "keep serving the previous list" instead of writing
 * an empty one over the top. Every failure path below therefore has to resist
 * the temptation to return a valid-looking empty payload.
 */
async function build(key: string): Promise<CachedLegislation | null> {
  const sessions = await fetchSessions(key, MN_JURISDICTION, SESSIONS_CACHE_TTL);
  if (!sessions.ok) return null;

  const session = pickSession(sessions.data, new Date());
  if (!session) return null;

  const search = (page: number) =>
    searchBills(key, {
      jurisdiction: MN_JURISDICTION,
      session: session.identifier,
      query: BILL_QUERY,
      page,
      perPage: BILLS_PER_PAGE,
      ttl: BILLS_CACHE_TTL,
    });

  // Page one first, because it carries the page count we need to know how many
  // more to ask for. Everything after it goes out at once — sequential paging
  // would put four round trips on the critical path of a cold request, and at
  // three pages the burst is still well inside the per-minute allowance.
  const first = await search(1);
  if (!first.ok) return null;

  const totalMatched =
    first.data.pagination?.total_items ?? first.data.results.length;
  const availablePages = first.data.pagination?.max_page ?? 1;
  const lastPage = Math.min(availablePages, MAX_BILL_PAGES);

  const rest = await Promise.all(
    Array.from({ length: Math.max(0, lastPage - 1) }, (_, i) => search(i + 2)),
  );

  // A page that failed is a hole in the list, not a reason to throw the whole
  // thing away — but the reader is told the list is partial rather than being
  // shown a short list as though it were complete. Rate limiting is the likely
  // cause when it happens, and it clears on its own within the minute.
  const missedPage = rest.some((page) => !page.ok);
  const raw = [first, ...rest].flatMap((page) =>
    page.ok ? page.data.results : [],
  );

  const bills = dedupe(
    raw.map(toLiveBill).filter((bill): bill is LiveBill => bill !== null),
  );

  return {
    session,
    core: sortCore(bills.filter((b) => b.tier === "core")),
    mentions: sortMentions(bills.filter((b) => b.tier === "mention")),
    dockets: PUC_DOCKETS,
    query: BILL_QUERY_LABEL,
    totalMatched,
    truncated: missedPage || availablePages > MAX_BILL_PAGES,
  };
}

export const GET: APIRoute = async () => {
  const key = openStatesKey();

  if (!key) {
    // Still a useful response: the PUC dockets are our own content and don't
    // need the API at all. Only the bills are missing.
    return jsonResponse(empty("unlinked"), { maxAge: LEGISLATION_MAX_AGE, sMaxAge: LEGISLATION_S_MAX_AGE });
  }

  const result = await withCache<CachedLegislation>(
    LEGISLATION_CACHE_KEY,
    { freshSeconds: LEGISLATION_FRESH_TTL, keepSeconds: LEGISLATION_KEEP_TTL },
    () => build(key),
  );

  // No live data and nothing cached to fall back on. Short edge TTL so the
  // next visitor retries rather than inheriting this minute's bad luck.
  if (!result) return jsonResponse(empty("degraded"), { maxAge: 60, sMaxAge: 60 });

  // The PUC dockets come from this deploy, not from the cache entry — they're
  // our own content and shouldn't be pinned to whenever the bills were fetched.
  const payload: LegislationPayload = {
    ...result.value,
    dockets: PUC_DOCKETS,
    source: result.stale ? "stale" : "live",
    fetchedAt: result.storedAt,
  };

  return result.stale
    ? jsonResponse(payload, { maxAge: 60, sMaxAge: 300 })
    : jsonResponse(payload, {
        maxAge: LEGISLATION_MAX_AGE,
        sMaxAge: LEGISLATION_S_MAX_AGE,
      });
};
