import { useLiveQuery } from 'dexie-react-hooks';

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
  const data = useLiveQuery(getDashboardStats);
  return { data, isLoading: data === undefined };
}

export function useConsistencyHeatmap(days = 365) {
  const data = useLiveQuery(() => getConsistencyHeatmap(days), [days]);
  return { data, isLoading: data === undefined };
}

export function useMuscleFreshness() {
  const data = useLiveQuery(getMuscleFreshness);
  return { data, isLoading: data === undefined };
}

export function useNextSessionSuggestion() {
  const data = useLiveQuery(getNextSessionSuggestionDetail);
  return { data, isLoading: data === undefined };
}

export function useLastWorkout() {
  const data = useLiveQuery(getLastWorkoutSummary);
  return { data, isLoading: data === undefined };
}

export function useUserProfile() {
  const data = useLiveQuery(async () => {
    const profile = await profileService.getProfile();
    return profile || null;
  });
  return { data, isLoading: data === undefined };
}

export function useWeightRecords() {
  const data = useLiveQuery(() => profileService.getBodyWeightRecords());
  return { data, isLoading: data === undefined };
}

export function useUserRegulation() {
  const data = useLiveQuery(async () => {
    const profile = await profileService.getRegulationProfile();
    return profile || { ...DEFAULT_REGULATION_PROFILE, updatedAt: new Date() };
  });
  return { data, isLoading: data === undefined };
}

export function useTrainingCalendar(month: Date) {
  const data = useLiveQuery(() => buildTrainingCalendar(month), [month.toISOString()]);
  return { data, isLoading: data === undefined };
}
