// src/hooks/queries/oneRepMaxQueries.ts
import { useQuery } from '@tanstack/react-query';

import { getGroupedData, OneRepMaxService } from '@/services/oneRepMaxService';

import { oneRepMaxKeys } from './workoutQueries';

export { oneRepMaxKeys } from './workoutQueries';

export function useOneRepMaxData() {
  return useQuery({
    queryKey: oneRepMaxKeys.list(),
    queryFn: getGroupedData,
    staleTime: Infinity,
  });
}

export function usePrioritized1RM(exerciseId?: string) {
  return useQuery({
    queryKey: [...oneRepMaxKeys.all, 'prioritized', exerciseId] as const,
    queryFn: () => OneRepMaxService.getPrioritized1RM(exerciseId!),
    enabled: !!exerciseId && exerciseId !== 'all',
    staleTime: Infinity,
  });
}
