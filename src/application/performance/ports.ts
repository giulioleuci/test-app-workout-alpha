import type { SessionExerciseGroup, SessionExerciseItem, SessionSet, WorkoutSession } from '@/domain/entities';

export interface PerformancePort {
  getSession(id: string): Promise<WorkoutSession | undefined>;
  getSessionEntities(ids: string[]): Promise<{ items: SessionExerciseItem[]; sets: SessionSet[] }>;
  getItemsByExercise(exerciseId: string, options: { toDate: Date; desc: boolean; limit: number }): Promise<SessionExerciseItem[]>;
  getGroupsByIds(ids: string[]): Promise<SessionExerciseGroup[]>;
  getSessionsByIds(ids: string[]): Promise<WorkoutSession[]>;
  getSetsByItems(ids: string[]): Promise<SessionSet[]>;
}

export interface PerformanceEstimatePort { estimateFromHistoryForExercise(exerciseId: string): Promise<number | undefined>; }
