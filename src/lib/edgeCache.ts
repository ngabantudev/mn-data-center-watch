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
// enough to start failing. `Cache-Control: s-maxage` alone does not fix that:
// it relies on a zone cache in front of the Worker, and on a workers.dev
// deployment there isn't one.
//
// So four layers, cheapest first:
//
//   1. module memory — survives between requests on the same isolate and works
//      everywhere, including workers.dev where the other two do nothing;
//   2. single-flight — concurrent requests for the same key await ONE upstream
//      refresh rather than each starting their own. This is the layer that
//      actually prevents the 429, because the failure mode is concurrency;
//   3. the Cache API — shared across isolates in a colo, when there's a zone;
//   4. KV, if and only if a binding is present — the only layer that survives
//      an isolate eviction and is shared between colos. Optional by design:
//      no binding means no setup, and adding one later upgrades the cache with
//      no change to this file or its callers.
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
  value: T;
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
 * Epoch ms of the next permitted attempt per key, for the case where a refresh
 * failed and there is no cached value to hang a `retryAfter` on. Memory-only
 * and per-isolate on purpose: it throttles retries, it isn't data, and losing
 * it on eviction costs one extra attempt.
 */
const coldRetryAfter = new Map<string, number>();

/** How long to wait after a failed refresh before trying again. Matched to
 *  Open States' rate-limit window — a shorter backoff would just collect
 *  another 429, and a longer one delays recovery for no gain. */
const FAILURE_BACKOFF_MS = 60_000;

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
 */
export async function withCache<T>(
  key: string,
  opts: { freshSeconds: number; keepSeconds: number },
  build: () => Promise<T | null>,
): Promise<CacheResult<T> | null> {
  const now = Date.now();
  const cached = await read<T>(key);

  if (cached && now < cached.freshUntil) {
    return { value: cached.value, storedAt: cached.storedAt, stale: false };
  }

  // A recent attempt already failed. Serve what we have and don't touch the
  // API — during an outage this is the difference between one probe a minute
  // and four calls per visitor.
  if (cached?.retryAfter && now < cached.retryAfter) {
    return { value: cached.value, storedAt: cached.storedAt, stale: true };
  }
  const coldUntil = coldRetryAfter.get(key);
  if (!cached && coldUntil !== undefined && now < coldUntil) return null;

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
    return cached
      ? { value: cached.value, storedAt: cached.storedAt, stale: true }
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
    coldRetryAfter.delete(key);
    const storedAt = new Date(now).toISOString();
    await write(
      key,
      { value: fresh, storedAt, freshUntil: now + opts.freshSeconds * 1000 },
      opts.keepSeconds,
    );
    return { value: fresh, storedAt, stale: false };
  }

  // Refresh failed. Keep the stale copy exactly as it was — same `storedAt`, so
  // the age we show the reader stays honest — and only push out the next
  // attempt. `freshUntil` deliberately stays in the past: this is a cooldown,
  // not a promotion of stale data back to fresh.
  if (cached) {
    await write(
      key,
      { ...cached, retryAfter: now + FAILURE_BACKOFF_MS },
      opts.keepSeconds,
    );
    return { value: cached.value, storedAt: cached.storedAt, stale: true };
  }

  coldRetryAfter.set(key, now + FAILURE_BACKOFF_MS);
  return null;
}
