/**
 * Query Key Conventions:
 * - Entity-based keys: ['exercises'], ['plannedWorkouts'], ['workoutSessions']
 * - Filtered keys: ['workoutSessions', { from, to, workoutId }]
 * - Detail keys: ['workoutSessions', sessionId]
 * - Dashboard keys: ['dashboard', 'stats']
 * 
 * All hooks should be defined in src/hooks/queries/
 */

import { useQuery } from '@tanstack/react-query';

import { profileService } from '@/services/profileService';

export const onboardingKeys = {
  all: ['onboardingStatus'] as const,
};

export function useOnboardingStatus() {
  return useQuery({
    queryKey: onboardingKeys.all,
    queryFn: async () => {
      // profileService.getProfile returns first or undefined.
      // If it returns a profile, count is 1. Else 0.
      const profile = await profileService.getProfile();
      return !!profile;
    },
    staleTime: Infinity,
  });
}
