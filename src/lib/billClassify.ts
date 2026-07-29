// src/lib/billClassify.ts
//
// Turns raw Open States records into the shape the banner renders. Pure — no
// fetching, no bindings, no clock beyond the `now` passed in — so the tiering
// and stage rules can be reasoned about (and tested) on their own.
//
// The governing rule for everything here: state what the record says, and let
// the reader draw the conclusion. "Session adjourned 2026-05-20" is a fact we
// can stand behind; "this bill is dead" is a conclusion, and one that has been
// wrong before. Where the two diverge, we render the fact.

import { stanceFor } from "~/data/legislation";
import type {
  BillStage,
  BillTier,
  LiveBill,
  SessionInfo,
  SponsorSummary,
} from "~/lib/legislation";
import type { OpenStatesBill, OpenStatesSession } from "~/lib/openStates";

/** "data center", "data centers", "datacenter", "data centre". */
const DATA_CENTER_RE = /data\s*cent(?:er|re)s?/i;

/**
 * Action descriptions that mean the bill actually moved, as MN writes them.
 *
 * `re-?refer` is careful not to swallow a plain "Referred to Taxes", which is
 * introduction routing rather than progress — "referred" never matches, only
 * the "re-refer" of a committee report does. Likewise "Author added Jones" is
 * not movement: picking up a co-author is the most common last action in the
 * whole result set, and treating it as progress would light up the board with
 * bills that have sat in committee for a year.
 */
const ADVANCING_RE =
  /comm(?:ittee)? report|second reading|third reading|general orders|calendar|adopted|passage|re-?refer|conference committee|presented to governor|signed by governor|effective date/i;

function nonEmpty(value: string | undefined | null): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : null;
}

/**
 * Which session to search.
 *
 * Prefers one that's in progress today, and otherwise the most recently ended
 * — so the tracker keeps showing the last biennium's record through an
 * interim instead of going blank the day the gavel falls.
 */
export function pickSession(
  sessions: OpenStatesSession[],
  now: Date,
): SessionInfo | null {
  const today = now.toISOString().slice(0, 10);

  const usable = sessions.filter((s) => nonEmpty(s.identifier));
  if (usable.length === 0) return null;

  const inProgress = usable.filter((s) => {
    const start = nonEmpty(s.start_date);
    const end = nonEmpty(s.end_date);
    if (start && start > today) return false;
    // A session with no end date on file hasn't been gavelled out yet.
    return !end || end >= today;
  });

  const pool = inProgress.length > 0 ? inProgress : usable;
  const chosen = pool.reduce((best, s) => {
    const bestKey = nonEmpty(best.end_date) ?? nonEmpty(best.start_date) ?? "";
    const key = nonEmpty(s.end_date) ?? nonEmpty(s.start_date) ?? "";
    return key > bestKey ? s : best;
  });

  const endDate = nonEmpty(chosen.end_date);

  return {
    identifier: chosen.identifier!.trim(),
    name: nonEmpty(chosen.name) ?? chosen.identifier!.trim(),
    startDate: nonEmpty(chosen.start_date),
    endDate,
    adjourned: endDate !== null && endDate < today,
  };
}

function summariseSponsors(bill: OpenStatesBill): SponsorSummary {
  const rows = bill.sponsorships ?? [];
  const byParty: Record<string, number> = {};
  let people = 0;
  let primary: string | null = null;

  for (const row of rows) {
    const person = row.person;
    const name = nonEmpty(person?.name) ?? nonEmpty(row.name);

    if (person || row.entity_type === "person") {
      people += 1;
      const party = nonEmpty(person?.party);
      if (party) byParty[party] = (byParty[party] ?? 0) + 1;
      if (row.primary && !primary && name) primary = name;
    }
  }

  return { total: rows.length, people, primary, byParty };
}

function deriveStage(bill: OpenStatesBill): BillStage {
  // A passage date is Open States recording a floor vote, which is the one
  // milestone we never have to infer from prose.
  if (nonEmpty(bill.latest_passage_date)) return "passed";
  if (ADVANCING_RE.test(bill.latest_action_description ?? "")) return "advancing";
  return "introduced";
}

function deriveTier(bill: OpenStatesBill): BillTier {
  return DATA_CENTER_RE.test(bill.title ?? "") ? "core" : "mention";
}

/**
 * The blindspot signals — the thing this tracker exists to surface.
 *
 * A bill that says "data center" in its title gets found by anyone who goes
 * looking. The ones that change the rules for data centers *without* saying so
 * in the title are the ones that pass. Both rules below require the bill to
 * have actually moved, because "introduced and never heard" describes most of
 * the legislature and flagging it would say nothing.
 */
function deriveBlindspots(
  tier: BillTier,
  stage: BillStage,
  sponsors: SponsorSummary,
): string[] {
  const moved = stage !== "introduced";
  const reasons: string[] = [];

  if (tier === "mention" && moved) {
    reasons.push(
      stage === "passed"
        ? "Passed a floor vote without naming data centers in its title"
        : "Moving without naming data centers in its title",
    );
  }
  if (sponsors.people === 1 && moved) {
    reasons.push("Advanced on a single author");
  }
  if (sponsors.people === 0 && sponsors.total > 0 && moved) {
    reasons.push("Committee bill — no individual author to lobby");
  }

  return reasons;
}

export function toLiveBill(bill: OpenStatesBill): LiveBill | null {
  const id = nonEmpty(bill.id);
  const identifier = nonEmpty(bill.identifier);
  if (!id || !identifier) return null;

  const sponsors = summariseSponsors(bill);
  const stage = deriveStage(bill);
  const tier = deriveTier(bill);

  return {
    id,
    identifier,
    title: nonEmpty(bill.title) ?? identifier,
    session: nonEmpty(bill.session) ?? "",
    chamber: nonEmpty(bill.from_organization?.name),
    subjects: bill.subject ?? [],
    url: nonEmpty(bill.openstates_url),
    firstActionDate: nonEmpty(bill.first_action_date),
    latestAction: nonEmpty(bill.latest_action_description),
    latestActionDate: nonEmpty(bill.latest_action_date),
    latestPassageDate: nonEmpty(bill.latest_passage_date),
    stage,
    tier,
    sponsors,
    blindspots: deriveBlindspots(tier, stage, sponsors),
    stance: stanceFor(identifier),
  };
}

const STAGE_RANK: Record<BillStage, number> = {
  passed: 0,
  advancing: 1,
  introduced: 2,
};

/** Newest action first; a bill with no date on file sorts last rather than
 *  jumping the queue on an empty string comparison. */
function byRecency(a: LiveBill, b: LiveBill): number {
  return (b.latestActionDate ?? "").localeCompare(a.latestActionDate ?? "");
}

/** Campaign priorities, then blindspots, then whatever moved most recently. */
export function sortCore(bills: LiveBill[]): LiveBill[] {
  return [...bills].sort((a, b) => {
    const stance = Number(Boolean(b.stance)) - Number(Boolean(a.stance));
    if (stance !== 0) return stance;
    const blind = Number(b.blindspots.length > 0) - Number(a.blindspots.length > 0);
    if (blind !== 0) return blind;
    return byRecency(a, b);
  });
}

/**
 * Blindspots first, then by how far the bill got.
 *
 * This tier is noisy by construction — a phrase search over full bill text
 * also catches a light rail tax bill that cross-references the data center
 * exemption statute. Ranking by movement is what floats the omnibus that
 * quietly passed above the ones that never left the hopper.
 */
export function sortMentions(bills: LiveBill[]): LiveBill[] {
  return [...bills].sort((a, b) => {
    const blind = Number(b.blindspots.length > 0) - Number(a.blindspots.length > 0);
    if (blind !== 0) return blind;
    const stage = STAGE_RANK[a.stage] - STAGE_RANK[b.stage];
    if (stage !== 0) return stage;
    return byRecency(a, b);
  });
}

/**
 * Open States paginates over a shifting index, so a bill can surface on two
 * pages of one crawl — SF 4835 did exactly that while this was being built.
 * Dedupe by OCD id, not identifier: identifiers repeat across sessions.
 */
export function dedupe(bills: LiveBill[]): LiveBill[] {
  const seen = new Set<string>();
  return bills.filter((b) => (seen.has(b.id) ? false : (seen.add(b.id), true)));
}
