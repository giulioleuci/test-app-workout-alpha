# Architecture Audit & Refactoring Plan

**Project:** Workout Tracker 2
**Scope:** Full codebase (368 source files, ~43.3k LOC under `src/`)
**Goals:** (1) reduce code duplication, (2) improve separation of responsibilities, (3) improve separation between layers.
**Audience:** This document is a directly-implementable plan. Each work item lists concrete files, line references, the target shape, and acceptance checks. Items are independently shippable.

---

## 0. Intended Architecture (the target)

The codebase already declares a layered, domain-centric architecture. The intended dependency direction is:

```
pages / components (presentation)
        ↓ (only via hooks)
hooks: queries / mutations / view-models / activeSession
        ↓
services (business logic, orchestration)   ← may use domain
        ↓
db/repositories (persistence, Dexie)
        ↓
db/database.ts (Dexie schema)

domain/ (entities, enums, value-objects, FormattingService)  ← pure, no deps on db/services
lib/ (formatting, math, lexorank, dayjs, errors)             ← pure utilities, leaf layer
```

The audit measures every layer against this target. The codebase is **well-organized overall** — there is a real repository layer, a real service layer, query/mutation/view-model hooks, a centralized design system, and a clean domain layer. The problems are **localized leaks and pervasive small-scale duplication**, not structural collapse. This plan fixes them without a rewrite.

### Severity legend
- **P1 (High):** layering violations or duplication that actively causes bugs/maintenance drag; fix first.
- **P2 (Medium):** clear separation/duplication issues with bounded blast radius.
- **P3 (Low):** polish, consistency, ergonomics.

---

## 1. Findings Summary

| # | Finding | Goal | Severity | Primary locations |
|---|---------|------|----------|-------------------|
| F1 | `load × reps` volume math reimplemented 6× | dup | P1 | `analyticsCalculators.ts:232,256`, `performanceAnalyzer.ts:127,241`, `dashboardService.ts:172`, `ExercisePerformanceService.ts:123` |
| F2 | `sets.filter(isCompleted[/isSkipped])` repeated 30× | dup | P1 | 30 sites across services + components (see §3.2) |
| F3 | 1RM + relativeIntensity block copy-pasted 3× in one file | dup | P1 | `sessionExecutionService.ts:36-41,274-279,382-387` |
| F4 | `Math.round(x*2)/2` weight rounding inline 10×, `roundToHalf()` exists but unused | dup | P1 | `LoadSuggestionDialog.tsx:126,141,156`, `TheoreticalPerformanceMatrix.tsx:28,33`, `loadCalculationService.ts:20,21,37,56`, `rpePercentageTable.ts:57` |
| F5 | Group→Item→Set hydration sequence re-fetched 5× in services | dup/layer | P1 | `analyticsService.ts:109-114`, `historyService.ts:99-106`, `dashboardService.ts:93-95`, `performanceAnalyzer.ts:50-104` |
| F6 | Component imports `SessionRepository` directly (skips hooks+services) | layer | P1 | `components/session/LoadSuggestionDialog.tsx:13,66-70` |
| F7 | Services bypass repositories with raw `db.*` Dexie calls | layer | P1 | `backupService.ts:90-92,125-127`, `csvHistoryService.ts:122-123` |
| F8 | Business logic (1RM, volume, muscle aggregation) inside DB migration v9 | layer | P1 | `db/database.ts:176,193-250` |
| F9 | Oversized multi-responsibility components/pages | resp | P2 | `LoadSuggestionDialog.tsx` (381), `WorkoutDetail.tsx` (324), `BackupPage.tsx` (332), `OneRepMaxPage`, `AnalyticsPage` |
| F10 | Business calculations embedded in presentation components | resp | P2 | `TheoreticalPerformanceMatrix.tsx:21-37`, `LoadSection.tsx:36-44`, `OneRMvsBodyWeightSection.tsx:40-80`, `SessionVolumeDialog.tsx:58-83` |
| F11 | Inconsistent query invalidation (centralized hook vs inline) | resp | P2 | `useInvalidation.ts` vs `templateMutations.ts:10-13`, `workoutPlanMutations.ts:69-76`, `oneRepMaxMutations.ts:12-15` |
| F12 | Two invalidation scopes for the same "finish session" action | resp | P2 | `useSessionLoader.ts:16` (narrow) vs `useSessionFinishHandlers.ts:27` (broad) |
| F13 | Direct service calls from components instead of mutation hooks | layer | P2 | `CreateUserDialog.tsx:128-162`, `BackupPage.tsx:66-90` |
| F14 | Repeated transaction boilerplate in repositories | dup | P2 | `SessionRepository.ts` (15+ sites), `WorkoutPlanRepository.ts:62-71`, `ExerciseRepository.ts:48-64` |
| F15 | Repeated LexoRank sort (`sortBy('orderIndex')` / `localeCompare`) | dup | P2 | `WorkoutPlanRepository.ts` (10+), `SessionRepository.ts` (11+) |
| F16 | Formatting embedded in service calculations (returns pre-formatted strings) | resp | P2 | `analyticsCalculators.ts:46-48,207`, `durationEstimator.ts:224-240`, `dashboardService.ts:174-176` |
| F17 | RPE `.toFixed(1)` display formatting inline 9× | dup | P3 | `FatigueIndicator.tsx:40,43,53,65`, `RPESelector.tsx:56`, `setCountAdvisor.ts:117`, `LastWorkoutSummaryCard.tsx:65` |
| F18 | Inline `dayjs().format(...)` instead of `lib/formatting` helpers | dup | P3 | 11+ sites (see §6.3) |
| F19 | Magic numbers scattered (default rest `90`, RPE bounds, percentage/reps arrays, Epley/O'Conner coefficients) | dup | P3 | `durationCalculators.ts:48,61`, `durationEstimator.ts:80`, `loadCalculationService.ts:33,49`, `oneRepMaxLogic.ts:13,17` |
| F20 | `err instanceof Error ? err.message : ...` + destructive toast repeated 30+× | dup | P3 | CSV toolbars, `BackupPage.tsx:101`, Settings/WorkoutList pages |
| F21 | `DurationRange` type defined in service layer, not `domain/value-objects.ts` | resp | P3 | `services/durationCalculators.ts:5` |
| F22 | Pages with 8–10 `useState` and inline logic (no view-model) | resp | P3 | `OneRepMaxPage.tsx:30-47`, `AnalyticsPage.tsx:20-27` |

**Healthy areas (no action needed):** `stores/activeSessionStore.ts` (pure UI state), `domain/` (clean, no outward deps), query-hook data path (consistently component→hook→service→repo→db), repository return types (return domain entities, not Dexie collections), `BaseRepository.validateData` (correct boundary validation), Dexie migration/versioning structure (v1–v14, well sequenced — except the embedded logic in F8).

---

## 2. Guiding rules for the refactor

1. **No behavior change.** Every item is a structure-preserving refactor. Output values must be identical. Lean on the existing test suite (`npm test`) and add characterization tests where coverage is thin.
2. **One concern per item.** Land each numbered work item as its own commit/PR so regressions are bisectable.
3. **Dependency direction is law.** After this work: components import only hooks; hooks import services; services import repositories + domain + lib; repositories import db + domain + lib; domain/lib import nothing upward.
4. **Pure where possible.** Calculation functions take data in, return data out — no Dexie access, no formatting, no `t()`.
5. **Verify with `npm run lint && npm test`** after each item.

---

## 3. WORKSTREAM A — Reduce Code Duplication

### A1 (P1) — Create a shared set-statistics module
**Problem:** F1, F2, F3 — volume math, completed-set filtering, and 1RM/relative-intensity computation are duplicated across the service layer.

**Action — create `src/services/logic/setStats.ts`** (pure, no db/formatting):
```ts
import type { SessionSet } from '@/domain/entities';
import { calculateWeighted1RM } from '@/services/rpePercentageTable';

export const isCompletedSet      = (s: SessionSet) => s.isCompleted;
export const isEffectiveSet      = (s: SessionSet) => s.isCompleted && !s.isSkipped;
export const filterCompleted     = (sets: SessionSet[]) => sets.filter(isCompletedSet);
export const filterEffective     = (sets: SessionSet[]) => sets.filter(isEffectiveSet);

export const setVolume   = (s: SessionSet) => (s.actualLoad ?? 0) * (s.actualCount ?? 0);
export const totalVolume = (sets: SessionSet[]) => sets.reduce((sum, s) => sum + setVolume(s), 0);

/** 1RM estimate + body-weight-relative intensity for a single completed set. */
export function computeSetEstimates(
  load: number | null, reps: number | null, rpe: number | null, bodyWeight?: number | null,
): { e1rm?: number; relativeIntensity?: number } {
  const est = calculateWeighted1RM(load, reps, rpe)?.media;
  if (!est || est <= 0) return {};
  const out: { e1rm?: number; relativeIntensity?: number } = { e1rm: est };
  if (bodyWeight && bodyWeight > 0) out.relativeIntensity = Math.round((est / bodyWeight) * 100) / 100;
  return out;
}
```

**Replace at these call sites:**
- Volume (F1): `analyticsCalculators.ts:232,256` → `totalVolume(completedSets)`; `performanceAnalyzer.ts:127,241`; `dashboardService.ts:172`; `ExercisePerformanceService.ts:123`.
- Completed filtering (F2): all 30 sites from §3.2 below; map `s.isCompleted` → `filterCompleted`, `s.isCompleted && !s.isSkipped` → `filterEffective`. **Note:** distinguish the two predicates carefully — `performanceAnalyzer`/`ExercisePerformanceService` use `&& !s.isSkipped`; `dashboardService`/`historyService` use plain `isCompleted`. Preserve each.
- 1RM block (F3): `sessionExecutionService.ts:36-41,274-279,382-387` → `const extras = { ...extras, ...computeSetEstimates(load, reps, rpe, bodyWeight) }`.

**Acceptance:** all three patterns import from `setStats.ts`; `grep -rn "actualLoad ?? 0) \* (s.actualCount" src` returns only `setStats.ts`; tests green.

#### §3.2 — Full list of F2 (`isCompleted`) sites (30)
`useActiveSessionViewModel.ts:56`, `sessionMutator.ts:61,62`, `analyticsCalculators.ts:230,249`, `oneRepMaxService.ts:113`, `exerciseHistoryService.ts:83`, `sessionFinisher.ts:30`, `setCountAdvisor.ts:48,106`, `performanceAnalyzer.ts:123,237`, `analyticsService.ts:318`, `dashboardService.ts:169,180`, `ExercisePerformanceService.ts:109,110`, plus presentation-side counts in `SequentialGroupRenderer.tsx:188`, `ClusterGroupRenderer.tsx:40,64` (and remaining sites surfaced by `grep -rn "filter(.*isCompleted" src`). Presentation-side uses may stay inline OR adopt the helper for consistency — but do not pull `SessionSet` business types into renderers that operate on display units.

---

### A2 (P1) — Route all weight rounding through `lib/math`
**Problem:** F4 — `roundToHalf()` exists at `src/lib/math.ts:9` and `roundTo01()` at `:17`, but 10+ sites reimplement `Math.round(x*2)/2` / `Math.round(x*10)/10` inline.

**Action:** replace every inline rounding with `roundToHalf` / `roundTo01`:
- `loadCalculationService.ts:20,21,37,56`, `rpePercentageTable.ts:57,61,62,65,66` (services first — these feed the components).
- `LoadSuggestionDialog.tsx:126,141,156`, `TheoreticalPerformanceMatrix.tsx:28,33` (these should mostly disappear once A2/B-stream moves their math into services — see B2).

**Acceptance:** `grep -rn "Math.round([^)]*\* 2) / 2" src` returns nothing (or only `lib/math.ts`).

---

### A3 (P2) — Repository transaction & ordering helpers
**Problem:** F14, F15 — transaction boilerplate (15+ sites) and LexoRank sort (`sortBy('orderIndex')` / `a.orderIndex.localeCompare(b.orderIndex)`, 20+ sites) are copy-pasted across repositories.

**Action:**
1. Add to `src/lib/lexorank.ts`: `export const byOrderIndex = <T extends { orderIndex: string }>(a: T, b: T) => a.orderIndex.localeCompare(b.orderIndex);` Replace all manual `localeCompare(b.orderIndex)` (e.g. `SessionRepository.ts:483,548,558,698,710`, `WorkoutPlanRepository.ts:365,376,386,406`) with `.sort(byOrderIndex)`.
2. Add `src/db/reorder.ts` with a reusable reorder helper that takes `(table, orderedIds)` and assigns `generateSequentialRanks` inside a transaction — replaces the repeated block at `SessionRepository.ts:269-277` and its WorkoutPlan twin.
3. (Optional, lower value) a thin `txn(tables, fn)` wrapper in `db/transactionHelper.ts` to standardize `db.transaction('rw', [...], fn)`. Only adopt if it reduces noise without obscuring the table list.

**Acceptance:** manual `localeCompare(b.orderIndex)` count drops to 0; reorder logic exists in one place.

---

### A4 (P3) — Formatting helpers for RPE, dates, percentages
**Problem:** F17, F18 — `.toFixed(1)` RPE display (9×), inline `dayjs().format()` (11×), and `Math.round(x*100)` percentage (12×) duplicated.

**Action:**
- Add `formatRPE(v: number): string` and `formatPercentage(fraction: number): string` to `src/lib/formatting.ts`. Replace F17 sites and the percentage sites listed in F19/§6.
- Replace inline `dayjs(...).format('DD/MM' | 'DD/MM/YY' | 'YYYY-MM-DD' | 'DD MMM YYYY')` with existing/added helpers in `lib/formatting.ts` (extend with `formatChartDate`, `formatIsoDate` as needed). Sites: `ExerciseHistoryButton.tsx:82,83`, `AnalyticsFilters.tsx:101,118`, `PerformanceTrendIndicator.tsx:121`, `OneRMvsBodyWeightSection.tsx:55,71`, `csvWorkoutService.ts:324`, `csvHistoryService.ts:206`, `backupService.ts:286`, `ExerciseCsvToolbar.tsx:41`, and the local `formatDate` in `analyticsCalculators.ts:46-48`.

**Acceptance:** no component calls `dayjs(...).format` directly; RPE/percentage formatting centralized.

---

### A5 (P3) — Centralize constants
**Problem:** F19 — magic numbers scattered.

**Action — create `src/domain/constants.ts`:**
```ts
export const DEFAULT_REST_SECONDS = 90;
export const RPE_MIN = 6, RPE_MAX = 10, RPE_STEP = 0.5;
export const PERCENTAGE_1RM_MIN = 40, PERCENTAGE_1RM_MAX = 100;
export const LOAD_PERCENTAGE_OPTIONS = [1.0,0.95,0.9,0.85,0.8,0.75,0.7,0.65,0.6,0.55,0.5];
export const XRM_REP_OPTIONS = [1,2,3,4,5,6,8,10,12];
export const SECONDS_PER_MINUTE = 60;
```
Move the 1RM-formula coefficients (`oneRepMaxLogic.ts:13` `0.0333`, `:17` `0.025`, `:22` `0.10`, Brzycki `36/(37-reps)`) into named constants **inside `oneRepMaxLogic.ts`** (they are domain math; keep them next to the formula, just named). Replace `?? 90` defaults (`durationCalculators.ts:48,61`, `durationEstimator.ts:80`, `WarmupConfigDialog.tsx:28`), the percentage/reps arrays (`loadCalculationService.ts:33,49`), and `min={40} max={100}` (`PlannedSetLoadSection.tsx:71,84`).

**Acceptance:** `grep -rn "?? 90" src/services` returns nothing; arrays defined once.

---

### A6 (P3) — Error + toast helpers
**Problem:** F20 — `err instanceof Error ? err.message : String(err)` (4+) and destructive-variant toast (30+) duplicated.

**Action:** add `src/lib/errors.ts` with `extractErrorMessage(err: unknown): string`, and `src/lib/toast-helpers.ts` with `showErrorToast(toast, title, description?)` / `showSuccessToast(...)`. Apply to CSV toolbars (`ExerciseCsvToolbar.tsx:63,65`, `HistoryCsvToolbar.tsx:60,63`, `WorkoutCsvToolbar.tsx:61,63`), `BackupPage.tsx:101,103`. Keep `toast` passed in (hook-bound) to avoid a hidden dependency.

**Acceptance:** the error-extraction ternary appears only in `lib/errors.ts`.

---

## 4. WORKSTREAM B — Improve Separation of Responsibilities

### B1 (P1) — Move business logic out of DB migration v9
**Problem:** F8 — `db/database.ts:176` calls `calculateWeighted1RM`, and `:193-250` performs volume/duration/muscle aggregation inside the Dexie upgrade callback. Persistence-schema code owns domain math.

**Action:** extract the calculation bodies into pure functions in a new `src/db/migrations/v9Backfill.ts` (e.g. `backfillSetE1rm(set)`, `aggregateSessionTotals(sets, snapshotLookup)`), and have the migration import and call them. The migration keeps orchestration (iterate tables, write rows); the math lives in testable functions.

**Acceptance:** `database.ts` contains no arithmetic on `actualLoad`/`actualCount`; new module unit-tested with `fake-indexeddb`-free pure inputs.

---

### B2 (P2) — Lift business calculations out of presentation components
**Problem:** F10 — components compute domain numbers inline.

**Action:** create/extend services and call them from components (via hooks where data-fetching is involved):
- `TheoreticalPerformanceMatrix.tsx:21-37` (XRM matrix) → move to `LoadCalculationService` (e.g. `buildXRMMatrix(oneRM)`); component renders the returned rows.
- `LoadSection.tsx:36-44` (load progression %) and `OneRMvsBodyWeightSection.tsx:40-80` (strength-to-weight ratio) → add `analyticsCalculators` functions `loadProgressionPct(points)` and `strengthToWeight(records, bodyweights)`. Components consume results.
- `SessionVolumeDialog.tsx:58-83` (item flattening + `analyzeItemsFromData`) → move the flatten+analyze into a `useSessionVolume` view-model hook or `volumeAnalyzer` helper.

**Acceptance:** no `Math.round`/`reduce` business math in `components/analytics/**`; components receive computed view-data.

---

### B3 (P2) — Separate formatting from service calculations
**Problem:** F16 — services return pre-formatted strings, coupling calculation to presentation.

**Action:** make calculators return raw values; format at the edge.
- `analyticsCalculators.ts:46-48,207` — return `Date`/numbers (e.g. `weekStart: Date`) instead of `'DD/MM'` strings; the chart components format via A4 helpers.
- `durationEstimator.ts:224-240` (`formatDurationRange`, `formatSeconds`) — keep estimation returning seconds; move string formatting to `lib/formatting` and call from components.
- `dashboardService.ts:174-176` — return seconds/minutes raw; format in the card.

**Acceptance:** `services/**` (excluding explicit `*Formatters`) contains no `dayjs(...).format` and no human-readable string assembly.

---

### B4 (P2) — Decompose oversized components/pages
**Problem:** F9 — files mixing fetch + business logic + rendering.

**Action (split each into hook + view + optional service):**
- `LoadSuggestionDialog.tsx` (381) → `useLoadSuggestion` hook (data + recommendation memo, lines ~63-187) + `LoadSuggestionDialog` (render only). This also resolves F6 (see B5).
- `WorkoutDetail.tsx` (324) → extract in-memory session CRUD into a `useWorkoutEditor` hook (mirror existing `usePlanEditor` used by `SessionDetail.tsx`).
- `BackupPage.tsx` (332) → `useBackup` hook wrapping export/import/conflict flow (also addresses F13).
- `TemplateEdit.tsx` (238) — already uses `usePlanEditor`; extract the template-materialization step (lines ~48-113) into `templateService`.

**Acceptance:** target files drop below ~180 lines and contain only JSX + handler wiring.

---

### B5 (P3) — Page view-models for stateful pages
**Problem:** F22 — `OneRepMaxPage.tsx:30-47` (10 `useState`), `AnalyticsPage.tsx:20-27` (8 filter states).

**Action:** introduce `useOneRepMaxPageViewModel` and `useAnalyticsFilters` hooks that own the local state and derived data, matching the established `useActiveSessionViewModel` pattern. Pages become thin.

**Acceptance:** these pages expose `{ state, actions }` from a single hook; no loose `useState` clusters.

---

## 5. WORKSTREAM C — Improve Separation Between Layers

### C1 (P1) — Remove repository import from component
**Problem:** F6 — `LoadSuggestionDialog.tsx:13` imports `SessionRepository`; `:66-70` calls it inside a `useQuery`.

**Action:** the `useLoadSuggestion` hook from B4 owns the query; the underlying data fetch (`getPrioritized1RM`, `getLastSetPerformance`, `getLastPerformance`) moves behind a service function (e.g. `loadSuggestionEngine.getSuggestionInputs(exerciseId, plannedSetId)`), which is the only place that touches `SessionRepository`. Add a query key under `sessionKeys`.

**Acceptance:** `grep -rn "from '@/db/" src/components src/pages` returns nothing.

---

### C2 (P1) — Stop services bypassing the repository layer
**Problem:** F7 — services reach into Dexie directly.

**Action:**
- `csvHistoryService.ts:122-123` (`db.plannedSessions.toArray()`) → add `WorkoutPlanRepository.getAllSessions()` and use it. (`db` import then removed from this file.)
- `backupService.ts:90-92,125-127` (generic `getTable(name).toArray()`, `.where('id').anyOf(...)`) → this is legitimately a cross-table bulk export/import that the per-entity repositories don't model. Resolve by **introducing a `BackupRepository`** (in `db/repositories/`) that owns the generic table access and conflict-key lookups. `backupService` then orchestrates via that repository and keeps only serialization + strategy logic. This keeps the "only repositories touch `db`" rule intact.

**Acceptance:** `grep -rln "from '@/db/database'" src/services` returns nothing (all raw `db` access lives in `db/repositories/**`).

---

### C3 (P2) — Push query/batching orchestration into repositories
**Problem:** F5 — services manually fetch groups→items→sets in sequence and own batch-size constants (`analyticsService.ts:90-105` BATCH_SIZE=50; `performanceAnalyzer.ts:50-104`).

**Action:** add `SessionRepository.getHydratedSessions(sessionIds, opts?)` returning fully-joined sessions (groups+items+sets) and absorbing the chunking. Replace the manual sequences at `analyticsService.ts:109-114`, `historyService.ts:99-106`, `dashboardService.ts:93-95`, `performanceAnalyzer.ts:50-104`. Services keep calculation; repositories own how data is queried/batched.

**Acceptance:** the `getGroupsBySession… → getItemsByGroups… → getSetsByItems…` triad appears only inside `SessionRepository`.

---

### C4 (P2) — Unify query invalidation
**Problem:** F11, F12 — two invalidation mechanisms and inconsistent scopes.

**Action:**
1. Make `useInvalidation` (`hooks/useInvalidation.ts`) the single source. Add any missing context groups (`invalidateTemplateContext`, `invalidateOneRepMaxContext`).
2. Replace inline `queryClient.invalidateQueries` in `templateMutations.ts:10-13`, `workoutPlanMutations.ts:69-76`, `oneRepMaxMutations.ts:12-15` with the corresponding `useInvalidation` callbacks.
3. Resolve F12: `useSessionLoader.ts:16` (narrow `sessionKeys.all`) vs `useSessionFinishHandlers.ts:27` (broad) — pick the intended scope per action. "Finish session" affects analytics+dashboard+workout, so it should use the broad `invalidateSessionContext`; the loader's `loadData` refetch can stay narrow (it is a reload, not a finish). Document the rule in `useInvalidation`.

**Acceptance:** `grep -rn "queryClient.invalidateQueries" src/hooks/mutations` returns nothing; all invalidation flows through `useInvalidation`.

---

### C5 (P2) — Components use mutation hooks, not services directly
**Problem:** F13 — `CreateUserDialog.tsx:128-162` and `BackupPage.tsx:66-90` call services from submit handlers.

**Action:** wrap these flows in mutation hooks: `useCreateUser` (composing `userService.createUser` + `systemService.mountUser` + `onboarding.onboardUser`) and `useBackup` (from B4). Components call the mutation and render state.

**Acceptance:** `components/auth` and `pages/BackupPage` import no `*Service` directly; they use hooks.

---

### C6 (P3) — Relocate `DurationRange` type to domain
**Problem:** F21 — `services/durationCalculators.ts:5` defines a value-object-shaped type in the service layer; re-exported by `durationEstimator.ts:12`.

**Action:** move `DurationRange` to `src/domain/value-objects.ts` alongside the other range types; update imports.

**Acceptance:** `DurationRange` declared only in `domain/value-objects.ts`.

---

## 6. Reference: duplication evidence (grep-verified)

These were confirmed live during the audit and are the regression checks for the workstreams above.

### 6.1 Volume math (F1) — exact duplicates
```
analyticsCalculators.ts:232   completedSets.reduce(... (s.actualLoad ?? 0) * (s.actualCount ?? 0), 0)
analyticsCalculators.ts:256   (identical)
performanceAnalyzer.ts:127    completed.reduce(... (s.actualCount ?? 0) * (s.actualLoad ?? 0), 0)
performanceAnalyzer.ts:241    (identical)
dashboardService.ts:172       completedSets.map(s => (s.actualLoad ?? 0) * (s.actualCount ?? 0)).reduce(...)
ExercisePerformanceService.ts:123  L += (s.actualCount ?? 0) * (s.actualLoad ?? 0)
```

### 6.2 1RM block (F3) — `sessionExecutionService.ts`
```
36-41   / 274-279 / 382-387   calculateWeighted1RM(...) + relativeIntensity = Math.round((est/bw)*100)/100
```

### 6.3 Layering counts (verified)
```
components/pages importing '@/db/*'        : 1  (LoadSuggestionDialog.tsx)
services importing '@/db/database' (raw db): backupService.ts, csvHistoryService.ts
services importing repositories            : 30 files  (intended; orchestration leaks are C3)
```

---

## 7. Suggested execution order

1. **Foundations (no risk):** A5 constants, A6 errors/toast, A4 formatters, C6 type move.
2. **Pure extractions:** A1 setStats, A2 rounding, A3 repo helpers.
3. **Layer fixes:** B1 migration logic, C2 db bypass, C1 component→repo, C4 invalidation.
4. **Decomposition (largest blast radius):** C3 hydration repo method, B2/B3 logic+formatting out of UI, B4/B5 component & page splits, C5 mutation hooks.

Run `npm run lint && npm test` after every item. Add characterization tests for `setStats.ts`, `v9Backfill.ts`, and `getHydratedSessions` before refactoring their callers.

---

## 8. Out of scope / explicitly fine
- `src/components/ui/**` (shadcn primitives) — vendored, leave as-is.
- `stores/activeSessionStore.ts` — already pure UI state; do not add logic.
- `domain/**` — already dependency-clean; only receives `constants.ts` (A5) and `DurationRange` (C6).
- Dexie migration **structure** (v1–v14 sequencing) — sound; only v9's embedded math moves (B1).
