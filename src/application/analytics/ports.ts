import type {
  BodyWeightRecord,
  Exercise,
  ExerciseVersion,
  OneRepMaxRecord,
  PlannedWorkout,
  SessionExerciseGroup,
  SessionExerciseItem,
  SessionSet,
  WorkoutSession,
} from '@/domain/entities';

export interface AnalyticsPort {
  getSessionsInDateRange(
    from: Date,
    to: Date,
    options?: { completedOnly?: boolean; workoutId?: string; sessionId?: string },
  ): Promise<WorkoutSession[]>;
  getSessionEntities(ids: string[]): Promise<{
    groups: SessionExerciseGroup[];
    items: SessionExerciseItem[];
    sets: SessionSet[];
  }>;
  getExercisesByIds(ids: string[]): Promise<Exercise[]>;
  getExerciseVersionsByIds(ids: string[]): Promise<ExerciseVersion[]>;
  getOneRepMaxRecordsInDateRange(from: Date, to: Date): Promise<OneRepMaxRecord[]>;
  getBodyWeightRecords(from: Date, to: Date): Promise<BodyWeightRecord[]>;
  getActiveWorkouts(): Promise<PlannedWorkout[]>;
  getSessionCountByWorkout(workoutId: string): Promise<number>;
}

export interface OneRepMaxHistoryEstimator {
  estimateAllFromHistory(): Promise<Record<string, number | undefined>>;
}
