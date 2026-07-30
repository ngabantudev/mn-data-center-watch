// src/lib/mapMarkers.ts
import type { Project } from '~/data/dataCenters';
import { STATUS_HEX, STATUS_POPUP_LABEL } from '~/data/mapStatusMeta';
import { LEGAL_META_BY_STATUS, getLegalStatus, isUnderLegalHold } from '~/data/legalStatusMeta';
import { impactForProject } from './ratepayerImpact';
import { buildRatepayerWidgetHtml } from './ratepayerWidget';

/**
 * The environmental-review / legal-hold badge. One builder for both the
 * hover preview and the detail panel — they differ only in whether the
 * sourcing note is shown, so the variant is a parameter rather than a
 * second near-identical template.
 */
function buildLegalBadgeHtml(project: Project, variant: 'preview' | 'detail'): string {
  if (!isUnderLegalHold(project)) return '';

  const meta = LEGAL_META_BY_STATUS[getLegalStatus(project)];
  const label = variant === 'preview' ? meta.label : meta.popupLabel;
  const note =
    variant === 'detail' && project.legalNote
      ? `<p class="mt-1 text-[10px] leading-snug opacity-80 wrap-break-word">${project.legalNote}</p>`
      : '';

  return `
    <div class="rounded-md border px-1.5 py-1 ${variant === 'preview' ? 'mb-1.5' : 'mb-2'}"
         style="border-color: ${meta.hex}59; background-color: ${meta.hex}1f; color: ${meta.hex}">
      <span class="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider">
        <span aria-hidden="true">⚖</span> ${label}
      </span>
      ${note}
    </div>
  `;
}

/**
 * A titled block in the detail panel. The heading markup was repeated
 * verbatim at each section, which is how the panel's sections drifted into
 * three slightly different spacings; now the rhythm is defined once and
 * reordering sections is a matter of moving one call.
 */
function section(title: string, body: string): string {
  return `
    <div class="mt-2.5 pt-2.5 border-t border-hair">
      <span class="block text-[9px] text-ink-4 font-bold uppercase tracking-wider mb-1.5">${title}</span>
      ${body}
    </div>
  `;
}

/**
 * The developer's own figures — the facility record — listed once for both
 * surfaces that show it.
 *
 * The hover preview and the detail panel render the same optional fields in the
 * same order, and used to do it as eight separate `project.x ? … : ''` blocks
 * across two functions: a new metric meant two coordinated edits, and the two
 * lists had every opportunity to disagree about what a facility record contains.
 *
 * `kind` is the single styling axis, and it settles the presentation on both
 * surfaces — an identifier gets a full-width label/value line, a figure gets a
 * half-width stat cell, and prose gets a stacked block free to wrap. Labels stay
 * per-variant because the popup is narrower and abbreviates.
 */
type MetricKind = 'id' | 'figure' | 'prose';

interface MetricField {
  get: (project: Project) => string | undefined;
  kind: MetricKind;
  previewLabel: string;
  detailLabel: string;
}

const METRIC_FIELDS: MetricField[] = [
  {
    get: (p) => p.developer,
    kind: 'id',
    previewLabel: 'Developer:',
    detailLabel: 'Developer:',
  },
  {
    get: (p) => p.estimatedCost,
    kind: 'figure',
    previewLabel: 'Est. Cost',
    detailLabel: 'Est. Cost:',
  },
  {
    get: (p) => p.powerCapacityMW,
    kind: 'figure',
    previewLabel: 'Power Draw',
    detailLabel: 'Power Grid Draw:',
  },
  {
    get: (p) => p.waterFootprint,
    kind: 'prose',
    previewLabel: 'Water Use',
    detailLabel: 'Water System Footprint:',
  },
];

/**
 * Renders whichever metrics this project actually has. Each surface supplies
 * only markup — the "is this field set" bookkeeping lives here once.
 */
function buildMetricsHtml(
  project: Project,
  label: (field: MetricField) => string,
  row: (kind: MetricKind, label: string, value: string) => string,
): string {
  return METRIC_FIELDS.map((field) => {
    const value = field.get(project);
    return value ? row(field.kind, label(field), value) : '';
  }).join('');
}

/** Preview rows: a two-column grid on white, so fixed neutral inks (see the
 *  popup note in global.css) rather than theme tokens. */
function buildPreviewMetricsHtml(project: Project): string {
  return buildMetricsHtml(
    project,
    (f) => f.previewLabel,
    (kind, label, value) => {
      if (kind === 'id') {
        return `
          <div class="col-span-2 flex justify-between items-center gap-2">
            <span class="text-neutral-400 font-medium shrink-0">${label}</span>
            <span class="font-bold text-neutral-800 text-right truncate">${value}</span>
          </div>
        `;
      }
      if (kind === 'prose') {
        return `
          <div class="col-span-2">
            <span class="block text-neutral-400 font-medium">${label}</span>
            <span class="font-semibold text-neutral-700 leading-tight">${value}</span>
          </div>
        `;
      }
      return `
        <div>
          <span class="block text-neutral-400 font-medium">${label}</span>
          <span class="font-bold text-neutral-800">${value}</span>
        </div>
      `;
    },
  );
}

/** Shared by every detail metric row, so the four can't drift apart on spacing. */
const DETAIL_ROW =
  'text-[11px] border-b border-hair pb-1 mb-1 last:border-b-0 last:pb-0 last:mb-0';

/** Detail rows: full-width label/value lines in the themed panel. */
function buildDetailMetricsHtml(project: Project): string {
  return buildMetricsHtml(
    project,
    (f) => f.detailLabel,
    (kind, label, value) =>
      kind === 'prose'
        ? `
          <div class="flex flex-col ${DETAIL_ROW}">
            <span class="text-ink-4 font-medium">${label}</span>
            <span class="font-semibold text-ink-2 mt-0.5 leading-tight">${value}</span>
          </div>
        `
        : `
          <div class="flex justify-between items-center ${DETAIL_ROW}">
            <span class="text-ink-4 font-medium">${label}</span>
            <span class="font-bold text-ink">${value}</span>
          </div>
        `,
  );
}

/** Builds the compact hover-preview popup: status, name, description, and a highlight grid of key stats. */
export function buildPreviewHtml(project: Project): string {
  const color = STATUS_HEX[project.status];
  const statusText = STATUS_POPUP_LABEL[project.status];

  // The single most legible line from the ratepayer calculator, previewed at
  // its default utilization. The interactive version lives in the detail
  // drawer — a hover popup that disappears on mouseout is the wrong place for
  // a slider, but the headline translation is what makes someone click.
  const impact = impactForProject(project);
  const householdsHtml = `
    <div class="mb-1.5 flex items-baseline justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-1">
      <span class="text-[9px] font-bold uppercase tracking-wider text-amber-700">Est. Power Usage</span>
      <span class="text-[10px] font-bold text-amber-900">≈ ${new Intl.NumberFormat('en-US').format(impact.households)} MN homes</span>
    </div>
  `;

  return `
    <div class="p-0.5 text-neutral-900 font-sans w-64 select-text">
      <div class="flex items-center gap-2 mb-1">
        <span class="inline-block w-2 h-2 rounded-full" style="background-color: ${color}"></span>
        <span class="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">${statusText}</span>
      </div>
      <h3 class="font-bold text-[13px] text-neutral-900 leading-snug mb-1 wrap-break-word">${project.name}</h3>
      <p class="text-[11px] text-neutral-600 leading-snug mb-2 line-clamp-2 wrap-break-word">${project.description}</p>
      ${buildLegalBadgeHtml(project, 'preview')}
      ${householdsHtml}
      <div class="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] bg-neutral-50 border border-neutral-100 rounded-md p-1.5 mb-1.5">
        ${buildPreviewMetricsHtml(project)}
      </div>
      <p class="text-[9px] font-semibold text-blue-600 uppercase tracking-wide">Click for full details &rarr;</p>
    </div>
  `;
}

/** Builds the full detail-panel content for a project (opened on marker click). */
export function buildDetailHtml(project: Project): string {
  const color = STATUS_HEX[project.status];
  const statusText = STATUS_POPUP_LABEL[project.status];

  const asymmetryHtml = project.economicAsymmetry ? section(
    'Jobs vs. Capital',
    `
      <p class="text-[11px] font-medium leading-snug text-ink-2 mb-1.5">${project.economicAsymmetry.metricRatioText}</p>
      <div class="grid grid-cols-2 gap-1 text-[10px] bg-hover p-1.5 rounded">
        <div>
          <span class="block text-ink-4 font-medium">Est. Construction:</span>
          <span class="font-bold text-ink">${project.economicAsymmetry.constructionJobsEstimate ?? 'N/A'} jobs</span>
        </div>
        <div>
          <span class="block text-ink-4 font-medium">Est. Permanent:</span>
          <span class="font-bold text-ink">${project.economicAsymmetry.permanentOperationalJobsEstimate ?? 'N/A'} jobs</span>
        </div>
      </div>
    `,
  ) : '';

  const publicRecordHtml = project.publicRecord ? section(
    'Official Registry',
    `
      <a href="${project.publicRecord.url}" target="_blank" rel="noopener noreferrer" class="text-[11px] font-medium text-accent hover:text-accent-hover hover:underline inline-flex items-center gap-1">
        📄 ${project.publicRecord.title} &rarr;
      </a>
    `,
  ) : '';

  // Ordered for a resident, not for a filing cabinet. What a neighbour opens
  // this for is, in order: is it being built, what does it do to my utility,
  // what is it, and only then the developer's paperwork. The status and any
  // court order lead because "Halted by Court Order" changes whether there is
  // anything to organize against this month.
  return `
    <div class="p-0.5 text-ink font-sans select-text">
      <!-- 1. Standing. The single most consequential line in the panel. -->
      <div class="flex flex-wrap items-center gap-1.5 mb-2">
        <span class="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider"
              style="background-color: ${color}1f; color: ${color}">
          <span class="inline-block w-1.5 h-1.5 rounded-full" style="background-color: ${color}"></span>
          ${statusText}
        </span>
      </div>
      ${buildLegalBadgeHtml(project, 'detail')}

      <h3 class="font-bold text-base text-ink pb-1 mb-1.5 leading-snug wrap-break-word">${project.name}</h3>
      <p class="text-xs text-ink-2 leading-normal font-medium mb-1 wrap-break-word">${project.businessImpact}</p>

      <!-- 2. What it costs the people already on the grid. -->
      ${buildRatepayerWidgetHtml(project)}

      <!-- 3. What the thing actually is. -->
      ${section('What Is Proposed', `
        <p class="text-xs text-ink-3 leading-relaxed wrap-break-word">${project.description}</p>
      `)}

      <!-- 4. The developer's own numbers. -->
      ${section('Facility Record', buildDetailMetricsHtml(project))}

      ${asymmetryHtml}

      ${publicRecordHtml}

      <div class="mt-3">
        <!-- The one primary CTA in the panel, so it gets --positive (the MN
             brand green in the light theme) rather than the link accent. -->
        <a href="${project.url}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center w-full text-center text-[11px] bg-positive text-on-positive py-2 px-3 rounded-lg hover:bg-positive-hover transition font-semibold tracking-wide shadow-sm pointer-events-auto">
          Track News Source &rarr;
        </a>
      </div>
    </div>
  `;
}