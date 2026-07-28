// src/lib/openStates.ts
//
// Server-side client for the Open States v3 API (open.pluralpolicy.com).
//
// Import this only from ~/pages/api/* — it reads the API key, and pulling it
// into a client island would ship that path to the browser.
//
// Secrets come from `cloudflare:workers`, not process.env. Note that
// `Astro.locals.runtime.env` was REMOVED in Astro v6 and now throws — the
// adapter points explicitly at this import instead.

import { env } from "cloudflare:workers";

const BASE = "https://v3.openstates.org";

export interface OpenStatesBill {
  identifier?: string;
  title?: string;
  session?: string;
  openstates_url?: string;
  latest_action_description?: string;
  latest_action_date?: string;
}

export interface OpenStatesPerson {
  id?: string;
  name?: string;
  party?: string;
  /** Not always an address — Open States stores a contact-form URL here for
   *  many members. Callers must validate before building a mailto. */
  email?: string;
  openstates_url?: string;
  jurisdiction?: { id?: string; name?: string; classification?: string };
  current_role?: {
    title?: string;
    org_classification?: string;
    district?: string | number;
  };
}

interface PeopleGeoResponse {
  results?: OpenStatesPerson[];
}

/**
 * Reads the Worker secret, falling back to Astro's build-time env so a plain
 * `.env` works in dev without a `.dev.vars` file.
 *
 * Returns null when unset rather than throwing — the banner has to render for
 * every visitor whether or not this deployment has a key, so callers surface
 * a missing key as an "unlinked" state in the payload.
 */
export function openStatesKey(): string | null {
  const fromWorker = (env as Record<string, unknown> | undefined)
    ?.OPENSTATES_API_KEY;
  const key =
    (typeof fromWorker === "string" ? fromWorker : undefined) ??
    import.meta.env.OPENSTATES_API_KEY;
  return typeof key === "string" && key.trim() ? key.trim() : null;
}

async function get<T>(
  key: string,
  path: string,
  params: Record<string, string>,
): Promise<T | null> {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  // Key goes in the header, never the query string — query params end up in
  // access logs and in intermediary cache keys.
  const res = await fetch(url, {
    headers: { "X-API-KEY": key, Accept: "application/json" },
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

/**
 * Look up one bill by its chamber identifier. Returns null when the session
 * identifier doesn't exist or Open States is down — callers must treat that
 * as "status unknown", never as "bill dead".
 */
export function fetchBill(
  key: string,
  jurisdiction: string,
  session: string,
  billId: string,
) {
  return get<OpenStatesBill>(
    key,
    `/bills/${encodeURIComponent(jurisdiction)}/${encodeURIComponent(session)}/${encodeURIComponent(billId)}`,
    {},
  );
}

/** Legislators whose districts contain the given point. */
export async function fetchLegislatorsByPoint(
  key: string,
  lat: number,
  lng: number,
) {
  const data = await get<PeopleGeoResponse>(key, "/people.geo", {
    lat: String(lat),
    lng: String(lng),
  });
  return data?.results ?? null;
}
