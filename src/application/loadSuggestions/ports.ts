import type { PlannedExerciseItem, PlannedSet, SessionSet } from '@/domain/entities';

export interface LoadSuggestionHistoryPort {
  getLastSetPerformance(plannedSetId: string): Promise<SessionSet | null>;
  getLastPerformance(exerciseId: string): Promise<{ load: number; reps: number; rpe: number } | null>;
  getPlannedSet(plannedSetId: string): Promise<PlannedSet | undefined>;
  getSetsInSessionForExercise(sessionId: string, exerciseId: string): Promise<SessionSet[]>;
  getBestOneRepMax(exerciseId: string): Promise<{
    value: number;
    valueMin?: number;
    valueMax?: number;
    method: string;
  } | undefined>;
  getUserRegulationProfile(): Promise<{ simpleMode?: boolean } | undefined>;
  getPlannedExerciseItem(itemId: string): Promise<PlannedExerciseItem | undefined>;
}
