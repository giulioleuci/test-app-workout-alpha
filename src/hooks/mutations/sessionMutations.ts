// src/hooks/mutations/sessionMutations.ts
import { useMutation } from '@tanstack/react-query';

import type { WorkoutSession, SessionSet, PlannedExerciseGroup, PlannedExerciseItem, PlannedSet } from '@/domain/entities';
import { useInvalidation } from '@/hooks/queries/useInvalidation';
import {
  deleteHistorySession, updateHistorySessionMeta, updateSessionSet, deleteSessionSet, addSessionSet,
} from '@/services/historyService';
import { updateSessionStructure } from '@/services/workoutService';

export function useSessionMutations() {
  const { invalidateSessionContext, invalidateWorkoutContext } = useInvalidation();

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
    onSuccess: invalidateWorkoutContext,
  });

  const deleteSessionMutation = useMutation({
    mutationFn: (id: string) => deleteHistorySession(id),
    onSuccess: invalidateSessionContext,
  });

  const updateSessionMetaMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<WorkoutSession> }) =>
      updateHistorySessionMeta(id, updates),
    onSuccess: invalidateSessionContext,
  });

  const updateSessionSetMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; sessionId: string; updates: Partial<SessionSet> }) =>
      updateSessionSet(id, updates),
    onSuccess: invalidateSessionContext,
  });

  const deleteSessionSetMutation = useMutation({
    mutationFn: ({ id }: { id: string; sessionId: string }) => deleteSessionSet(id),
    onSuccess: invalidateSessionContext,
  });

  const addSessionSetMutation = useMutation({
    mutationFn: ({ set }: { sessionId: string; set: SessionSet }) => addSessionSet(set),
    onSuccess: invalidateSessionContext,
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
