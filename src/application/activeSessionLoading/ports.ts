import type { Exercise, PlannedExerciseGroup, PlannedExerciseItem, PlannedSession, PlannedSet, PlannedWorkout, SessionExerciseGroup, SessionExerciseItem, SessionSet, WorkoutSession } from '@/domain/entities';
export interface ActiveSessionLoadingPort {
  getHydratedSession(id: string): Promise<{ session: WorkoutSession; groups: { group: SessionExerciseGroup; items: { item: SessionExerciseItem; exercise: Exercise; sets: SessionSet[] }[] }[] } | null>;
  getRegulationProfile(): Promise<{ simpleMode?: boolean } | undefined>;
  getPlannedSession(id: string): Promise<PlannedSession | undefined>; getPlannedWorkout(id: string): Promise<PlannedWorkout | undefined>;
  getPlannedGroups(ids: string[]): Promise<(PlannedExerciseGroup | undefined)[]>; getPlannedItems(ids: string[]): Promise<(PlannedExerciseItem | undefined)[]>; getPlannedSets(ids: string[]): Promise<PlannedSet[]>;
}
