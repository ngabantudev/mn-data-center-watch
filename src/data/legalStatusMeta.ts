// src/data/legalStatusMeta.ts
//
// Single source of truth for the environmental-review / legal-hold axis,
// deliberately shaped like STATUS_META so both registries can be consumed
// by the same filter, popup, and map-styling code paths.

import type { LegalStatus, Project } from './dataCenters';
import { indexBy } from '~/lib/collections';

export interface LegalStatusMeta {
  legalStatus: LegalStatus;
  hex: string;
  /** Short label for the filter sidebar and map badge */
  label: string;
  /** Longer phrasing used in the detail panel */
  popupLabel: string;
  description: string;
  /** Glyph rendered inside the map's warning ring */
  glyph: string;
  /** Whether this counts as "under review / legal hold" for the isolate filter */
  isHold: boolean;
}

export const LEGAL_STATUS_META: LegalStatusMeta[] = [
  {
    legalStatus: 'compliant',
    hex: '#64748b',
    label: 'No Active Challenge',
    popupLabel: 'No Known Legal Challenge',
    description: 'No state-level review dispute or active suit on record',
    glyph: '',
    isHold: false,
  },
  {
    legalStatus: 'eaw_challenged',
    // Mid-tone gold, not a bright yellow. Bright yellow scored 1.74:1 against
    // the light "positron" basemap (floor for UI graphics is 3.0:1) — it was
    // effectively invisible on one of the four themes. This clears both
    // extremes: 4.48:1 on light, 3.54:1 on dark. Chosen over the equally
    // compliant #b45309, which is a burnt orange easily confused with the
    // red court_paused ring at marker scale.
    hex: '#a16207',
    label: 'EAW Challenged',
    popupLabel: 'Environmental Assessment Worksheet Contested',
    description: 'Citizen petition or contested EAW in progress',
    glyph: '!',
    isHold: true,
  },
  {
    legalStatus: 'eis_ordered',
    hex: '#8b5cf6',
    label: 'EIS Ordered',
    popupLabel: 'Full Environmental Impact Statement Ordered',
    description: 'Agency escalated the site to a full EIS',
    glyph: '!',
    isHold: true,
  },
  {
    legalStatus: 'court_paused',
    hex: '#dc2626',
    label: 'Court Paused',
    popupLabel: 'Halted by Court Order',
    description: 'Restraining order, stay, or appellate ruling halting work',
    glyph: '§',
    isHold: true,
  },
];

const DEFAULT_LEGAL_STATUS: LegalStatus = 'compliant';

/** Normalizes the optional field so every consumer reads one shape. */
export function getLegalStatus(project: Project): LegalStatus {
  return project.legalStatus ?? DEFAULT_LEGAL_STATUS;
}

export const LEGAL_META_BY_STATUS = indexBy(
  LEGAL_STATUS_META,
  (m) => m.legalStatus,
  (m) => m,
);

/** The subset that the "isolate legal holds" toggle matches. */
export const HOLD_STATUSES: LegalStatus[] = LEGAL_STATUS_META.filter((m) => m.isHold).map(
  (m) => m.legalStatus,
);

export function isUnderLegalHold(project: Project): boolean {
  return LEGAL_META_BY_STATUS[getLegalStatus(project)].isHold;
}
