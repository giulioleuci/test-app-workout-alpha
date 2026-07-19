import type { PlannedSession, SessionExerciseGroup, SessionExerciseItem, SessionSet, WorkoutSession } from '@/domain/entities';

export interface ExerciseHistoryPort {
  getItemsByPlannedItem(id: string): Promise<SessionExerciseItem[]>;
  getItemsByExercise(id: string): Promise<SessionExerciseItem[]>;
  getGroupsByIds(ids: string[]): Promise<SessionExerciseGroup[]>;
  getSession(id: string): Promise<WorkoutSession | undefined>;
  getPlannedSession(id: string): Promise<PlannedSession | undefined>;
  getSetsByItems(ids: string[]): Promise<SessionSet[]>;
}
