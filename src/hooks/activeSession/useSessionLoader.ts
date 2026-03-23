import { useActiveSessionData } from '@/hooks/queries/sessionQueries';

export function useSessionLoader(activeSessionId: string | null) {
    const { data, isLoading, refetch } = useActiveSessionData(activeSessionId);

    return {
        workoutSession: data?.workoutSession ?? null,
        plannedSession: data?.plannedSession ?? null,
        plannedWorkout: data?.plannedWorkout ?? null,
        loadedGroups: data?.loadedGroups ?? [],
        simpleMode: data?.simpleMode ?? false,
        isLoading,
        loadData: refetch
    };
}
