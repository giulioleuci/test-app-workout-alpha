import { useQuery } from '@tanstack/react-query';

import { getGroupedHistory } from '@/services/exerciseHistoryService';
import { type HistoryFilters } from '@/services/historyService';
import { getHydratedLoadSuggestions, type LoadSuggestionContext } from '@/services/loadSuggestionEngine';
import { analyzeExercisePerformance } from '@/services/performanceAnalyzer';
import { loadActiveSessionData } from '@/services/sessionLoaderService';

export const sessionKeys = {
  all: ['sessions'] as const,
  active: (id: string | null) => [...sessionKeys.all, 'active', id] as const,
  exerciseHistory: (exerciseId: string, sessionId: string, plannedExerciseItemId?: string, occurrenceIndex?: number, filterSameWorkout?: boolean) =>
    [...sessionKeys.all, 'exerciseHistory', exerciseId, sessionId, plannedExerciseItemId, occurrenceIndex, filterSameWorkout] as const,
  suggestions: (exerciseId: string, context: LoadSuggestionContext) => [...sessionKeys.all, 'suggestions', exerciseId, context] as const,
  performanceTrend: (exerciseId: string, sessionId: string) => [...sessionKeys.all, 'performance', exerciseId, sessionId] as const,
  historyPage: (page: number, pageSize: number) => [...sessionKeys.all, 'history', page, pageSize] as const,
  detail: (id: string) => [...sessionKeys.all, 'detail', id] as const,
  filteredHistory: (filters: HistoryFilters) => [...sessionKeys.all, 'filteredHistory', filters] as const,
  oneRepMax: (exerciseId: string) => [...sessionKeys.all, 'oneRepMax', exerciseId] as const,
};

export function useExerciseHistory(exerciseId: string, currentSessionId: string, plannedExerciseItemId?: string, occurrenceIndex?: number, filterSameWorkout?: boolean) {
  const { data, isLoading } = useQuery({
    queryKey: sessionKeys.exerciseHistory(exerciseId, currentSessionId, plannedExerciseItemId, occurrenceIndex, filterSameWorkout),
    queryFn: () => getGroupedHistory(exerciseId, currentSessionId, plannedExerciseItemId, occurrenceIndex, filterSameWorkout),
    enabled: !!exerciseId && !!currentSessionId,
    staleTime: 0,
  });
  return { data, isLoading };
}

export function useActiveSessionData(activeSessionId: string | null) {
  const { data, isLoading } = useQuery({
    queryKey: sessionKeys.active(activeSessionId),
    queryFn: () => loadActiveSessionData(activeSessionId!),
    enabled: !!activeSessionId,
    staleTime: 0,
  });
  return { data: data ?? null, isLoading: isLoading && !!activeSessionId };
}

export function useLoadSuggestions(context: LoadSuggestionContext) {
  const { data, isLoading } = useQuery({
    queryKey: sessionKeys.suggestions(context.exerciseId ?? '', context),
    queryFn: () => getHydratedLoadSuggestions(context),
    enabled: !!context.exerciseId,
    staleTime: 0,
  });
  return { data: data ?? null, isLoading: isLoading && !!context.exerciseId };
}

export function usePerformanceTrend(exerciseId?: string, activeSessionId?: string) {
  const { data, isLoading } = useQuery({
    queryKey: sessionKeys.performanceTrend(exerciseId ?? '', activeSessionId ?? ''),
    queryFn: () => analyzeExercisePerformance(exerciseId!, activeSessionId!),
    enabled: !!exerciseId && !!activeSessionId,
    staleTime: 0,
  });
  return { data: data ?? null, isLoading: isLoading && !!exerciseId && !!activeSessionId };
}
