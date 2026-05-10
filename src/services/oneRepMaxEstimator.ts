import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import { SessionRepository } from '@/db/repositories/SessionRepository';
import { type HistoryEstimate } from '@/domain/analytics-types';
import dayjs from '@/lib/dayjs';
import { calculateWeighted1RM, suggestLoad } from '@/services/rpePercentageTable';

/**
 * For each exercise, find the most recent completed set with valid load, reps, and RPE,
 * then estimate 1RM using the RPE percentage table.
 * Returns a map of exerciseId → HistoryEstimate.
 */
export async function estimateAllFromHistory(): Promise<Record<string, HistoryEstimate>> {
  const result: Record<string, HistoryEstimate> = {};

  // 1. Load all exercises
  const exercises = await ExerciseRepository.getAll();

  // 2. For each exercise, find the latest valid set
  // We do this in parallel to speed up (limited batching could be better but this is fine for now)
  await Promise.all(exercises.map(async (ex) => {
    const fullEst = await fetchHistoryEstimateForExercise(ex.id, ex.defaultLoadUnit);
    if (fullEst) {
      result[ex.id] = fullEst;
    }
  }));

  return result;
}

async function fetchHistoryEstimateForExercise(exerciseId: string, unit: 'kg' | 'lbs'): Promise<HistoryEstimate | null> {
  // Find latest items for this exercise using compound index
  // We might need to scan back a few items if the latest one has no valid sets
  const items = await SessionRepository.getItemsByExercise(exerciseId, {
    toDate: dayjs().toDate(),
    desc: true,
    limit: 5 // Scan up to 5 latest sessions for valid data
  });

  for (const item of items) {
    const sets = await SessionRepository.getSetsByItem(item.id);
    const validSets = sets.filter(s =>
      s.isCompleted &&
      !s.isSkipped &&
      s.actualLoad != null && s.actualLoad > 0 &&
      s.actualCount != null && s.actualCount > 0 &&
      s.actualRPE != null && s.actualRPE >= 6 && s.actualRPE <= 10
    );

    if (validSets.length > 0) {
      // Pick the best (highest estimate) set in this item, or just the first?
      // Usually latest is best for "current" 1RM.
      validSets.sort((a, b) => (b.orderIndex - a.orderIndex));
      const bestSet = validSets[0];
      const estResult = calculateWeighted1RM(bestSet.actualLoad!, bestSet.actualCount!, bestSet.actualRPE!);
      const estimated = bestSet.e1rm ?? estResult.media;

      if (estimated && estimated > 0) {
        return {
          value: estimated,
          unit,
          load: bestSet.actualLoad!,
          reps: bestSet.actualCount!,
          rpe: bestSet.actualRPE!,
          date: item.completedAt || dayjs(0).toDate(),
        };
      }
    }
  }

  return null;
}

/** Estimate 1RM from the most recent valid completed set for an exercise */
export async function estimateFromHistoryForExercise(exerciseId: string): Promise<number | null> {
  const est = await fetchHistoryEstimateForExercise(exerciseId, 'kg');
  return est ? est.value : null;
}

/** Calculate XRM (load for X reps at RPE 10) */
export function calculateXRM(oneRepMax: number, reps: number): number | null {
  const result = suggestLoad(oneRepMax, reps, 10);
  return result ? result.media : null;
}
