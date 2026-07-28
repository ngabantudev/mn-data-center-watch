// src/pages/api/legislation.ts
//
// Live status for the campaign's tracked bills. Runs per-request on the
// Cloudflare adapter, like ~/pages/api/news.ts.
//
// Caching is the whole story here: Open States' free tier is 500 requests/day
// for the entire deployment, and this route makes one upstream call per
// tracked bill. The s-maxage below is what keeps that at a few dozen calls a
// day regardless of traffic — the edge serves everyone else from cache.

import type { APIRoute } from "astro";
import {
  LEGISLATION_MAX_AGE,
  LEGISLATION_S_MAX_AGE,
  MN_JURISDICTION,
  PUC_DOCKETS,
  TRACKED_BILLS,
} from "~/data/legislation";
import type { LegislationPayload, TrackedBillView } from "~/lib/legislation";
import { fetchBill, openStatesKey } from "~/lib/openStates";

export const prerender = false;

function json(payload: LegislationPayload, maxAge: number, sMaxAge: number) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=${maxAge}, s-maxage=${sMaxAge}`,
    },
  });
}

export const GET: APIRoute = async () => {
  const key = openStatesKey();

  if (!key) {
    // Still a useful response: the demands and dockets are our own content and
    // don't need the API at all. Only the live status is missing.
    return json(
      {
        bills: TRACKED_BILLS.map((b) => ({ ...b, status: { known: false } })),
        dockets: PUC_DOCKETS,
        source: "unlinked",
      },
      LEGISLATION_MAX_AGE,
      LEGISLATION_S_MAX_AGE,
    );
  }

  const bills = await Promise.all(
    TRACKED_BILLS.map(async (tracked): Promise<TrackedBillView> => {
      const bill = await fetchBill(
        key,
        MN_JURISDICTION,
        tracked.session,
        tracked.identifier,
      ).catch(() => null);

      if (!bill?.latest_action_description) {
        return { ...tracked, status: { known: false } };
      }

      return {
        ...tracked,
        status: {
          known: true,
          title: bill.title ?? tracked.identifier,
          latestAction: bill.latest_action_description,
          latestActionDate: bill.latest_action_date ?? null,
          url: bill.openstates_url ?? null,
        },
      };
    }),
  );

  // If every lookup came back empty the key is probably bad or the service is
  // down. Saying "degraded" lets the banner explain itself instead of showing
  // a wall of "status unknown" as though that were the real state of the
  // legislature.
  const degraded = !bills.some((b) => b.status.known);

  return json(
    { bills, dockets: PUC_DOCKETS, source: degraded ? "degraded" : "live" },
    // Don't let a bad upstream response stick at the edge for six hours.
    degraded ? 60 : LEGISLATION_MAX_AGE,
    degraded ? 60 : LEGISLATION_S_MAX_AGE,
  );
};
