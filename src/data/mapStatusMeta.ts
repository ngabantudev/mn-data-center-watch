// src/data/mapStatusMeta.ts
import type { ProjectStatus } from './dataCenters';

export interface StatusMeta {
  status: ProjectStatus;
  hex: string;
  /** Tailwind bg-[#hex] class — kept as a literal string so Tailwind's scanner can pick it up */
  color: string;
  /** Short label used in the filters sidebar */
  filterLabel: string;
  /** Slightly longer label used in the map popup's status pill */
  popupLabel: string;
  description: string;
  activePulse: boolean;
}

export const STATUS_META: StatusMeta[] = [
  {
    status: 'active',
    hex: '#10b981',
    color: 'bg-[#10b981]',
    filterLabel: 'Operational Site',
    popupLabel: 'Operational Site',
    description: 'Active and on the grid',
    activePulse: false,
  },
  {
    status: 'construction',
    hex: '#f97316',
    color: 'bg-[#f97316]',
    filterLabel: 'Active Construction',
    popupLabel: 'Under Active Construction',
    description: 'Formally approved / building out',
    activePulse: true,
  },
  {
    status: 'planned',
    hex: '#3b82f6',
    color: 'bg-[#3b82f6]',
    filterLabel: 'Proposed / Planned',
    popupLabel: 'Proposed / Planned',
    description: 'In zoning reviews or permitting',
    activePulse: false,
  },
  {
    status: 'paused',
    hex: '#f59e0b',
    color: 'bg-[#f59e0b]',
    filterLabel: 'Development Paused',
    popupLabel: 'Development Paused',
    description: 'Held by legal stays or moratorium',
    activePulse: false,
  },
  {
    status: 'rejected',
    hex: '#ef4444',
    color: 'bg-[#ef4444]',
    filterLabel: 'Rejected / Withdrawn',
    popupLabel: 'Rejected / Withdrawn',
    description: 'Voted down or cancelled',
    activePulse: false,
  },
];

export const STATUS_HEX: Record<ProjectStatus, string> = STATUS_META.reduce(
  (acc, meta) => ({ ...acc, [meta.status]: meta.hex }),
  {} as Record<ProjectStatus, string>
);

export const STATUS_POPUP_LABEL: Record<ProjectStatus, string> = STATUS_META.reduce(
  (acc, meta) => ({ ...acc, [meta.status]: meta.popupLabel }),
  {} as Record<ProjectStatus, string>
);