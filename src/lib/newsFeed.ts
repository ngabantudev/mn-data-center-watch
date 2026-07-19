// src/lib/newsFeed.ts
export interface NewsItem {
  title: string;
  url: string;
  published: string;
  source: string;
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

// Soft signal only — used for sort ranking, not filtering. Add/remove freely.
const CONTEXT_TERMS = [
  "impact",
  "community",
  "grid",
  "water",
  "rate",
  "moratorium",
  "fresh energy",
  "pushback",
  "opposition",
  "hearing",
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

export async function fetchLocalNews(
  windowDays: number = 7,
): Promise<{ newsItems: NewsItem[]; errorMessage: string | null }> {
  const rawQuery = `"data center" Minnesota ${buildDateQuery(windowDays)}`;
  const query = encodeURIComponent(rawQuery);
  const googleNewsUrl = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;

  // Force an early escape if the internal environment hangs during build or HMR
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

  try {
    const response = await fetch(googleNewsUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { newsItems: [], errorMessage: "Feed momentarily unavailable." };
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
      .map((item) => ({
        ...item,
        contextScore: CONTEXT_TERMS.filter((t) => item.haystack.includes(t)).length,
      }))
      // Higher context relevance first, then most recent within the same score
      .sort((a, b) => {
        if (b.contextScore !== a.contextScore) return b.contextScore - a.contextScore;
        return new Date(b.published).getTime() - new Date(a.published).getTime();
      })
      .map(({ haystack, contextScore, ...item }) => item);

    return { newsItems, errorMessage: null };

  } catch (error) {
    clearTimeout(timeoutId);
    console.warn("⚠️ Miniflare safety fallback triggered. Bypassing news fetch.");
    return { newsItems: [], errorMessage: "News temporarily unavailable in dev environment." };
  }
}