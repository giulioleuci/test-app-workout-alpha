// src/hooks/mutations/sessionMutations.ts
import { useMutation } from '@tanstack/react-query';

import { historyCommands } from '@/composition/history';
import { workoutCommands } from '@/composition/workouts';
import type { WorkoutSession, SessionSet, SessionExerciseGroup, SessionExerciseItem, PlannedExerciseGroup, PlannedExerciseItem, PlannedSet } from '@/domain/entities';
import { useInvalidation } from '@/hooks/queries/useInvalidation';

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
      await workoutCommands.updateSessionStructure(
        sessionId, { name, dayNumber, notes },
        { groups, items, sets },
        { removedGroupIds, removedItemIds, removedSetIds }
      );
    },
    onSuccess: invalidateWorkoutContext,
  });

  const deleteSessionMutation = useMutation({
    mutationFn: (id: string) => historyCommands.deleteHistorySession(id),
    onSuccess: invalidateSessionContext,
  });

  const updateSessionMetaMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<WorkoutSession> }) =>
      historyCommands.updateHistorySessionMeta(id, updates),
    onSuccess: invalidateSessionContext,
  });

  const updateSessionSetMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; sessionId: string; updates: Partial<SessionSet> }) =>
      historyCommands.updateSessionSet(id, updates),
    onSuccess: invalidateSessionContext,
  });

  const deleteSessionSetMutation = useMutation({
    mutationFn: ({ id }: { id: string; sessionId: string }) => historyCommands.deleteSessionSet(id),
    onSuccess: invalidateSessionContext,
  });

  const addSessionSetMutation = useMutation({
    mutationFn: ({ set }: { sessionId: string; set: SessionSet }) => historyCommands.addSessionSet(set),
    onSuccess: invalidateSessionContext,
  });

  const addExerciseGroupMutation = useMutation({
    mutationFn: ({ group, items, sets }: { group: SessionExerciseGroup; items: SessionExerciseItem[]; sets: SessionSet[] }) =>
      historyCommands.addSessionExerciseGroup(group, items, sets),
    onSuccess: invalidateSessionContext,
  });

  const deleteExerciseItemMutation = useMutation({
    mutationFn: ({ itemId, groupId }: { itemId: string; groupId: string }) =>
      historyCommands.deleteSessionExerciseItemCascade(itemId, groupId),
    onSuccess: invalidateSessionContext,
  });

  const updateExerciseItemMutation = useMutation({
    mutationFn: ({ itemId, updates }: { itemId: string; updates: Partial<SessionExerciseItem> }) =>
      historyCommands.updateSessionExerciseItem(itemId, updates),
    onSuccess: invalidateSessionContext,
  });

  return {
    saveSession: saveSessionMutation.mutateAsync,
    deleteSession: deleteSessionMutation.mutateAsync,
    updateSessionMeta: updateSessionMetaMutation.mutateAsync,
    updateSessionSet: updateSessionSetMutation.mutateAsync,
    deleteSessionSet: deleteSessionSetMutation.mutateAsync,
    addSessionSet: addSessionSetMutation.mutateAsync,
    addExerciseGroup: addExerciseGroupMutation.mutateAsync,
    deleteExerciseItem: deleteExerciseItemMutation.mutateAsync,
    updateExerciseItem: updateExerciseItemMutation.mutateAsync,
  };
}
