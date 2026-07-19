// src/hooks/queries/analyticsQueries.ts
import { useQuery } from '@tanstack/react-query';

import { analyticsCommands } from '@/composition/analytics';
import { exerciseCommands } from '@/composition/exercises';
import { workoutCommands } from '@/composition/workouts';

export const analyticsKeys = {
  all: ['analytics'] as const,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filters: (filters: any) => [...analyticsKeys.all, 'data', filters] as const,
  workouts: () => [...analyticsKeys.all, 'workouts'] as const,
  sessions: (workoutId?: string) => [...analyticsKeys.all, 'sessions', { workoutId }] as const,
  groups: (sessionId?: string) => [...analyticsKeys.all, 'groups', { sessionId }] as const,
  items: (groupId?: string) => [...analyticsKeys.all, 'items', { groupId }] as const,
  muscleVolume: (from: Date, to: Date, workoutId?: string) => [...analyticsKeys.all, 'muscleVolume', from, to, workoutId] as const,
};

export function useAnalyticsData(filters: {
  fromDate: Date; toDate: Date; workoutId?: string; sessionId?: string;
  plannedGroupId?: string; plannedExerciseItemId?: string;
}) {
  return useQuery({
    queryKey: analyticsKeys.filters(filters),
    queryFn: () => analyticsCommands.fetchAnalyticsData(filters),
    staleTime: Infinity,
  });
}

export function useAnalyticsWorkouts() {
  return useQuery({
    queryKey: analyticsKeys.workouts(),
    queryFn: () => workoutCommands.getAllWorkouts(),
    staleTime: Infinity,
  });
}

export function useAnalyticsSessions(workoutId?: string) {
  return useQuery({
    queryKey: analyticsKeys.sessions(workoutId),
    queryFn: () => workoutId ? workoutCommands.getWorkoutSessions(workoutId) : Promise.resolve([]),
    enabled: !!workoutId,
    staleTime: Infinity,
  });
}

export function useAnalyticsGroups(sessionId?: string) {
  return useQuery({
    queryKey: analyticsKeys.groups(sessionId),
    queryFn: () => sessionId ? workoutCommands.getWorkoutSessionGroups(sessionId) : Promise.resolve([]),
    enabled: !!sessionId,
    staleTime: Infinity,
  });
}

export function useAnalyticsItems(groupId?: string) {
  return useQuery({
    queryKey: analyticsKeys.items(groupId),
    queryFn: async () => {
      if (!groupId) return [];
      const items = await workoutCommands.getWorkoutGroupItems(groupId);
      const exIds = items.map(i => i.exerciseId);
      const exercises = await exerciseCommands.getExercisesByIds(exIds);
      const exMap = new Map(exercises.filter(Boolean).map(e => [e.id, e]));
      return items.map(i => ({ ...i, exercise: exMap.get(i.exerciseId) }));
    },
    enabled: !!groupId,
    staleTime: Infinity,
  });
}

export function useMuscleVolumeDistribution(from: Date, to: Date, workoutId?: string) {
  return useQuery({
    queryKey: analyticsKeys.muscleVolume(from, to, workoutId),
    queryFn: () => analyticsCommands.getMuscleVolumeDistribution(from, to, workoutId),
    staleTime: Infinity,
  });
}
