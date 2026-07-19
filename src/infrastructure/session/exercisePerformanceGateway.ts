import type { ExercisePerformancePort } from '@/application/exercisePerformance';
import { SessionRepository } from '@/db/repositories/SessionRepository';
import { WorkoutPlanRepository } from '@/db/repositories/WorkoutPlanRepository';

/** Dexie-backed data and status updates for completed-session performance analysis. */
export const exercisePerformanceGateway: ExercisePerformancePort = {
  getHydratedSession: id => SessionRepository.getHydratedSession(id),
  findPreviousSessions: (workoutId, plannedSessionId, before) => SessionRepository.findPreviousSessionsForPerformance(workoutId, plannedSessionId, before, 1),
  getHydratedSessions: sessions => SessionRepository.getHydratedSessions(sessions),
  async getPlannedSets(itemId) { const item = await WorkoutPlanRepository.getItem(itemId); return item ? WorkoutPlanRepository.getSetsByItem(item.id) : []; },
  getItem: id => SessionRepository.getItem(id), getGroup: id => SessionRepository.getGroup(id), getSession: id => SessionRepository.getSession(id), updateItem: (id, updates) => SessionRepository.updateItem(id, updates),
};
