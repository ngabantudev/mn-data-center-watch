// src/lib/projectFilters.ts
//
// One definition of "which projects are visible", expressed twice against
// the same criteria object: `matchesProject` for JS-side counting, and
// `toMapLibreFilter` for the GPU-side layer filter. Previously the status
// and MW predicates lived in two places (MapFilterParent's "Showing N of M"
// label and MapParent's setFilter expression) and had already drifted apart
// once — adding the legal-hold axis to both by hand would have doubled that
// risk. Now the sidebar count can never disagree with what's on the map.

import type { Project, ProjectStatus } from '~/data/dataCenters';
import { STATUS_META } from '~/data/mapStatusMeta';
import { HOLD_STATUSES, getLegalStatus } from '~/data/legalStatusMeta';
import { ALL_SIZE_TIERS, getSizeTier, type SizeTier } from '~/data/sizeTierMeta';
import { parseMW } from './projectMetrics';

export interface FilterCriteria {
  /** Project statuses left checked in the sidebar */
  statuses: string[];
  /** Capacity buckets left checked in the sidebar */
  sizeTiers: string[];
  /** When true, show only sites under environmental review or legal hold */
  legalHoldOnly: boolean;
}

export const ALL_STATUSES: ProjectStatus[] = STATUS_META.map((m) => m.status);

export const DEFAULT_CRITERIA: FilterCriteria = {
  statuses: ALL_STATUSES,
  sizeTiers: ALL_SIZE_TIERS,
  legalHoldOnly: false,
};

/** Properties the map's GeoJSON features must carry for `toMapLibreFilter` to work. */
export interface ProjectFeatureProps {
  status: ProjectStatus;
  /** Raw capacity — still drives the continuous marker radius, not the filter. */
  parsedMW: number;
  sizeTier: SizeTier;
  legalStatus: string;
  underLegalHold: boolean;
}

/** Derives the filterable properties for a project — used to build map features. */
export function toFeatureProps(project: Project): ProjectFeatureProps {
  const legalStatus = getLegalStatus(project);
  // `|| 5` keeps un-parseable capacity strings visible at the smallest
  // marker size rather than collapsing them to a zero-radius dot.
  const parsedMW = parseMW(project.powerCapacityMW) || 5;
  return {
    status: project.status,
    parsedMW,
    sizeTier: getSizeTier(parsedMW),
    legalStatus,
    underLegalHold: HOLD_STATUSES.includes(legalStatus),
  };
}

export function matchesProject(project: Project, criteria: FilterCriteria): boolean {
  const props = toFeatureProps(project);
  return (
    criteria.statuses.includes(props.status) &&
    criteria.sizeTiers.includes(props.sizeTier) &&
    (!criteria.legalHoldOnly || props.underLegalHold)
  );
}

export function countVisible(projects: readonly Project[], criteria: FilterCriteria): number {
  let n = 0;
  for (const p of projects) if (matchesProject(p, criteria)) n++;
  return n;
}

/**
 * The same predicate as a MapLibre expression, so filtering stays on the
 * style engine (no per-frame JS, no source re-upload) instead of rebuilding
 * the GeoJSON on every checkbox change.
 */
export function toMapLibreFilter(criteria: FilterCriteria): unknown[] {
  const clauses: unknown[] = [
    ['in', ['get', 'status'], ['literal', criteria.statuses]],
    ['in', ['get', 'sizeTier'], ['literal', criteria.sizeTiers]],
  ];
  if (criteria.legalHoldOnly) {
    clauses.push(['==', ['get', 'underLegalHold'], true]);
  }
  return ['all', ...clauses];
}
