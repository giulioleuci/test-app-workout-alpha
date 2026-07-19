import type {
  SessionMutationExercisePort,
  SessionMutationPersistencePort,
} from '@/application/sessionMutation';
import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import { SessionRepository } from '@/db/repositories/SessionRepository';

export const sessionMutationPersistenceGateway: SessionMutationPersistencePort = {
  getItem: id => SessionRepository.getItem(id),
  getSetsByItem: id => SessionRepository.getSetsByItem(id),
  getGroup: id => SessionRepository.getGroup(id),
  swapExercise: (itemId, exerciseId, deleteSetIds, newSets, substitution) =>
    SessionRepository.swapExercise(itemId, exerciseId, deleteSetIds, newSets, substitution),
  getGroupsBySession: id => SessionRepository.getGroupsBySession(id),
  addGroupWithItemsAndSets: (group, items, sets) => SessionRepository.addGroupWithItemsAndSets(group, items, sets),
  removeExercise: id => SessionRepository.removeExercise(id),
  getItemsByGroup: id => SessionRepository.getItemsByGroup(id),
};

export const sessionMutationExerciseGateway: SessionMutationExercisePort = {
  getExerciseName: async id => (await ExerciseRepository.getById(id))?.name,
};
