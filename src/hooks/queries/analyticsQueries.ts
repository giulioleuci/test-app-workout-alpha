import { useQuery } from '@tanstack/react-query';

import { fetchAnalyticsData, getMuscleVolumeDistribution } from '@/services/analyticsService';
import { getExercisesByIds } from '@/services/exerciseService';
import { getAllWorkouts, getWorkoutSessions, getWorkoutSessionGroups, getWorkoutGroupItems } from '@/services/workoutService';

export const analyticsKeys = {
  all: ['analytics'] as const,
  filters: (filters: any) => [...analyticsKeys.all, 'data', filters] as const,
  workouts: () => [...analyticsKeys.all, 'workouts'] as const,
  sessions: (workoutId?: string) => [...analyticsKeys.all, 'sessions', { workoutId }] as const,
  groups: (sessionId?: string) => [...analyticsKeys.all, 'groups', { sessionId }] as const,
  items: (groupId?: string) => [...analyticsKeys.all, 'items', { groupId }] as const,
  muscleVolume: (from: Date, to: Date, workoutId?: string) => [...analyticsKeys.all, 'muscleVolume', from, to, workoutId] as const,
};

export function useAnalyticsData(filters: {
  fromDate: Date;
  toDate: Date;
  workoutId?: string;
  sessionId?: string;
  plannedGroupId?: string;
  plannedExerciseItemId?: string;
}) {
  return useQuery({
    queryKey: analyticsKeys.filters(filters),
    queryFn: () => fetchAnalyticsData(
      filters.fromDate,
      filters.toDate,
      filters.workoutId,
      filters.sessionId,
      filters.plannedGroupId,
      filters.plannedExerciseItemId
    ),
  });
}

export function useAnalyticsWorkouts() {
  return useQuery({
    queryKey: analyticsKeys.workouts(),
    queryFn: () => getAllWorkouts(),
  });
}

export function useAnalyticsSessions(workoutId?: string) {
  return useQuery({
    queryKey: analyticsKeys.sessions(workoutId),
    queryFn: () => workoutId
      ? getWorkoutSessions(workoutId)
      : Promise.resolve([]),
    enabled: !!workoutId,
  });
}

export function useAnalyticsGroups(sessionId?: string) {
  return useQuery({
    queryKey: analyticsKeys.groups(sessionId),
    queryFn: () => sessionId
      ? getWorkoutSessionGroups(sessionId)
      : Promise.resolve([]),
    enabled: !!sessionId,
  });
}

export function useAnalyticsItems(groupId?: string) {
  return useQuery({
    queryKey: analyticsKeys.items(groupId),
    queryFn: async () => {
      if (!groupId) return [];
      const items = await getWorkoutGroupItems(groupId);
      const exIds = items.map(i => i.exerciseId);
      const exercises = await getExercisesByIds(exIds);
      const exMap = new Map(exercises.filter(Boolean).map(e => [e.id, e]));
      return items.map(i => ({ ...i, exercise: exMap.get(i.exerciseId) }));
    },
    enabled: !!groupId,
  });
}

export function useMuscleVolumeDistribution(from: Date, to: Date, workoutId?: string) {
  return useQuery({
    queryKey: analyticsKeys.muscleVolume(from, to, workoutId),
    queryFn: () => getMuscleVolumeDistribution(from, to, workoutId),
  });
}
