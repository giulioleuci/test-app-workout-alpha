import type { OneRepMaxRecordPort } from '@/application/oneRepMaxRecords';
import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import { OneRepMaxRepository } from '@/db/repositories/OneRepMaxRepository';
import { SessionRepository } from '@/db/repositories/SessionRepository';
import { UserProfileRepository } from '@/db/repositories/UserProfileRepository';

/** Dexie-backed storage for manually recorded and calculated one-rep max values. */
export const oneRepMaxRecordGateway: OneRepMaxRecordPort = {
  getExercises: () => ExerciseRepository.getAll(),
  getRecordsInDateRange: (from, to) => OneRepMaxRepository.getRecordsInDateRange(from, to),
  getBodyWeightRecords: (from, to) => UserProfileRepository.getBodyWeightRecords(from, to),
  putRecord: record => OneRepMaxRepository.put(record),
  deleteRecord: id => OneRepMaxRepository.delete(id),
  getLatestRecord: exerciseId => OneRepMaxRepository.getLatestForExercise(exerciseId),
  getRecordsForExercise: exerciseId => OneRepMaxRepository.getAllForExercise(exerciseId),
  getCompletedE1RMSetsForExercise: exerciseId => SessionRepository.getCompletedE1RMSetsForExercise(exerciseId),
};
