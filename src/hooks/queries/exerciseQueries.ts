// src/hooks/queries/exerciseQueries.ts
import { useQuery } from '@tanstack/react-query';

import type { ExerciseCatalogOptions } from '@/application/exercises';
import { exerciseCommands } from '@/composition/exercises';

import { exerciseKeys } from './workoutQueries';

export { exerciseKeys } from './workoutQueries';

export function useExerciseList() {
  return useQuery({
    queryKey: exerciseKeys.list(),
    queryFn: () => exerciseCommands.getAllExercises(),
    staleTime: Infinity,
  });
}

export function useEnhancedExerciseCatalog(options?: ExerciseCatalogOptions) {
  return useQuery({
    queryKey: exerciseKeys.catalog(options),
    queryFn: () => exerciseCommands.getEnhancedExerciseCatalog(options),
    staleTime: Infinity,
  });
}
