import { useQueryClient } from '@tanstack/react-query';

import { sessionKeys, useActiveSessionData } from '@/hooks/queries/sessionQueries';

export function useSessionLoader(activeSessionId: string | null) {
    const queryClient = useQueryClient();
    const { data, isLoading } = useActiveSessionData(activeSessionId);

    return {
        workoutSession: data?.workoutSession ?? null,
        plannedSession: data?.plannedSession ?? null,
        plannedWorkout: data?.plannedWorkout ?? null,
        loadedGroups: data?.loadedGroups ?? [],
        simpleMode: data?.simpleMode ?? false,
        isLoading,
        loadData: () => queryClient.invalidateQueries({ queryKey: sessionKeys.all }),
    };
}
