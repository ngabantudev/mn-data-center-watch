// src/lib/edgeCache.ts
//
// A read-through cache with a last-good fallback, layered so it degrades
// instead of disappearing.
//
// WHY THIS EXISTS, precisely: Open States' free tier allows **10 requests per
// minute**. Not 500 a day — I measured it, and 17 of 30 back-to-back calls
// came back `429 {"detail":"exceeded limit of 10/min"}`. A single cold refresh
// of the bill tracker spends 4 of those 10 (one for the session list, three for
// pages of results), so three visitors arriving at the same cold moment is
// enough to start failing.
//
// `Cache-Control: s-maxage` alone does not fix that. It needs a zone cache in
// front of the Worker, and this deployment is on workers.dev, where responses
// come back with no `cf-cache-status` at all — verified live. The header is
// inert here, so everything below has to work without it.
//
// So four layers, cheapest first:
//
//   1. module memory — survives between requests on the same isolate;
//   2. single-flight — concurrent requests for the same key await ONE upstream
//      refresh rather than each starting their own. This is the layer that
//      actually prevents the 429, because the failure mode is concurrency;
//   3. the Cache API — shared across isolates in a colo. Note this DOES work on
//      workers.dev, despite the absent zone cache above: an explicit
//      caches.default put/match is not the same mechanism as automatic response
//      caching. Confirmed by a cached payload outliving a version upload, which
//      necessarily replaces the isolate;
//   4. KV, if and only if a binding is present — the only layer shared between
//      colos, so the only one that helps when traffic arrives from several
//      regions at once. Optional by design: no binding means no setup, and
//      adding one later upgrades the cache with no change to this file or its
//      callers.
//
// And the property that matters most on a civic site: a refresh that fails
// serves the last good copy, labelled with when it was fetched, rather than an
// empty tracker. An empty list would read as "the legislature is quiet", which
// is a false statement about the world. A timestamped stale list is true.

import { env } from "cloudflare:workers";

export interface CacheResult<T> {
  value: T;
  /** ISO timestamp of the fetch this value came from. */
  storedAt: string;
  /** True when the refresh failed and this is the last good copy. */
  stale: boolean;
}

interface Envelope<T> {
  /**
   * The cached value, or null for a *negative* entry — a refresh that failed
   * with no last-good copy to fall back on.
   *
   * Negative entries exist to carry `retryAfter` through the shared layers.
   * Before them the cold-failure backoff was a module-level Map, which is
   * per-isolate: a colo spinning up a fresh isolate had no memory that the
   * upstream was down, so it went and found out for itself, at whatever the
   * upstream's timeout happened to be. Measured against the live deployment
   * during a Google News outage, every single request paid that in full.
   */
  value: T | null;
  storedAt: string;
  /** Epoch ms after which we should try to refresh. */
  freshUntil: number;
  /**
   * Epoch ms before which we must NOT try to refresh again, set after a failed
   * attempt.
   *
   * Without this, an outage turns every single visitor into another four
   * upstream calls: the value is stale, so each request dutifully tries to
   * refresh, fails, and serves stale — hammering an API that is either down or
   * already rate-limiting us. Backing off for the length of the rate-limit
   * window turns a thundering herd into one probe a minute.
   */
  retryAfter?: number;
}

/**
 * Structural, not the generated `KVNamespace` — this file must compile whether
 * or not a KV binding has been added to wrangler.jsonc.
 */
interface KvLike {
  get(key: string, type: "text"): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number },
  ): Promise<void>;
}

/** Binding name to look for. Absent is the expected case, not an error. */
const KV_BINDING = "LEGISLATION_CACHE";

const memory = new Map<string, Envelope<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

/**
 * Default wait after a failed refresh before trying again, matched to Open
 * States' one-minute rate-limit window: retrying inside it only collects
 * another 429.
 *
 * Callers override it, because the right value depends entirely on *why* the
 * upstream failed. A rate-limited API needs the full window. An upstream that
 * simply dropped one connection — Google News RSS does this — should be retried
 * in seconds, since backing off for a minute there converts one transient blip
 * into a minute of empty UI. Getting this wrong is invisible until you watch a
 * cold cache in production, which is exactly how it was found.
 */
const DEFAULT_FAILURE_BACKOFF_MS = 60_000;

function kv(): KvLike | null {
  const candidate = (env as Record<string, unknown> | undefined)?.[KV_BINDING];
  if (!candidate || typeof candidate !== "object") return null;
  const maybe = candidate as Partial<KvLike>;
  return typeof maybe.get === "function" && typeof maybe.put === "function"
    ? (candidate as KvLike)
    : null;
}

function workerCache(): Cache | null {
  try {
    return (globalThis as { caches?: { default?: Cache } }).caches?.default ?? null;
  } catch {
    return null;
  }
}

/** Cache API keys on a URL, so synthesise a stable one per logical key. */
function cacheUrl(key: string): string {
  return `https://cache.invalid/${encodeURIComponent(key)}`;
}

function parse<T>(body: string): Envelope<T> | null {
  try {
    const parsed = JSON.parse(body) as Envelope<T>;
    return typeof parsed?.freshUntil === "number" && "value" in parsed
      ? parsed
      : null;
  } catch {
    return null;
  }
}

async function read<T>(key: string): Promise<Envelope<T> | null> {
  const hot = memory.get(key) as Envelope<T> | undefined;
  if (hot) return hot;

  const cache = workerCache();
  if (cache) {
    const hit = await cache.match(new Request(cacheUrl(key))).catch(() => null);
    if (hit) {
      const parsed = parse<T>(await hit.text());
      if (parsed) {
        memory.set(key, parsed);
        return parsed;
      }
    }
  }

  const store = kv();
  if (store) {
    const raw = await store.get(key, "text").catch(() => null);
    if (raw) {
      const parsed = parse<T>(raw);
      if (parsed) {
        memory.set(key, parsed);
        return parsed;
      }
    }
  }

  return null;
}

async function write<T>(
  key: string,
  envelope: Envelope<T>,
  keepSeconds: number,
): Promise<void> {
  memory.set(key, envelope);
  const body = JSON.stringify(envelope);

  const cache = workerCache();
  if (cache) {
    await cache
      .put(
        new Request(cacheUrl(key)),
        new Response(body, {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": `public, max-age=${keepSeconds}`,
          },
        }),
      )
      // A cache write failure costs one extra upstream refresh, nothing more.
      .catch(() => {});
  }

  const store = kv();
  if (store) {
    await store.put(key, body, { expirationTtl: keepSeconds }).catch(() => {});
  }
}

/**
 * Serve `key` from cache, refreshing through `build` when stale.
 *
 * `build` returns null to mean "I could not get the data" — never an empty
 * result dressed up as success. That distinction is the whole contract: null
 * makes us fall back to the last good copy, whereas an empty-but-successful
 * payload would overwrite it and erase the record.
 *
 * `freshSeconds` is how long a value is served without contacting the API.
 * `keepSeconds` is how long it's retained as a stale fallback — deliberately
 * much longer, because a week-old bill list with a visible date beats nothing.
 *
 * `freshSeconds` may be a function of the value just built, for upstreams that
 * can succeed *partially*. A degraded answer is still worth serving and still
 * worth caching — but caching it for as long as a complete one lets one bad
 * minute define the next several hours, and the caller is the only layer that
 * can tell the two apart.
 */
export async function withCache<T>(
  key: string,
  opts: {
    freshSeconds: number | ((value: T) => number);
    keepSeconds: number;
    /** Wait before retrying after a failed refresh. Defaults to one minute;
     *  set it low for upstreams that fail transiently rather than by quota. */
    failureBackoffSeconds?: number;
  },
  build: () => Promise<T | null>,
): Promise<CacheResult<T> | null> {
  const backoffMs =
    opts.failureBackoffSeconds !== undefined
      ? opts.failureBackoffSeconds * 1000
      : DEFAULT_FAILURE_BACKOFF_MS;

  const now = Date.now();
  const cached = await read<T>(key);
  // A negative entry is present-but-empty: it carries a backoff and no data,
  // so every "do we have something to serve" test below has to ask about the
  // value rather than about the entry.
  const lastGood = cached && cached.value !== null ? (cached as Envelope<T> & { value: T }) : null;

  if (lastGood && now < lastGood.freshUntil) {
    return { value: lastGood.value, storedAt: lastGood.storedAt, stale: false };
  }

  // A recent attempt already failed. Serve what we have and don't touch the
  // API — during an outage this is the difference between one probe a minute
  // and four calls per visitor.
  if (cached?.retryAfter && now < cached.retryAfter) {
    return lastGood
      ? { value: lastGood.value, storedAt: lastGood.storedAt, stale: true }
      : null;
  }

  // Single-flight. Without this, N simultaneous cold requests each fire their
  // own page walk and collectively trip the per-minute limit — the exact
  // failure this cache exists to prevent.
  const existing = inflight.get(key) as Promise<T | null> | undefined;
  if (existing) {
    const shared = await existing.catch(() => null);
    if (shared !== null && shared !== undefined) {
      const envelope = memory.get(key) as Envelope<T> | undefined;
      return {
        value: shared,
        storedAt: envelope?.storedAt ?? new Date(now).toISOString(),
        stale: false,
      };
    }
    return lastGood
      ? { value: lastGood.value, storedAt: lastGood.storedAt, stale: true }
      : null;
  }

  const task = (async () => {
    try {
      return await build();
    } catch {
      return null;
    }
  })();
  inflight.set(key, task);

  let fresh: T | null;
  try {
    fresh = await task;
  } finally {
    inflight.delete(key);
  }

  if (fresh !== null) {
    const storedAt = new Date(now).toISOString();
    const freshSeconds =
      typeof opts.freshSeconds === "function"
        ? opts.freshSeconds(fresh)
        : opts.freshSeconds;
    await write(
      key,
      { value: fresh, storedAt, freshUntil: now + freshSeconds * 1000 },
      opts.keepSeconds,
    );
    return { value: fresh, storedAt, stale: false };
  }

  // Refresh failed. Keep the stale copy exactly as it was — same `storedAt`, so
  // the age we show the reader stays honest — and only push out the next
  // attempt. `freshUntil` deliberately stays in the past: this is a cooldown,
  // not a promotion of stale data back to fresh.
  if (lastGood) {
    await write(
      key,
      { ...lastGood, retryAfter: now + backoffMs },
      opts.keepSeconds,
    );
    return { value: lastGood.value, storedAt: lastGood.storedAt, stale: true };
  }

  // Nothing to fall back on, so record the failure itself. This is what every
  // other isolate — and every other colo, once a KV binding exists — reads to
  // learn that the upstream is down without asking it again.
  //
  // Held only for the backoff, not for `keepSeconds`: it is a cooldown, and a
  // week-long one would keep answering "unavailable" long after the upstream
  // came back. `freshUntil: now` keeps it permanently stale by construction, so
  // the single path that could mistake it for servable data never sees it as
  // fresh even if the TTL is ignored by a layer.
  await write(
    key,
    { value: null, storedAt: new Date(now).toISOString(), freshUntil: now, retryAfter: now + backoffMs },
    Math.max(Math.ceil(backoffMs / 1000), 1),
  );
  return null;
}
