// src/lib/newsFeed.ts
import { decodeEntities } from './htmlEntities';

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

/**
 * Twin Cities metro counties, matched as "<name> county" phrases rather than
 * bare county names — "Dakota" alone pulls in every North and South Dakota
 * story, which is a large share of the country's data center news.
 *
 * Five of the seven metro counties are here. Washington and Scott are left out
 * on purpose, and the omission is measured rather than assumed: over a 30-day
 * window, `"data center" "Washington County"` returned 57 stories and not one
 * of them was Minnesota's — Hillsboro and Washington County, Oregon are one of
 * the largest data center clusters in the country, and Maryland and Alabama
 * supplied most of the rest. `"Scott County"` returned 33, of which exactly one
 * was Minnesota; the rest were Kentucky and Iowa. Admitting either name would
 * put other states' data center fights on a Minnesota map. Both counties are
 * covered below by their city names instead, which don't collide.
 */
const METRO_COUNTY_TERMS = [
  "anoka county",
  "carver county",
  "dakota county",
  "hennepin county",
  "ramsey county",
];

/**
 * Counties outside the seven that carry real data center proceedings anyway.
 *
 * Sherburne is where Becker and Elk River are, and the name is Minnesota's
 * alone — a 365-day check returned 13 data center stories under it and every
 * one was this state's.
 *
 * Wright County is the conspicuous omission, and it is a close call rather than
 * an obvious one: 21 stories over the same year, roughly four in five of them
 * Minnesota's, since the Monticello proposals and the county's emergency
 * moratorium are among the largest data center fights in the state right now.
 * The remainder are Wright County, Iowa, which is running its own data center
 * moratorium under a phrase we cannot tell apart. Admitting one in five Iowa
 * stories to catch Minnesota ones we already reach through Monticello, Otsego,
 * Albertville and St. Michael below — and through the local outlets covering
 * them — is a bad trade, so the towns carry it.
 */
const EXURBAN_COUNTY_TERMS = ["sherburne county"];

/**
 * Minnesota news outlets, matched against an item's `<source>`.
 *
 * The place-name list below can only see the headline and Google's one-line
 * description, so it misses any story that names a town in its body and not its
 * title — which is most of them. Measured over 30 days, the place list alone
 * dropped 25 data center stories that Google had already matched to Minnesota,
 * including the Pine Island fight, three separate Elk River council votes, the
 * Monticello application, Otsego's pause, and both Mankato moratoriums.
 *
 * The outlet is the signal that recovers those: a data center story filed by
 * the Star Tribune or hometownsource is Minnesota coverage by construction.
 * The trade is that a Minnesota paper's wire story about somebody else's data
 * center now passes too — MinnPost on rural America, say. For a Minnesota data
 * center watch that reads as coverage worth showing, and it is a far smaller
 * error than silently dropping half the state's local reporting.
 */
const MINNESOTA_SOURCE_TERMS = [
  "star tribune",
  "minnpost",
  "pioneer press",
  "hometownsource",
  "southernminn",
  "post bulletin",
  "west central tribune",
  "bring me the news",
  "5 eyewitness news", // KSTP
  "kare11",
  "kare 11",
  "wcco",
  "fox 9",
  // Small-market stations doing the closest reporting on the exurban fights —
  // KRWC is Buffalo, KYMN is Northfield, KEYC is Mankato. These are how a
  // Wright County story reaches us now that the county name doesn't.
  "krwc",
  "kymn",
  "keyc",
  "patriot news mn",
  "mpr news",
  "minnesota public radio",
  "sahan journal",
  "minnesota reformer",
  "finance & commerce",
  "duluth news tribune",
  "mankato free press",
  "brainerd dispatch",
  "st. cloud live",
  "alpha news",
  "minnesota women's press",
];

/**
 * The check that keeps the outlet signal honest.
 *
 * Trusting the source alone let Pioneer Press wire copy through — "Virginia
 * study on groundwater, data centers calls for tighter water regulations" and
 * "New York won't build big data centers for a year" both landed in the feed.
 * A Minnesota paper reprinting somebody else's data center news is not
 * Minnesota data center news, and putting it on this map misrepresents it.
 *
 * Applied only to items that matched on the outlet and named no Minnesota place
 * at all, so it can never override a headline that says Minneapolis or Anoka
 * County outright. That narrow application is what makes it safe to be blunt
 * about it: a story that names another state and nowhere here is the ambiguous
 * case, and dropping it is the better error.
 */
const OTHER_STATE_PATTERN = new RegExp(
  `\\b(${[
    "alabama", "alaska", "arizona", "arkansas", "california", "colorado",
    "connecticut", "delaware", "florida", "georgia", "hawaii", "idaho",
    "illinois", "indiana", "iowa", "kansas", "kentucky", "louisiana", "maine",
    "maryland", "massachusetts", "michigan", "mississippi", "missouri",
    "montana", "nebraska", "nevada", "new hampshire", "new jersey",
    // The Dakotas appear in their welded form because the haystack is
    // normalised before any of this runs — see the `north_dakota` replacement
    // where it's built.
    "new mexico", "new york", "north carolina", "north_dakota_state", "ohio",
    "oklahoma", "oregon", "pennsylvania", "rhode island", "south carolina",
    "south_dakota_state", "tennessee", "texas", "utah", "vermont", "virginia",
    "west virginia", "wisconsin", "wyoming",
  ].join("|")})\\b`,
);

// Must match at least one of these — establishes Minnesota relevance without
// depending on the literal word "Minnesota" appearing in the article.
const MINNESOTA_TERMS = [
  "minnesota",
  " mn ",
  "twin cities",
  ...METRO_COUNTY_TERMS,
  ...EXURBAN_COUNTY_TERMS,
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
  // Washington and Scott county seats and larger cities. These stand in for the
  // two county names held out above, and unlike those names they're Minnesota's
  // alone in practice.
  "stillwater",
  "cottage grove",
  "oakdale",
  "forest lake",
  "savage",
  "prior lake",
  // Remaining Anoka County population centers, which the metro list reached
  // only through Coon Rapids and Blaine.
  "anoka",
  "andover",
  "fridley",
  "champlin",
  // Towns with live data center proceedings that the 30-day measurement caught
  // this list dropping. Wright and Sherburne counties are the reason several of
  // these appear; the county names themselves are ambiguous — Wright County,
  // Iowa is running its own data center fight and files under the same phrase —
  // so the towns carry the geography instead.
  "monticello",
  "otsego",
  "elk river",
  "big lake",
  "albertville",
  "st. michael",
  "pine island",
  "lonsdale",
  "mankato",
];

/**
 * The geography half of the query, as two separate searches rather than one.
 *
 * The county names have to be asked for somehow: gating on the bare token
 * `Minnesota`, as this did, means a story headlined "Anoka County board delays
 * data center vote" never comes back at all. Google News RSS does honour `OR`
 * inside parentheses — checked against the live feed, since the docs don't
 * specify it — so folding the counties into one widened query is the obvious
 * move, and it's wrong.
 *
 * It's wrong because the response is capped: measured at ~60 items for a 30-day
 * window and 100 for a year, whatever the query. Terms compete for one fixed
 * budget, so widening trades coverage rather than adding it. That isn't a
 * theory — with the counties folded in, "Google behind plans for Duluth area
 * data center" dropped out of every one of three samples, while the plain
 * Minnesota query returned it in all three. Displacing Duluth to reach Anoka is
 * not a trade worth making when both are cheap.
 *
 * Two queries get two budgets. The cost is one extra upstream call per window
 * per freshness period — 15 minutes at the tightest — which the cache in
 * ~/pages/api/news.ts absorbs entirely.
 */
const GEOGRAPHY_QUERIES = [
  // Byte-identical to the query this file has always sent, parentheses and all
  // — which is to say, none. That is not fussiness: the first attempt at this
  // widened it only as far as `(Minnesota OR "Twin Cities")`, and "Eagan facing
  // lawsuit over data center moratorium" then vanished from all three samples
  // when it had been present in all three before. Merely grouping the term
  // reorders what Google fits into the cap. Leaving this string untouched is
  // what makes the second search additive by construction rather than by
  // measurement.
  "Minnesota",
  `(${[
    '"Twin Cities"',
    ...[...METRO_COUNTY_TERMS, ...EXURBAN_COUNTY_TERMS].map(
      (county) => `"${county.replace(/\b\w/g, (c) => c.toUpperCase())}"`,
    ),
  ].join(" OR ")})`,
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

      // Decoded on the way in, once, for every field that is read rather than
      // matched on. XML requires an ampersand in a text node to arrive escaped,
      // so a real headline — "Q&A: Minnesota environmental group leader talks
      // data center review process" — reaches us as `Q&amp;A: …`, and every
      // surface that renders it (the prerendered rail, the client re-render,
      // the phone ticker) sets it as *text*, which is exactly what shows the
      // entity to the reader instead of the character. The link needs it too:
      // `&amp;` between query parameters is not the URL Google published.
      let fullTitle = decodeEntities(titleMatch ? titleMatch[1] : "Local Update");
      let source = decodeEntities(sourceMatch ? sourceMatch[1] : "Local News");
      const description = decodeEntities(descMatch ? descMatch[1] : "");

      if (fullTitle.includes(` - ${source}`)) {
        fullTitle = fullTitle.split(` - ${source}`)[0];
      }

      // The Dakotas are rewritten before matching, because "North Dakota county
      // commissioner" literally contains the substring "dakota county" and so
      // introduced both Dakotas to a Minnesota feed the moment the county list
      // arrived — a Fargo Forum piece on a commissioner resigning over a data
      // center debate, and another on a western North Dakota county, both
      // caught this way.
      //
      // The sentinel has to end in something other than "dakota": joining the
      // words to "north_dakota" leaves "north_dakota county", which still
      // contains "dakota county" one character in. Appending `_state` is what
      // actually breaks the adjacency. `\b` keeps a bare "Dakota County" —
      // Minnesota's — untouched.
      const haystack = ` ${fullTitle} ${description} `
        .toLowerCase()
        .replace(/\b(north|south) dakota\b/g, "$1_dakota_state");

      return {
        title: fullTitle,
        url: linkMatch ? decodeEntities(linkMatch[1]) : "#",
        published: pubDateMatch ? pubDateMatch[1] : new Date().toString(),
        source,
        haystack,
      };
    });

    const newsItems = parsed
      .filter((item) => {
        const hasDataCenter = DATA_CENTER_TERMS.some((t) => item.haystack.includes(t));
        // Geography is satisfied either by a place named in the headline or by
        // the outlet being a Minnesota one. The source is checked separately
        // from the haystack rather than folded into it, so that an outlet name
        // can never stand in for the data center half of the test.
        const namesPlace = MINNESOTA_TERMS.some((t) => item.haystack.includes(t));
        const sourceName = item.source.toLowerCase();
        const isLocalOutlet = MINNESOTA_SOURCE_TERMS.some((t) =>
          sourceName.includes(t),
        );
        const hasMinnesota =
          namesPlace ||
          (isLocalOutlet && !OTHER_STATE_PATTERN.test(item.haystack));
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
async function fetchOneQuery(rawQuery: string): Promise<NewsResult> {
  const query = encodeURIComponent(rawQuery);
  const googleNewsUrl = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;

  const first = await attemptNews(googleNewsUrl);
  if (first.ok) return first;

  // Whatever the second attempt says stands: on success it's the data, and on
  // failure it's the more recent truth about why.
  return attemptNews(googleNewsUrl);
}

export async function fetchNews(windowDays: number = 7): Promise<NewsResult> {
  const dateQuery = buildDateQuery(windowDays);
  const results = await Promise.all(
    GEOGRAPHY_QUERIES.map((geography) =>
      fetchOneQuery(`"data center" ${geography} ${dateQuery}`),
    ),
  );

  const succeeded = results.filter((r) => r.ok);

  // Only a total failure is a failure. One query answering is partial coverage,
  // which is worth serving and worth preferring over the cache's last-good
  // copy — the alternative is discarding live headlines because a second
  // search we added for extra reach happened to drop its connection.
  if (succeeded.length === 0) {
    const firstFailure = results.find((r) => !r.ok);
    return firstFailure ?? { ok: false, reason: "Couldn't reach Google News." };
  }

  // The two searches overlap heavily by design — anything naming both a county
  // and the state matches both — so identity is the article URL, which Google
  // keeps stable per item. Titles are the fallback for the same story arriving
  // under two links, and are compared whole: near-identical headlines here are
  // usually genuinely separate items, three different Elk River council votes
  // being the case that made that clear.
  const seen = new Set<string>();
  const merged: NewsItem[] = [];
  for (const item of succeeded.flatMap((r) => r.newsItems)) {
    const key = item.url !== "#" ? item.url : `title:${item.title.trim()}`;
    if (seen.has(key) || seen.has(`title:${item.title.trim()}`)) continue;
    seen.add(key);
    seen.add(`title:${item.title.trim()}`);
    merged.push(item);
  }

  return { ok: true, newsItems: merged.sort(byPublishedDesc) };
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