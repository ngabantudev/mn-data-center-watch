// src/pages/api/news.ts
//
// Runs on-demand (per request) rather than being built as a static file.
// Requires `output: 'server'` plus the @astrojs/cloudflare adapter in
// astro.config.mjs — this route is excluded from static prerendering
// via `export const prerender = false` below.

import type { APIRoute } from "astro";
import { fetchLocalNews } from "~/lib/newsFeed";

export const prerender = false;

const ALLOWED_WINDOWS = [1, 7, 30, 365]; // days — beyond 1y rarely changes
                                          // results given Google News RSS's
                                          // ~100-item cap, so we stop here.

export const GET: APIRoute = async ({ url }) => {
  const requested = Number(url.searchParams.get("days"));
  const windowDays = ALLOWED_WINDOWS.includes(requested) ? requested : 7;

  const { newsItems, errorMessage } = await fetchLocalNews(windowDays);

  // Longer windows change less often day-to-day, so give them a longer
  // cache; short windows stay near-live.
  const maxAge = windowDays >= 365 ? 3600 : 120;
  const sMaxAge = windowDays >= 365 ? 21600 : 300;

  return new Response(JSON.stringify({ newsItems, errorMessage }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=${maxAge}, s-maxage=${sMaxAge}`,
    },
  });
};