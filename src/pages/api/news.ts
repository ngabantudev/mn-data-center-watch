// src/pages/api/news.ts
//
// Runs on-demand (per request) rather than being built as a static file.
// Requires `output: 'server'` plus the @astrojs/cloudflare adapter in
// astro.config.mjs — this route is excluded from static prerendering
// via `export const prerender = false` below.
//
// This route is now the source of truth for the news panel, which it wasn't
// before: the panel rendered a snapshot baked in at build time and only called
// this when someone clicked a date range. That's why there was a cron job
// rebuilding the entire site every six hours just to refresh headlines.
//
// Being the source of truth means being reliable, and it wasn't — measured on a
// live deployment, roughly one request in three returned nothing, because a 2s
// fetch budget with no cache behind it meant every visitor paid a fresh Google
// round trip and the slow ones lost. The budget is now 8s (see
// ~/lib/newsFeed.ts) and the result goes through the same cache as the
// legislative tracker: one fetch per window per freshness period shared by every
// visitor, single-flighted, with the last good result served when Google can't
// be reached.

import type { APIRoute } from "astro";
import { withCache } from "~/lib/edgeCache";
import { jsonResponse } from "~/lib/jsonResponse";
import { fetchNews, type NewsItem, type NewsPayload } from "~/lib/newsFeed";

export const prerender = false;

/** What one window's cache entry holds. The truncation flag is cached with the
 *  items because it describes that same fetch — recomputing it later, or
 *  defaulting it to false when serving a stale copy, would tell the reader the
 *  period is fully covered when the fetch that produced it said otherwise. */
interface CachedNews {
  items: NewsItem[];
  truncated: boolean;
  partial: boolean;
}

const ALLOWED_WINDOWS = [1, 7, 30, 365]; // days — beyond 1y rarely changes
                                          // results given Google News RSS's
                                          // ~100-item cap, so we stop here.

/**
 * Freshness per window, in seconds.
 *
 * A 24-hour window turns over fast and is what someone checks for breaking
 * news, so it's the tightest. A year of coverage doesn't change meaningfully
 * inside an hour. These are the numbers that decide how often Google is asked
 * at all: at worst one call per window per period, whatever the traffic.
 */
const FRESH_SECONDS: Record<number, number> = {
  1: 900, // 15 min
  7: 1800, // 30 min
  30: 3600, // 1 h
  365: 21600, // 6 h
};

/** Kept far longer than it stays fresh, purely as an outage fallback.
 *  Yesterday's headlines beat an empty panel, and every item shows its date. */
const KEEP_SECONDS = 604800; // 7 days

/**
 * Short, unlike the one-minute default the legislative tracker needs.
 *
 * That default exists to avoid re-tripping a per-minute quota. Google News RSS
 * imposes no such quota here — its failures are dropped connections, which
 * `fetchNews` already retries once. Holding a minute-long backoff on top would
 * turn one blip into a minute of empty panel, which is exactly what a cold
 * cache did on the first live test of this change.
 */
const FAILURE_BACKOFF_SECONDS = 10;

export const GET: APIRoute = async ({ url }) => {
  const requested = Number(url.searchParams.get("days"));
  const windowDays = ALLOWED_WINDOWS.includes(requested) ? requested : 7;
  const freshSeconds = FRESH_SECONDS[windowDays] ?? 1800;

  // Captured from inside the builder so the reader gets the actual reason —
  // a timeout, or Google's status code — instead of one generic sentence that
  // covers up which of the two happened.
  let failure: string | null = null;

  const result = await withCache<CachedNews>(
    // Bump this version whenever the query, the relevance filter, or the shape
    // cached here changes. Entries outlive a deploy by design — KEEP_SECONDS is
    // a week — so without a bump the new code serves the old code's results
    // until they age out, and a changed shape would be read back as the wrong
    // type entirely.
    //
    // It also matters for review: the cache key contains no deployment
    // identity, so a PR preview and production address the same entries. Both
    // returned an identical 19 and 26 here while the branch's own numbers were
    // 29 and 49, which reads as a change that did nothing rather than a change
    // that hadn't been reached yet.
    `news:v3:${windowDays}d`,
    {
      freshSeconds,
      keepSeconds: KEEP_SECONDS,
      failureBackoffSeconds: FAILURE_BACKOFF_SECONDS,
    },
    async () => {
      const fetched = await fetchNews(windowDays);
      if (fetched.ok) {
        return {
          items: fetched.newsItems,
          truncated: fetched.truncated,
          partial: fetched.partial,
        };
      }
      // Only a real failure returns null. An empty-but-successful fetch is a
      // fact about a quiet week and gets cached as one — otherwise a quiet week
      // would refetch on every request and, worse, keep serving last month's
      // articles as though they were this week's.
      failure = fetched.reason;
      return null;
    },
  );

  const payload: NewsPayload = result
    ? {
        newsItems: result.value.items,
        errorMessage: null,
        truncated: result.value.truncated,
        partial: result.value.partial,
      }
    : {
        newsItems: [],
        // `failure` is null when the backoff short-circuited before any fetch,
        // so say that rather than implying we just tried and Google refused.
        errorMessage: failure ?? "News feed temporarily unavailable.",
        truncated: false,
        partial: false,
      };

  // Client max-age stays short so a reader with a tab open picks up new
  // coverage. s-maxage is what would matter behind a zone cache and is
  // harmless where there isn't one.
  const maxAge = windowDays >= 365 ? 3600 : 120;
  const sMaxAge = result?.stale ? 60 : freshSeconds;

  return jsonResponse(payload, {
    maxAge,
    sMaxAge,
    headers: {
      // Lets us tell "live" from "last known good" when debugging, without
      // changing the payload shape the client already parses.
      "X-News-Source": result
        ? result.stale
          ? "stale"
          : "live"
        : "unavailable",
    },
  });
};
