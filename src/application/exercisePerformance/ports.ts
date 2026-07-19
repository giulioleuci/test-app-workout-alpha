import type { HydratedHistorySession } from '@/application/history';
import type { PlannedSet, SessionExerciseGroup, SessionExerciseItem, WorkoutSession } from '@/domain/entities';

export interface ExercisePerformancePort {
  getHydratedSession(id: string): Promise<HydratedHistorySession | null>;
  findPreviousSessions(workoutId: string, plannedSessionId: string, before: Date): Promise<WorkoutSession[]>;
  getHydratedSessions(sessions: WorkoutSession[]): Promise<HydratedHistorySession[]>;
  getPlannedSets(itemId: string): Promise<PlannedSet[]>;
  getItem(id: string): Promise<SessionExerciseItem | undefined>;
  getGroup(id: string): Promise<SessionExerciseGroup | undefined>;
  getSession(id: string): Promise<WorkoutSession | undefined>;
  updateItem(id: string, updates: Partial<SessionExerciseItem>): Promise<void>;
}
