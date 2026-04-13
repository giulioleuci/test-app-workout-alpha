import { useMutation } from '@tanstack/react-query';

import type { WorkoutSession, SessionSet, PlannedExerciseGroup, PlannedExerciseItem, PlannedSet } from '@/domain/entities';
import {
  deleteHistorySession, updateHistorySessionMeta, updateSessionSet, deleteSessionSet, addSessionSet
} from '@/services/historyService';
import { updateSessionStructure } from '@/services/workoutService';

export function useSessionMutations() {
  const saveSessionMutation = useMutation({
    mutationFn: async ({
      sessionId: _sessionId, name, dayNumber, notes, groups, items, sets,
      removedGroupIds, removedItemIds, removedSetIds
    }: {
      sessionId: string, name: string, dayNumber: number, notes?: string,
      groups: PlannedExerciseGroup[], items: PlannedExerciseItem[], sets: PlannedSet[],
      removedGroupIds: string[], removedItemIds: string[], removedSetIds: string[]
    }) => {
      // This is a transactional bulk update for a Planned Session (Template Editing).
      await updateSessionStructure(
        _sessionId,
        { name, dayNumber, notes },
        { groups, items, sets },
        { removedGroupIds, removedItemIds, removedSetIds }
      );
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (id: string) => {
      // This deletes a COMPLETED session (WorkoutSession).
      await deleteHistorySession(id);
    },
  });

  const updateSessionMetaMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<WorkoutSession> }) => {
      // WorkoutSession update (e.g. notes, dates).
      await updateHistorySessionMeta(id, updates);
    },
  });

  const updateSessionSetMutation = useMutation({
    mutationFn: async ({ id, sessionId: _sessionId, updates }: { id: string, sessionId: string, updates: Partial<SessionSet> }) => {
      // Updates a performed set (SessionSet).
      await updateSessionSet(id, updates);
    },
  });

  const deleteSessionSetMutation = useMutation({
    mutationFn: async ({ id, sessionId: _sessionId }: { id: string, sessionId: string }) => {
      await deleteSessionSet(id);
    },
  });

  const addSessionSetMutation = useMutation({
    mutationFn: async ({ sessionId: _sessionId, set }: { sessionId: string, set: SessionSet }) => {
      // Adds a performed set.
      await addSessionSet(set);
    },
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
