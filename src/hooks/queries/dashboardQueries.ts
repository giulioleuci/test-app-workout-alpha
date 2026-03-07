import { useQuery } from '@tanstack/react-query';

import { DEFAULT_REGULATION_PROFILE } from '@/domain/entities';
import { 
  getLastWorkoutSummary, 
  buildTrainingCalendar, 
  getDashboardStats,
  getConsistencyHeatmap,
  getMuscleFreshness
} from '@/services/dashboardService';
import { profileService } from '@/services/profileService';
import { getNextSessionSuggestionDetail } from '@/services/sessionRotation';

import { weightRecordKeys } from './workoutQueries';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  suggestion: () => [...dashboardKeys.all, 'suggestion'] as const,
  lastWorkout: () => [...dashboardKeys.all, 'lastWorkout'] as const,
  profile: () => [...dashboardKeys.all, 'profile'] as const,
  regulation: () => [...dashboardKeys.all, 'regulation'] as const,
  heatmap: (days: number) => [...dashboardKeys.all, 'heatmap', days] as const,
  muscleFreshness: () => [...dashboardKeys.all, 'muscleFreshness'] as const,
};

export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: getDashboardStats,
  });
}

export function useConsistencyHeatmap(days = 365) {
  return useQuery({
    queryKey: dashboardKeys.heatmap(days),
    queryFn: () => getConsistencyHeatmap(days),
  });
}

export function useMuscleFreshness() {
  return useQuery({
    queryKey: dashboardKeys.muscleFreshness(),
    queryFn: getMuscleFreshness,
  });
}

export function useNextSessionSuggestion() {
  return useQuery({
    queryKey: dashboardKeys.suggestion(),
    queryFn: getNextSessionSuggestionDetail,
  });
}

export function useLastWorkout() {
  return useQuery({
    queryKey: dashboardKeys.lastWorkout(),
    queryFn: getLastWorkoutSummary,
  });
}

export function useUserProfile() {
  return useQuery({
    queryKey: dashboardKeys.profile(),
    queryFn: async () => {
      const profile = await profileService.getProfile();
      return profile || null;
    },
  });
}

export function useWeightRecords() {
  return useQuery({
    queryKey: weightRecordKeys.all,
    queryFn: () => profileService.getBodyWeightRecords(),
  });
}

export function useUserRegulation() {
  return useQuery({
    queryKey: dashboardKeys.regulation(),
    queryFn: async () => {
      const profile = await profileService.getRegulationProfile();
      return profile || { ...DEFAULT_REGULATION_PROFILE, updatedAt: new Date() };
    },
  });
}

export function useTrainingCalendar(month: Date) {
  return useQuery({
    queryKey: ['trainingCalendar', month, month.toISOString()],
    queryFn: () => buildTrainingCalendar(month),
  });
}
