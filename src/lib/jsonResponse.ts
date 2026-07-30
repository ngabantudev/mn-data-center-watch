// src/lib/jsonResponse.ts
//
// The one JSON reply every API route sends. All three routes had built it
// themselves — two of them with a local function of the same name, `json`,
// differing only in arity (one took `maxAge` and `sMaxAge`, the other hardcoded
// `max-age` from its own constant), and the third inline because it also sets a
// debug header. Same status, same content type, same `Cache-Control` shape,
// three places to fix a mistake in it.
//
// Caching is the one thing that varies and the one thing worth getting right,
// so it stays an explicit argument at every call site rather than a default:
// `max-age` is what a reader's own browser holds, `s-maxage` what a shared
// cache in front of us holds, and these routes want very different pairs.

export interface JsonResponseOptions {
  /** Browser cache lifetime, seconds. */
  maxAge: number;
  /** Shared/edge cache lifetime, seconds. */
  sMaxAge: number;
  /** Anything else this route wants to say about *this* reply. */
  headers?: Record<string, string>;
}

export function jsonResponse(
  payload: unknown,
  { maxAge, sMaxAge, headers }: JsonResponseOptions,
): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${maxAge}, s-maxage=${sMaxAge}`,
      ...headers,
    },
  });
}
