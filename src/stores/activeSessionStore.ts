import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { SessionSet } from '@/domain/entities';
import dayjs from '@/lib/dayjs';
import { systemService } from '@/services/systemService';

interface ActiveSessionState {
  // Session reference
  activeSessionId: string | null;        // WorkoutSession.id
  plannedSessionId: string | null;
  plannedWorkoutId: string | null;

  // Navigation
  currentGroupIndex: number;
  currentItemIndex: number;
  currentSetIndex: number;

  // Rest timer
  restTimerEndAt: number | null;
  restTimerDuration: number;
  restTimerPausedRemaining: number | null; // seconds remaining when paused

  // Unsaved current set draft (volatile)
  draftSet: Partial<SessionSet> | null;

  // Actions
  setActiveSession: (id: string, plannedSessionId?: string, plannedWorkoutId?: string) => void;
  setCurrentPosition: (group: number, item: number, set: number) => void;
  startRestTimer: (durationSeconds: number) => void;
  pauseRestTimer: () => void;
  resumeRestTimer: () => void;
  clearRestTimer: () => void;
  setDraftSet: (draft: Partial<SessionSet> | null) => void;
  updateDraft: (updates: Partial<SessionSet>) => void;
  reset: () => void;
}

const initialState = {
  activeSessionId: null,
  plannedSessionId: null,
  plannedWorkoutId: null,
  currentGroupIndex: 0,
  currentItemIndex: 0,
  currentSetIndex: 0,
  restTimerEndAt: null,
  restTimerDuration: 0,
  restTimerPausedRemaining: null,
  draftSet: null,
};

export const useActiveSessionStore = create<ActiveSessionState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setActiveSession: (id, plannedSessionId, plannedWorkoutId) =>
        set({ activeSessionId: id, plannedSessionId: plannedSessionId ?? null, plannedWorkoutId: plannedWorkoutId ?? null }),

      setCurrentPosition: (group, item, setIdx) =>
        set({ currentGroupIndex: group, currentItemIndex: item, currentSetIndex: setIdx }),

      startRestTimer: (durationSeconds) =>
        set({ restTimerEndAt: dayjs().add(durationSeconds, 'second').valueOf(), restTimerDuration: durationSeconds, restTimerPausedRemaining: null }),

      pauseRestTimer: () => {
        const { restTimerEndAt } = get();
        if (!restTimerEndAt) return;
        const remaining = Math.max(0, Math.ceil(dayjs(restTimerEndAt).diff(dayjs(), 'second')));
        set({ restTimerEndAt: null, restTimerPausedRemaining: remaining });
      },

      resumeRestTimer: () => {
        const { restTimerPausedRemaining } = get();
        if (restTimerPausedRemaining == null || restTimerPausedRemaining <= 0) return;
        set({ restTimerEndAt: dayjs().add(restTimerPausedRemaining, 'second').valueOf(), restTimerPausedRemaining: null });
      },

      clearRestTimer: () => set({ restTimerEndAt: null, restTimerDuration: 0, restTimerPausedRemaining: null }),

      setDraftSet: (draft) => set({ draftSet: draft }),

      updateDraft: (updates) =>
        set((state) => ({ draftSet: state.draftSet ? { ...state.draftSet, ...updates } : updates })),

      reset: () => set(initialState),
    }),
    {
      name: `active-session-store-${systemService.getCurrentUserId()}`,
      partialize: (state) => ({
        activeSessionId: state.activeSessionId,
        plannedSessionId: state.plannedSessionId,
        plannedWorkoutId: state.plannedWorkoutId,
        currentGroupIndex: state.currentGroupIndex,
        currentItemIndex: state.currentItemIndex,
        currentSetIndex: state.currentSetIndex,
        restTimerEndAt: state.restTimerEndAt,
        restTimerDuration: state.restTimerDuration,
        restTimerPausedRemaining: state.restTimerPausedRemaining,
      }),
    }
  )
);
