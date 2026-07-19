import type { AnalyticsPort } from '@/application/analytics';
import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import { OneRepMaxRepository } from '@/db/repositories/OneRepMaxRepository';
import { SessionRepository } from '@/db/repositories/SessionRepository';
import { UserProfileRepository } from '@/db/repositories/UserProfileRepository';
import { WorkoutPlanRepository } from '@/db/repositories/WorkoutPlanRepository';

/** Dexie-backed reads required by analytics use cases. */
export const analyticsGateway: AnalyticsPort = {
  getSessionsInDateRange: (from, to, options) => SessionRepository.getSessionsInDateRange(from, to, options),
  getSessionEntities: ids => SessionRepository.getSessionEntities(ids),
  getExercisesByIds: ids => ExerciseRepository.getByIds(ids),
  getExerciseVersionsByIds: ids => ExerciseRepository.getVersionsByIds(ids),
  getOneRepMaxRecordsInDateRange: (from, to) => OneRepMaxRepository.getRecordsInDateRange(from, to),
  getBodyWeightRecords: (from, to) => UserProfileRepository.getBodyWeightRecords(from, to),
  getActiveWorkouts: () => WorkoutPlanRepository.getActiveWorkouts(),
  getSessionCountByWorkout: id => WorkoutPlanRepository.getSessionCountByWorkout(id),
};
