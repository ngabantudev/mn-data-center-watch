// src/lib/cleanGridClient.ts
//
// The browser-side glue shared by the two surfaces that render the 2040
// mandate: the headline bar over the map (CleanGridBar.astro) and the full
// readout in the filters rail (CleanGridTracker.astro).
//
// Two things, both of which exist because there are now two surfaces. The
// arithmetic itself stays in ~/lib/cleanGridProgress.ts, which has no DOM and
// no clock of its own.
//
// ---------------------------------------------------------------------------
// 1. THE COUNTDOWN CORRECTION
// ---------------------------------------------------------------------------
// Re-runs the 2040 countdown against the reader's own clock, across every
// surface that renders it.
//
// index.astro is prerendered, so anything derived from `new Date()` in
// component frontmatter ships stamped with the year of the last deploy. That is
// right for the carbon-free share — it is a measurement of a named year and
// must not drift — and wrong for "years remaining" and for which milestone is
// highlighted as next, both of which are statements about now. A site not
// redeployed since December would otherwise count one year too many.
//
// This lived inside CleanGridTracker.astro's own script and was scoped to that
// component's root. It moved here when the top bar started rendering the same
// countdown: two surfaces showing "14 years" and "15 years" on one screen is
// exactly the class of bug the registries in ~/data exist to prevent, and the
// fix is one owner for the correction rather than a second copy of it.
//
// So the query is document-wide and the function is idempotent — it only writes
// text derived from the current year, so running it once per mounted surface
// costs a few DOM writes and can never produce a different answer. Both callers
// invoke it through `onReady`.

// ---------------------------------------------------------------------------
// 2. THE ONE MESSAGE BETWEEN THEM
// ---------------------------------------------------------------------------
// The banner is a headline, so it has to lead to the record. It does not reach
// into the modal to open it: the two are separate components mounted as
// siblings by MapParent, and a `<dialog>` is opened by calling `showModal()` on
// it, which is the dialog's own business — a caller that reached across for the
// element and called it directly would be a second owner of that element's
// state, which is the bug the mobile-sheet and map-control notes were written
// to remove.
//
// So the banner asks and the record answers, through one event on `document` —
// the same shape `mapfilterchange`, `mapmarkerselect` and `mobilesheetchange`
// already use, and one direction only.
//
// (This used to be answered by MapFilterParent, which opened the tracker's
// accordion section in the filters rail. That section is gone; the event
// survived the move unchanged, which is the point of it being an event.)

import { cleanGridProgress } from './cleanGridProgress';
import { CARBON_FREE_DEADLINE_YEAR } from '~/data/mnCleanGridStandard';

/** Dispatched on `document` when the reader asks to see the full tracker. */
export const OPEN_CLEAN_GRID_EVENT = 'opencleangridtracker';

export function syncCleanGridYear(): void {
  const progress = cleanGridProgress(new Date().getFullYear());

  document
    .querySelectorAll<HTMLElement>('[data-cg="years-left"]')
    .forEach((el) => {
      el.textContent = String(progress.yearsLeft);
    });

  // Past the deadline the countdown stops being a countdown. Saying "0 to 2040"
  // would read as a rounding artifact rather than as the mandate having come
  // due.
  document
    .querySelectorAll<HTMLElement>('[data-cg="deadline-note"]')
    .forEach((el) => {
      el.textContent =
        progress.yearsLeft > 0 ? `to ${CARBON_FREE_DEADLINE_YEAR}` : 'mandate due';
    });

  // The bar writes the same fact as a phrase rather than as a bare number, so
  // it reads as a sentence beside the share. Same source, same clock. States
  // the goal ("100% carbon-free by 2040") before the countdown — matches the
  // server-rendered phrase in CleanGridBar.astro's `yearsPhrase`.
  document
    .querySelectorAll<HTMLElement>('[data-cg="years-phrase"]')
    .forEach((el) => {
      el.textContent =
        progress.yearsLeft > 0
          ? `100% carbon-free by ${CARBON_FREE_DEADLINE_YEAR} — ${progress.yearsLeft} ${progress.yearsLeft === 1 ? 'yr' : 'yrs'} left`
          : `100% carbon-free by ${CARBON_FREE_DEADLINE_YEAR} — mandate due`;
    });

  document
    .querySelectorAll<HTMLElement>('[data-cg-milestone]')
    .forEach((row) => {
      const year = Number(row.dataset.cgMilestone);
      if (progress.next?.year === year) row.setAttribute('data-next', '');
      else row.removeAttribute('data-next');
    });
}
