import type { LoadSuggestionHistoryPort } from '@/application/loadSuggestions';
import { OneRepMaxRepository } from '@/db/repositories/OneRepMaxRepository';
import { SessionRepository } from '@/db/repositories/SessionRepository';
import { WorkoutPlanRepository } from '@/db/repositories/WorkoutPlanRepository';

/** Dexie-backed history reads used to build load-suggestion context. */
export const loadSuggestionHistoryGateway: LoadSuggestionHistoryPort = {
  getLastSetPerformance: plannedSetId => SessionRepository.getLastSetPerformance(plannedSetId),
  getLastPerformance: exerciseId => SessionRepository.getLastPerformance(exerciseId),
  getPlannedSet: plannedSetId => SessionRepository.getPlannedSet(plannedSetId),
  getSetsInSessionForExercise: (sessionId, exerciseId) =>
    SessionRepository.getSetsInSessionForExercise(sessionId, exerciseId),
  getBestOneRepMax: exerciseId => OneRepMaxRepository.getBestRecord(exerciseId),
  getUserRegulationProfile: () => SessionRepository.getUserRegulationProfile(),
  getPlannedExerciseItem: itemId => WorkoutPlanRepository.getItem(itemId),
};
