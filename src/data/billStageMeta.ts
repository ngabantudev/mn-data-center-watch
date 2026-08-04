// src/data/billStageMeta.ts
//
// Single source of truth for the three-step legislative progress axis shown in
// the campaign banner, shaped like STATUS_META and LEGAL_STATUS_META so it can
// be consumed the same way.
//
// Hexes rather than theme tokens, deliberately, and for the reason global.css
// states: colors that *encode meaning* must stay stable across themes. A bill
// that has passed is green whether the reader is in light or dark mode.
//
// LABELS: "Proposed / Advancing / Passed". Chosen to be readable by someone who
// has never followed a bill before, which ruled out the accurate-but-opaque
// alternatives — "In Committee" assumes you know what a committee does, and
// "First Reading" is meaningless outside the building. All three are parallel
// forms so the sequence reads as one progression rather than three unrelated
// states. The verbatim latest action is always rendered underneath, so nothing
// here is the only thing a reader has to go on.

import { indexBy } from "~/lib/collections";
import type { BillStage } from "~/lib/legislation";

export interface BillStageMeta {
  stage: BillStage;
  /** Public-facing label. One word, no legislative jargon. */
  label: string;
  hex: string;
  /**
   * The background utility for `hex`, written out in full below rather than
   * composed at runtime, because Tailwind only emits classes it can find as
   * literal text.
   *
   * Note the phrasing of this comment avoids spelling that class pattern out
   * with a placeholder: the scanner reads comments too, and the equivalent note
   * in mapStatusMeta.ts made it emit a real rule declaring a colour of `#hex`.
   */
  color: string;
  /** Plain-language gloss. Carries the meaning for anyone who can't or doesn't
   *  distinguish the colors, and is what the pill announces to a screen reader. */
  description: string;
  /** Display order — most consequential first, so a bill that actually passed
   *  is never below two dozen that merely exist. */
  order: number;
}

/**
 * Pill text. Every stage color below is light enough that near-black clears
 * 4.5:1 on it, so one ink value works for all three rather than each pill
 * carrying its own.
 */
export const STAGE_INK = "text-[#0a0a0a]";

/**
 * Colors are measured, not picked by eye. Two constraints, both of which have
 * bitten this project before (see the note on `eaw_challenged` in
 * legalStatusMeta.ts):
 *
 *  1. CONTRAST. These three are only ever drawn on the campaign banner, which
 *     is a dark surface in both themes — the flag's #002d5d in light (the
 *     `.band` scope in global.css; the banner opts in precisely so these stay
 *     valid), #18181b in dark. So each pill has to clear the 3.0:1 graphics
 *     floor against both, and its own near-black text has to clear 4.5:1.
 *     Measured, in that order: band / dark / text. Do not carry these onto the
 *     light theme's off-white panel body — every one lands under 2.5:1 there.
 *
 *  2. NO COLLISION with the map. #10b981 means "Operational" in STATUS_META
 *     (rejected/withdrawn sites are shown in neutral gray, not red, so they read
 *     as inactive rather than alarming), and the map legend can be open at the
 *     same time as this banner. Reusing #10b981 for "passed" would make green
 *     mean two different things on one screen, so these are separate tints —
 *     deliberately not the obvious red-500/green-500.
 *
 * Color is never the only signal: the label ships next to it everywhere, which
 * is what keeps the red/green pair legible to a red-green colorblind reader.
 * Their lightness also differs substantially (6.40 vs 10.17 against dark),
 * so they don't collapse into each other in greyscale either.
 */
export const BILL_STAGE_META: BillStageMeta[] = [
  {
    stage: "passed",
    label: "Passed",
    // 7.86 band / 10.17 dark / 11.36 text. Not #10b981 (map "Operational")
    // and not #34d399 (the dark theme's own accent, which would read as
    // decoration rather than status).
    hex: "#4ade80",
    color: "bg-[#4ade80]",
    description: "Passed a floor vote",
    order: 0,
  },
  {
    stage: "advancing",
    label: "Advancing",
    // 8.20 band / 10.61 dark / 11.86 text. Not #f59e0b (map "Paused") or
    // #f97316 (map "Under Construction").
    hex: "#fbbf24",
    color: "bg-[#fbbf24]",
    description: "Cleared a committee or reached a reading",
    order: 1,
  },
  {
    stage: "introduced",
    label: "Proposed",
    // 4.95 band / 6.40 dark / 7.16 text. Deliberately not the red-500 that would
    // evoke the map's old "Rejected" red — "proposed" is the start of the
    // process and must not be mistaken for a bill that was killed.
    hex: "#f87171",
    color: "bg-[#f87171]",
    description: "Introduced, no action yet beyond gaining authors",
    order: 2,
  },
];

export const STAGE_META_BY_STAGE = indexBy(
  BILL_STAGE_META,
  (m) => m.stage,
  (m) => m,
);

/** Stages in display order — drives the grouped sections in the banner. */
export const STAGES_IN_ORDER: BillStage[] = [...BILL_STAGE_META]
  .sort((a, b) => a.order - b.order)
  .map((m) => m.stage);
