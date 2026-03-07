/**
 * Fatigue Progression Analyzer — tracks RPE climb across sets
 * and classifies fatigue accumulation rate vs the planned profile.
 * Pure functions, no side effects.
 */

import type { FatigueAnalysisResult } from '@/domain/analytics-types';
import type { SessionSet } from '@/domain/entities';
import { FatigueProgressionStatus } from '@/domain/enums';
import type { FatigueProgressionProfile } from '@/domain/value-objects';

// ===== Types =====

export type FatigueStatus = FatigueProgressionStatus;

// ===== Core Functions =====

/**
 * Calculate the expected RPE for a given set based on the fatigue profile.
 * The first working set uses the planned RPE range min as baseline.
 */
export function calculateExpectedRPE(
  profile: FatigueProgressionProfile,
  baselineRPE: number,
  setIndex: number, // 0-based index within the exercise
): number {
  const increment = profile.expectedRPEIncrementPerSet || 1;
  return Math.min(10, baselineRPE + increment * setIndex);
}

/**
 * Analyze fatigue progression for the current set relative to previous sets.
 */
export function analyzeFatigueProgression(
  completedSets: SessionSet[],
  currentSetIndex: number,
  profile: FatigueProgressionProfile | undefined,
  baselineRPE: number | undefined,
): FatigueAnalysisResult {
  if (!profile || baselineRPE === undefined) {
    return {
      status: FatigueProgressionStatus.NotApplicable,
      expectedRPE: null,
      actualRPE: null,
      rpeClimbPerSet: null,
      expectedClimbPerSet: 0,
      tolerance: 0,
      deviation: null,
      setIndex: currentSetIndex,
    };
  }

  const increment = profile.expectedRPEIncrementPerSet || 1;
  const currentSet = completedSets[currentSetIndex];
  const actualRPE = currentSet?.actualRPE ?? null;
  const expectedRPE = calculateExpectedRPE(profile, baselineRPE, currentSetIndex);

  // Calculate actual RPE climb from previous set
  let rpeClimbPerSet: number | null = null;
  if (currentSetIndex > 0 && actualRPE !== null) {
    const prevRPE = completedSets[currentSetIndex - 1]?.actualRPE;
    if (prevRPE !== null && prevRPE !== undefined) {
      rpeClimbPerSet = actualRPE - prevRPE;
    }
  }

  // Calculate deviation from expected
  let deviation: number | null = null;
  let status: FatigueStatus = FatigueProgressionStatus.Optimal;

  if (actualRPE !== null) {
    deviation = actualRPE - expectedRPE;

    if (Math.abs(deviation) <= profile.tolerance) {
      status = FatigueProgressionStatus.Optimal;
    } else if (deviation > 0) {
      status = FatigueProgressionStatus.TooFast;
    } else {
      status = FatigueProgressionStatus.TooSlow;
    }
  }

  return {
    status,
    expectedRPE,
    actualRPE,
    rpeClimbPerSet,
    expectedClimbPerSet: increment,
    tolerance: profile.tolerance,
    deviation,
    setIndex: currentSetIndex,
  };
}
