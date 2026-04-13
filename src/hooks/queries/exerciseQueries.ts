// src/hooks/queries/exerciseQueries.ts
import { useQuery } from '@tanstack/react-query';

import {
  getAllExercises, getEnhancedExerciseCatalog, type ExerciseCatalogOptions,
} from '@/services/exerciseService';

import { exerciseKeys } from './workoutQueries';

export { exerciseKeys } from './workoutQueries';

export function useExerciseList() {
  return useQuery({
    queryKey: exerciseKeys.list(),
    queryFn: getAllExercises,
    staleTime: Infinity,
  });
}

export function useEnhancedExerciseCatalog(options?: ExerciseCatalogOptions) {
  return useQuery({
    queryKey: exerciseKeys.catalog(options),
    queryFn: () => getEnhancedExerciseCatalog(options),
    staleTime: Infinity,
  });
}
