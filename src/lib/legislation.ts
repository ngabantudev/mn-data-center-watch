// src/lib/legislation.ts
//
// Shared shapes and pure helpers for the legislative tracker. No fetching and
// no Cloudflare bindings here, so both the API routes and the client island
// can import this without dragging the Open States client into the browser
// bundle (which would ship the key-reading code to every visitor).

import type { CampaignStance, PucDocket } from "~/data/legislation";

/**
 * How far a bill has actually got, derived only from fields Open States
 * publishes. Deliberately coarse: three rungs we can defend from the data,
 * rather than a detailed ladder we'd be guessing at.
 */
export type BillStage = "passed" | "advancing" | "introduced";

/**
 * 'core'    — the bill's own title names data centers.
 * 'mention' — it didn't, but the phrase search matched it anyway, so the
 *             subject sits somewhere in the text. These are shown separately
 *             and never mixed into the headline list, because "a bill about
 *             data centers" and "a bill that mentions data centers once" are
 *             different claims and only one of them is safe to make.
 */
export type BillTier = "core" | "mention";

export interface SponsorSummary {
  /** Sponsorship rows returned for the bill, people and committees alike. */
  total: number;
  /** Named individuals only — a committee-sponsored bill has zero. */
  people: number;
  /** The primary author, when one is marked. */
  primary: string | null;
  /** Party -> count, for people whose party Open States knows. */
  byParty: Record<string, number>;
}

export interface LiveBill {
  id: string;
  identifier: string;
  title: string;
  session: string;
  /** "House" / "Senate", as Open States names the originating body. */
  chamber: string | null;
  subjects: string[];
  url: string | null;
  firstActionDate: string | null;
  latestAction: string | null;
  latestActionDate: string | null;
  latestPassageDate: string | null;
  stage: BillStage;
  tier: BillTier;
  sponsors: SponsorSummary;
  /**
   * Why this bill is under-watched, in plain language, or empty. Each entry is
   * a statement of fact about the record — never a guess about intent.
   */
  blindspots: string[];
  /** The campaign's position, when we have one. Null for everything we're
   *  tracking but not actively championing. */
  stance: CampaignStance | null;
}

export interface SessionInfo {
  identifier: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  /** End date is in the past. Stated, not interpreted — what it means for a
   *  given bill is left to the reader. */
  adjourned: boolean;
}

/**
 * 'live'     — results came back from Open States on this refresh
 * 'stale'    — the refresh failed, so this is the last good copy. Always shown
 *              with `fetchedAt` so the reader knows how old it is; a bill list
 *              without a date on it is the one thing worse than no bill list.
 * 'unlinked' — no API key configured on this deployment
 * 'degraded' — key present, refresh failed, and there's no cached copy to fall
 *              back on. The only state where the tracker genuinely knows
 *              nothing, and it says so rather than showing an empty list.
 */
export type CampaignSource = "live" | "stale" | "unlinked" | "degraded";

export interface LegislationPayload {
  session: SessionInfo | null;
  /** Bills whose title names data centers, campaign priorities first. */
  core: LiveBill[];
  /** Matched the search but not by title; blindspots first. */
  mentions: LiveBill[];
  dockets: PucDocket[];
  /** The phrase that produced this list, shown to the reader verbatim. */
  query: string;
  /** How many bills the search matched in total, before tiering. */
  totalMatched: number;
  /** True when the page ceiling stopped us short of the full result set. */
  truncated: boolean;
  source: CampaignSource;
  /** ISO timestamp of the fetch this list came from, or null when there was no
   *  fetch to date. Rendered whenever `source` is 'stale'. */
  fetchedAt: string | null;
}

/** "3 hours ago" / "2 days ago", for stamping a stale list. Coarse on purpose
 *  — minute-level precision on a six-hour cache implies a freshness we don't
 *  have. */
export function relativeAge(iso: string, now: number): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return "an unknown time ago";

  const minutes = Math.max(0, Math.round((now - then) / 60000));
  if (minutes < 60) return minutes <= 1 ? "just now" : `${minutes} minutes ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? "an hour ago" : `${hours} hours ago`;

  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

export type Chamber = "upper" | "lower";

export interface LegislatorView {
  id: string;
  name: string;
  party: string | null;
  chamber: Chamber;
  /** "Senator" / "Representative", as Open States titles it. */
  title: string;
  district: string | null;
  /** A real mail address, or null. Never a contact-form URL — see contactUrl. */
  email: string | null;
  /** The member's own contact form, when that's all Open States has. */
  contactUrl: string | null;
  url: string | null;
}

export interface LegislatorsPayload {
  legislators: LegislatorView[];
  source: CampaignSource;
}

export const CHAMBER_LABEL: Record<Chamber, string> = {
  upper: "State Senate",
  lower: "State House",
};

// Stage labels and colors live in ~/data/billStageMeta.ts, alongside the other
// status registries and the contrast measurements that justify their hexes.

/** Long party names are unreadable in a 10px line. Only `sponsorLine` needs
 *  this — nothing outside renders a bare party. */
function shortParty(party: string): string {
  if (/democratic-farmer-labor/i.test(party)) return "DFL";
  if (/republican/i.test(party)) return "R";
  if (/democrat/i.test(party)) return "D";
  return party;
}

/** "9 authors · DFL 7, R 1", or null when there's nothing worth saying. */
export function sponsorLine(s: SponsorSummary): string | null {
  if (s.total === 0) return null;
  if (s.people === 0) return "Committee bill — no individual author";

  const noun = s.people === 1 ? "author" : "authors";
  const split = Object.entries(s.byParty)
    .sort((a, b) => b[1] - a[1])
    .map(([party, n]) => `${shortParty(party)} ${n}`)
    .join(", ");

  return split ? `${s.people} ${noun} · ${split}` : `${s.people} ${noun}`;
}

/**
 * Open States' `email` field is not reliably an address — for many members it
 * holds a contact-form URL, and handing the mail client `mailto:https://...`
 * produces a dead link.
 *
 * Deliberately a plain boolean and not a `value is string` type predicate:
 * "not an email address" does not imply "not a string", and asserting that
 * narrows the false branch to `never` at every call site.
 */
export function isMailAddress(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * Subject and body for the "Email your legislator" action.
 *
 * Deliberately a draft the sender edits rather than a form letter sent
 * verbatim — legislative offices weight identical mass mail far below a
 * constituent's own words, and the UI says so next to the button.
 *
 * Bills the campaign has a written position on lead with that position; the
 * rest lead with their own live title, so a bill discovered this morning is
 * still something a constituent can write about tonight.
 */
export function composeRepEmail(
  legislator: LegislatorView,
  bills: LiveBill[],
): { subject: string; body: string } {
  const billList = bills.length
    ? bills
        .map((b) => `- ${b.identifier}: ${b.stance?.demand ?? b.title}`)
        .join("\n")
    : "- (see the bill tracker at this site for the current list)";

  const salutation = legislator.title
    ? `${legislator.title} ${legislator.name}`
    : legislator.name;

  return {
    subject: "Constituent request: data center energy and water accountability",
    body: [
      `Dear ${salutation},`,
      "",
      "I am a constituent writing about the buildout of large data centers in Minnesota and what it means for our electricity bills, our grid, and our water.",
      "",
      "I am writing to you about:",
      billList,
      "",
      "[Add a sentence in your own words here — what this means for you, your neighborhood, or your utility bill. This matters more than anything above.]",
      "",
      "Thank you for your time.",
      "",
      "Sincerely,",
      "[Your name and address]",
    ].join("\n"),
  };
}

export function mailtoHref(
  legislator: LegislatorView,
  bills: LiveBill[],
): string | null {
  if (!isMailAddress(legislator.email)) return null;
  const { subject, body } = composeRepEmail(legislator, bills);
  return `mailto:${legislator.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
