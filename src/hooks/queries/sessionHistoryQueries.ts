// src/hooks/queries/sessionHistoryQueries.ts
/**
 * TanStack useQuery hooks for session HISTORY (completed sessions).
 *
 * Active-session hooks (useActiveSessionData, useLoadSuggestions,
 * useExerciseHistory, usePerformanceTrend) remain in sessionQueries.ts
 * with useLiveQuery for sub-second reactivity during live workout logging.
 */
import { useQuery } from '@tanstack/react-query';

import type { HistoryFilters } from '@/application/history';
import { historyCommands } from '@/composition/history';

import { sessionKeys } from './sessionQueries';

export { sessionKeys } from './sessionQueries';

export function useHistoryList(page: number, pageSize: number) {
  return useQuery({
    queryKey: sessionKeys.historyPage(page, pageSize),
    queryFn: () => historyCommands.getHistoryPage(page, pageSize),
    staleTime: Infinity,
  });
}

export function useHistoryDetail(sessionId?: string) {
  return useQuery({
    queryKey: sessionKeys.detail(sessionId ?? ''),
    queryFn: () => historyCommands.getHistoryDetail(sessionId!),
    enabled: !!sessionId,
    staleTime: Infinity,
  });
}

export function useFilteredHistory(filters: HistoryFilters) {
  return useQuery({
    queryKey: sessionKeys.filteredHistory(filters),
    queryFn: () => historyCommands.getFilteredHistory(filters),
    staleTime: Infinity,
  });
}
