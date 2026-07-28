// src/lib/mapMarkers.ts
import type { Project } from '~/data/dataCenters';
import { STATUS_HEX, STATUS_POPUP_LABEL } from '~/data/mapStatusMeta';
import { LEGAL_META_BY_STATUS, getLegalStatus, isUnderLegalHold } from '~/data/legalStatusMeta';

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

/** Builds the compact hover-preview popup: status, name, description, and a highlight grid of key stats. */
export function buildPreviewHtml(project: Project): string {
  const color = STATUS_HEX[project.status];
  const statusText = STATUS_POPUP_LABEL[project.status];

  const statsHtml = `
    ${project.developer ? `
      <div class="col-span-2 flex justify-between items-center gap-2">
        <span class="text-neutral-400 font-medium shrink-0">Developer:</span>
        <span class="font-bold text-neutral-800 text-right truncate">${project.developer}</span>
      </div>
    ` : ''}
    ${project.estimatedCost ? `
      <div>
        <span class="block text-neutral-400 font-medium">Est. Cost</span>
        <span class="font-bold text-neutral-800">${project.estimatedCost}</span>
      </div>
    ` : ''}
    ${project.powerCapacityMW ? `
      <div>
        <span class="block text-neutral-400 font-medium">Power Draw</span>
        <span class="font-bold text-neutral-800">${project.powerCapacityMW}</span>
      </div>
    ` : ''}
    ${project.waterFootprint ? `
      <div class="col-span-2">
        <span class="block text-neutral-400 font-medium">Water Use</span>
        <span class="font-semibold text-neutral-700 leading-tight">${project.waterFootprint}</span>
      </div>
    ` : ''}
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
      <div class="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] bg-neutral-50 border border-neutral-100 rounded-md p-1.5 mb-1.5">
        ${statsHtml}
      </div>
      <p class="text-[9px] font-semibold text-blue-600 uppercase tracking-wide">Click for full details &rarr;</p>
    </div>
  `;
}

/** Builds the full detail-panel content for a project (opened on marker click). */
export function buildDetailHtml(project: Project): string {
  const color = STATUS_HEX[project.status];
  const statusText = STATUS_POPUP_LABEL[project.status];

  const metricsHtml = `
    ${project.developer ? `
      <div class="flex justify-between items-center text-[11px] border-b border-white/5 pb-1 mb-1">
        <span class="text-neutral-500 font-medium">Developer:</span>
        <span class="font-bold text-neutral-100">${project.developer}</span>
      </div>
    ` : ''}
    ${project.estimatedCost ? `
      <div class="flex justify-between items-center text-[11px] border-b border-white/5 pb-1 mb-1">
        <span class="text-neutral-500 font-medium">Est. Cost:</span>
        <span class="font-bold text-neutral-100">${project.estimatedCost}</span>
      </div>
    ` : ''}
    ${project.powerCapacityMW ? `
      <div class="flex justify-between items-center text-[11px] border-b border-white/5 pb-1 mb-1">
        <span class="text-neutral-500 font-medium">Power Grid Draw:</span>
        <span class="font-bold text-neutral-100">${project.powerCapacityMW}</span>
      </div>
    ` : ''}
    ${project.waterFootprint ? `
      <div class="flex flex-col text-[11px] border-b border-white/5 pb-1 mb-1">
        <span class="text-neutral-500 font-medium">Water System Footprint:</span>
        <span class="font-semibold text-neutral-300 mt-0.5 leading-tight">${project.waterFootprint}</span>
      </div>
    ` : ''}
  `;

  const asymmetryHtml = project.economicAsymmetry ? `
    <div class="mt-2 pt-2 border-t border-white/10 text-[11px] leading-tight text-neutral-400">
      <span class="block text-[9px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Economic Footprint</span>
      <p class="font-medium text-neutral-300 mb-1.5">${project.economicAsymmetry.metricRatioText}</p>
      <div class="grid grid-cols-2 gap-1 text-[10px] bg-white/5 p-1.5 rounded">
        <div>
          <span class="block text-neutral-500 font-medium">Est. Construction:</span>
          <span class="font-bold text-neutral-100">${project.economicAsymmetry.constructionJobsEstimate ?? 'N/A'} jobs</span>
        </div>
        <div>
          <span class="block text-neutral-500 font-medium">Est. Permanent:</span>
          <span class="font-bold text-neutral-100">${project.economicAsymmetry.permanentOperationalJobsEstimate ?? 'N/A'} jobs</span>
        </div>
      </div>
    </div>
  ` : '';

  const publicRecordHtml = project.publicRecord ? `
    <div class="mt-2 pt-2 border-t border-dashed border-white/10">
      <span class="block text-[9px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Official Registry</span>
      <a href="${project.publicRecord.url}" target="_blank" rel="noopener noreferrer" class="text-[11px] font-medium text-blue-400 hover:text-blue-300 hover:underline inline-flex items-center gap-1">
        📄 ${project.publicRecord.title} &rarr;
      </a>
    </div>
  ` : '';

  return `
    <div class="p-0.5 text-neutral-100 font-sans select-text">
      <div class="flex items-center gap-2 mb-1">
        <span class="inline-block w-2 h-2 rounded-full" style="background-color: ${color}"></span>
        <span class="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">${statusText}</span>
      </div>
      <h3 class="font-bold text-base text-neutral-100 border-b border-white/10 pb-1 mb-2 leading-snug wrap-break-word">${project.name}</h3>
      <p class="text-xs text-neutral-400 leading-relaxed mb-3 wrap-break-word">${project.description}</p>
      ${buildLegalBadgeHtml(project, 'detail')}

      <div class="bg-white/5 border border-white/10 p-2 rounded-lg mb-2">
        <span class="block text-[9px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Impact & Status</span>
        <p class="text-xs text-neutral-200 leading-normal font-medium mb-2 wrap-break-word">${project.businessImpact}</p>
        ${metricsHtml}
        ${asymmetryHtml}
      </div>

      ${publicRecordHtml}

      <div class="mt-3">
        <a href="${project.url}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center w-full text-center text-[11px] bg-emerald-500 text-neutral-900 py-2 px-3 rounded-lg hover:bg-emerald-400 transition font-semibold tracking-wide shadow-sm pointer-events-auto">
          Track News Source &rarr;
        </a>
      </div>
    </div>
  `;
}