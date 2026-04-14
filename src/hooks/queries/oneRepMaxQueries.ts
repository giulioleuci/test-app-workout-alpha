// src/hooks/queries/oneRepMaxQueries.ts
import { useQuery } from '@tanstack/react-query';

import { getGroupedData } from '@/services/oneRepMaxService';

import { oneRepMaxKeys } from './workoutQueries';

export { oneRepMaxKeys } from './workoutQueries';

export function useOneRepMaxData() {
  return useQuery({
    queryKey: oneRepMaxKeys.list(),
    queryFn: getGroupedData,
    staleTime: Infinity,
  });
}
