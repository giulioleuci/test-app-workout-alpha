// src/hooks/mutations/sessionMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { WorkoutSession, SessionSet, PlannedExerciseGroup, PlannedExerciseItem, PlannedSet } from '@/domain/entities';
import { analyticsKeys } from '@/hooks/queries/analyticsQueries';
import { dashboardKeys } from '@/hooks/queries/dashboardQueries';
import { sessionKeys } from '@/hooks/queries/sessionHistoryQueries';
import { workoutKeys } from '@/hooks/queries/workoutQueries';
import {
  deleteHistorySession, updateHistorySessionMeta, updateSessionSet, deleteSessionSet, addSessionSet,
} from '@/services/historyService';
import { updateSessionStructure } from '@/services/workoutService';

export function useSessionMutations() {
  const queryClient = useQueryClient();

  const invalidateHistory = () => {
    queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
  };

  const saveSessionMutation = useMutation({
    mutationFn: async ({
      sessionId, name, dayNumber, notes, groups, items, sets,
      removedGroupIds, removedItemIds, removedSetIds,
    }: {
      sessionId: string; name: string; dayNumber: number; notes?: string;
      groups: PlannedExerciseGroup[]; items: PlannedExerciseItem[]; sets: PlannedSet[];
      removedGroupIds: string[]; removedItemIds: string[]; removedSetIds: string[];
    }) => {
      await updateSessionStructure(
        sessionId, { name, dayNumber, notes },
        { groups, items, sets },
        { removedGroupIds, removedItemIds, removedSetIds }
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workoutKeys.all }),
  });

  const deleteSessionMutation = useMutation({
    mutationFn: (id: string) => deleteHistorySession(id),
    onSuccess: invalidateHistory,
  });

  const updateSessionMetaMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<WorkoutSession> }) =>
      updateHistorySessionMeta(id, updates),
    onSuccess: invalidateHistory,
  });

  const updateSessionSetMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; sessionId: string; updates: Partial<SessionSet> }) =>
      updateSessionSet(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionKeys.all }),
  });

  const deleteSessionSetMutation = useMutation({
    mutationFn: ({ id }: { id: string; sessionId: string }) => deleteSessionSet(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionKeys.all }),
  });

  const addSessionSetMutation = useMutation({
    mutationFn: ({ set }: { sessionId: string; set: SessionSet }) => addSessionSet(set),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionKeys.all }),
  });

  return {
    saveSession: saveSessionMutation.mutateAsync,
    deleteSession: deleteSessionMutation.mutateAsync,
    updateSessionMeta: updateSessionMetaMutation.mutateAsync,
    updateSessionSet: updateSessionSetMutation.mutateAsync,
    deleteSessionSet: deleteSessionSetMutation.mutateAsync,
    addSessionSet: addSessionSetMutation.mutateAsync,
  };
}
