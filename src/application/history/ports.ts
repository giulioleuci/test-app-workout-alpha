import type { Exercise, PlannedSession, PlannedWorkout, SessionExerciseGroup, SessionExerciseItem, SessionSet, WorkoutSession } from '@/domain/entities';

export interface HydratedHistoryItem { item: SessionExerciseItem; exercise?: Exercise; sets: SessionSet[]; }
export interface HydratedHistoryGroup { group: SessionExerciseGroup; items: HydratedHistoryItem[]; }
export interface HydratedHistorySession { session: WorkoutSession; groups: HydratedHistoryGroup[]; }

export interface HistoryPort {
  countSessions(): Promise<number>;
  getPagedSessions(offset: number, limit: number): Promise<WorkoutSession[]>;
  getSessionEntities(ids: string[]): Promise<{ groups: SessionExerciseGroup[]; items: SessionExerciseItem[]; sets: SessionSet[] }>;
  getItemsByExercise(exerciseId: string): Promise<SessionExerciseItem[]>;
  getGroupsByIds(ids: string[]): Promise<SessionExerciseGroup[]>;
  getSessionsByIds(ids: string[]): Promise<WorkoutSession[]>;
  getSessionsByWorkout(workoutId: string): Promise<WorkoutSession[]>;
  getSessionsInDateRange(from: Date, to: Date): Promise<WorkoutSession[]>;
  getHydratedSession(id: string): Promise<HydratedHistorySession | null>;
  getWorkout(id: string): Promise<PlannedWorkout | undefined>;
  getPlannedSession(id: string): Promise<PlannedSession | undefined>;
  getRegulationProfile(): Promise<{ simpleMode?: boolean } | undefined>;
  getExercisesByIds(ids: string[]): Promise<Exercise[]>;
  deleteSessionCascade(id: string): Promise<void>;
  updateSession(id: string, updates: Partial<WorkoutSession>): Promise<number>;
  updateSet(id: string, updates: Partial<SessionSet>): Promise<void>;
  getSet(id: string): Promise<SessionSet | undefined>;
  deleteSet(id: string): Promise<void>;
  addSets(sets: SessionSet[]): Promise<void>;
  addGroupWithItemsAndSets(group: SessionExerciseGroup, items: SessionExerciseItem[], sets: SessionSet[]): Promise<void>;
  deleteItemCascade(itemId: string, groupId: string): Promise<void>;
  updateItem(itemId: string, updates: Partial<SessionExerciseItem>): Promise<void>;
  analyzeItemOnChange(itemId: string): Promise<void>;
}
