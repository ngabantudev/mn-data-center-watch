// src/lib/newsFeed.ts
export interface NewsItem {
  title: string;
  url: string;
  published: string;
  source: string;
}

export async function fetchLocalNews(): Promise<{ newsItems: NewsItem[], errorMessage: string | null }> {
  const query = encodeURIComponent('"data center" AND Minnesota when:7d');
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

    const newsItems = itemMatches.map((itemXml) => {
      const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/);
      const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      const sourceMatch = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/);

      let fullTitle = titleMatch ? titleMatch[1] : "Local Update";
      let source = sourceMatch ? sourceMatch[1] : "Local News";
      
      if (fullTitle.includes(` - ${source}`)) {
        fullTitle = fullTitle.split(` - ${source}`)[0];
      }

      return {
        title: fullTitle,
        url: linkMatch ? linkMatch[1] : "#",
        published: pubDateMatch ? pubDateMatch[1] : new Date().toString(),
        source: source
      };
    });

    newsItems.sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime());
    return { newsItems, errorMessage: null };

  } catch (error) {
    clearTimeout(timeoutId);
    console.warn("⚠️ Miniflare safety fallback triggered. Bypassing news fetch.");
    return { newsItems: [], errorMessage: "News temporarily unavailable in dev environment." };
  }
}