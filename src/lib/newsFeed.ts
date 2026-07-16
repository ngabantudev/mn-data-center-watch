// src/lib/newsFeed.ts
export interface NewsItem {
  title: string;
  url: string;
  published: string;
  source: string;
}

export async function fetchLocalNews(): Promise<{ newsItems: NewsItem[], errorMessage: string | null }> {
  // Google News search query looking for data centers and AI in Minnesota within the last 7 days
  const query = encodeURIComponent('"data center" AND (AI OR "artificial intelligence") AND Minnesota when:7d');
  const googleNewsUrl = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;

  try {
    const response = await fetch(googleNewsUrl);
    const xmlText = await response.text();

    // A lightweight, dependency-free way to parse out <item> blocks from the RSS feed
    const itemMatches = xmlText.match(/<item>([\s\S]*?)<\/item>/g) || [];

    const newsItems = itemMatches.map((itemXml) => {
      const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/);
      const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      const sourceMatch = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/);

      let fullTitle = titleMatch ? titleMatch[1] : "Local Update";
      let source = sourceMatch ? sourceMatch[1] : "Local News";
      
      // Clean up Google News trailing sources in titles
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

    // Sort newest first. Google's RSS feed order isn't guaranteed to be
    // strictly chronological, so this must run before items leave this function.
    newsItems.sort((a, b) => {
      const timeA = new Date(a.published).getTime();
      const timeB = new Date(b.published).getTime();
      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    });

    return { newsItems, errorMessage: null };
  } catch (error) {
    console.error("Google News RSS Fetch Error:", error);
    return { newsItems: [], errorMessage: "Failed to fetch latest regional coverage." };
  }
}