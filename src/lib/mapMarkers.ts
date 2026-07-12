// src/lib/mapMarkers.ts
import type { Project, ProjectStatus } from '~/data/dataCenters';
import { STATUS_HEX, STATUS_POPUP_LABEL } from '~/data/mapStatusMeta';

/** Builds the custom pin element (with the construction pulse animation hook) for a marker. */
export function createMarkerElement(status: ProjectStatus): HTMLElement {
  const color = STATUS_HEX[status];

  const el = document.createElement('div');
  el.className = 'custom-map-pin';
  el.innerHTML = `
    <div class="pin-icon-wrapper ${status === 'construction' ? 'construction-pulse-marker' : ''}">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="${color}"/>
      </svg>
    </div>
  `;
  return el;
}

/** Builds the inner HTML for a project's popup card. */
export function buildPopupHtml(project: Project, popupId: string): string {
  const color = STATUS_HEX[project.status];
  const statusText = STATUS_POPUP_LABEL[project.status];

  const metricsHtml = `
    ${project.estimatedCost ? `
      <div class="flex justify-between items-center text-[11px] border-b border-neutral-100 pb-1 mb-1">
        <span class="text-neutral-400 font-medium">Est. Cost:</span>
        <span class="font-bold text-neutral-800">${project.estimatedCost}</span>
      </div>
    ` : ''}
    ${project.powerCapacityMW ? `
      <div class="flex justify-between items-center text-[11px] border-b border-neutral-100 pb-1 mb-1">
        <span class="text-neutral-400 font-medium">Power Grid Draw:</span>
        <span class="font-bold text-neutral-800">${project.powerCapacityMW}</span>
      </div>
    ` : ''}
    ${project.waterFootprint ? `
      <div class="flex flex-col text-[11px]">
        <span class="text-neutral-400 font-medium">Water System Footprint:</span>
        <span class="font-semibold text-neutral-700 mt-0.5 leading-tight">${project.waterFootprint}</span>
      </div>
    ` : ''}
  `;

  const publicRecordHtml = project.publicRecord ? `
    <div class="mt-2 pt-2 border-t border-dashed border-neutral-200">
      <span class="block text-[9px] text-neutral-400 font-bold uppercase tracking-wider mb-1">Official Registry</span>
      <a href="${project.publicRecord.url}" target="_blank" rel="noopener noreferrer" class="text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1">
        📄 ${project.publicRecord.title} &rarr;
      </a>
    </div>
  ` : '';

  return `
    <div id="container-${popupId}" class="p-0.5 text-neutral-900 font-sans max-h-[45vh] sm:max-h-[55vh] overflow-y-auto overflow-x-hidden select-text">
      <div class="flex items-center gap-2 mb-1">
        <span class="inline-block w-2 h-2 rounded-full" style="background-color: ${color}"></span>
        <span class="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">${statusText}</span>
      </div>
      <h3 class="font-bold text-sm md:text-base text-neutral-900 border-b border-neutral-200 pb-1 mb-2 leading-snug wrap-break-word">${project.name}</h3>
      <p class="text-[11px] md:text-xs text-neutral-600 leading-relaxed mb-3 wrap-break-word">${project.description}</p>

      <div class="bg-neutral-50 border border-neutral-200/60 p-2 rounded-lg mb-2">
        <span class="block text-[9px] text-neutral-400 font-bold uppercase tracking-wider mb-1">Impact & Status</span>
        <p class="text-[11px] md:text-xs text-neutral-700 leading-normal font-medium mb-2 wrap-break-word">${project.businessImpact}</p>
        ${metricsHtml}
      </div>

      ${publicRecordHtml}

      <div class="mt-3">
        <a href="${project.url}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center w-full text-center text-[11px] bg-neutral-900 text-white py-2 px-3 rounded-lg hover:bg-neutral-800 transition font-medium tracking-wide shadow-sm pointer-events-auto">
          Track News Source &rarr;
        </a>
      </div>
    </div>
  `;
}

// --- Marker filter controller ------------------------------------------------

export type MarkerRecord = { el: HTMLElement; status: string };

const ALL_STATUSES = ['active', 'construction', 'planned', 'paused', 'rejected'];

/**
 * Listens for `mapfilterchange` events (dispatched by MapFilters.astro) and
 * shows/hides whatever marker elements are currently registered with it.
 */
export class MarkerFilterController {
  private registry: MarkerRecord[] = [];
  private activeStatuses = new Set(ALL_STATUSES);

  constructor() {
    document.addEventListener('mapfilterchange', (event) => {
      const detail = (event as CustomEvent<{ statuses: string[] }>).detail;
      if (!detail) return;
      this.activeStatuses = new Set(detail.statuses);
      this.apply();
    });
  }

  /** Replace the tracked markers (e.g. after a map re-init) and immediately re-apply filters. */
  setRegistry(registry: MarkerRecord[]): void {
    this.registry = registry;
    this.apply();
  }

  apply(): void {
    this.registry.forEach(({ el, status }) => {
      el.style.display = this.activeStatuses.has(status) ? '' : 'none';
    });
  }
}