# Duplication and Dead-Code Refactor Report

**Generated:** 2026-07-17  
**Scope:** current `src/` tree (tests noted separately)  
**Method:** `AUDIT.md` was read first; the repository was then fully re-indexed with `codebase-memory-mcp` (8,339 nodes, 18,525 edges). Findings below are based on graph similarity/call relationships plus targeted source confirmation. This is a refactor plan, not a request to change behaviour.

## Important baseline

`AUDIT.md` is partially historical. Its highest-value proposed consolidations are already present in the current source tree:

- `src/services/logic/setStats.ts` now owns set predicates, volume, and set estimates.
- `src/lib/math.ts` owns shared half/decimal rounding.
- `src/lib/lexorank.ts` owns `byOrderIndex`.
- `src/lib/errors.ts`, `src/lib/toast-helpers.ts`, `src/domain/constants.ts`, `src/db/reorder.ts`, `src/db/migrations/v9Backfill.ts`, `src/hooks/useBackup.ts`, and `src/hooks/view-models/useLoadSuggestion.ts` already implement much of the earlier plan.

Do **not** recreate those extractions. Preserve their current API unless a task below explicitly changes it.

## Execution contract for a refactor agent

1. Work one numbered item per commit.
2. Before deleting a symbol, run its exact-name search and verify there is no dynamic/registry use. Graph in-degree is strong evidence, but JSX, barrel exports, and runtime lookup can be under-modelled.
3. Keep the public UI and persisted data format unchanged.
4. After each item run `npm run lint` and the focused tests; run `npm test` for a completed workstream.
5. Do not touch `src/components/ui/**` merely because graph data shows a low in-degree: it is a component-primitives area and has false positives by design.

## Confirmed duplication

### D1 — Extract the identical app-information modal (P1)

**Evidence:** graph similarity is **1.000** across two 62-line local functions.

| Current definition | Caller |
|---|---|
| `src/pages/OnboardingPage.tsx:29-90` `AppInfoModal` | `OnboardingPage` |
| `src/pages/UserSelectionPage.tsx:32-93` `AppInfoModal` | `UserSelectionPage` |

The only intended differences are trigger sizing/icon sizing and two i18n namespace keys (`onboarding.*` vs `users.*`).

**Refactor:** create `src/components/auth/AppInfoModal.tsx` with explicit props, for example:

```ts
type AppInfoModalProps = {
  triggerClassName: string;
  iconClassName: string;
  privacyTitleKey: string;
  offlineInfoKey: string;
};
```

Move the shared dialog body verbatim, render it from both pages, then remove both local functions and their now-unused dialog/icon imports.

**Acceptance:** only one `AppInfoModal` definition remains; both page triggers and translated strings render unchanged.

### D2 — Consolidate three CSV toolbar wrappers (P2)

**Evidence:** graph similarity is **1.000** for every pair below. Each wrapper is an 11-line copy of the same view, differing only in the view-model hook.

- `src/components/csv/ExerciseCsvToolbar.tsx:12-22`
- `src/components/csv/HistoryCsvToolbar.tsx:12-22`
- `src/components/csv/WorkoutCsvToolbar.tsx:12-22`

`src/components/csv/CsvToolbar.tsx:16-45` is already the shared button view; the repeated wrapper also repeats `CsvConflictDialog` and the four translation props.

**Refactor:** add a shared `CsvTransferToolbar` that receives a normalized transfer view-model and renders `CsvToolbar` plus `CsvConflictDialog`. Keep the three entity-specific components only as thin hook adapters, or replace them at call sites if their prop types line up. Do not pass a hook as an ordinary callback and call it conditionally.

**Acceptance:** conflict-dialog wiring and labels exist once; each entity still uses its own import/export implementation.

### D3 — Merge the near-identical active-session accordions (P2)

**Evidence:** graph similarity is **0.984**.

- `src/pages/ActiveSession/components/CompletedExercisesAccordion.tsx:15-48`
- `src/pages/ActiveSession/components/UpcomingExercisesAccordion.tsx:14-46`

Both render the same accordion/unit mapping. The completed variant adds the undo callback/state; the upcoming variant supplies the “upcoming” presentation state.

**Refactor:** introduce `ExerciseUnitsAccordion` accepting `units`, `titleKey`, `unitState` (`'completed' | 'upcoming'`), `onActivateUnit`, and optional `onUndoUnit`. Leave the existing named exports as semantic adapters if that keeps `ActiveSession.tsx` readable.

**Acceptance:** one unit mapping and accordion shell; completed-only undo remains available only for completed units.

### D4 — Collapse three transaction methods into one repository operation (P1)

**Evidence:** all three repository methods have the same transaction/tables and only vary by single-versus-array item insertion. Graph similarity: `addExercise` ↔ `addSuperset` **1.000**; each ↔ generic operation **0.953**.

- `src/db/repositories/SessionRepository.ts:644-657` `addExercise`
- `src/db/repositories/SessionRepository.ts:659-672` `addSuperset`
- `src/db/repositories/SessionRepository.ts:674-686` `addGroupWithItemsAndSets`

Callers are already split by orchestration layer:

- `src/services/sessionMutator.ts:112-156` calls `addExercise`.
- `src/services/sessionMutator.ts:169-216` calls `addSuperset`.
- `src/services/historyService.ts:178-184` calls `addGroupWithItemsAndSets`.

**Refactor:** retain only `addGroupWithItemsAndSets(group, items, sets)`. Convert the single item to `[item]`, pass arrays unchanged for supersets, and delete the redundant `sessionId` parameter (it is currently unused, deliberately named `_sessionId`). The generic implementation’s guarded `bulkAdd` is safe for empty arrays.

**Acceptance:** one transaction implementation owns these three tables; all three service paths produce the same groups/items/sets and rollback semantics.

## Confirmed dead code / cleanup

### X1 — Duplicate import that breaks TypeScript (P0)

**Location:** `src/hooks/activeSession/useSessionFinishHandlers.ts:1` and `:82`.

The module imports `finishSession` at line 1 and repeats the same import after the final `}`. A stricter TypeScript pass reports `TS2300: Duplicate identifier 'finishSession'`; ESLint also reports an import-order error at line 82.

**Action:** delete the trailing line-82 import only. Do not change the line-1 type import of `UnresolvedSet`.

**Acceptance:** no duplicate identifier and no import-order error in this file.

### X2 — Unused imports (P1, mechanical)

These are direct ESLint `@typescript-eslint/no-unused-vars` findings. Remove only the listed imports; no behaviour change is intended.

| File | Symbols | Location |
|---|---|---|
| `src/components/layout/AppLayout.tsx` | `AnimatePresence` | import line 3 |
| `src/pages/Dashboard/components/ConsistencyHeatmap.tsx` | `CardHeader`, `CardTitle` | import line 3 |
| `src/pages/Dashboard/components/MuscleFreshnessList.tsx` | `CardHeader`, `CardTitle` | import line 5 |
| `src/pages/HistoryList.tsx` | `useMemo` | import line 1 |
| `src/pages/SessionDetail/components/ExerciseGroupCard.tsx` | `MoreVertical`, `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuTrigger` | imports lines 3 and 13 |

**Acceptance:** the listed warnings disappear; retain imports that become used during a simultaneous feature change.

### X3 — Stale TypeScript suppression (P2)

**Location:** `src/db/repositories/UserProfileRepository.ts:38,41,44`.

The strict typecheck reports three `TS2578` errors: unused `@ts-expect-error` directives.

**Action:** remove each directive, then run the normal project typecheck/build to ensure no intended incompatibility is being hidden.

### X4 — Unused component prop (P2; verify call sites first)

**Location:** `src/pages/OneRepMax/components/OneRepMaxCard.tsx:37` (`onAddRecord`).

ESLint reports the prop is declared but never read. Use graph `trace_path`/exact-name search to find every `<OneRepMaxCard>` call site, remove `onAddRecord` from the prop type and callers only if no API consumer needs it.

**Acceptance:** no unused-argument warning; adding a record still happens through the existing visible control, if one exists.

## High-confidence dead-code candidates — verify then delete

These candidates have no graph inbound usages and targeted exact-name search did not show a production call. They are not automatic deletions because exported functions can be used dynamically or by external code.

| Candidate | Evidence | Safe next step |
|---|---|---|
| `src/services/sessionExecutionService.ts:471-473` `SessionExecutionService.quickAddExercise` | graph in-degree `0`; the corresponding `quickAddSuperset` has one caller | exact-name search including tests; if no call, delete it. The active-session UI already exposes `onQuickAddExercise` through a separate action path. |
| `src/lib/formatting.ts:31-33` `formatPercentage` | graph in-degree `0`; targeted helper search found only its definition | exact-name search; delete if still unused. Do not remove `formatRPE`/`formatChartDate`, which have callers. |
| `src/services/logic/setStats.ts:14` `isPendingSet` | graph in-degree `0`; `filterPending` has four callers | exact-name search; delete only this predicate if no import/test uses it. |

## Explicit non-findings / avoid false positives

- `DetailPageSkeleton`, `EnumCheckboxSelector`, and the active-session hooks are live despite low or misleading graph call counts; targeted source search finds production consumers.
- `snapRpe` is used inside `RPESelector`; do not delete it based on in-degree alone.
- The old audit’s volume math, set filtering, 1RM block, rounding, formatting helpers, ordering comparator, migration extraction, backup hook, and load-suggestion hook are already consolidated. No residual matches were found for the old raw volume/filter/rounding patterns in `src/`.
- Do not mass-delete zero-in-degree exports from `src/components/ui/**`; graph resolution is intentionally weak for JSX primitive composition.

## Refactor blockers discovered during verification

These are not all duplication/dead-code items, but they prevent a clean typecheck and should be fixed before using TypeScript as a deletion gate.

1. `npx tsc -p tsconfig.app.json --noUnusedLocals true --noUnusedParameters true --pretty false` fails before completion. Representative non-dead-code errors include i18n key typing, `Progress` prop mismatches, fixture arithmetic/types, `db/reorder.ts` update typing, missing `GlobalAppState.language`, and toast callback typing.
2. `npm run lint` currently fails with **12 errors and 67 warnings**. Besides X1/X2, most errors are import-order violations. The report deliberately does not fold generic style warnings or test-only unused imports into the production dead-code backlog.
3. `tsconfig.json` has `noUnusedLocals` and `noUnusedParameters` set to `false`; enabling them should be a separate, staged quality task after the existing type errors are addressed.

## Recommended order

1. **Unblock checks:** X1, X2, X3, then existing import-order errors.
2. **Lowest-risk deduplication:** D1 and D4, with focused UI/repository tests.
3. **UI composition:** D2 and D3, with interaction tests for CSV conflict selection and completed-unit undo.
4. **Deletion sweep:** verify and handle each X4/candidate item individually; do not batch speculative removals.

## Final validation checklist

```bash
npm run lint
npm test
npm run build
```

For D4, add or retain a repository test that verifies one-item, multi-item, and empty-set-array writes. For D1–D3, add focused component tests that preserve trigger size, translated text, CSV conflict flow, unit activation, and completed-unit undo.
