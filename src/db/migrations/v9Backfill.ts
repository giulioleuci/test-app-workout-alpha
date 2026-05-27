/**
 * Pure calculation helpers for the v9 schema backfill.
 *
 * The Dexie upgrade in database.ts owns orchestration (reading/writing tables);
 * the domain math lives here so it is unit-testable with plain inputs.
 */
import { RPE_MIN, RPE_MAX, SECONDS_PER_MINUTE } from '@/domain/constants';
import { calculateWeighted1RM } from '@/services/rpePercentageTable';

interface BackfillSet {
  e1rm?: number;
  actualLoad?: number | null;
  actualCount?: number | null;
  actualRPE?: number | null;
  isCompleted?: boolean;
  sessionExerciseItemId: string;
}

interface MuscleSnapshot {
  counterType?: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
}

export interface SessionTotals {
  totalSets: number;
  totalLoad: number;
  totalReps: number;
  totalDuration: number;
  primaryMuscles: string[];
  secondaryMuscles: string[];
}

/**
 * Estimated 1RM to backfill for a legacy set, or undefined when it should be left as-is.
 */
export function backfillSetE1rm(set: BackfillSet): number | undefined {
  if (set.e1rm) return undefined;
  if (set.actualLoad == null || set.actualLoad <= 0) return undefined;
  if (set.actualCount == null || set.actualCount <= 0) return undefined;
  if (set.actualRPE == null || set.actualRPE < RPE_MIN || set.actualRPE > RPE_MAX) return undefined;

  const estimated = calculateWeighted1RM(set.actualLoad, set.actualCount, set.actualRPE).media;
  return estimated && estimated > 0 ? estimated : undefined;
}

/**
 * Aggregate per-session totals (sets/load/reps/duration/muscles) from completed sets.
 */
export function aggregateSessionTotals(
  sets: BackfillSet[],
  itemToGroup: Map<string, string>,
  groupToSession: Map<string, string>,
  itemToSnapshot: Map<string, MuscleSnapshot | undefined>,
): Map<string, SessionTotals> {
  const result = new Map<string, SessionTotals>();
  const primaryBySession = new Map<string, Set<string>>();
  const secondaryBySession = new Map<string, Set<string>>();

  for (const set of sets) {
    if (!set.isCompleted) continue;
    const groupId = itemToGroup.get(set.sessionExerciseItemId);
    if (!groupId) continue;
    const sessionId = groupToSession.get(groupId);
    if (!sessionId) continue;

    if (!result.has(sessionId)) {
      result.set(sessionId, {
        totalSets: 0, totalLoad: 0, totalReps: 0, totalDuration: 0,
        primaryMuscles: [], secondaryMuscles: [],
      });
      primaryBySession.set(sessionId, new Set());
      secondaryBySession.set(sessionId, new Set());
    }
    const sd = result.get(sessionId)!;

    sd.totalSets += 1;

    const snap = itemToSnapshot.get(set.sessionExerciseItemId);
    const counterType = snap ? snap.counterType : 'reps';
    const actualCount = set.actualCount || 0;
    const actualLoad = set.actualLoad || 0;

    if (counterType === 'seconds' || counterType === 'minutes' || counterType === 'time') {
      sd.totalDuration += (counterType === 'minutes') ? actualCount * SECONDS_PER_MINUTE : actualCount;
    } else if (counterType === 'reps') {
      sd.totalReps += actualCount;
      sd.totalLoad += (actualCount * actualLoad);
    }

    if (snap) {
      snap.primaryMuscles.forEach((m: string) => primaryBySession.get(sessionId)!.add(m));
      snap.secondaryMuscles.forEach((m: string) => secondaryBySession.get(sessionId)!.add(m));
    }
  }

  for (const [sessionId, sd] of result) {
    sd.totalLoad = Math.round(sd.totalLoad);
    sd.primaryMuscles = Array.from(primaryBySession.get(sessionId)!);
    sd.secondaryMuscles = Array.from(secondaryBySession.get(sessionId)!);
  }

  return result;
}
