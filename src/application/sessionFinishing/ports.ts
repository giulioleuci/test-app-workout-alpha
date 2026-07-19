import type { ExerciseVersion, SessionExerciseGroup, SessionExerciseItem, SessionSet } from '@/domain/entities';
import type { Muscle } from '@/domain/enums';

export interface SessionFinishingPort {
  getGroups(sessionId: string): Promise<SessionExerciseGroup[]>;
  getItems(groupId: string): Promise<SessionExerciseItem[]>;
  getSets(itemId: string): Promise<SessionSet[]>;
  deleteSets(itemId: string): Promise<void>;
  deleteItem(itemId: string): Promise<void>;
  getExerciseVersion(exerciseId: string): Promise<ExerciseVersion | undefined>;
  updateSet(id: string, updates: Partial<SessionSet>): Promise<void>;
  updateItem(id: string, updates: Partial<SessionExerciseItem>): Promise<void>;
  deleteGroup(id: string): Promise<void>;
  updateGroup(id: string, updates: Partial<SessionExerciseGroup>): Promise<void>;
  getLatestBodyWeight(): Promise<{ weight: number } | undefined>;
  updateSession(id: string, updates: { totalSets: number; totalLoad: number; totalReps: number; totalDuration: number; primaryMusclesSnapshot: Muscle[]; secondaryMusclesSnapshot: Muscle[] }): Promise<number>;
  completeSession(id: string, completedAt: Date): Promise<void>;
  discardSession(id: string): Promise<void>;
  analyzeSession(id: string): Promise<void>;
}
