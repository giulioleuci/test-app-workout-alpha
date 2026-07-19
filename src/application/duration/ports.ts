import type {
  PlannedExerciseGroup,
  PlannedExerciseItem,
  PlannedSession,
  PlannedSet,
  PlannedWorkout,
} from '@/domain/entities';

export interface DurationGroupSource {
  group: PlannedExerciseGroup;
  items: { item: PlannedExerciseItem; sets: PlannedSet[] }[];
}

export interface DurationSessionSource {
  session: PlannedSession;
  groups: DurationGroupSource[];
}

export interface DurationWorkoutSource {
  workout: PlannedWorkout;
  sessions: DurationSessionSource[];
}

/** Persistence boundary for duration-estimation queries. */
export interface DurationPort {
  getItemWithSets(itemId: string): Promise<{ item: PlannedExerciseItem; sets: PlannedSet[] } | null>;
  getGroupWithItems(groupId: string): Promise<{ group: PlannedExerciseGroup; items: { item: PlannedExerciseItem; sets: PlannedSet[] }[] } | null>;
  getSessionSource(sessionId: string): Promise<DurationSessionSource | null>;
  getWorkoutSource(workoutId: string): Promise<DurationWorkoutSource | null>;
  getWorkoutSources(workouts: PlannedWorkout[]): Promise<DurationWorkoutSource[]>;
}
