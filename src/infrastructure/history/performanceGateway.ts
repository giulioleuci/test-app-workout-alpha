import type { PerformancePort } from '@/application/performance';
import { SessionRepository } from '@/db/repositories/SessionRepository';

/** Dexie-backed reads required by performance analysis. */
export const performanceGateway: PerformancePort = {
  getSession: id => SessionRepository.getSession(id),
  getSessionEntities: ids => SessionRepository.getSessionEntities(ids),
  getItemsByExercise: (exerciseId, options) => SessionRepository.getItemsByExercise(exerciseId, options),
  getGroupsByIds: ids => SessionRepository.getGroupsByIds(ids),
  getSessionsByIds: ids => SessionRepository.getSessionsByIds(ids),
  getSetsByItems: ids => SessionRepository.getSetsByItems(ids),
};
