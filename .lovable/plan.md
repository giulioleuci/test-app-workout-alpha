
# Redesign of InterleavedGroupRenderer + Rest Field Clarification

## Summary

Two related changes are needed:
1. **Rename/relabel the group-level rest field** to make its true semantics clear: it is the rest between completing a full round and starting the next, not the rest between exercises within a round.
2. **Completely rewrite the `InterleavedGroupRenderer`** so that the "grouping on the same screen" logic is driven by the per-exercise `restSecondsRange` on `PlannedSet`, not by the group-level `restBetweenExercisesSeconds`.

---

## Part 1 — Field Rename: `restBetweenExercisesSeconds` → `restBetweenRoundsSeconds`

### Semantic clarification

| Field | Correct meaning | Where it lives |
|---|---|---|
| `PlannedExerciseGroup.restBetweenExercisesSeconds` (current name) | Rest between completing one full round and starting the next | `PlannedExerciseGroup` entity |
| `PlannedSet.restSecondsRange` | Rest after completing one set of this exercise (within the round) | `PlannedSet` entity |

The current name is misleading. We rename the field to `restBetweenRoundsSeconds` everywhere.

### Files to update

- `src/domain/entities.ts` — rename field on `PlannedExerciseGroup` and `SessionTemplateContent`
- `src/db/database.ts` — update the Dexie schema string if indexed
- `src/db/fixtures.ts` — update all fixture objects
- `src/services/backupValidation.ts` — update Zod schema
- `src/services/sessionCloner.ts` — update field reference
- `src/pages/SessionDetail/components/ExerciseGroupCard.tsx` — update input binding + label
- `src/pages/TemplateEdit.tsx` — update input binding
- `src/i18n/it.ts` — update the label key (`restBetweenExercises` → `restBetweenRounds`)
- `src/pages/ActiveSession/components/InterleavedGroupRenderer.tsx` — update reference from `restBetweenExercisesSeconds` to `restBetweenRoundsSeconds`

### UI label change

In `ExerciseGroupCard` and `TemplateEdit`, the label currently reads something like "Riposo tra esercizi". It will be updated to "Riposo tra round" to reflect that this field controls the pause between completing one full round and starting the next.

---

## Part 2 — InterleavedGroupRenderer: Screen-grouping by per-exercise rest

### New logic

For an interleaved group at round R, the renderer iterates over the exercises in order. It splits them into **"screens"** — groups of consecutive exercises that are shown together on one card — using this rule:

> Exercise N and Exercise N+1 are shown on the **same screen** if Exercise N's current-round `PlannedSet.restSecondsRange` is absent (`undefined`/`null`), or has `min = 0` and (`max = 0` or `max` is absent).
> Otherwise, Exercise N ends the current screen, and a rest timer is shown before Exercise N+1 starts a new screen.

This logic mirrors how the app works for standard sequential exercises: a non-zero rest means "stop here, show the timer, then continue."

### New screen model

```text
Round R of group G:
  Screen 0: [ ExA (rest=0s) | ExB (rest=0s) ]  → shown together, one "Completa" button
  Screen 1: [ ExC (rest=60s) ]                  → standalone, timer fires after completion
  Screen 2: [ ExD ]                             → standalone (last item, no timer after)
```

The active screen is tracked by a derived value: given `current.ii` (which exercise within the round is active), we compute which screen it belongs to, and render all exercises of that screen together.

### State changes

The `CurrentTarget.ii` already tracks which item (exercise) is active within the group. The renderer computes "screens" from the item list on each render — no new persistent state.

A new local helper `buildScreens(items, roundIndex)` will:
1. Walk through each item in `lg.items`.
2. Look up the `PlannedSet` for `roundIndex` for that item.
3. Check if its `restSecondsRange` means "no rest" (undefined, both null/0, or min=0).
4. Group consecutive "no-rest" items into a single screen.
5. Return `Screen[]` = `Array<{ items: LoadedItem[], itemIndices: number[] }>`.

### Rendering model per screen

**Single-item screen** (has its own rest): Renders like a focused sequential card. Has the full `SetInputWidget` with "Completa / Salta / Salta rimanenti / Aggiungi" button row. After completion the rest timer fires (using `PlannedSet.restSecondsRange`).

**Multi-item screen** (exercises run back-to-back with 0 rest between them): All exercises are shown together in one card, each with its `SetInputWidget` with `hideActions={true}`. A single shared "Completa round / Salta / Salta rimanenti / Aggiungi" button row at the bottom completes all sets in the screen at once, using `widgetRefs` to collect data (existing `handleRegisterRound` approach, but scoped to a screen rather than the whole round).

### Rest timer logic

After completing the last exercise in a screen:
- If there are more screens left in this round: fire timer using that last exercise's `restSecondsRange.min`.
- After completing the last screen in a round: fire timer using `restBetweenRoundsSeconds` (the renamed group-level field).
- After the final round: no timer.

This replaces the current hard-coded `isZeroRest` branch with a proper per-item rest check.

### Handler changes

`handleCompleteRound` in `useSessionHandlers.ts` currently completes all sets in a round at once. With the new screen model, we need either:
- A `handleCompleteScreen(group, roundIndex, screenItems, setsData)` handler that completes only the exercises in the current screen.
- The existing `handleCompleteRound` can remain for the "all exercises together" case, but we add the new scoped version.

The `onCompleteRound` callback type in `ExerciseGroupRendererProps` will remain; a new `onCompleteScreen` callback is added alongside it.

### Navigation/viewed-set changes

`viewedSetParams.ii` continues to point to the focused item. When a screen has multiple items, `ii` points to the first incomplete item in that screen. Set navigation arrows (prev/next) work per-item within the screen.

---

## Technical implementation order

1. Rename `restBetweenExercisesSeconds` → `restBetweenRoundsSeconds` across all files.
2. Update i18n labels.
3. Add `onCompleteScreen` to `ExerciseGroupRendererProps`.
4. Add `handleCompleteScreen` to `useSessionHandlers.ts`.
5. Wire `onCompleteScreen` through `ActiveSession/index.tsx`.
6. Rewrite `InterleavedGroupRenderer.tsx`:
   - Extract `buildScreens()` helper.
   - Replace the `isZeroRest` branch with screen-aware rendering.
   - Single-item screen → sequential-style card with full action row + rest timer.
   - Multi-item screen → grouped card with `hideActions={true}` widgets + shared action row.
7. Update `useSessionHandlers.handleCompleteRound` / add `handleCompleteScreen` to fire the correct rest timer (per-exercise rest vs. between-rounds rest).

---

## Files changed

- `src/domain/entities.ts`
- `src/db/fixtures.ts`
- `src/services/backupValidation.ts`
- `src/services/sessionCloner.ts`
- `src/pages/SessionDetail/components/ExerciseGroupCard.tsx`
- `src/pages/TemplateEdit.tsx`
- `src/i18n/it.ts`
- `src/pages/ActiveSession/components/ExerciseGroupRenderer.types.ts`
- `src/pages/ActiveSession/useSessionHandlers.ts`
- `src/pages/ActiveSession/index.tsx`
- `src/pages/ActiveSession/components/InterleavedGroupRenderer.tsx` (full rewrite)
