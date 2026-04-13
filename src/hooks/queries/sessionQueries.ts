import { useLiveQuery } from 'dexie-react-hooks';

import { getGroupedHistory } from '@/services/exerciseHistoryService';
import { getHistoryPage, getHistoryDetail, getFilteredHistory, type HistoryFilters } from '@/services/historyService';
import { getHydratedLoadSuggestions, type LoadSuggestionContext } from '@/services/loadSuggestionEngine';
import { analyzeExercisePerformance } from '@/services/performanceAnalyzer';
import { loadActiveSessionData } from '@/services/sessionLoaderService';

import { exerciseKeys } from './workoutQueries';

export const sessionKeys = {
  all: ['sessions'] as const,
  active: (id: string | null) => [...sessionKeys.all, 'active', id] as const,
  suggestions: (exerciseId: string, context: LoadSuggestionContext) => [...sessionKeys.all, 'suggestions', exerciseId, context] as const,
  performanceTrend: (exerciseId: string, sessionId: string) => [...sessionKeys.all, 'performance', exerciseId, sessionId] as const,
  history: () => [...sessionKeys.all, 'history'] as const,
  detail: (id: string) => [...sessionKeys.all, 'detail', id] as const,
  filteredHistory: (filters: HistoryFilters) => [...sessionKeys.all, 'filteredHistory', filters] as const,
};

export function useExerciseHistory(exerciseId: string, currentSessionId: string, plannedExerciseItemId?: string, occurrenceIndex?: number, filterSameWorkout?: boolean) {
  const data = useLiveQuery(
    () => getGroupedHistory(exerciseId, currentSessionId, plannedExerciseItemId, occurrenceIndex, filterSameWorkout),
    [exerciseId, currentSessionId, plannedExerciseItemId, occurrenceIndex, filterSameWorkout]
  );
  return { data, isLoading: data === undefined };
}

export function useActiveSessionData(activeSessionId: string | null) {
  const data = useLiveQuery(
    () => activeSessionId ? loadActiveSessionData(activeSessionId) : Promise.resolve(null),
    [activeSessionId]
  );
  return { data, isLoading: data === undefined && !!activeSessionId };
}

export function useLoadSuggestions(context: LoadSuggestionContext) {
  const data = useLiveQuery(
    () => context.exerciseId ? getHydratedLoadSuggestions(context) : Promise.resolve(null),
    [JSON.stringify(context)]
  );
  return { data, isLoading: data === undefined && !!context.exerciseId };
}

export function usePerformanceTrend(exerciseId?: string, activeSessionId?: string) {
  const data = useLiveQuery(
    () => (exerciseId && activeSessionId) ? analyzeExercisePerformance(exerciseId, activeSessionId) : Promise.resolve(null),
    [exerciseId, activeSessionId]
  );
  return { data, isLoading: data === undefined && !!exerciseId && !!activeSessionId };
}

export function useHistoryDetail(sessionId?: string) {
  const data = useLiveQuery(
    () => sessionId ? getHistoryDetail(sessionId) : Promise.resolve(null),
    [sessionId]
  );
  return { data, isLoading: data === undefined && !!sessionId };
}

export function useHistoryList(page: number, pageSize: number) {
  const data = useLiveQuery(
    () => getHistoryPage(page, pageSize),
    [page, pageSize]
  );
  return { data, isLoading: data === undefined };
}

export function useFilteredHistory(filters: HistoryFilters) {
  const data = useLiveQuery(
    () => getFilteredHistory(filters),
    [JSON.stringify(filters)]
  );
  return { data, isLoading: data === undefined };
}
