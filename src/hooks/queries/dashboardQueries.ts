// src/hooks/queries/dashboardQueries.ts
import { useQuery } from '@tanstack/react-query';

import { dashboardCommands } from '@/composition/dashboard';
import { profileCommands } from '@/composition/profile';
import { sessionRotationCommands } from '@/composition/sessionRotation';
import { DEFAULT_REGULATION_PROFILE } from '@/domain/entities';

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
  weightRecords: () => [...weightRecordKeys.all] as const,
};

export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: () => dashboardCommands.getDashboardStats(),
    staleTime: Infinity,
  });
}

export function useConsistencyHeatmap(days = 365) {
  return useQuery({
    queryKey: dashboardKeys.heatmap(days),
    queryFn: () => dashboardCommands.getConsistencyHeatmap(days),
    staleTime: Infinity,
  });
}

export function useMuscleFreshness() {
  return useQuery({
    queryKey: dashboardKeys.muscleFreshness(),
    queryFn: () => dashboardCommands.getMuscleFreshness(),
    staleTime: Infinity,
  });
}

export function useNextSessionSuggestion() {
  return useQuery({
    queryKey: dashboardKeys.suggestion(),
    queryFn: () => sessionRotationCommands.getNextSessionSuggestionDetail(),
    staleTime: Infinity,
  });
}

export function useLastWorkout() {
  return useQuery({
    queryKey: dashboardKeys.lastWorkout(),
    queryFn: () => dashboardCommands.getLastWorkoutSummary(),
    staleTime: Infinity,
  });
}

export function useUserProfile() {
  return useQuery({
    queryKey: dashboardKeys.profile(),
    queryFn: async () => {
      const profile = await profileCommands.getProfile();
      return profile || null;
    },
    staleTime: Infinity,
  });
}

export function useWeightRecords() {
  return useQuery({
    queryKey: dashboardKeys.weightRecords(),
    queryFn: () => profileCommands.getBodyWeightRecords(),
    staleTime: Infinity,
  });
}

export function useUserRegulation() {
  return useQuery({
    queryKey: dashboardKeys.regulation(),
    queryFn: async () => {
      const profile = await profileCommands.getRegulationProfile();
      return profile || { ...DEFAULT_REGULATION_PROFILE, updatedAt: new Date() };
    },
    staleTime: Infinity,
  });
}

export function useTrainingCalendar(month: Date) {
  return useQuery({
    queryKey: [...dashboardKeys.all, 'calendar', month],
    queryFn: () => dashboardCommands.buildTrainingCalendar(month),
    staleTime: Infinity,
  });
}
