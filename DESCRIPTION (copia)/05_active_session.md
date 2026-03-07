# Workout Tracker — Active Session: Complete Specification

The Active Session page is the most complex and central feature of the application. This document provides a complete, exhaustive description of its behavior, state model, component hierarchy, and all user interactions.

---

## Overview

The Active Session page is a real-time workout execution interface. It displays the user's exercises one group at a time, collects performance data set by set, provides guidance on load and fatigue, manages a rest timer, and supports a range of in-session modifications.

Only one session may be active at any time. The page is accessible from any part of the app when a session is in progress.

---

## High-Level Layout

```
┌─────────────────────────────────────────────┐
│  SessionHeader                              │  ← session name, workout name, elapsed time, discard button
├─────────────────────────────────────────────┤
│  Session Notes (if any)                     │  ← read-only note from planned session
├─────────────────────────────────────────────┤
│  Rest Timer Start Control                   │  ← manual rest timer trigger
├─────────────────────────────────────────────┤
│  Session Completion Card (when all done)    │  ← shown when all sets are complete
├─────────────────────────────────────────────┤
│  Current Unit (active exercise/group)       │  ← the primary interaction area
├─────────────────────────────────────────────┤
│  Upcoming Exercises Accordion               │  ← collapsed list of future exercises
├─────────────────────────────────────────────┤
│  Completed Exercises Accordion              │  ← collapsed list of finished exercises
├─────────────────────────────────────────────┤
│  FABs                                       │  ← Quick Add, Save Session buttons
└─────────────────────────────────────────────┘
```

---

## Session State Model

The session state is maintained in a global store (one active session at a time). Key state fields:

| Field | Description |
|---|---|
| `activeSessionId` | ID of the current `WorkoutSession` |
| `workoutSession` | The WorkoutSession entity |
| `plannedSession` | The associated PlannedSession (if plan-linked) |
| `plannedWorkout` | The associated PlannedWorkout (if plan-linked) |
| `loadedGroups` | Full tree of groups → items → sets with plan linkage |
| `current` | `CurrentTarget` — points to the next incomplete set |
| `activeUnits` | Ordered list of DisplayUnits not yet completed |
| `completedUnits` | Ordered list of DisplayUnits that are fully done |
| `allDone` | Boolean — true when all sets are complete or skipped |
| `loadSuggestions` | Map of `plannedSetId → LoadSuggestion[]` |
| `setCountAdvice` | Map of `sessionExerciseItemId → SetCountAdvisorResult` |
| `viewedSetParams` | The set currently being viewed in the input widget (may differ from `current`) |
| `simpleMode` | From user regulation profile |
| `swapSheetState` | State of the exercise swap sheet (open/closed, target item) |
| `quickAddOpen` | Boolean — quick-add exercise sheet open |
| `unresolvedSetsState` | State of unresolved sets dialog when ending session |
| `alertConfig` | Configuration for generic alert dialogs |

---

## Display Units

The session is split into "units" — chunks of work presented one at a time:

### Type: `group`
Used when an exercise group contains interleaved exercises (Superset, Circuit, AMRAP, EMOM). The entire group (all its items and their sets in interleaved round order) is presented as a single unit.

### Type: `item`
Used when a group uses sequential traversal (Standard, Warmup, Cluster). Each exercise item in the group is presented as a separate unit.

The distinction allows the UI to show the full round view for interleaved groups and a focused single-exercise view for sequential groups.

---

## Current Unit Area

This is the primary interaction area. It renders the current unit using one of three specialized renderers:

### SequentialGroupRenderer
Used for Standard, Warmup, and Cluster groups (sequential traversal).

**Layout per exercise item**:
1. `SessionItemHeader` — exercise name, performance trend badge, info button, swap button, remove button.
2. `SetCountAdvisorCard` — advice panel ("Do another set" / "Optional" / "Stop") with reasoning.
3. `SessionUnitItem` — the main set input area (see below).
4. `ClusterProgressCard` — visible for Cluster groups; shows mini-set progress.
5. Completed set summary list (above the current set, read-only).
6. Add set / Skip remaining sets buttons.

### InterleavedGroupRenderer
Used for Superset, Circuit, AMRAP, EMOM groups (interleaved traversal, round-based).

**Layout**:
- `SessionGroupHeader` — group name, round counter (e.g., "Round 2/4"), group notes.
- For each exercise in the group, shows: exercise name, current set indicator, performance trend badge.
- The currently active exercise item is highlighted with a full `SessionUnitItem`.
- "Complete Round" button (advances past the current round to the rest period, then the next round).
- "Skip Round" and "Skip Remaining Rounds" buttons.

### ClusterGroupRenderer
Special-purpose renderer for Cluster groups. Shows:
- The working set with full input.
- Mini-set list with mini-set rest indicator.
- Inter-mini-set rest timer.

---

## SessionUnitItem — Set Input Widget

The core input component for recording a set. Composed of:

### SetInputHeader
- Set type badge (Warmup / Working / Backoff / ClusterMiniSet).
- Set number indicator.
- "Viewed set" navigation (previous/next arrows) — allows viewing past sets.
- Compliance badge (color-coded, updates after completion).
- Fatigue progression badge (not shown in simple mode).

### SetInputValues
Primary input fields:
- **Load field** (numeric, step 0.5): Hidden if counter type is not load-compatible. Pre-populated from history. Unit displayed (kg or lbs).
- **Count field** (numeric, step 1): Label changes based counter type (Reps / Seconds / Minutes / Meters / Kilometers).
- **RPE selector**: Visible only if NOT in simple mode. A horizontal scroll/tap selector from 6.0 to 10.0 in 0.5 increments. RPE color-coded from green (6–7) to red (9.5–10).

### SetInputExtras
Collapsible secondary fields (hidden in simple mode):
- **To failure indicator**: None / Technical Failure / Absolute Failure / Bar Speed Failure.
- **Partials toggle**: Boolean.
- **Forced reps counter**: Integer.
- **Notes**: Text input.
- **Tempo**: Text input (e.g., "3-1-2-0").

### SetInputActions
Action buttons:
- **Complete Set**: Marks set as completed, computes compliance, triggers fatigue analysis, optionally starts rest timer.
- **Skip Set**: Marks set as skipped without recording values.
- **Uncomplete Last Set**: Reverts the most recently completed set to incomplete state.

---

## Load Suggestion Badge and Dialog

### LoadSuggestionBadge
A compact display near the load field showing the best available load suggestion. Tapping it opens the full dialog.

### LoadSuggestionDialog
Shows all available suggestions (from all applicable methods). Each suggestion shows:
- Method name.
- Suggested load (central value and optional range).
- Confidence indicator (high / medium / low).
- Reasoning text.

Tapping a suggestion pre-fills the load field with that value.

---

## Rest Timer

### Behavior
- After a set is completed, if `autoStartRestTimer` is true, the rest timer starts automatically with the duration from the planned rest range (resolved by the Rest Timer Resolver).
- The timer counts down from the planned rest duration to zero.
- For cluster groups, uses the intra-set rest time when transitioning between mini-sets.
- At zero: plays a notification/vibration alert.

### RestTimerStartControl
A persistent control (visible at the top of the page) allowing the user to manually start a rest timer at any point.

### TimerDisplay
Visual countdown component. Shows:
- Remaining time.
- A circular progress indicator.
- A "+30s" or "+1min" quick-add button.
- A "Skip" button to dismiss the timer early.

---

## Warmup Calculator

Accessible from within an exercise item header. Opens a sheet/dialog showing:
- The auto-calculated warmup scheme (percentages and weights) based on the suggested working weight, exercise type, and session context.
- If the exercise item has a custom warmup configuration, shows those weights instead.

The warmup sets are informational — they are not automatically added to the session.

A separate `WarmupCalculator` component in the session also allows configuring custom warmup sets per-item inline.

---

## Exercise History Button and Modal

**ExerciseHistoryButton**: A button per exercise item that opens historical data.

**ExerciseInfoModal**: Shows:
- Previous session data for this exercise (load, count, RPE per set).
- Best performance metrics.
- e1RM estimate.
- Performance trend chart.

---

## Set Count Advisor Card

Displayed per exercise item. Shows:
- Advice: "Do another set" / "Optional — do more if you want" / "Stop here".
- Reasoning: explains why (e.g., "RPE ceiling of 9.5 reached", "Max 5 sets reached", "Below minimum of 3 sets").
- Progress indicator: X completed / Y minimum / Z maximum.
- Current RPE.
- RPE ceiling from fatigue sensitivity setting.

---

## Compliance Badge

A small colored badge shown per set after completion:
- Green: Fully Compliant.
- Yellow/Amber: Within Range.
- Red: Below Minimum or Above Maximum.
- Gray: Incomplete.
- Muted: No plan linked.

---

## Performance Badge

A small badge on the exercise item header:
- Arrow up: Improving.
- Dash: Stable.
- Clock: Stagnant.
- Arrow down: Deteriorating.
- Dash (muted): Insufficient data.

---

## Upcoming Exercises Accordion

A collapsed list of future exercise units. The user can expand it to see what exercises are coming.

Each item shows: exercise name(s), group type badge, set count summary.

Tapping a unit activates it immediately (jumps to that unit). This is useful for reordering within a session.

---

## Completed Exercises Accordion

A collapsed list of fully completed exercise units. Visible for review only — no further action required.

Actions per completed unit:
- **Activate**: Bring the unit back to the current position (re-open for more sets).
- **Undo Last Set**: Reverts the most recent completed set in the unit to incomplete.

---

## Session Completion Card

Appears when `allDone` is true (all sets are completed or skipped).

Shows:
- "All exercises complete!" message.
- Summary statistics.
- "End Session" button (same as the Save FAB).

---

## FABs (Floating Action Buttons)

Two FABs fixed at the bottom of the page:

### Quick Add FAB
Opens the `QuickAddSheet`.

### Save Session FAB
Ends the session. If there are incomplete (non-skipped) sets remaining, opens the `UnresolvedSetsDialog` first.

---

## Quick Add Sheet

A bottom sheet for adding exercises mid-session.

**Options**:
1. **Add Exercise**: Opens `ExercisePicker` to select any exercise. Adds it as a new Standard group at the end of the session.
2. **Add Superset**: Allows selecting two or more exercises to add as a Superset group.

---

## Swap Exercise Sheet

Opened when the user taps "Swap" on an exercise item header.

**Behavior**:
- Shows `ExercisePicker` for selecting a replacement exercise.
- On selection, replaces the exercise in the current session item.
- Records the substitution in `ExerciseSubstitution` for future activation prompts.
- `SubstitutionConfirmDialog` may appear to ask if the user wants to propagate this substitution to future sessions of the same planned slot.

---

## Unresolved Sets Dialog

Opens when the user attempts to end the session with incomplete sets.

Shows a list of exercises that have incomplete sets remaining. Options:
- **Skip all and finish**: Marks all remaining sets as skipped and ends the session.
- **Cancel**: Returns to the session to complete remaining sets.

---

## Session Header

Persistent header at the top of the active session page:

- Session name (from planned session or "Free Session").
- Workout name (from planned workout or empty).
- Elapsed time (live counter from `startedAt`).
- **Discard button**: Opens a confirmation dialog. On confirm, calls the Session Discard Service (deletes all data for this session) and returns to the dashboard.

---

## Session Lifecycle During Execution

```
Session Activated
      ↓
Page loads → SessionLoader fetches all data → Sets loaded with history pre-population
      ↓
Navigator finds first incomplete set → CurrentTarget set
      ↓
User inputs values → Taps "Complete Set"
      ↓
Set marked isCompleted = true
Compliance computed → stored on set
Fatigue progression computed → stored on set
e1RM tentatively computed (stored at session end)
Rest timer starts (if autoStart = true, from planned rest range)
Navigator finds next incomplete set
      ↓
[Repeat until all sets done]
      ↓
AllDone = true → Completion Card shown
      ↓
User taps "End Session"
      ↓
UnresolvedSetsDialog (if any non-skipped incomplete sets remain)
      ↓
Session Finisher Service:
  - Removes empty items and groups
  - Computes e1RM and relative intensity for all completed sets
  - Links exercise version snapshots
  - Computes aggregates (totalSets, totalLoad, totalReps, totalDuration, muscle snapshots)
  - Marks session completed with completedAt timestamp
  - Triggers ExercisePerformanceService.analyzeSession()
      ↓
Session complete → Navigate to Dashboard (or History)
```

---

## Key Behaviors and Edge Cases

### Multiple Items in Same Group (Sequential)
When a Standard group contains multiple exercise items, each item is its own display unit. They are presented in sequence. After all sets of item A are done, the next unit is item B from the same group.

### Interleaved Round Tracking
For Superset/Circuit/AMRAP/EMOM groups:
- One "round" = one set of each exercise in the group.
- The user completes a set for exercise A, then exercise B, then the round is complete.
- Rest timer fires between rounds (using `restBetweenRoundsSeconds` if set).
- The "Complete Round" button advances to the next round.

### Cluster Group Execution
- The working set is performed first.
- After the working set, mini-sets follow with short intra-set rest (e.g., 20s).
- The rest timer overrides to use the intra-cluster rest time between mini-sets.
- After all mini-sets, the full planned inter-set rest applies before the next working set.

### Adding Sets Mid-Session
The user can add extra sets to any exercise item at any point. New sets are appended with the same type as the last set of that item.

### Adding Rounds Mid-Session (Interleaved Groups)
For interleaved groups, the user can add an extra round via the "Add Round" button. A new set for each exercise in the group is appended.

### Uncompleting Sets
The user can undo the most recent completed set on any item. This re-opens it for editing. Uncomplete is only available for the last completed set of an item (not arbitrary sets).

### Simple Mode
In simple mode:
- RPE input is hidden.
- To-failure, partials, forced reps fields are hidden.
- Compliance badges are hidden.
- Fatigue progression badges are hidden.
- Set Count Advisor does not show RPE-based recommendations.
- Load suggestion dialog does not show "Planned RPE" method.

### Pending Session Recovery
If the app is closed mid-session, on next launch the `PendingSessionDialog` appears asking the user to resume or discard the in-progress session.

### Performance Status Display
After a set is completed, the performance trend badge on the exercise item header may update to reflect the latest computed trend. The trend compares the current session's performance against the previous equivalent session for the same planned slot.
