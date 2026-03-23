# Hook Layer Analysis Report

## Overview
This report details the findings from an analysis of the React Hook layer within the `src/hooks` directory. It identifies Custom Hooks that are currently defined and exported but remain unused (or strictly localized to their own module) within the broader application hierarchy (`src/components`, `src/pages`, `src/App.tsx`, etc.).

For each unused hook, this report suggests potential integration points in the existing UI layer where these hooks could improve code reuse, maintainability, and data fetching encapsulation.

## Unused Hooks Identified

### 1. `usePerformanceTrends`
**Location:** `src/hooks/usePerformanceTrends.ts`

**Description:**
Fetches a comprehensive performance trend analysis for a specific exercise and active session context. It aggregates:
- `usePerformanceTrend` (from `sessionQueries`)
- `useExerciseHistory` (from `sessionQueries`)
- A direct React Query for `getLatestOneRepMax`

**Potential UI Usage:**
This hook is ideal for **Active Session** components, specifically when a user clicks on an exercise during a workout to view historical performance, trends, or PRs (e.g., inside an "Exercise Details" modal or drawer). Currently, components likely fetch these pieces of information independently or lack aggregated performance insights. It could also be utilized in the `Analytics` or `Exercise Library` pages to show a user's progression over time for a selected exercise.

### 2. `useSessionNavigationHandlers`
**Location:** `src/hooks/activeSession/useSessionNavigationHandlers.ts`

**Description:**
Provides functions to handle navigation inside an active session (e.g., jumping between exercises, navigating to next/previous set).

**Potential UI Usage:**
Could be used in `ActiveSession` layout components, specifically the header or sticky footer controls that manage the "Next Set" / "Previous Exercise" flow, rather than recreating these complex layout navigation events locally in component state.

### 3. `useSessionHandlers`
**Location:** `src/hooks/activeSession/useSessionHandlers.ts`

**Description:**
A wrapper hook for aggregating session-related handlers like starting, pausing, or stopping an active session.

**Potential UI Usage:**
This should be utilized in the primary `ActiveSession` view component. If the view currently handles its own pausing/resuming logic or relies directly on context/stores, this hook would encapsulate those actions neatly.

### 4. `useActiveSessionHealth`
**Location:** `src/hooks/activeSession/useActiveSessionHealth.ts`

**Description:**
Evaluates the "health" of a session based on loaded groups, likely checking if the session state is valid, corrupted, or missing data.

**Potential UI Usage:**
Can be used early in the `ActiveSession` page load lifecycle to automatically redirect the user or show an error state if the loaded session data is invalid. It acts as a safety guardrail.

### 5. `useSessionMutationHandlers`
**Location:** `src/hooks/activeSession/useSessionMutationHandlers.ts`

**Description:**
Provides specific handlers for mutating an active session, such as updating set values or replacing exercises.

**Potential UI Usage:**
Useful in components like `SetRow` or `ExerciseReplacementModal` within an Active Session to dispatch modifications to the current workout state safely through the service layer.

### 6. `useSetCompletionHandlers`
**Location:** `src/hooks/activeSession/useSetCompletionHandlers.ts`

**Description:**
Provides functions specifically tied to marking sets as complete or incomplete, validating their loads and reps.

**Potential UI Usage:**
Should be integrated directly into the `SetRow` component's "Check/Complete" button `onClick` handler.

### 7. `useSessionLoader`
**Location:** `src/hooks/activeSession/useSessionLoader.ts`

**Description:**
A hook to load an active session from the database into the state/store, handling loading states.

**Potential UI Usage:**
This should be the primary data-fetching hook at the very top of the `ActiveSession` route component to bootstrap the application state when entering a workout.

### 8. `useSessionFinishHandlers`
**Location:** `src/hooks/activeSession/useSessionFinishHandlers.ts`

**Description:**
Handles the complex business logic of finishing a session, calculating duration, and saving it to history.

**Potential UI Usage:**
Used in the "Finish Workout" confirmation dialog or the main "Finish" button inside the `ActiveSession` UI.

### 9. `useEnhancedExerciseCatalog`
**Location:** `src/hooks/queries/workoutQueries.ts`

**Description:**
Wraps the `getEnhancedExerciseCatalog` service function, enriching exercise lists with `usageCount` and `lastUsedAt` statistics based on recent history.

**Potential UI Usage:**
This should replace standard `useExerciseList` calls in the **Exercise Selection / Workout Builder** UI (e.g., `WorkoutCreate` or `WorkoutEdit` pages). The UI could automatically sort or highlight "Frequently Used" or "Recently Used" exercises, improving UX.

### 10. `useRoutineInsights`
**Location:** `src/hooks/queries/workoutQueries.ts`

**Description:**
Queries `getRoutineInsights(workoutId)` from the `workoutService` to provide insights about a specific routine.

**Potential UI Usage:**
Could be integrated into the **Workout Plan Detail** page or the **Training Plan Editor** (`usePlanEditor`) to display insights like estimated duration, primary muscle groups targeted, or historical adherence to the routine.

### 11. `useActiveSessionData`
**Location:** `src/hooks/queries/sessionQueries.ts`

**Description:**
React Query wrapper to fetch active session data via `loadActiveSessionData`.

**Potential UI Usage:**
Often used in tandem with or wrapped by `useSessionLoader` to fetch the raw data that populates the active session state.

### 12. `useLoadSuggestions`
**Location:** `src/hooks/queries/sessionQueries.ts`

**Description:**
Fetches load (weight) suggestions for a specific exercise context based on historical performance and PRs.

**Potential UI Usage:**
Highly useful in the `SetRow` component of an Active Session to auto-fill or suggest the next weight a user should attempt, particularly for their first set of an exercise.

### 13. `useHistoryList`
**Location:** `src/hooks/queries/sessionQueries.ts`

**Description:**
Provides a paginated query wrapper around `getHistoryPage(page, pageSize)` from the `historyService`.

**Potential UI Usage:**
This is explicitly designed for the **History Page** (`src/pages/History`). Swapping the current history logic to use `useHistoryList` would immediately leverage React Query's caching, background fetching, and standardized pagination capabilities.

### 14. `useMuscleVolumeDistribution`
**Location:** `src/hooks/queries/analyticsQueries.ts`

**Description:**
Fetches data about how training volume is distributed across different muscle groups over a given timeframe.

**Potential UI Usage:**
Highly relevant for the **Analytics Dashboard** (`src/pages/Analytics` or `src/pages/Dashboard`). It could power a pie chart, radar chart, or bar graph showing "Muscle Group Volume Breakdown" to help users identify if they are over-training or under-training specific body parts.

## Summary & Recommendations
The presence of these 14 unused hooks suggests that data-fetching and complex active session logic have been thoughtfully designed and centralized into hooks, but the UI components have not yet been fully updated to consume them, or the functionality they provide (like active session management and advanced analytics) is still pending UI integration.

**Next Steps for Development:**
1. **Integrate Active Session Logic:** Connect `useSessionHandlers`, `useSessionLoader`, and related handlers to the `ActiveSession` components to remove inline logic.
2. **Refactor Exercise Selection:** Implement `useEnhancedExerciseCatalog` in exercise pickers.
3. **Enhance Session Context:** Use `usePerformanceTrends` and `useLoadSuggestions` to provide better in-workout historical context and smart load assistance.
4. **Upgrade History Pagination:** Refactor the History page to use `useHistoryList`.
5. **Expand Analytics:** Build new chart components in the Analytics page that consume `useMuscleVolumeDistribution`.
