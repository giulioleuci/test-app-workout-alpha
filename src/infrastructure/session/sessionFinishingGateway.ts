import type { SessionFinishingPort } from '@/application/sessionFinishing';
import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import { SessionRepository } from '@/db/repositories/SessionRepository';
import { UserProfileRepository } from '@/db/repositories/UserProfileRepository';

export const createSessionFinishingGateway = (
  analyzeSession: SessionFinishingPort['analyzeSession'],
): SessionFinishingPort => ({
  getGroups: id => SessionRepository.getGroupsBySession(id), getItems: id => SessionRepository.getItemsByGroup(id), getSets: id => SessionRepository.getSetsByItem(id), deleteSets: id => SessionRepository.deleteSetsByItem(id), deleteItem: id => SessionRepository.deleteItem(id), getExerciseVersion: id => ExerciseRepository.getLatestVersion(id), updateSet: (id, updates) => SessionRepository.updateSet(id, updates), updateItem: (id, updates) => SessionRepository.updateItem(id, updates), deleteGroup: id => SessionRepository.deleteGroup(id), updateGroup: (id, updates) => SessionRepository.updateGroup(id, updates), getLatestBodyWeight: () => UserProfileRepository.getLatestBodyWeight(), updateSession: (id, updates) => SessionRepository.updateSession(id, updates), completeSession: (id, at) => SessionRepository.completeSession(id, at), discardSession: id => SessionRepository.deleteSessionCascade(id), analyzeSession,
});
