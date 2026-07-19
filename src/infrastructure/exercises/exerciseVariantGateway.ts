import type { ExerciseVariantPort } from '@/application/exerciseVariants';
import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';

/** Dexie-backed implementation of the exercise-variant port. */
export const exerciseVariantGateway: ExerciseVariantPort = {
  getById: id => ExerciseRepository.getById(id),
  getByIds: ids => ExerciseRepository.getByIds(ids),
  getAll: () => ExerciseRepository.getAll(),
  update: (id, changes) => ExerciseRepository.update(id, changes),
};
