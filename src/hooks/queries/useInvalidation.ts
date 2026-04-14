import { useQueryClient } from '@tanstack/react-query';

import { analyticsKeys } from '@/hooks/queries/analyticsQueries';
import { dashboardKeys } from '@/hooks/queries/dashboardQueries';
import { sessionKeys } from '@/hooks/queries/sessionQueries';
import { exerciseKeys, workoutKeys, weightRecordKeys } from '@/hooks/queries/workoutQueries';

export function useInvalidation() {
  const queryClient = useQueryClient();

  /**
   * Call after a workout session is finished, discarded, or when historical
   * session sets are edited. Refreshes: history list, analytics charts,
   * dashboard stats/suggestions, and workout rotation.
   */
  const invalidateSessionContext = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: sessionKeys.all }),
      queryClient.invalidateQueries({ queryKey: analyticsKeys.all }),
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
      queryClient.invalidateQueries({ queryKey: workoutKeys.all }),
    ]);

  /**
   * Call after planning changes: session structure edits, workout
   * activate/deactivate/archive/restore/remove/update/create.
   * Refreshes: workout list and dashboard session suggestions.
   */
  const invalidateWorkoutContext = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: workoutKeys.all }),
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
    ]);

  /**
   * Call after exercise save or delete.
   * Refreshes: exercise catalog and muscle-group analytics aggregations.
   */
  const invalidateExerciseContext = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: exerciseKeys.all }),
      queryClient.invalidateQueries({ queryKey: analyticsKeys.all }),
    ]);

  /**
   * Call after profile, body weight, or regulation changes.
   * Refreshes: dashboard display and strength-to-weight analytics.
   */
  const invalidateUserContext = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: weightRecordKeys.all }),
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
      queryClient.invalidateQueries({ queryKey: analyticsKeys.all }),
    ]);

  /**
   * Call after onboarding — seeds the entire DB, cheapest to wipe all caches.
   */
  const invalidateAll = () => queryClient.invalidateQueries();

  return {
    invalidateSessionContext,
    invalidateWorkoutContext,
    invalidateExerciseContext,
    invalidateUserContext,
    invalidateAll,
  };
}
