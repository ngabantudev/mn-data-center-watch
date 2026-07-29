// src/data/mapStatusMeta.ts
import type { ProjectStatus } from './dataCenters';
import { indexBy } from '~/lib/collections';

export interface StatusMeta {
  status: ProjectStatus;
  hex: string;
  /**
   * The background utility for `hex`, spelled out in full below rather than
   * composed at runtime, since Tailwind only emits classes it finds as literal
   * text.
   *
   * This comment used to illustrate the pattern with a `hex` placeholder in it,
   * which the scanner also treats as literal text — it was emitting a real
   * `background-color:#hex` rule into the production stylesheet. Invalid CSS
   * that browsers drop, but shipped to every visitor. Don't reintroduce it.
   */
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

export const STATUS_HEX = indexBy(STATUS_META, (m) => m.status, (m) => m.hex);

export const STATUS_POPUP_LABEL = indexBy(STATUS_META, (m) => m.status, (m) => m.popupLabel);