import type { ExerciseCatalogFilters, ExerciseCatalogPort } from '@/application/exercises';
import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import { SessionRepository } from '@/db/repositories/SessionRepository';
import type { ExerciseFilters } from '@/db/repositories/types';

/** Dexie-backed implementation of the exercise catalog port. */
export const exerciseCatalogGateway: ExerciseCatalogPort = {
  getAll: () => ExerciseRepository.getAll(),
  getById: id => ExerciseRepository.getById(id),
  getByIds: ids => ExerciseRepository.getByIds(ids),
  add: exercise => ExerciseRepository.add(exercise),
  put: exercise => ExerciseRepository.put(exercise),
  update: (id, changes) => ExerciseRepository.update(id, changes),
  smartDelete: id => ExerciseRepository.smartDelete(id),
  search: query => ExerciseRepository.search(query),
  getByCriteria: (filters: ExerciseCatalogFilters) => ExerciseRepository.getExercisesByCriteria(filters as ExerciseFilters),
  getCompletedItemsSince: since => SessionRepository.getCompletedItemsSince(since),
};
