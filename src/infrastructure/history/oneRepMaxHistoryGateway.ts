import type { OneRepMaxHistoryPort } from '@/application/oneRepMaxEstimates';
import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import { SessionRepository } from '@/db/repositories/SessionRepository';

/** Dexie-backed history reads for one-rep-max estimates. */
export const oneRepMaxHistoryGateway: OneRepMaxHistoryPort = {
  getExercises: () => ExerciseRepository.getAll(),
  getItemsByExercise: (exerciseId, options) => SessionRepository.getItemsByExercise(exerciseId, options),
  getSetsByItem: itemId => SessionRepository.getSetsByItem(itemId),
};
