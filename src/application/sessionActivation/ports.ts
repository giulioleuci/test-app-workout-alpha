import type { Exercise, PlannedExerciseGroup, PlannedExerciseItem, PlannedSession, PlannedSet, SessionExerciseGroup, SessionExerciseItem, SessionSet, WorkoutSession } from '@/domain/entities';

export interface SessionActivationPort {
  getPlannedSession(id: string): Promise<PlannedSession | undefined>;
  getPlannedGroups(sessionId: string): Promise<PlannedExerciseGroup[]>;
  getPlannedItems(groupId: string): Promise<PlannedExerciseItem[]>;
  getPlannedSets(itemId: string): Promise<PlannedSet[]>;
  getSubstitutions(itemId: string): Promise<{ originalExerciseId: string; substitutedExerciseId: string; createdAt: Date }[]>;
  getExercise(id: string): Promise<Exercise | undefined>;
  findActiveSession(): Promise<WorkoutSession | undefined>;
  getItemsByPlannedItem(itemId: string): Promise<SessionExerciseItem[]>;
  getItemsByExercise(exerciseId: string): Promise<SessionExerciseItem[]>;
  getGroupsByIds(ids: string[]): Promise<SessionExerciseGroup[]>;
  getGroups(sessionId: string): Promise<SessionExerciseGroup[]>;
  getItemsByGroups(groupIds: string[]): Promise<SessionExerciseItem[]>;
  getSets(itemId: string): Promise<SessionSet[]>;
  findLatestCompletedSessionFromIds(ids: string[]): Promise<WorkoutSession | undefined>;
  saveFullSession(session: WorkoutSession, groups: SessionExerciseGroup[], items: SessionExerciseItem[], sets: SessionSet[]): Promise<void>;
  findPendingSessionInfo(): Promise<PendingSessionInfo | null>;
}

export interface PendingSessionInfo { id: string; startedAt: Date; sessionName: string; }
export interface SessionFinisher { finishSession(id: string, completedAt: Date): Promise<void>; }
