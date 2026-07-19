import type { Exercise, PlannedExerciseGroup, PlannedExerciseItem } from '@/domain/entities';

/** Persistence boundary for deriving a planned session's targeted muscles. */
export interface MuscleDeductionPort {
  getGroupsBySession(sessionId: string): Promise<PlannedExerciseGroup[]>;
  getItemsByGroups(groupIds: string[]): Promise<PlannedExerciseItem[]>;
  getExercisesByIds(exerciseIds: string[]): Promise<Exercise[]>;
}
