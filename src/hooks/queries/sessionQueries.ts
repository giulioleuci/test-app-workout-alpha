import { useQuery } from '@tanstack/react-query';

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
  return useQuery({
    queryKey: exerciseKeys.history(exerciseId, { currentSessionId, plannedExerciseItemId, occurrenceIndex, filterSameWorkout }),
    queryFn: () => getGroupedHistory(exerciseId, currentSessionId, plannedExerciseItemId, occurrenceIndex, filterSameWorkout),
  });
}

export function useActiveSessionData(activeSessionId: string | null) {
  return useQuery({
    queryKey: sessionKeys.active(activeSessionId),
    queryFn: () => loadActiveSessionData(activeSessionId),
    enabled: !!activeSessionId,
    staleTime: 60 * 1000, // 1 minute
  });
}


export function useLoadSuggestions(context: LoadSuggestionContext) {
  return useQuery({
    queryKey: sessionKeys.suggestions(context.exerciseId, context),
    queryFn: () => getHydratedLoadSuggestions(context),
    enabled: !!context.exerciseId,
  });
}

export function usePerformanceTrend(exerciseId?: string, activeSessionId?: string) {
  return useQuery({
    queryKey: sessionKeys.performanceTrend(exerciseId!, activeSessionId!),
    queryFn: () => analyzeExercisePerformance(exerciseId!, activeSessionId!),
    enabled: !!exerciseId && !!activeSessionId,
  });
}

export function useHistoryDetail(sessionId?: string) {
  return useQuery({
    queryKey: sessionKeys.detail(sessionId!),
    queryFn: () => sessionId ? getHistoryDetail(sessionId) : null,
    enabled: !!sessionId,
  });
}

export function useHistoryList(page: number, pageSize: number) {
  return useQuery({
    queryKey: [...sessionKeys.history(), page, pageSize],
    queryFn: () => getHistoryPage(page, pageSize),
  });
}

export function useFilteredHistory(filters: HistoryFilters) {
  return useQuery({
    queryKey: sessionKeys.filteredHistory(filters),
    queryFn: () => getFilteredHistory(filters),
  });
}
