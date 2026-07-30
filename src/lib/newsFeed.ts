// src/lib/newsFeed.ts
export interface NewsItem {
  title: string;
  url: string;
  published: string;
  source: string;
}

/**
 * Deliberately distinguishes "the fetch failed" from "the fetch worked and
 * matched nothing".
 *
 * That distinction is load-bearing now that ~/pages/api/news.ts caches this and
 * falls back to the last good result. Collapsing both into an empty array would
 * make a genuinely quiet news day look identical to a failed request — and the
 * cache would either overwrite good results with an outage's emptiness, or
 * serve last week's articles on a day that really had none. Neither is true.
 */
export type NewsResult =
  | { ok: true; newsItems: NewsItem[] }
  | { ok: false; reason: string };

/**
 * The flattened shape the UI consumes, and the JSON body of /api/news.
 *
 * Declared here rather than in the route so the route, the server-rendered
 * first paint, and the client island that parses the response all agree by
 * construction — all three previously re-declared the same two fields inline.
 */
export interface NewsPayload {
  newsItems: NewsItem[];
  errorMessage: string | null;
}

/**
 * Wall-clock budget for the Google News RSS call.
 *
 * Was 2000ms, which failed roughly one request in three from a Worker —
 * measured across all four windows on a live deployment. Google itself answers
 * in 0.2-0.6s, so the old budget wasn't wrong about Google being fast; it was
 * too tight to absorb a cold isolate and a TLS handshake on top. There is no
 * cost to waiting longer on the rare slow call: the result is cached, so the
 * next visitor doesn't wait at all.
 */
const FETCH_TIMEOUT_MS = 8000;

/**
 * Newest first. Written out twice before — here and again in the news rail's
 * client script, which re-sorts after fetching a different date range — so the
 * two paths could have disagreed about ordering.
 */
export function byPublishedDesc(
  a: { published: string },
  b: { published: string },
): number {
  return new Date(b.published).getTime() - new Date(a.published).getTime();
}

/**
 * How a headline's date is written, in one place. The rail renders items from
 * two paths — the build-time snapshot through the Astro template, and the
 * client's own fetch when someone picks another range — and each had its own
 * copy of these options, ~130 lines apart in the same file.
 *
 * `undefined` locale on purpose: the reader's own, not ours.
 */
export function formatNewsDate(published: string): string {
  return new Date(published).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// --- Tune these lists to control precision without touching the fetch/parse logic ---

// Must match at least one of these — establishes it's actually about a data center.
const DATA_CENTER_TERMS = ["data center", "data centre", "hyperscale", "server farm"];

// Must match at least one of these — establishes Minnesota relevance without
// depending on the literal word "Minnesota" appearing in the article.
const MINNESOTA_TERMS = [
  "minnesota",
  " mn ",
  "twin cities",
  // Largest MN cities by population
  "minneapolis",
  "st. paul",
  "saint paul",
  "rochester",
  "duluth",
  "bloomington",
  "brooklyn park",
  "plymouth",
  "maple grove",
  "woodbury",
  "st. cloud",
  "saint cloud",
  "eagan",
  "eden prairie",
  "burnsville",
  "coon rapids",
  "blaine",
  "lakeville",
  "minnetonka",
  "apple valley",
  // Known/likely MN data-center hub cities
  "farmington",
  "becker",
  "shakopee",
  "rosemount",
  "chaska",
  "faribault",
];

function buildDateQuery(windowDays: number): string {
  // when: is documented and reliable up to 1y; anything longer uses
  // after:/before: date ranges instead, since when: beyond ~1y is
  // undocumented and its behavior isn't guaranteed by Google.
  if (windowDays <= 30) {
    return `when:${windowDays}d`;
  }

  const now = new Date();
  const after = new Date(now);
  after.setDate(after.getDate() - windowDays);
  const fmt = (d: Date) => d.toISOString().slice(0, 10); // YYYY-MM-DD
  return `after:${fmt(after)} before:${fmt(now)}`;
}

/**
 * One attempt. Separated from `fetchNews` so the retry below is obviously a
 * retry of exactly this, and so the failure reason it returns is the real one
 * rather than a generic message chosen at the call site.
 */
async function attemptNews(
  googleNewsUrl: string,
): Promise<NewsResult> {
  try {
    // Force an early escape rather than hanging a request on a slow upstream.
    // `AbortSignal.timeout` rather than an AbortController and a setTimeout to
    // cancel by hand: the manual version needed a `clearTimeout` on the success
    // path *and* in the catch, which is two chances to leak a pending timer on
    // a route that runs per request. Same mechanism openStates.ts uses, though
    // the budgets stay separate constants — they're the same 8s for unrelated
    // reasons, and tuning one shouldn't move the other.
    const response = await fetch(googleNewsUrl, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (!response.ok) {
      // Carry the status. "Feed unavailable" and "Google answered 429 to this
      // datacenter IP" call for completely different fixes, and the old code
      // made them indistinguishable from outside.
      return { ok: false, reason: `Google News returned ${response.status}.` };
    }

    const xmlText = await response.text();
    const itemMatches = xmlText.match(/<item>([\s\S]*?)<\/item>/g) || [];

    const parsed = itemMatches.map((itemXml) => {
      const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/);
      const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      const sourceMatch = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/);
      const descMatch = itemXml.match(/<description>([\s\S]*?)<\/description>/);

      let fullTitle = titleMatch ? titleMatch[1] : "Local Update";
      let source = sourceMatch ? sourceMatch[1] : "Local News";
      const description = descMatch ? descMatch[1] : "";

      if (fullTitle.includes(` - ${source}`)) {
        fullTitle = fullTitle.split(` - ${source}`)[0];
      }

      const haystack = ` ${fullTitle} ${description} `.toLowerCase();

      return {
        title: fullTitle,
        url: linkMatch ? linkMatch[1] : "#",
        published: pubDateMatch ? pubDateMatch[1] : new Date().toString(),
        source,
        haystack,
      };
    });

    const newsItems = parsed
      .filter((item) => {
        const hasDataCenter = DATA_CENTER_TERMS.some((t) => item.haystack.includes(t));
        const hasMinnesota = MINNESOTA_TERMS.some((t) => item.haystack.includes(t));
        return hasDataCenter && hasMinnesota;
      })
      .sort(byPublishedDesc)
      .map(({ haystack, ...item }) => item);

    return { ok: true, newsItems };

  } catch (error) {
    // The old message here claimed "unavailable in dev environment", which was
    // being served in production — the same abort path runs in both, and this
    // was the string a live visitor saw when the 2s budget expired.
    //
    // Both names are checked because they're the same event from two APIs:
    // `AbortSignal.timeout` rejects with `TimeoutError`, while an
    // `AbortController.abort()` (what this used to use) gives `AbortError`.
    const name = (error as Error | undefined)?.name;
    const timedOut = name === "TimeoutError" || name === "AbortError";
    return {
      ok: false,
      reason: timedOut
        ? `No response from Google News within ${FETCH_TIMEOUT_MS / 1000}s.`
        : "Couldn't reach Google News.",
    };
  }
}

/**
 * Fetch one window, retrying once.
 *
 * The retry is not belt-and-braces, it's the fix for a measured failure: on a
 * live deployment the *first* call for a given window intermittently failed
 * while immediate repeats succeeded, so the connection — not the query — is
 * what's flaky. Unlike Open States, Google News RSS enforces no per-minute
 * quota here, so an immediate second attempt is free and almost always works.
 *
 * Two attempts, not more. Past that we'd be adding latency to a request that
 * has a cached fallback behind it anyway.
 */
export async function fetchNews(windowDays: number = 7): Promise<NewsResult> {
  const rawQuery = `"data center" Minnesota ${buildDateQuery(windowDays)}`;
  const query = encodeURIComponent(rawQuery);
  const googleNewsUrl = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;

  const first = await attemptNews(googleNewsUrl);
  if (first.ok) return first;

  // Whatever the second attempt says stands: on success it's the data, and on
  // failure it's the more recent truth about why.
  return attemptNews(googleNewsUrl);
}

/**
 * Build-time adapter, kept for the prerendered first paint in MapParent.astro.
 *
 * That call bakes a snapshot into the static HTML so the panel has something to
 * show before JS runs. It is no longer the source of truth — the client
 * refetches from /api/news on mount — so a failure here costs a blank panel for
 * one paint, not a stale feed until the next deploy.
 */
export async function fetchLocalNews(
  windowDays: number = 7,
): Promise<NewsPayload> {
  const result = await fetchNews(windowDays);
  return result.ok
    ? { newsItems: result.newsItems, errorMessage: null }
    : { newsItems: [], errorMessage: result.reason };
}