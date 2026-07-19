import type { DeducedMuscles } from '@/application/muscles';
import type {
  Exercise,
  PlannedExerciseGroup,
  PlannedExerciseItem,
  PlannedSession,
  PlannedSet,
  PlannedWorkout,
  WorkoutSession,
} from '@/domain/entities';

export interface HydratedPlannedSession {
  session: PlannedSession;
  groups: {
    group: PlannedExerciseGroup;
    items: { item: PlannedExerciseItem; sets: PlannedSet[] }[];
  }[];
}

export interface WorkoutDataPort {
  getAllWorkouts(): Promise<PlannedWorkout[]>;
  getWorkout(id: string): Promise<PlannedWorkout | undefined>;
  addWorkout(workout: PlannedWorkout): Promise<string>;
  updateWorkout(id: string, changes: Partial<PlannedWorkout>): Promise<number>;
  getActiveWorkouts(): Promise<PlannedWorkout[]>;
  smartDeleteWorkout(id: string): Promise<void>;
  getSessionsByWorkout(workoutId: string): Promise<PlannedSession[]>;
  getSessionCountByWorkout(workoutId: string): Promise<number>;
  deleteSessionCascade(sessionId: string): Promise<void>;
  bulkUpsertSessions(sessions: PlannedSession[]): Promise<void>;
  updateSessionStructure(
    sessionId: string,
    updates: Partial<PlannedSession>,
    added: { groups: PlannedExerciseGroup[]; items: PlannedExerciseItem[]; sets: PlannedSet[] },
    removed: { removedGroupIds: string[]; removedItemIds: string[]; removedSetIds: string[] },
  ): Promise<void>;
  getGroupsBySession(sessionId: string): Promise<PlannedExerciseGroup[]>;
  getItemsByGroup(groupId: string): Promise<PlannedExerciseItem[]>;
  getHydratedPlannedSession(sessionId: string): Promise<HydratedPlannedSession | undefined>;
  getExercises(): Promise<Exercise[]>;
  getRegulationProfile(): Promise<{ simpleMode?: boolean } | undefined>;
  getCompletedSessionsByWorkout(workoutId: string): Promise<WorkoutSession[]>;
}

export interface WorkoutDurationPort {
  bulkEstimateWorkoutDurations(workouts: PlannedWorkout[]): Promise<Record<string, { minSeconds: number; maxSeconds: number }>>;
  estimateSessionDuration(sessionId: string): Promise<{ minSeconds: number; maxSeconds: number }>;
  estimateWorkoutDuration(workoutId: string): Promise<{ minSeconds: number; maxSeconds: number }>;
}

export interface WorkoutMusclePort {
  deduceSessionMuscles(sessionId: string): Promise<DeducedMuscles>;
}
