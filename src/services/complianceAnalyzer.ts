/**
 * Compliance Analyzer — compares actual set performance against planned ranges.
 * Pure functions, no side effects.
 */

import type { ParameterCompliance, SetComplianceResult } from '@/domain/analytics-types';
import type { SessionSet, PlannedSet } from '@/domain/entities';
import { ComplianceStatus } from '@/domain/enums';

// ===== Core Functions =====

function analyzeParameter(
  actual: number | null,
  min: number,
  max: number | null,
): ParameterCompliance {
  if (actual === null) {
    return { status: ComplianceStatus.Incomplete, actual, plannedMin: min, plannedMax: max, deviation: 0 };
  }

  const effectiveMax = max ?? Infinity;

  if (actual >= min && actual <= effectiveMax) {
    return { status: ComplianceStatus.WithinRange, actual, plannedMin: min, plannedMax: max, deviation: 0 };
  }
  if (actual < min) {
    return { status: ComplianceStatus.BelowMinimum, actual, plannedMin: min, plannedMax: max, deviation: actual - min };
  }
  return { status: ComplianceStatus.AboveMaximum, actual, plannedMin: min, plannedMax: max, deviation: actual - effectiveMax };
}

/** Analyze a completed set against its planned set ranges. */
export function analyzeSetCompliance(
  sessionSet: SessionSet,
  plannedSet: PlannedSet,
): SetComplianceResult {
  // Count compliance
  const count = analyzeParameter(
    sessionSet.actualCount,
    plannedSet.countRange.min,
    plannedSet.countRange.max,
  );

  // Load compliance
  let load: ParameterCompliance | null = null;
  if (plannedSet.loadRange) {
    load = analyzeParameter(
      sessionSet.actualLoad,
      plannedSet.loadRange.min,
      plannedSet.loadRange.max,
    );
  }

  // RPE compliance
  let rpe: ParameterCompliance | null = null;
  if (plannedSet.rpeRange) {
    rpe = analyzeParameter(
      sessionSet.actualRPE,
      plannedSet.rpeRange.min,
      plannedSet.rpeRange.max,
    );
  }

  // Determine overall status
  const statuses = [count, load, rpe].filter(Boolean) as ParameterCompliance[];

  let overall: ComplianceStatus;
  if (statuses.some(s => s.status === ComplianceStatus.Incomplete)) {
    overall = ComplianceStatus.Incomplete;
  } else if (statuses.every(s => s.status === ComplianceStatus.WithinRange)) {
    overall = ComplianceStatus.FullyCompliant;
  } else if (statuses.some(s => s.status === ComplianceStatus.BelowMinimum)) {
    overall = ComplianceStatus.BelowMinimum;
  } else if (statuses.some(s => s.status === ComplianceStatus.AboveMaximum)) {
    overall = ComplianceStatus.AboveMaximum;
  } else {
    overall = ComplianceStatus.WithinRange;
  }

  return { overall, count, load, rpe };
}
