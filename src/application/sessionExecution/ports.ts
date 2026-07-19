import type { CurrentTarget, LoadedGroup } from '@/domain/activeSessionTypes';
import type { SessionExerciseGroup, SessionExerciseItem, SessionSet, WorkoutSession } from '@/domain/entities';
import type { ExerciseGroupType } from '@/domain/enums';

export interface UnresolvedSet {
  set: SessionSet;
  exerciseName: string;
  groupIndex: string;
  itemIndex: string;
  setIndex: string;
}

export interface SessionExecutionPersistencePort {
  getLatestBodyWeight(): Promise<{ weight: number } | undefined>;
  getAutoStartRestTimer(): Promise<boolean | undefined>;
  updateSet(id: string, changes: Partial<SessionSet>): Promise<unknown>;
  bulkUpdateSets(updates: { key: string; changes: Partial<SessionSet> }[]): Promise<void>;
  getSetsByItem(itemId: string): Promise<SessionSet[]>;
  addSets(sets: SessionSet[]): Promise<unknown>;
  transaction<T>(work: () => Promise<T>): Promise<T>;
  getSession(id: string): Promise<WorkoutSession | undefined>;
  updateItem(id: string, changes: Partial<SessionExerciseItem>): Promise<unknown>;
  updateGroup(id: string, changes: Partial<SessionExerciseGroup>): Promise<unknown>;
}

export interface SessionMutationPort {
  swapExercise(itemId: string, exerciseId: string, plannedWorkoutId?: string): Promise<void>;
  addExercise(sessionId: string, exerciseId: string, index: number): Promise<unknown>;
  addSuperset(sessionId: string, exerciseIds: string[], index: number, groupType: ExerciseGroupType): Promise<unknown>;
  removeExercise(itemId: string): Promise<void>;
  validateSessionCompletion(sessionId: string): Promise<{ isValid: boolean; unresolvedSets: UnresolvedSet[] }>;
}

export interface SessionFinishingPort {
  finishSession(sessionId: string, completedAt: Date): Promise<void>;
  discardSession(sessionId: string): Promise<void>;
}

export type { CurrentTarget, LoadedGroup };
