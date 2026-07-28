// src/lib/legislation.ts
//
// Shared shapes and pure helpers for the legislative tracker. No fetching and
// no Cloudflare bindings here, so both the API routes and the client island
// can import this without dragging the Open States client into the browser
// bundle (which would ship the key-reading code to every visitor).

import type { PucDocket, TrackedBill } from "~/data/legislation";

export type BillStatus =
  | {
      known: true;
      title: string;
      latestAction: string;
      latestActionDate: string | null;
      url: string | null;
    }
  | { known: false };

export interface TrackedBillView extends TrackedBill {
  status: BillStatus;
}

/**
 * 'live'     — statuses came back from Open States
 * 'unlinked' — no API key configured on this deployment
 * 'degraded' — key present but the upstream call failed or returned nothing
 */
export type CampaignSource = "live" | "unlinked" | "degraded";

export interface LegislationPayload {
  bills: TrackedBillView[];
  dockets: PucDocket[];
  source: CampaignSource;
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
 */
export function composeRepEmail(
  legislator: LegislatorView,
  bills: TrackedBillView[],
): { subject: string; body: string } {
  const billList = bills.map((b) => `- ${b.identifier}: ${b.demand}`).join("\n");
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
      "I am asking you to support:",
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
  bills: TrackedBillView[],
): string | null {
  if (!isMailAddress(legislator.email)) return null;
  const { subject, body } = composeRepEmail(legislator, bills);
  return `mailto:${legislator.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
