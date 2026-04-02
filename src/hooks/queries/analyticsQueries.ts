import { useLiveQuery } from 'dexie-react-hooks';

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
  const data = useLiveQuery(
    () => fetchAnalyticsData(
      filters.fromDate,
      filters.toDate,
      filters.workoutId,
      filters.sessionId,
      filters.plannedGroupId,
      filters.plannedExerciseItemId
    ),
    [JSON.stringify(filters)]
  );
  return { data, isLoading: data === undefined };
}

export function useAnalyticsWorkouts() {
  const data = useLiveQuery(getAllWorkouts);
  return { data, isLoading: data === undefined };
}

export function useAnalyticsSessions(workoutId?: string) {
  const data = useLiveQuery(
    () => workoutId ? getWorkoutSessions(workoutId) : Promise.resolve([]),
    [workoutId]
  );
  return { data, isLoading: data === undefined && !!workoutId };
}

export function useAnalyticsGroups(sessionId?: string) {
  const data = useLiveQuery(
    () => sessionId ? getWorkoutSessionGroups(sessionId) : Promise.resolve([]),
    [sessionId]
  );
  return { data, isLoading: data === undefined && !!sessionId };
}

export function useAnalyticsItems(groupId?: string) {
  const data = useLiveQuery(
    async () => {
      if (!groupId) return [];
      const items = await getWorkoutGroupItems(groupId);
      const exIds = items.map(i => i.exerciseId);
      const exercises = await getExercisesByIds(exIds);
      const exMap = new Map(exercises.filter(Boolean).map(e => [e.id, e]));
      return items.map(i => ({ ...i, exercise: exMap.get(i.exerciseId) }));
    },
    [groupId]
  );
  return { data, isLoading: data === undefined && !!groupId };
}

export function useMuscleVolumeDistribution(from: Date, to: Date, workoutId?: string) {
  const data = useLiveQuery(
    () => getMuscleVolumeDistribution(from, to, workoutId),
    [from.toISOString(), to.toISOString(), workoutId]
  );
  return { data, isLoading: data === undefined };
}
