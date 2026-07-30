// src/lib/ratepayerWidget.ts
//
// The "what this costs the people already on the grid" widget, rendered into
// the facility detail drawer.
//
// Two halves that must never disagree: `buildRatepayerWidgetHtml` writes the
// markup, `hydrateRatepayerWidget` re-writes the numbers when the utilization
// slider moves. Both read `impactFields()`, a single map of slot name → text,
// so adding a stat is one entry rather than one template edit plus one
// matching DOM write. Every mutable value in the markup carries a
// `data-rp="<slot>"` attribute; the hydrator does nothing but fill those.
//
// Lives in `lib/` next to mapMarkers.ts, which builds the rest of the drawer
// and calls into here.

import type { Project } from '~/data/dataCenters';
import { MAX_LOAD_FACTOR, MIN_LOAD_FACTOR } from '~/data/mnRatepayerBaseline';
import { UNSOURCED_UTILITY_ISSUE_URL } from '~/data/utilities';
import {
  clampLoadFactor,
  computeImpactForMW,
  impactForProject,
  type RatepayerImpact,
} from './ratepayerImpact';
import { projectMW } from './projectMetrics';

/** Root selector, shared by the markup below and the hydrator at the bottom.
 *  Module-private: the drawer calls `hydrateRatepayerWidget(root)` and never
 *  queries for widgets itself. */
const RATEPAYER_ROOT_SELECTOR = '[data-ratepayer]';

/**
 * Upper bound of the share-of-state meter. The largest site on the map draws
 * a fifth of Minnesota's entire retail load, so a 0–100% track would render
 * every other facility as an invisible sliver. A 0–20% track with the ceiling
 * stated on the label keeps small sites legible without overstating them.
 */
const METER_CEILING = 0.2;

/**
 * One thousands-separated formatter for the whole app. Exported because
 * `mapMarkers.ts` was building a second `Intl.NumberFormat` inline, per popup,
 * to print the same `impact.households` figure this one prints — two ways to
 * format one number, and a fresh formatter allocated on every hover.
 */
export const nf = new Intl.NumberFormat('en-US');

/** Percent with just enough precision to stay honest at both ends of the range. */
function formatPercent(fraction: number): string {
  const pct = fraction * 100;
  if (pct >= 10) return `${pct.toFixed(0)}%`;
  if (pct >= 1) return `${pct.toFixed(1)}%`;
  if (pct >= 0.01) return `${pct.toFixed(2)}%`;
  return '<0.01%';
}

/** GWh reads naturally across the map's 5 MW – 1,900 MW spread; MWh does not. */
function formatAnnualEnergy(annualMWh: number): string {
  return `${nf.format(Math.round(annualMWh / 1000))} GWh`;
}

/**
 * The facility's draw measured against its own utility's customer base.
 *
 * Flips to a multiple above parity rather than running the percentage past
 * 100: Pine Island alone out-draws every Xcel account in Minnesota, and
 * "Equal to 114% of every account Xcel serves" reads as a broken sentence
 * exactly where the number is most damning.
 *
 * "Household electricity" is doing real work in this phrasing — the numerator
 * is homes-equivalent (annual MWh ÷ average household use) while the
 * denominator is customer accounts of every class. That's a legitimate civic
 * comparison, but the wording has to say which unit it's counting in.
 */
function formatUtilityShare(impact: RatepayerImpact): string {
  const ratio = impact.shareOfUtilityAccounts;
  if (!ratio || !impact.utility) return '';

  const name = impact.utility.name;
  return ratio >= 1
    ? `As much household electricity as ${ratio.toFixed(1)}× every customer ${name} serves.`
    : `As much household electricity as ${formatPercent(ratio)} of the customers ${name} serves.`;
}

/**
 * Every value in the widget that depends on the slider. Keys are the
 * `data-rp` slot names in the markup below.
 */
function impactFields(impact: RatepayerImpact): Record<string, string> {
  return {
    annual: formatAnnualEnergy(impact.annualMWh),
    utilization: `${Math.round(impact.loadFactor * 100)}%`,
    households: nf.format(impact.households),
    'share-state-load': formatPercent(impact.shareOfStateLoad),
    'share-state-households': formatPercent(impact.shareOfStateHouseholds),
    scale: impact.scaleText,
    'share-utility': formatUtilityShare(impact),
  };
}

/** Meter fill width, clamped to a visible minimum so a real value never reads as zero. */
function meterWidth(impact: RatepayerImpact): string {
  const pct = Math.min(impact.shareOfStateLoad / METER_CEILING, 1) * 100;
  return `${Math.max(pct, 1.5).toFixed(2)}%`;
}

/** The serving-utility block, or an honest, actionable gap where one isn't sourced. */
function buildUtilityHtml(impact: RatepayerImpact, fields: Record<string, string>): string {
  if (!impact.utility || !impact.ownership) {
    return `
      <div class="rounded-lg border border-dashed border-hair bg-hover px-2.5 py-2">
        <span class="block text-[9px] font-bold uppercase tracking-wider text-ink-4">Serving Utility</span>
        <p class="mt-1 text-[11px] leading-snug text-ink-3">
          Not sourced yet. Minnesota service territory doesn't follow city limits, so we
          won't guess which co-op or utility carries this site.
        </p>
        <a href="${UNSOURCED_UTILITY_ISSUE_URL}" target="_blank" rel="noopener noreferrer"
           class="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:text-accent-hover hover:underline">
          Know the answer? Send us the record &rarr;
        </a>
      </div>
    `;
  }

  const { utility, ownership } = impact;
  const share = fields['share-utility'];

  return `
    <div class="rounded-lg border border-hair bg-hover px-2.5 py-2"
         style="border-color: ${ownership.hex}40">
      <span class="block text-[9px] font-bold uppercase tracking-wider text-ink-4">Serving Utility</span>
      <div class="mt-1 flex items-start justify-between gap-2">
        <span class="text-[11.5px] font-bold leading-snug text-ink wrap-break-word">${utility.name}</span>
        <span class="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap"
              style="background-color: ${ownership.hex}1f; color: ${ownership.hex}">${ownership.label}</span>
      </div>
      ${
        // Rendered only when the utility publishes an account count. The
        // element is constant per site (the utility can't change under the
        // slider), so omitting it entirely beats leaving an empty paragraph
        // holding its top margin open.
        share
          ? `<p class="mt-1 text-[10.5px] leading-snug text-ink-3" data-rp="share-utility">${share}</p>`
          : ''
      }
      <p class="mt-1 text-[10.5px] leading-snug text-ink-3">${ownership.rateAuthority}</p>
      <p class="mt-1.5 border-t border-hair pt-1.5 text-[10.5px] font-medium leading-snug text-ink-2">${ownership.leverage}</p>
    </div>
  `;
}

/**
 * Renders the widget for a project. `data-mw` / `data-utility` on the root are
 * what the hydrator recomputes from, so the drawer never has to hold onto the
 * `Project` object it was opened with.
 */
export function buildRatepayerWidgetHtml(project: Project): string {
  const impact = impactForProject(project);
  const f = impactFields(impact);
  const mw = projectMW(project);

  return `
    <section data-ratepayer
             data-mw="${mw}"
             data-utility="${project.servingUtilityId ?? ''}"
             class="mt-2 rounded-lg border border-hair bg-hover p-2.5">
      <div class="mb-2 flex items-center justify-between gap-2">
        <span class="text-[9px] font-bold uppercase tracking-wider text-ink-4">Ratepayer &amp; Grid Impact</span>
        <span class="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap"
              style="background-color: ${impact.tier.hex}1f; color: ${impact.tier.hex}">${impact.tier.label} load</span>
      </div>

      <!-- Hero: the facility's own annual appetite. -->
      <div class="flex items-baseline gap-1.5">
        <span class="text-2xl font-bold leading-none tracking-tight text-ink tabular-nums" data-rp="annual">${f.annual}</span>
        <span class="text-[11px] font-medium text-ink-3">per year</span>
      </div>
      <p class="mt-1 text-[10.5px] leading-snug text-ink-3">
        ${nf.format(impact.mw)} MW running at <span class="font-semibold text-ink-2" data-rp="utilization">${f.utilization}</span> of nameplate.
      </p>

      <!-- Share of everything Minnesota buys in a year. -->
      <div class="mt-2.5">
        <div class="flex items-baseline justify-between gap-2">
          <span class="text-[10px] font-semibold text-ink-3">Share of MN retail electricity sales</span>
          <span class="text-[11.5px] font-bold text-ink tabular-nums" data-rp="share-state-load">${f['share-state-load']}</span>
        </div>
        <!-- Decorative: the same figure is already text in the row above, and
             a live aria-valuenow here would only risk going stale as the
             slider moves. -->
        <div class="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-panel-3" aria-hidden="true">
          <div class="h-full rounded-full transition-[width] duration-200 ease-out"
               style="width: ${meterWidth(impact)}; background-color: ${impact.tier.hex}"
               data-rp-meter></div>
        </div>
        <div class="mt-0.5 flex justify-between text-[8.5px] font-medium text-ink-4">
          <span>0%</span><span>20% of the entire state</span>
        </div>
      </div>

      <!-- The household translation. -->
      <div class="mt-2.5 grid grid-cols-2 gap-1.5">
        <div class="rounded-md bg-panel-3 px-2 py-1.5">
          <span class="block text-[9px] font-medium text-ink-4">Equivalent MN homes</span>
          <span class="text-[13px] font-bold text-ink tabular-nums" data-rp="households">${f.households}</span>
        </div>
        <div class="rounded-md bg-panel-3 px-2 py-1.5">
          <span class="block text-[9px] font-medium text-ink-4">Of all MN households</span>
          <span class="text-[13px] font-bold text-ink tabular-nums" data-rp="share-state-households">${f['share-state-households']}</span>
        </div>
      </div>
      <p class="mt-1.5 text-[11px] font-medium leading-snug text-ink-2" data-rp="scale">${f.scale}</p>

      <div class="mt-2.5">${buildUtilityHtml(impact, f)}</div>

      <!-- What the grid build-out at this size means for existing accounts. -->
      <div class="mt-2 rounded-lg border-l-2 px-2.5 py-1.5" style="border-color: ${impact.tier.hex}; background-color: ${impact.tier.hex}14">
        <span class="block text-[9px] font-bold uppercase tracking-wider text-ink-4">Who absorbs the upgrade</span>
        <p class="mt-0.5 text-[10.5px] leading-snug text-ink-2">${impact.tier.ratepayerExposure}</p>
      </div>

      <!-- The one contested assumption, handed to the reader instead of asserted. -->
      <div class="mt-2.5 border-t border-hair pt-2">
        <label class="flex items-center justify-between gap-2 text-[10px] font-semibold text-ink-3">
          <span>Assumed utilization</span>
          <span class="tabular-nums text-ink-2" data-rp="utilization">${f.utilization}</span>
        </label>
        <input type="range"
               data-rp-slider
               min="${Math.round(MIN_LOAD_FACTOR * 100)}"
               max="${Math.round(MAX_LOAD_FACTOR * 100)}"
               step="5"
               value="${Math.round(impact.loadFactor * 100)}"
               aria-label="Assumed utilization, percent of nameplate capacity"
               class="mt-1.5 w-full cursor-pointer accent-accent
                      focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/50" />
        <p class="mt-1.5 text-[9.5px] leading-snug text-ink-4">
          Load, not dollars. A bill impact needs the interconnection agreement and rate case for
          this specific site, and those aren't public for most projects here — so we don't estimate one.
          Baselines: EIA Minnesota electricity profile; U.S. Census ACS household counts.
        </p>
      </div>
    </section>
  `;
}

/**
 * Wires the utilization slider on every widget inside `root`.
 *
 * Called after the drawer sets `innerHTML`, so there is nothing to tear down:
 * the listener dies with the node it's attached to on the next open.
 */
export function hydrateRatepayerWidget(root: ParentNode): void {
  const widgets = root.querySelectorAll<HTMLElement>(RATEPAYER_ROOT_SELECTOR);

  widgets.forEach((widget) => {
    const slider = widget.querySelector<HTMLInputElement>('[data-rp-slider]');
    const meter = widget.querySelector<HTMLElement>('[data-rp-meter]');
    if (!slider) return;

    const mw = Number(widget.dataset.mw);
    const utilityId = widget.dataset.utility || undefined;
    if (!Number.isFinite(mw)) return;

    const render = () => {
      const impact = computeImpactForMW(
        mw,
        utilityId,
        clampLoadFactor(Number(slider.value) / 100),
      );
      const fields = impactFields(impact);

      // One pass over the declared slots. A slot with no element (the utility
      // share line is absent on unsourced sites) is simply skipped.
      for (const [slot, text] of Object.entries(fields)) {
        widget
          .querySelectorAll<HTMLElement>(`[data-rp="${slot}"]`)
          .forEach((el) => {
            el.textContent = text;
          });
      }

      if (meter) meter.style.width = meterWidth(impact);
    };

    slider.addEventListener('input', render);
  });
}
