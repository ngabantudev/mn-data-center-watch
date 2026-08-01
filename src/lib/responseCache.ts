// src/lib/responseCache.ts
//
// A colo-level cache for whole API responses, and the closest thing this
// deployment has to the zone cache it doesn't get.
//
// ---------------------------------------------------------------------------
// WHY, AND WHY IT ISN'T ALREADY COVERED BY `withCache`.
// ---------------------------------------------------------------------------
// ~/lib/edgeCache.ts caches the *data* a route composes, which is what stops
// concurrent visitors from each hitting Open States or Google. It does not stop
// them each re-running the route: on a hit, every request still re-reads the
// envelope, rebuilds the payload object and serialises it. For the 1Y news
// window that is a ~170 KB `JSON.stringify` per request, and for a thousand
// people opening the map at once it is a thousand of them.
//
// This caches the finished `Response`, so the first request in a colo does that
// work and the rest are answered by the cache with no route code running at all.
//
// ---------------------------------------------------------------------------
// IT WORKS HERE, WHICH IS THE NON-OBVIOUS PART.
// ---------------------------------------------------------------------------
// edgeCache.ts records that `Cache-Control: s-maxage` is inert on this
// deployment: workers.dev has no zone cache, responses come back with no
// `cf-cache-status` at all, verified live. That is about *automatic* response
// caching. An explicit `caches.default` put/match is a different mechanism and
// does work on workers.dev — the same note says so, and the news and bills
// caches have been relying on it for their middle layer.
//
// So this makes the `s-maxage` the routes already set mean something, without a
// custom domain. If the site later moves onto a real Cloudflare zone, the zone
// cache will sit in front of this and both will be reading the same header.
//
// ---------------------------------------------------------------------------
// ONE OWNER OF FRESHNESS.
// ---------------------------------------------------------------------------
// This deliberately takes no TTL argument. The Cache API honours the response's
// own `Cache-Control`, preferring `s-maxage` — which is exactly the number each
// route already computed for its shared-cache lifetime, and which it already
// varies by window, by staleness and by whether the answer was partial.
//
// Giving this function its own TTL would create a second thing deciding how
// long a degraded answer is served, and the routes have been bitten by that
// before: see the note on `sMaxAge` in ~/pages/api/news.ts about advertising a
// full window for a stale copy. There is one number, the routes own it, and
// this layer just obeys it.

/** Cloudflare's shared cache for this colo, or null off-runtime (dev, tests). */
function coloCache(): Cache | null {
  try {
    return (globalThis as { caches?: { default?: Cache } }).caches?.default ?? null;
  } catch {
    return null;
  }
}

/**
 * Serve `request` from the colo cache, building it once if it isn't there.
 *
 * `build` is only called on a miss. Its response is stored with whatever
 * `Cache-Control` it set — see the note above on why the TTL is not a parameter.
 *
 * Every failure here is non-fatal by construction: no Cache API, a `match` that
 * throws, a `put` that is refused. The worst case is that the route runs the way
 * it did before this file existed, which is why nothing below rethrows.
 */
export async function withResponseCache(
  request: Request,
  build: () => Promise<Response>,
): Promise<Response> {
  const cache = coloCache();
  // `put` only accepts GET, and every route using this is a GET. Guarding
  // anyway so a future POST route can call this without silently never caching.
  if (!cache || request.method !== "GET") return build();

  const hit = await cache.match(request).catch(() => null);
  if (hit) {
    // Marked so "is this layer doing anything" is answerable from curl. The
    // routes' own `X-News-Source` / payload `source` still describe the *data*;
    // this describes only whether the route body ran.
    const headers = new Headers(hit.headers);
    headers.set("X-Response-Cache", "hit");
    return new Response(hit.body, { status: hit.status, headers });
  }

  const response = await build();

  // Clone before returning: a Response body can only be read once, and `put`
  // consumes the copy it is given.
  await cache.put(request, response.clone()).catch(() => {});

  const headers = new Headers(response.headers);
  headers.set("X-Response-Cache", "miss");
  return new Response(response.body, { status: response.status, headers });
}
