import type { HistoryPort } from '@/application/history';
import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import { SessionRepository } from '@/db/repositories/SessionRepository';
import { UserProfileRepository } from '@/db/repositories/UserProfileRepository';
import { WorkoutPlanRepository } from '@/db/repositories/WorkoutPlanRepository';

/** Dexie-backed reads and mutations for completed-session history. */
export const createSessionHistoryGateway = (
  analyzeItemOnChange: HistoryPort['analyzeItemOnChange'],
): HistoryPort => ({
  countSessions: () => SessionRepository.count(), getPagedSessions: (offset, limit) => SessionRepository.getPagedSessions(offset, limit), getSessionEntities: ids => SessionRepository.getSessionEntities(ids),
  getItemsByExercise: id => SessionRepository.getItemsByExercise(id), getGroupsByIds: ids => SessionRepository.getGroupsByIds(ids), getSessionsByIds: ids => SessionRepository.getSessionsByIds(ids), getSessionsByWorkout: id => SessionRepository.getSessionsByWorkout(id), getSessionsInDateRange: (from, to) => SessionRepository.getSessionsInDateRange(from, to),
  getHydratedSession: id => SessionRepository.getHydratedSession(id), getWorkout: id => WorkoutPlanRepository.getWorkout(id), getPlannedSession: id => WorkoutPlanRepository.getSession(id), getRegulationProfile: () => UserProfileRepository.getRegulationProfile(), getExercisesByIds: ids => ExerciseRepository.getByIds(ids),
  deleteSessionCascade: id => SessionRepository.deleteSessionCascade(id), updateSession: (id, updates) => SessionRepository.updateSession(id, updates), updateSet: (id, updates) => SessionRepository.updateSet(id, updates), getSet: id => SessionRepository.getSet(id), deleteSet: id => SessionRepository.deleteSet(id), addSets: sets => SessionRepository.addSets(sets), addGroupWithItemsAndSets: (group, items, sets) => SessionRepository.addGroupWithItemsAndSets(group, items, sets), deleteItemCascade: (itemId, groupId) => SessionRepository.deleteItemCascade(itemId, groupId), updateItem: (itemId, updates) => SessionRepository.updateItem(itemId, updates), analyzeItemOnChange,
});
