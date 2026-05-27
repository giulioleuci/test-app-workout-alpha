import { useEffect, useState, useCallback, useMemo } from 'react';

import { nanoid } from 'nanoid';
import { useTranslation } from 'react-i18next';

import type { PlannedSession } from '@/domain/entities';
import { PlannedSessionStatus } from '@/domain/enums';
import { useWorkoutPlanMutations } from '@/hooks/mutations/workoutPlanMutations';
import { useToast } from '@/hooks/useToast';
import dayjs from '@/lib/dayjs';
import { getRankBetween, getInitialRank, byOrderIndex } from '@/lib/lexorank';

/**
 * Owns the in-memory editing of a workout's session list (no DB writes until save).
 * Mirrors the usePlanEditor pattern used by SessionDetail.
 */
export function useWorkoutEditor(workoutId: string | undefined, originalSessions: PlannedSession[]) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const mutations = useWorkoutPlanMutations();

  const [sessions, setSessions] = useState<PlannedSession[]>([]);

  useEffect(() => {
    setSessions(originalSessions);
  }, [originalSessions]);

  const isDirty = useMemo(
    () => JSON.stringify(sessions) !== JSON.stringify(originalSessions),
    [sessions, originalSessions],
  );

  const addSession = useCallback(() => {
    if (!workoutId) return;
    const now = dayjs().toDate();
    setSessions(prev => [
      ...prev,
      {
        id: nanoid(),
        plannedWorkoutId: workoutId,
        name: `Sessione ${prev.length + 1}`,
        dayNumber: prev.length + 1,
        focusMuscleGroups: [],
        status: PlannedSessionStatus.Pending,
        orderIndex: prev.length === 0 ? getInitialRank() : getRankBetween(prev[prev.length - 1].orderIndex, null),
        createdAt: now,
        updatedAt: now,
      },
    ]);
  }, [workoutId]);

  const removeSession = useCallback((sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
  }, []);

  const updateSession = useCallback((sessionId: string, updates: Partial<PlannedSession>) => {
    setSessions(prev => prev.map(s =>
      s.id === sessionId ? { ...s, ...updates, updatedAt: dayjs().toDate() } : s
    ));
  }, []);

  const moveSession = useCallback((index: number, direction: -1 | 1) => {
    setSessions(prev => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      const a = next[index];
      const b = next[targetIndex];
      next[index] = { ...b, orderIndex: a.orderIndex, dayNumber: a.dayNumber, updatedAt: dayjs().toDate() };
      next[targetIndex] = { ...a, orderIndex: b.orderIndex, dayNumber: b.dayNumber, updatedAt: dayjs().toDate() };
      return next.sort(byOrderIndex);
    });
  }, []);

  const saveAll = useCallback(async () => {
    if (!workoutId) return;
    await mutations.saveWorkoutSessions({ workoutId, sessions, originalSessions });
    toast({ title: t('unsavedChanges.saved') });
  }, [workoutId, sessions, originalSessions, mutations, t, toast]);

  const discardAll = useCallback(() => {
    setSessions(originalSessions);
    toast({ title: t('unsavedChanges.discarded') });
  }, [originalSessions, toast, t]);

  return {
    mutations,
    sessions,
    setSessions,
    isDirty,
    addSession,
    removeSession,
    updateSession,
    moveSession,
    saveAll,
    discardAll,
  };
}
