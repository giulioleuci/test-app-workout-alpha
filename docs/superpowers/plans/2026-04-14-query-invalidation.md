# Query Invalidation Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix stale-UI bugs caused by missing or incomplete `invalidateQueries` calls across all mutation hooks by introducing a `useInvalidation()` hook with five named invalidation-group functions.

**Architecture:** A single new hook `useInvalidation.ts` is created in `src/hooks/queries/`. It calls `useQueryClient()` and returns five functions (`invalidateSessionContext`, `invalidateWorkoutContext`, `invalidateExerciseContext`, `invalidateUserContext`, `invalidateAll`). Every mutation file that was previously calling wrong or missing keys is updated to call the appropriate group function.

**Tech Stack:** TanStack Query v5 (`useQueryClient`, `invalidateQueries`), React hooks, TypeScript.

---

## File Map

| Action | File | Change |
|---|---|---|
| **Create** | `src/hooks/queries/useInvalidation.ts` | New hook with five group functions |
| **Modify** | `src/hooks/activeSession/useSessionFinishHandlers.ts` | Replace 3× `dashboardKeys.all` with `invalidateSessionContext()` |
| **Modify** | `src/hooks/mutations/profileMutations.ts` | Add `useInvalidation()`, call `invalidateUserContext()` in all 5 mutations |
| **Modify** | `src/hooks/mutations/onboardingMutations.ts` | Replace `onboardingKeys.all` with `invalidateAll()` |
| **Modify** | `src/hooks/mutations/workoutPlanMutations.ts` | Refactor local `invalidateWorkouts` helper to use `invalidateWorkoutContext()`; fix `saveWorkoutSessions` |
| **Modify** | `src/hooks/mutations/exerciseMutations.ts` | Replace `exerciseKeys.all` with `invalidateExerciseContext()` |
| **Modify** | `src/hooks/mutations/oneRepMaxMutations.ts` | Add `exerciseKeys.all` to `deleteRecord` |
| **Modify** | `src/hooks/mutations/sessionMutations.ts` | Refactor `invalidateHistory` to use `invalidateSessionContext()`; fix `saveSession` and set mutations |

---

## Task 1: Create `useInvalidation.ts`

**Files:**
- Create: `src/hooks/queries/useInvalidation.ts`

- [ ] **Step 1: Create the file**

```ts
// src/hooks/queries/useInvalidation.ts
import { useQueryClient } from '@tanstack/react-query';

import { analyticsKeys } from '@/hooks/queries/analyticsQueries';
import { dashboardKeys } from '@/hooks/queries/dashboardQueries';
import { sessionKeys } from '@/hooks/queries/sessionQueries';
import { exerciseKeys, workoutKeys, weightRecordKeys } from '@/hooks/queries/workoutQueries';

export function useInvalidation() {
  const queryClient = useQueryClient();

  /**
   * Call after a workout session is finished, discarded, or when historical
   * session sets are edited. Refreshes: history list, analytics charts,
   * dashboard stats/suggestions, and workout rotation.
   */
  const invalidateSessionContext = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: sessionKeys.all }),
      queryClient.invalidateQueries({ queryKey: analyticsKeys.all }),
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
      queryClient.invalidateQueries({ queryKey: workoutKeys.all }),
    ]);

  /**
   * Call after planning changes: session structure edits, workout
   * activate/deactivate/archive/restore/remove/update/create.
   * Refreshes: workout list and dashboard session suggestions.
   */
  const invalidateWorkoutContext = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: workoutKeys.all }),
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
    ]);

  /**
   * Call after exercise save or delete.
   * Refreshes: exercise catalog and muscle-group analytics aggregations.
   */
  const invalidateExerciseContext = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: exerciseKeys.all }),
      queryClient.invalidateQueries({ queryKey: analyticsKeys.all }),
    ]);

  /**
   * Call after profile, body weight, or regulation changes.
   * Refreshes: dashboard display and strength-to-weight analytics.
   */
  const invalidateUserContext = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: weightRecordKeys.all }),
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
      queryClient.invalidateQueries({ queryKey: analyticsKeys.all }),
    ]);

  /**
   * Call after onboarding — seeds the entire DB, cheapest to wipe all caches.
   */
  const invalidateAll = () => queryClient.invalidateQueries();

  return {
    invalidateSessionContext,
    invalidateWorkoutContext,
    invalidateExerciseContext,
    invalidateUserContext,
    invalidateAll,
  };
}
```

- [ ] **Step 2: Verify the file compiles**

```bash
npm run lint -- --max-warnings 0
```

Expected: no errors on the new file.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/queries/useInvalidation.ts
git commit -m "feat: add useInvalidation hook with five named invalidation groups"
```

---

## Task 2: Fix `useSessionFinishHandlers.ts`

**Files:**
- Modify: `src/hooks/activeSession/useSessionFinishHandlers.ts`

Currently this file imports only `dashboardKeys` and calls `invalidateQueries({ queryKey: dashboardKeys.all })` in three places. Replace all three with `invalidateSessionContext()`.

- [ ] **Step 1: Rewrite the file**

```ts
import { useQueryClient } from '@tanstack/react-query';

import { useInvalidation } from '@/hooks/queries/useInvalidation';
import { SessionExecutionService } from '@/services/sessionExecutionService';
import type { UnresolvedSet } from '@/services/sessionMutator';

interface AlertConfig {
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
}

export function useSessionFinishHandlers(
  activeSessionId: string | null,
  resetSessionStore: () => void,
  navigate: (path: string) => void,
  setAlertConfig: (config: AlertConfig) => void,
  unresolvedSetsState: { open: boolean; sets: UnresolvedSet[] },
  setUnresolvedSetsState: (state: { open: boolean; sets: UnresolvedSet[] }) => void,
) {
    const { invalidateSessionContext } = useInvalidation();

    const handleEndSession = async (allDone: boolean, title: string, incompleteConfirmDesc: string) => {
        if (!activeSessionId) return;

        const doFinish = async () => {
            await SessionExecutionService.finishSession(activeSessionId);
            await invalidateSessionContext();
            resetSessionStore();
            navigate('/');
        };

        const validation = await SessionExecutionService.validateSessionCompletion(activeSessionId);

        if (!validation.isValid) {
            setUnresolvedSetsState({ open: true, sets: validation.unresolvedSets });
            return;
        }

        if (!allDone) {
            setAlertConfig({
                open: true,
                title,
                description: incompleteConfirmDesc,
                onConfirm: doFinish,
            });
            return;
        }

        await doFinish();
    };

    const handleSkipAllAndFinish = async () => {
        if (!activeSessionId) return;

        await SessionExecutionService.skipUnresolvedSets(unresolvedSetsState.sets);

        setUnresolvedSetsState({ open: false, sets: [] });
        await SessionExecutionService.finishSession(activeSessionId);
        await invalidateSessionContext();
        resetSessionStore();
        navigate('/');
    };

    const handleDiscardSession = (title: string, desc: string) => {
        setAlertConfig({
            open: true,
            title,
            description: desc,
            onConfirm: async () => {
                if (!activeSessionId) return;
                await SessionExecutionService.discardSession(activeSessionId);
                await invalidateSessionContext();
                resetSessionStore();
                navigate('/');
            },
        });
    };

    return {
        handleEndSession,
        handleSkipAllAndFinish,
        handleDiscardSession,
    };
}
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all tests pass (the unused `useQueryClient` import is gone; no other behaviour changes).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/activeSession/useSessionFinishHandlers.ts
git commit -m "fix: invalidate session, analytics, workout, and dashboard on session finish/discard"
```

---

## Task 3: Fix `profileMutations.ts`

**Files:**
- Modify: `src/hooks/mutations/profileMutations.ts`

Currently this file has zero `invalidateQueries` calls. Add `useInvalidation()` and call `invalidateUserContext()` in `onSuccess` for every mutation.

- [ ] **Step 1: Rewrite the file**

```ts
import { useMutation } from '@tanstack/react-query';

import type { UserProfile, BodyWeightRecord, UserRegulationProfile } from '@/domain/entities';
import { useInvalidation } from '@/hooks/queries/useInvalidation';
import dayjs from '@/lib/dayjs';
import { profileService } from '@/services/profileService';

export function useProfileMutations() {
  const { invalidateUserContext } = useInvalidation();

  const updateProfileMutation = useMutation({
    mutationFn: async (profile: UserProfile) => {
      await profileService.upsertProfile({ ...profile, updatedAt: dayjs().toDate() });
    },
    onSuccess: invalidateUserContext,
  });

  const addWeightMutation = useMutation({
    mutationFn: async (record: BodyWeightRecord) => {
      await profileService.addBodyWeightRecord(record);
    },
    onSuccess: invalidateUserContext,
  });

  const updateWeightMutation = useMutation({
    mutationFn: async (record: BodyWeightRecord) => {
      await profileService.updateBodyWeightRecord(record.id, record);
    },
    onSuccess: invalidateUserContext,
  });

  const deleteWeightMutation = useMutation({
    mutationFn: async (id: string) => {
      await profileService.deleteBodyWeightRecord(id);
    },
    onSuccess: invalidateUserContext,
  });

  const updateRegulationMutation = useMutation({
    mutationFn: async (profile: UserRegulationProfile) => {
      await profileService.upsertRegulationProfile({ ...profile, updatedAt: dayjs().toDate() });
    },
    onSuccess: invalidateUserContext,
  });

  return {
    updateProfile: updateProfileMutation.mutateAsync,
    addWeight: addWeightMutation.mutateAsync,
    updateWeight: updateWeightMutation.mutateAsync,
    deleteWeight: deleteWeightMutation.mutateAsync,
    updateRegulation: updateRegulationMutation.mutateAsync,
  };
}
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/mutations/profileMutations.ts
git commit -m "fix: invalidate weight, dashboard, and analytics after profile/weight/regulation mutations"
```

---

## Task 4: Fix `onboardingMutations.ts`

**Files:**
- Modify: `src/hooks/mutations/onboardingMutations.ts`

Currently invalidates only `onboardingKeys.all`. Replace with `invalidateAll()` — onboarding seeds exercises, workouts, and profile; all caches must be cleared.

- [ ] **Step 1: Edit the file**

Replace the `onSuccess` callback and remove the now-unused `onboardingKeys` and `useQueryClient` imports:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { nanoid } from 'nanoid';

import { DEFAULT_REGULATION_PROFILE } from '@/domain/entities';
import { PlannedWorkoutStatus } from '@/domain/enums';
import { useInvalidation } from '@/hooks/queries/useInvalidation';
import dayjs from '@/lib/dayjs';
import { profileService } from '@/services/profileService';
import { SystemMaintenanceService } from '@/services/systemMaintenanceService';
```

Note: `useQueryClient` is no longer needed. Remove it. The full rewritten file:

```ts
import { useMutation } from '@tanstack/react-query';
import { nanoid } from 'nanoid';

import { DEFAULT_REGULATION_PROFILE } from '@/domain/entities';
import { PlannedWorkoutStatus } from '@/domain/enums';
import { useInvalidation } from '@/hooks/queries/useInvalidation';
import dayjs from '@/lib/dayjs';
import { profileService } from '@/services/profileService';
import { SystemMaintenanceService } from '@/services/systemMaintenanceService';

export function useOnboardingMutations() {
  const { invalidateAll } = useInvalidation();

  const onboardUserMutation = useMutation({
    mutationFn: async ({ name, gender, weight, seedOptions, language = 'en' }: {
      name: string, gender: 'male' | 'female' | 'undisclosed', weight: number,
      seedOptions: { exercises: boolean, fullBody: boolean, ppl: boolean, upperLower: boolean, powerlifting: boolean, calisthenics: boolean },
      language?: 'en' | 'it' | 'es' | 'fr' | 'zh'
    }) => {
      const now = dayjs().toDate();

      await profileService.upsertProfile({
        id: 'default',
        name: name.trim(),
        gender,
        createdAt: now,
        updatedAt: now,
      });

      await profileService.upsertRegulationProfile({
        ...DEFAULT_REGULATION_PROFILE,
        updatedAt: now,
      });

      if (weight > 0) {
        await profileService.addBodyWeightRecord({
          id: nanoid(),
          weight,
          recordedAt: now,
        });
      }

      if (seedOptions.exercises) {
        await SystemMaintenanceService.seedExercises(language);
      }

      const plansToSeed: { fn: (status: PlannedWorkoutStatus) => Promise<void>; selected: boolean }[] = [
        { fn: (s) => SystemMaintenanceService.seedFullBody2x(s, language), selected: seedOptions.fullBody },
        { fn: (s) => SystemMaintenanceService.seedPPL3x(s, language), selected: seedOptions.ppl },
        { fn: (s) => SystemMaintenanceService.seedUpperLower4x(s, language), selected: seedOptions.upperLower },
        { fn: (s) => SystemMaintenanceService.seedPowerlifting(s, language), selected: seedOptions.powerlifting },
        { fn: (s) => SystemMaintenanceService.seedCalisthenics(s, language), selected: seedOptions.calisthenics },
      ];

      const selectedPlans = plansToSeed.filter(p => p.selected);
      for (let i = 0; i < selectedPlans.length; i++) {
        const isLast = i === selectedPlans.length - 1;
        await selectedPlans[i].fn(isLast ? PlannedWorkoutStatus.Active : PlannedWorkoutStatus.Inactive);
      }
    },
    onSuccess: invalidateAll,
  });

  return {
    onboardUser: onboardUserMutation.mutateAsync,
  };
}
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/mutations/onboardingMutations.ts
git commit -m "fix: invalidate all caches after onboarding (seeds exercises, workouts, and profile)"
```

---

## Task 5: Fix `workoutPlanMutations.ts`

**Files:**
- Modify: `src/hooks/mutations/workoutPlanMutations.ts`

Two issues: (1) the local `invalidateWorkouts` helper already does `workoutKeys + dashboardKeys` correctly but should be replaced with `invalidateWorkoutContext()` for consistency; (2) `saveWorkoutSessionsMutation` only invalidates `workoutKeys.all` — fix to use `invalidateWorkoutContext()`.

- [ ] **Step 1: Rewrite the file**

```ts
// src/hooks/mutations/workoutPlanMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { PlannedWorkout } from '@/domain/entities';
import { ObjectiveType, WorkType, PlannedWorkoutStatus } from '@/domain/enums';
import { templateKeys } from '@/hooks/queries/workoutQueries';
import { useInvalidation } from '@/hooks/queries/useInvalidation';
import { deleteTemplate, updateTemplate } from '@/services/templateService';
import {
  activateWorkout, deactivateWorkout, archiveWorkout, restoreWorkout,
  removeWorkout, updateWorkout, createWorkout, saveWorkoutSessions,
} from '@/services/workoutService';

export function useWorkoutPlanMutations() {
  const queryClient = useQueryClient();
  const { invalidateWorkoutContext } = useInvalidation();

  const activateMutation = useMutation({
    mutationFn: (id: string) => activateWorkout(id),
    onSuccess: invalidateWorkoutContext,
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => deactivateWorkout(id),
    onSuccess: invalidateWorkoutContext,
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => archiveWorkout(id),
    onSuccess: invalidateWorkoutContext,
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => restoreWorkout(id),
    onSuccess: invalidateWorkoutContext,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeWorkout(id),
    onSuccess: invalidateWorkoutContext,
  });

  const updateWorkoutMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<PlannedWorkout> }) =>
      updateWorkout(id, updates),
    onSuccess: invalidateWorkoutContext,
  });

  const createWorkoutMutation = useMutation({
    mutationFn: (params: {
      name: string;
      description?: string;
      objectiveType: ObjectiveType;
      workType: WorkType;
      status: PlannedWorkoutStatus;
    }) => createWorkout(params),
    onSuccess: invalidateWorkoutContext,
  });

  const saveWorkoutSessionsMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: ({ workoutId, sessions, originalSessions }: { workoutId: string; sessions: any[]; originalSessions: any[] }) =>
      saveWorkoutSessions(workoutId, sessions, originalSessions),
    onSuccess: invalidateWorkoutContext,
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: templateKeys.all }),
  });

  const updateTemplateMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: ({ id, name, description, content }: { id: string; name: string; description?: string; content: any }) =>
      updateTemplate(id, { name, description, content }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: templateKeys.all }),
  });

  return {
    activate: activateMutation.mutateAsync,
    deactivate: deactivateMutation.mutateAsync,
    archive: archiveMutation.mutateAsync,
    restore: restoreMutation.mutateAsync,
    remove: removeMutation.mutateAsync,
    updateWorkout: updateWorkoutMutation.mutateAsync,
    createWorkout: createWorkoutMutation.mutateAsync,
    saveWorkoutSessions: saveWorkoutSessionsMutation.mutateAsync,
    deleteTemplate: deleteTemplateMutation.mutateAsync,
    updateTemplate: updateTemplateMutation.mutateAsync,
  };
}
```

Note: `queryClient` is kept for the two template mutations which correctly use `templateKeys.all` (templates are standalone — no cross-invalidation needed).

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/mutations/workoutPlanMutations.ts
git commit -m "fix: invalidate dashboard after saveWorkoutSessions; unify workout mutations via invalidateWorkoutContext"
```

---

## Task 6: Fix `exerciseMutations.ts`

**Files:**
- Modify: `src/hooks/mutations/exerciseMutations.ts`

Replace `exerciseKeys.all` with `invalidateExerciseContext()` so analytics are also refreshed when exercise metadata (name, muscles) changes.

- [ ] **Step 1: Rewrite the file**

```ts
// src/hooks/mutations/exerciseMutations.ts
import { useMutation } from '@tanstack/react-query';

import type { Exercise } from '@/domain/entities';
import { useInvalidation } from '@/hooks/queries/useInvalidation';
import { upsertExercise, deleteExercise } from '@/services/exerciseService';

export function useExerciseMutations() {
  const { invalidateExerciseContext } = useInvalidation();

  const saveExerciseMutation = useMutation({
    mutationFn: (exercise: Exercise) => upsertExercise(exercise),
    onSuccess: invalidateExerciseContext,
  });

  const deleteExerciseMutation = useMutation({
    mutationFn: (id: string) => deleteExercise(id),
    onSuccess: invalidateExerciseContext,
  });

  return {
    saveExercise: saveExerciseMutation.mutateAsync,
    deleteExercise: deleteExerciseMutation.mutateAsync,
    isSaving: saveExerciseMutation.isPending,
    isDeleting: deleteExerciseMutation.isPending,
  };
}
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/mutations/exerciseMutations.ts
git commit -m "fix: invalidate analytics after exercise save/delete (muscle-group aggregations)"
```

---

## Task 7: Fix `oneRepMaxMutations.ts`

**Files:**
- Modify: `src/hooks/mutations/oneRepMaxMutations.ts`

`deleteRecord` currently only invalidates `oneRepMaxKeys.all`. The enhanced exercise catalog includes 1RM data, so `exerciseKeys.all` must also be invalidated — consistent with what `saveRecord` already does.

- [ ] **Step 1: Rewrite the file**

```ts
// src/hooks/mutations/oneRepMaxMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { OneRepMaxRecord } from '@/domain/entities';
import { exerciseKeys, oneRepMaxKeys } from '@/hooks/queries/workoutQueries';
import { upsertRecord, deleteRecord } from '@/services/oneRepMaxService';

export function useOneRepMaxMutations() {
  const queryClient = useQueryClient();

  const invalidateOneRepMax = () => {
    queryClient.invalidateQueries({ queryKey: oneRepMaxKeys.all });
    queryClient.invalidateQueries({ queryKey: exerciseKeys.all });
  };

  const saveRecordMutation = useMutation({
    mutationFn: (record: OneRepMaxRecord) => upsertRecord(record),
    onSuccess: invalidateOneRepMax,
  });

  const deleteRecordMutation = useMutation({
    mutationFn: (id: string) => deleteRecord(id),
    onSuccess: invalidateOneRepMax,
  });

  return {
    saveRecord: saveRecordMutation.mutateAsync,
    deleteRecord: deleteRecordMutation.mutateAsync,
    isSaving: saveRecordMutation.isPending,
  };
}
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/mutations/oneRepMaxMutations.ts
git commit -m "fix: invalidate exerciseKeys on 1RM delete (consistent with save)"
```

---

## Task 8: Fix `sessionMutations.ts`

**Files:**
- Modify: `src/hooks/mutations/sessionMutations.ts`

Three issues:
1. `invalidateHistory` helper is already correct (`sessionKeys + dashboardKeys + analyticsKeys`) but should use `invalidateSessionContext()` which adds `workoutKeys` (for rotation). Replace the local helper.
2. `saveSessionMutation` (planning structure edits) only invalidates `workoutKeys.all` — fix with `invalidateWorkoutContext()`.
3. `updateSessionSet`, `deleteSessionSet`, `addSessionSet` only invalidate `sessionKeys.all` — fix with `invalidateSessionContext()`.

- [ ] **Step 1: Rewrite the file**

```ts
// src/hooks/mutations/sessionMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { WorkoutSession, SessionSet, PlannedExerciseGroup, PlannedExerciseItem, PlannedSet } from '@/domain/entities';
import { useInvalidation } from '@/hooks/queries/useInvalidation';
import { workoutKeys } from '@/hooks/queries/workoutQueries';
import {
  deleteHistorySession, updateHistorySessionMeta, updateSessionSet, deleteSessionSet, addSessionSet,
} from '@/services/historyService';
import { updateSessionStructure } from '@/services/workoutService';

export function useSessionMutations() {
  const queryClient = useQueryClient();
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
```

Note: `queryClient` and `workoutKeys` imports are no longer used — remove them. The full clean file has only the `useInvalidation` import and the TanStack `useMutation` import.

Clean version (no unused imports):

```ts
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
```

- [ ] **Step 2: Run full test suite and lint**

```bash
npm test && npm run lint -- --max-warnings 0
```

Expected: all tests pass, no lint errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/mutations/sessionMutations.ts
git commit -m "fix: use invalidateSessionContext for history mutations, invalidateWorkoutContext for planning session edits"
```

---

## Task 9: Final verification

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: all tests pass with no failures.

- [ ] **Step 2: Run lint**

```bash
npm run lint -- --max-warnings 0
```

Expected: no lint warnings or errors.

- [ ] **Step 3: Confirm all eight files are changed**

```bash
git log --oneline -9
```

Expected output (newest first):
```
<hash> fix: use invalidateSessionContext for history mutations, invalidateWorkoutContext for planning session edits
<hash> fix: invalidate exerciseKeys on 1RM delete (consistent with save)
<hash> fix: invalidate analytics after exercise save/delete (muscle-group aggregations)
<hash> fix: invalidate dashboard after saveWorkoutSessions; unify workout mutations via invalidateWorkoutContext
<hash> fix: invalidate all caches after onboarding (seeds exercises, workouts, and profile)
<hash> fix: invalidate weight, dashboard, and analytics after profile/weight/regulation mutations
<hash> fix: invalidate session, analytics, workout, and dashboard on session finish/discard
<hash> feat: add useInvalidation hook with five named invalidation groups
<hash> docs: add query invalidation design spec
```
