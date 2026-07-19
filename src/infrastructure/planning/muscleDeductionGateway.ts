import type { MuscleDeductionPort } from '@/application/muscles';
import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import { WorkoutPlanRepository } from '@/db/repositories/WorkoutPlanRepository';

/** Dexie-backed implementation of planned-session muscle deduction reads. */
export const muscleDeductionGateway: MuscleDeductionPort = {
  getGroupsBySession: sessionId => WorkoutPlanRepository.getGroupsBySession(sessionId),
  getItemsByGroups: groupIds => WorkoutPlanRepository.getItemsByGroups(groupIds),
  getExercisesByIds: exerciseIds => ExerciseRepository.getByIds(exerciseIds),
};
