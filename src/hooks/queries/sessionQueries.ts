import { useLiveQuery } from 'dexie-react-hooks';

import { getGroupedHistory } from '@/services/exerciseHistoryService';
import { type HistoryFilters } from '@/services/historyService';
import { getHydratedLoadSuggestions, type LoadSuggestionContext } from '@/services/loadSuggestionEngine';
import { analyzeExercisePerformance } from '@/services/performanceAnalyzer';
import { loadActiveSessionData } from '@/services/sessionLoaderService';

import { exerciseKeys } from './workoutQueries';

export const sessionKeys = {
  all: ['sessions'] as const,
  active: (id: string | null) => [...sessionKeys.all, 'active', id] as const,
  suggestions: (exerciseId: string, context: LoadSuggestionContext) => [...sessionKeys.all, 'suggestions', exerciseId, context] as const,
  performanceTrend: (exerciseId: string, sessionId: string) => [...sessionKeys.all, 'performance', exerciseId, sessionId] as const,
  historyPage: (page: number, pageSize: number) => [...sessionKeys.all, 'history', page, pageSize] as const,
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

