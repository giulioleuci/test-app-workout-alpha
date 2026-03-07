# Workout Tracker — User Journey Mapping

This document maps the complete step-by-step workflows for all major user operations, including starting context, intermediate UI states, success outcomes, and failure/recovery paths.

---

## Journey 1: First-Time Setup (Onboarding)

**Starting context**: App is launched for the first time; no user profiles exist.

**Steps**:
1. App detects no existing user profile.
2. `OnboardingPage` is displayed (full-screen card, blocks main app).
3. **Step 1**: User enters name, selects gender, optionally enters body weight. Taps "Next".
   - Validation: If name is empty or gender not selected, button is disabled.
4. **Step 2**: User selects which starter content to include:
   - Exercise library (enabled by default)
   - Full Body plan (only selectable if exercises are enabled)
   - Push/Pull/Legs plan
   - Upper/Lower plan
5. User taps "Start".
6. Loading state: spinner shown on button.
7. System creates `UserProfile`, `UserRegulationProfile` (with defaults), optional `BodyWeightRecord`, optionally seeds exercises and workout plans.
8. Onboarding status is updated → main app renders with Dashboard.

**Success outcome**: User is on the Dashboard with their data ready.

**Failure path**: If creation fails, error is logged; user remains on the onboarding page and may retry.

---

## Journey 2: Creating an Exercise

**Starting context**: User is on the Exercise List page.

**Steps**:
1. User taps the FAB ("+" button).
2. `ExerciseForm` dialog opens in "create" mode.
3. User fills in:
   - Name (required)
   - Type (Compound / Isolation)
   - Primary muscles (at least one required)
   - Secondary muscles (optional)
   - Equipment (zero or more)
   - Movement pattern
   - Counter type
   - Default load unit (kg / lbs)
   - Optional: description, key points, notes, variant links
4. Taps "Save".
5. Exercise is persisted. Dialog closes. List refreshes with the new exercise visible.

**Failure paths**:
- If name is empty → form shows validation error; save is blocked.
- If primary muscles are empty → validation error shown.

---

## Journey 3: Creating a Workout Plan

**Starting context**: User is on the Workout List page.

**Steps**:
1. User taps the FAB.
2. `WorkoutCreate` page is shown.
3. User fills in: name, optional description, objective type, work type.
4. Taps "Create".
5. Workout is persisted. User is navigated to `WorkoutDetail` for the new workout.

---

## Journey 4: Building a Training Plan (Session Planning)

**Starting context**: User is on the Workout Detail page for a workout that has no sessions yet.

**Steps**:
1. User taps the FAB ("Add Session").
2. A new session "Sessione 1" is added to the in-memory list.
3. User taps the session card to navigate to `SessionDetail`.

### Inside Session Detail:
4. User taps FAB ("Add Group") and selects a group type (e.g., Standard).
5. A new group appears. User taps "Add Exercise" within the group.
6. `ExercisePicker` opens. User searches and selects an exercise.
7. An exercise item is added to the group. A default PlannedSet is created automatically.
8. User taps the PlannedSet card to edit its parameters:
   - Set type (Working / Warmup / Backoff)
   - Set count range (e.g., 3–5 sets)
   - Rep range (e.g., 6–10 reps)
   - Load range (optional)
   - % 1RM range (optional)
   - RPE range (optional)
   - Rest range (optional)
   - Fatigue progression profile (optional)
   - Tempo (optional)
9. User repeats steps 4–8 for additional groups and exercises.
10. User navigates back to Workout Detail.

### Back on Workout Detail:
11. The `UnsavedChangesBar` is visible because session structure is locally modified.
12. User taps "Save".
13. All changes are persisted to the database.

**Failure paths**:
- If user navigates away without saving, `UnsavedChangesBar` shows navigation-blocking dialog.
- If user confirms "Leave Without Saving", all in-memory changes are discarded.

---

## Journey 5: Starting a Session from the Dashboard

**Starting context**: User is on the Dashboard; an active workout plan exists with at least one session.

**Steps**:
1. `NextSessionSuggestionCard` is visible showing the next session in the rotation.
2. User reads the session details (name, estimated duration, equipment, volume).
3. User taps "Start Session".

### Two-Phase Activation:

#### Phase 1 Check — Substitution History:
- System checks if any exercise in this planned session has been substituted in a previous execution.
- **If substitutions exist**: `SubstitutionConfirmDialog` appears.
  - For each substitution: "Last time you replaced [Exercise A] with [Exercise B] on [date]. Use B again?"
  - User confirms or declines each.
  - User taps "Confirm All".
- **If no substitutions**: Proceeds directly.

#### Phase 2 Check — Pending Session:
- System checks if any session is currently in progress.
- **If in progress**: `PendingSessionDialog` appears.
  - Options: "Resume existing session" → navigates to Active Session. "Start new" → discards old session, continues activation.
  - User selects.
- **If none in progress**: Proceeds directly.

#### Activation:
- System creates `WorkoutSession` and all session entities.
- Sets are pre-populated with load/rep values from the last matching session.
- User is navigated to `/session/active`.

**Success outcome**: Active session page with first set highlighted and ready for input.

---

## Journey 6: Executing a Standard Workout Session

**Starting context**: Active session page loaded, group type is Standard.

**Steps**:
1. `SessionHeader` shows session name and elapsed timer.
2. First exercise item is shown in the Current Unit area.
3. `SetCountAdvisorCard` shows "Do another set — 0/3 minimum reached".
4. `SetInputWidget` shows the first working set with pre-filled load and count from history.
5. `LoadSuggestionBadge` shows a load recommendation. User may tap to view all methods in `LoadSuggestionDialog`.
6. User adjusts load and count values as needed.
7. If not in simple mode: User enters RPE using the RPE selector.
8. User taps "Complete Set".

**After completing a set**:
- Set is marked complete.
- Compliance badge updates (color-coded against planned targets).
- Fatigue badge updates.
- Set Count Advisor updates.
- If `autoStartRestTimer` is true: rest timer countdown begins.
- Input widget advances to the next set (same exercise).

9. User waits for rest timer (or taps "Skip" to proceed early).
10. User completes remaining sets for this exercise.
11. After minimum sets reached: Set Count Advisor shows "Optional — 3/3 minimum reached, 5 max".
12. After maximum sets reached (or failure indicator): Set Count Advisor shows "Stop here".
13. When exercise is done: unit moves to Completed Exercises accordion. Next exercise becomes the Current Unit.
14. User repeats for all exercises.

**When all done**:
15. `SessionCompletionCard` appears: "All exercises complete!".
16. User taps "End Session" (or the Save FAB).
17. Session Finisher runs.
18. User is returned to Dashboard (or History).

**Interruptions**:
- User may at any point: swap an exercise, add a new exercise, skip a set, undo the last completed set.
- User may close the app; session state persists. On relaunch, `PendingSessionDialog` prompts to resume.

---

## Journey 7: Executing a Superset

**Starting context**: Active session page; current unit is a Superset group with exercises A and B.

**Steps**:
1. `InterleavedGroupRenderer` shown with "Round 1/4" header.
2. Exercise A's set input is active. User enters values and taps "Complete Set".
3. Exercise B's set input becomes active. User enters values and taps "Complete Set".
4. Round 1 complete. Rest timer fires (using `restBetweenRoundsSeconds` if configured).
5. Round counter advances: "Round 2/4".
6. User repeats until all rounds complete.
7. Group moves to Completed Exercises.

**Shortcut actions**: "Complete Round" marks all remaining sets in the current round as skipped and advances. "Skip Round" skips the entire round. "Skip Remaining Rounds" skips all remaining rounds.

---

## Journey 8: Using a Cluster Set

**Starting context**: Active session page; current unit is a Cluster group.

**Steps**:
1. `ClusterGroupRenderer` shown.
2. First working set input shown.
3. User completes the working set.
4. Intra-cluster rest timer fires (e.g., 20 seconds).
5. Mini-set input shown (smaller reps, same or reduced load per cluster config).
6. User completes the mini-set.
7. Intra-cluster rest timer fires again.
8. Next mini-set shown. User continues until all mini-sets complete.
9. Full inter-set rest fires.
10. Next working set shown. Repeat.

**ClusterProgressCard**: Shows: total reps done / total reps target, mini-sets completed / mini-sets planned.

---

## Journey 9: Exercise Substitution During Session

**Starting context**: User is in an active session and wants to replace an exercise.

**Steps**:
1. User taps the swap icon on an exercise item header.
2. `SwapExerciseSheet` opens with `ExercisePicker`.
3. User searches and selects the replacement exercise.
4. The session item's exercise is updated in-memory and persisted.
5. `originalExerciseId` is recorded on the item.
6. An `ExerciseSubstitution` record is created.
7. `SubstitutionConfirmDialog` may appear: "Save this substitution for future sessions of this planned slot? (Next time you start this session, it will suggest using [new exercise] instead)." User confirms or declines.

**Future sessions**: On the next activation of the same planned session, Phase 1 of the activation flow detects this substitution and asks if the user wants to repeat it.

---

## Journey 10: Managing the Exercise Library (CSV Import)

**Starting context**: User is on the Exercise List page.

**Steps**:
1. User taps "Import CSV" in the `ExerciseCsvToolbar`.
2. File picker opens. User selects a CSV file.
3. System parses the CSV (columns: exercise, equipment, type, pattern, counter, load_unit, primary_muscles, secondary_muscles, description, key_points, variants).
4. System detects conflicts: exercises whose names already exist in the library.
5. If conflicts exist: `CsvConflictDialog` appears.
   - Lists conflicting exercise names.
   - Strategy options: Skip / Overwrite / Copy as new.
6. User selects strategy and confirms.
7. Import is executed. Toast notification shows counts (inserted / overwritten / skipped).
8. List refreshes.

**Export**: User taps "Export CSV" → all exercises downloaded as a `.csv` file.

---

## Journey 11: Backup and Restore

**Starting context**: User is on the Backup page.

### Export:
1. User selects categories to export (or leaves all selected for full backup).
2. Taps "Download Backup".
3. On web: JSON file is downloaded. On native: system share sheet appears.
4. Success toast shown.

### Import:
1. User taps the file picker area.
2. File picker opens. User selects a `.json` backup file.
3. File is parsed and validated.
4. Record counts are displayed per table.
5. If conflicts detected: a warning shows the count per table.
6. User taps "Import".
7. If conflicts exist: `ConflictResolutionDialog` appears with three strategy options.
   - "Copy as new": conflicting records get new IDs; everything is imported.
   - "Skip conflicts": only non-conflicting records are imported.
   - "Overwrite": conflicting records replace existing data.
8. User selects a strategy.
9. Import is executed. Result summary toast shows: inserted / copied / overwritten / skipped / failed counts.

**Failure paths**:
- File too large (> 10 MB): error toast.
- Invalid JSON format: error toast.
- Invalid record schema: per-record failures counted in "failed" count.

---

## Journey 12: Managing 1RM Records

**Starting context**: User is on the 1RM page.

### Adding a direct record:
1. User taps FAB or "Add Record" on an exercise card.
2. `OneRepMaxRecordDialog` opens.
3. User selects exercise (if not pre-selected).
4. Selects method "Direct".
5. Enters the 1RM value and unit (kg/lbs).
6. Optionally enters date and notes.
7. Taps "Save". Record is persisted.

### Adding an indirect record:
1. Same as above but method "Indirect".
2. User enters tested load, reps, and unit.
3. System computes all five formula estimates (Brzycki, Epley, Lander, O'Connor, Lombardi) and shows them in a comparison table.
4. The weighted average is pre-filled as the 1RM value. User may adjust.
5. Taps "Save".

### Viewing estimates from history:
1. User taps "Show estimates from history" in `OneRepMaxFilters`.
2. System runs the history estimator for all exercises.
3. Cards for exercises with history estimates appear (even if no direct record exists).
4. Each card shows the estimate source: load, reps, RPE, and date of the set used.

---

## Journey 13: Reviewing Session History

**Starting context**: User is on the History List page.

**Steps**:
1. List of session cards is shown, grouped by date, most recent first.
2. User may search by exercise name or filter by date range.
3. User taps a session card.
4. `HistoryDetail` page loads.
5. `SessionMetaCard` shows: start/end time, duration, total sets, volume, average RPE.
6. Each exercise group is shown with its items and all sets.
7. Each set shows: load, count, RPE, compliance badge, fatigue badge, modifiers.

---

## Journey 14: Interpreting Analytics

**Starting context**: User is on the Analytics page.

**Steps**:
1. Default filter: last 7 days.
2. User adjusts date range (preset or custom) and optionally filters by workout/session.
3. Summary cards update: total sessions, total sets, overall compliance.
4. User explores each tab:

**Volume Tab**: Identifies which muscles are receiving the most training volume. Compares to other muscles to find imbalances.

**Load Tab**: Selects a specific exercise. Reviews load progression over time to identify progress stalls. Views 1RM history.

**Compliance Tab**: Checks what percentage of sets matched planned targets. Sees week-by-week frequency vs. goal.

**RPE Tab**: Reviews whether perceived effort aligns with planned targets. High deviation may indicate load miscalibration.

5. User may open the Intensity Calculator to compute e1RM from any set.
6. User may open the Theoretical Performance Matrix to plan future loads based on their 1RM.

---

## Journey 15: Adjusting User Preferences

**Starting context**: User is on the Settings page.

**Steps**:
1. User navigates to the Preferences tab.
2. Adjusts load suggestion method: "Percentage 1RM" → "Last Session" (useful if 1RM records are not maintained).
3. Adjusts fatigue sensitivity: "Medium" → "High" (will stop recommending sets at RPE 9.0 instead of 9.5).
4. Toggles Simple Mode on: hides all RPE and advanced metrics throughout the app.
5. All changes are persisted immediately (no save button required).

### Resetting Data:
1. User scrolls to "Danger Zone" section.
2. Taps "Reset Database".
3. `AlertDialog` confirms: "This will delete all your data. Are you sure?".
4. On confirm: all tables in the current user's database are cleared, app reloads.

---

## Journey 16: Switching Users

**Starting context**: User is logged in as User A and wants to switch to User B.

**Steps**:
1. User navigates to Settings → User Management (or taps their avatar).
2. `UserSwitcher` component shows all GlobalUsers with avatars.
3. User taps User B's entry.
4. **If User B has a PIN**: `PinEntryDialog` appears. User enters PIN.
   - Correct PIN → proceeds.
   - Wrong PIN → error message shown, dialog stays open.
5. **If no PIN**: proceeds immediately.
6. User A's database is closed. User B's database is opened. All cached data is cleared.
7. App refreshes with User B's data visible.
