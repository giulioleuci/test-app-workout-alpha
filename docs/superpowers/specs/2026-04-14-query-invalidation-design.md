# Query Invalidation — Design Spec

**Date:** 2026-04-14  
**Status:** Approved

## Problem

All queries use `staleTime: Infinity` (offline-first, IndexedDB data is never auto-refetched). This means the UI only updates when mutations explicitly call `invalidateQueries`. Several mutations call the wrong keys, call too few, or call none at all, producing stale UI: missing history entries, flat analytics charts, and wrong weight-based calculations.

## Confirmed Issues

| # | File | Mutation(s) | Current invalidation | What's missing |
|---|---|---|---|---|
| 1 | `useSessionFinishHandlers.ts` | end / skip-and-finish / discard | `dashboardKeys.all` | `sessionKeys.all`, `analyticsKeys.all`, `workoutKeys.all` |
| 2 | `profileMutations.ts` | all five mutations | *(none)* | `weightRecordKeys.all`, `dashboardKeys.all`, `analyticsKeys.all` |
| 3 | `onboardingMutations.ts` | `onboardUser` | `onboardingKeys.all` | everything else |
| 4 | `workoutPlanMutations.ts` | `saveWorkoutSessions` | `workoutKeys.all` | `dashboardKeys.all` |
| 5 | `exerciseMutations.ts` | save / delete | `exerciseKeys.all` | `analyticsKeys.all` |
| 6 | `oneRepMaxMutations.ts` | `deleteRecord` | `oneRepMaxKeys.all` | `exerciseKeys.all` |
| 7 | `sessionMutations.ts` | `saveSession` (planning structure) | `workoutKeys.all` | `dashboardKeys.all` |
| 8 | `sessionMutations.ts` | `updateSessionSet` / `deleteSessionSet` / `addSessionSet` | `sessionKeys.all` | `analyticsKeys.all`, `dashboardKeys.all` |

## Solution

### New file: `src/hooks/queries/useInvalidation.ts`

A React hook that calls `useQueryClient()` and returns five named invalidation-group functions. Mutation files call this hook alongside their existing `useQueryClient()` call (or rely on it instead).

```ts
export function useInvalidation() {
  const queryClient = useQueryClient();
  return {
    invalidateSessionContext,
    invalidateWorkoutContext,
    invalidateExerciseContext,
    invalidateUserContext,
    invalidateAll,
  };
}
```

### Invalidation groups

| Function | Keys invalidated | Used by |
|---|---|---|
| `invalidateSessionContext` | `sessionKeys.all`, `analyticsKeys.all`, `dashboardKeys.all`, `workoutKeys.all` | session finish/discard, history set edits |
| `invalidateWorkoutContext` | `workoutKeys.all`, `dashboardKeys.all` | planning session structure save, workout status changes (already correct — refactored to use this helper) |
| `invalidateExerciseContext` | `exerciseKeys.all`, `analyticsKeys.all` | exercise save/delete |
| `invalidateUserContext` | `weightRecordKeys.all`, `dashboardKeys.all`, `analyticsKeys.all` | profile, weight, and regulation mutations |
| `invalidateAll` | `queryClient.invalidateQueries()` (no key filter) | onboarding |

All functions return `Promise<void>` (or `void` — mutations can fire-and-forget).

### Per-mutation changes

| File | Mutation(s) | Change |
|---|---|---|
| `useSessionFinishHandlers.ts` | end / skip-and-finish / discard | replace `dashboardKeys.all` with `invalidateSessionContext()` |
| `profileMutations.ts` | all mutations | add `useInvalidation()`, call `invalidateUserContext()` in each `onSuccess` |
| `onboardingMutations.ts` | `onboardUser` | replace `onboardingKeys.all` with `invalidateAll()` (which subsumes it) |
| `workoutPlanMutations.ts` | `saveWorkoutSessions` | replace local `workoutKeys.all` with `invalidateWorkoutContext()` |
| `workoutPlanMutations.ts` | existing `invalidateWorkouts` local helper | refactor to call `invalidateWorkoutContext()` (removes duplicated inline pair) |
| `exerciseMutations.ts` | save / delete | replace `exerciseKeys.all` with `invalidateExerciseContext()` |
| `oneRepMaxMutations.ts` | `deleteRecord` | add `exerciseKeys.all` invalidation (no new group — stays local) |
| `sessionMutations.ts` | `saveSession` | replace `workoutKeys.all` with `invalidateWorkoutContext()` |
| `sessionMutations.ts` | `updateSessionSet` / `deleteSessionSet` / `addSessionSet` | replace `sessionKeys.all` with `invalidateSessionContext()` |

### What is NOT changing

- `workoutPlanMutations.ts` activate / deactivate / archive / restore / remove / update / create — already correct (`workoutKeys + dashboardKeys`), refactored to use `invalidateWorkoutContext()` for consistency
- `sessionMutations.ts` `deleteSession` / `updateSessionMeta` — already correct (`sessionKeys + dashboardKeys + analyticsKeys`), refactored to use `invalidateSessionContext()` for consistency
- `templateMutations.ts` — templates are standalone; `templateKeys + workoutKeys` is correct
- `oneRepMaxMutations.ts` `saveRecord` — already invalidates both `oneRepMaxKeys` and `exerciseKeys`; keep as-is
- `SettingsPage.tsx` — calls `invalidateQueries()` (no filter) on import/reset; intentional full wipe, keep as-is

## File Structure

```
src/hooks/queries/
  useInvalidation.ts        ← new
  analyticsQueries.ts
  dashboardQueries.ts
  exerciseQueries.ts
  onboardingQueries.ts
  oneRepMaxQueries.ts
  sessionHistoryQueries.ts
  sessionQueries.ts
  workoutQueries.ts
```

## Testing

No new tests are required: the logic being changed is pure query-key bookkeeping. Existing integration tests that cover mutation → UI update flows will catch regressions. Specifically, `tests/integration/session/ActiveSession.test.tsx` and `ActiveSessionPerformance.test.tsx` should continue to pass unchanged.
