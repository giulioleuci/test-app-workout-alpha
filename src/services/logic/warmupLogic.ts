// src/services/logic/warmupLogic.ts
/**
 * Pure warmup scheme logic.
 * No DB access. Caller provides exerciseType, isFirst, bodyWeightRatio.
 */

export type WarmupExerciseType = 'compound_upper' | 'compound_lower' | 'isolation';

export interface WarmupInput {
  exerciseType: WarmupExerciseType;
  isFirst: boolean;
  /** workingWeight / bodyWeight, or null if bodyWeight unknown */
  bodyWeightRatio: number | null;
}

export interface WarmupSetSpec {
  percent: number;
  reps: number;
}

export function buildWarmupScheme(input: WarmupInput): WarmupSetSpec[] {
  const { exerciseType, isFirst, bodyWeightRatio } = input;

  if (exerciseType === 'isolation') {
    return isFirst
      ? [{ percent: 60, reps: 8 }, { percent: 80, reps: 3 }]
      : [{ percent: 60, reps: 8 }];
  }

  const highThreshold = exerciseType === 'compound_lower' ? 1.25 : 1.0;
  const medThreshold = exerciseType === 'compound_lower' ? 0.75 : 0.5;

  const highStress = bodyWeightRatio === null || bodyWeightRatio >= highThreshold;
  const medStress = !highStress && bodyWeightRatio !== null && bodyWeightRatio >= medThreshold;

  let scheme: WarmupSetSpec[];
  if (highStress) {
    scheme = [{ percent: 50, reps: 6 }, { percent: 70, reps: 4 }, { percent: 85, reps: 2 }];
  } else if (medStress) {
    scheme = [{ percent: 60, reps: 5 }, { percent: 80, reps: 3 }];
  } else {
    scheme = [{ percent: 65, reps: 5 }];
  }

  return !isFirst && scheme.length > 1 ? scheme.slice(1) : scheme;
}
