import type { SessionExecutionPersistencePort } from '@/application/sessionExecution';
import { SessionRepository } from '@/db/repositories/SessionRepository';
import { UserProfileRepository } from '@/db/repositories/UserProfileRepository';

/** Dexie-backed persistence adapter for active session execution. */
export const sessionExecutionGateway: SessionExecutionPersistencePort = {
  getLatestBodyWeight: () => UserProfileRepository.getLatestBodyWeight(),
  getAutoStartRestTimer: async () => (await UserProfileRepository.getRegulationProfile())?.autoStartRestTimer,
  updateSet: (id, changes) => SessionRepository.updateSet(id, changes),
  bulkUpdateSets: updates => SessionRepository.bulkUpdateSets(updates),
  getSetsByItem: id => SessionRepository.getSetsByItem(id),
  addSets: sets => SessionRepository.addSets(sets),
  transaction: work => SessionRepository.transaction(work),
  getSession: id => SessionRepository.getSession(id),
  updateItem: (id, changes) => SessionRepository.updateItem(id, changes),
  updateGroup: (id, changes) => SessionRepository.updateGroup(id, changes),
};
