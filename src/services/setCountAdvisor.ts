/**
 * Set Count Advisor — advises whether to do another set based on
 * plan constraints, fatigue trend, and stop criteria.
 * Pure functions, no side effects.
 */

import type { SessionSet, PlannedSet } from '@/domain/entities';
import { ToFailureIndicator } from '@/domain/enums';
import type { FatigueProgressionProfile, SetCountRange } from '@/domain/value-objects';
import { t } from '@/i18n/t';

// ===== Constants =====

const RPE_CEILING_MAP: Record<'low' | 'medium' | 'high', number> = {
  low: 10,
  medium: 9.5,
  high: 9,
};

const DEFAULT_SET_COUNT_RANGE: SetCountRange = { min: 3, max: 5 };

// ===== Types =====

export type SetCountAdvice = 'doAnother' | 'optional' | 'stop';

export interface SetCountAdvisorResult {
  advice: SetCountAdvice;
  reason: string;
  completedSets: number;
  minSets: number;
  maxSets: number;
  currentRPE: number | null;
  rpeCeiling: number;      // RPE at which we recommend stopping
}

// ===== Core Function =====

export function adviseOnSetCount(
  completedSets: SessionSet[],
  plannedSet: PlannedSet | undefined,
  fatigueSensitivity: 'low' | 'medium' | 'high',
  simpleMode?: boolean,
): SetCountAdvisorResult {
  const rawRange = plannedSet?.setCountRange ?? DEFAULT_SET_COUNT_RANGE;
  const setCountRange = { ...rawRange, max: rawRange.max ?? rawRange.min };
  const profile: FatigueProgressionProfile | undefined = plannedSet?.fatigueProgressionProfile;

  const numCompleted = completedSets.filter(s => s.isCompleted).length;
  const lastCompletedSet = [...completedSets].reverse().find(s => s.isCompleted);
  const currentRPE = !simpleMode ? (lastCompletedSet?.actualRPE ?? null) : null;

  // RPE ceiling based on sensitivity
  const rpeCeiling = RPE_CEILING_MAP[fatigueSensitivity];

  // Stop criteria from plan
  const stopCriteria = setCountRange.stopCriteria ?? 'maxSets';

  // Check max sets reached
  if (numCompleted >= setCountRange.max) {
    return {
      advice: 'stop',
      reason: t('setCountAdvice.maxSetsReached', { max: setCountRange.max }),
      completedSets: numCompleted,
      minSets: setCountRange.min,
      maxSets: setCountRange.max,
      currentRPE,
      rpeCeiling,
    };
  }

  // Check RPE ceiling stop criteria
  if (!simpleMode && stopCriteria === 'rpeCeiling' && currentRPE !== null && currentRPE >= rpeCeiling) {
    const missingPart = numCompleted < setCountRange.min
      ? ` ${t('setCountAdvice.rpeCeilingMissing', { remaining: setCountRange.min - numCompleted })}`
      : '';
    return {
      advice: numCompleted >= setCountRange.min ? 'stop' : 'optional',
      reason: `${t('setCountAdvice.rpeCeilingReached', { rpe: currentRPE, ceiling: rpeCeiling })}${missingPart}`,
      completedSets: numCompleted,
      minSets: setCountRange.min,
      maxSets: setCountRange.max,
      currentRPE,
      rpeCeiling,
    };
  }

  // Check technical breakdown or absolute failure
  if (!simpleMode && (lastCompletedSet?.actualToFailure === ToFailureIndicator.AbsoluteFailure || lastCompletedSet?.actualToFailure === ToFailureIndicator.TechnicalFailure)) {
    const suffix = numCompleted < setCountRange.min
      ? ` ${t('setCountAdvice.failureMissing', { remaining: setCountRange.min - numCompleted })}`
      : ` ${t('setCountAdvice.failureConsiderStop')}`;
    return {
      advice: numCompleted >= setCountRange.min ? 'stop' : 'optional',
      reason: `${t('setCountAdvice.failureReached')}${suffix}`,
      completedSets: numCompleted,
      minSets: setCountRange.min,
      maxSets: setCountRange.max,
      currentRPE,
      rpeCeiling,
    };
  }

  // Check fatigue progression trend
  if (!simpleMode && profile && currentRPE !== null && numCompleted >= 2) {
    const rpeValues = completedSets
      .filter(s => s.isCompleted && s.actualRPE !== null)
      .map(s => s.actualRPE!);

    if (rpeValues.length >= 2) {
      const lastTwo = rpeValues.slice(-2);
      const climb = lastTwo[1] - lastTwo[0];

      // If climb is much faster than expected, suggest stopping
      if (climb > profile.expectedRPEIncrementPerSet + profile.tolerance * 2) {
        return {
          advice: numCompleted >= setCountRange.min ? 'stop' : 'optional',
          reason: t('setCountAdvice.rpeClimbTooFast', { climb: climb.toFixed(1), expected: profile.expectedRPEIncrementPerSet.toFixed(1) }),
          completedSets: numCompleted,
          minSets: setCountRange.min,
          maxSets: setCountRange.max,
          currentRPE,
          rpeCeiling,
        };
      }
    }
  }

  // Below minimum — must do more
  if (numCompleted < setCountRange.min) {
    return {
      advice: 'doAnother',
      reason: t('setCountAdvice.belowMinimum', { completed: numCompleted, min: setCountRange.min }),
      completedSets: numCompleted,
      minSets: setCountRange.min,
      maxSets: setCountRange.max,
      currentRPE,
      rpeCeiling,
    };
  }

  // Between min and max — optional
  return {
    advice: 'optional',
    reason: t('setCountAdvice.betweenMinMax', { completed: numCompleted, min: setCountRange.min, max: setCountRange.max }),
    completedSets: numCompleted,
    minSets: setCountRange.min,
    maxSets: setCountRange.max,
    currentRPE,
    rpeCeiling,
  };
}
