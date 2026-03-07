# Workout Tracker — Business Rules and Validation

This document enumerates all business rules, validation constraints, and invariants that the system must enforce. These rules are independent of any technology choice.

---

## 1. User Management Rules

### R-U1: At Least One User Always Exists
The application must always have at least one GlobalUser. Attempting to delete the last remaining user must be rejected with an appropriate error or warning.

### R-U2: Single Active User
Only one GlobalUser may be active at a time. Switching users closes the current user's data context before opening the new one.

### R-U3: PIN Verification
A GlobalUser's PIN is stored as a SHA-256 hash. Verification requires hashing the candidate PIN and performing a constant-time comparison. The PIN must be a numeric string of 4–6 digits when set.

### R-U4: Avatar Color Assignment
Avatar colors are drawn from a fixed palette of 8 predefined hex color values. When creating a new user, a default color is selected (typically the least-used one). The user may choose any color from the palette.

### R-U5: Name Length
User names (both GlobalUser and UserProfile) must be non-empty and have a maximum length of 100 characters.

---

## 2. Exercise Library Rules

### R-E1: Name Required
An exercise must have a non-empty name. Whitespace-only names are rejected (trim before validation).

### R-E2: Primary Muscles Required
At least one primary muscle must be assigned to each exercise.

### R-E3: Counter Type Determines Metric
The `counterType` of an exercise determines what is counted during session execution:
- `reps` → repetition count (integer, ≥ 1)
- `seconds` → duration in seconds (integer, ≥ 1)
- `minutes` → duration in minutes (integer, ≥ 1)
- `distanceMeter` → distance in meters (integer, ≥ 1)
- `distanceKMeter` → distance in kilometers (decimal, > 0)

### R-E4: Only Reps-Based Exercises Support 1RM
The `supportsOneRepMax` flag is true only for `reps` counter type. 1RM records should only be recorded and used for reps-based exercises. Load suggestions using the RPE/percentage table are only available for reps-based exercises.

### R-E5: Only Reps and Seconds Support To-Failure
The `supportsToFailure` flag is true for `reps` and `seconds`. The to-failure indicator should be restricted to these counter types.

### R-E6: Versioning on Edit
Whenever an exercise's core attributes (name, type, primaryMuscles, secondaryMuscles, equipment, movementPattern, counterType) are modified, a new `ExerciseVersion` snapshot must be created before the update is persisted. The snapshot preserves the prior state.

### R-E7: Soft Delete Preference
Exercises that are referenced in past sessions should be archived (soft-deleted) rather than hard-deleted. Hard deletion is acceptable only for exercises with no session history.

### R-E8: Equipment as Array
The `equipment` field on an exercise is always an array, even if a single piece of equipment is required. Empty array means no equipment required (bodyweight).

---

## 3. Planning Hierarchy Rules

### R-P1: Workout Status Uniqueness (Soft Rule)
Ideally only one PlannedWorkout should have status `active` at any time. The session rotation algorithm uses only `active` workouts. The system should ensure this when activating a workout.

### R-P2: Session Count Minimum
A workout plan must have at least one PlannedSession before a session can be started from it.

### R-P3: Group Count Minimum for Activation
A planned session can be activated even if it has no groups (resulting in an empty session). However, empty sessions produce no useful data and may be immediately completed.

### R-P4: Cluster Group Single Exercise
A PlannedExerciseGroup of type `cluster` must contain exactly one PlannedExerciseItem. Adding more than one item to a cluster group must be prevented.

### R-P5: Set Count Range Validity
`SetCountRange.min` must be ≥ 1. If `max` is provided, it must be ≥ `min`.

### R-P6: Count Range Validity
`CountRange.min` must be ≥ 1. `CountRange.max` may be null (to failure) or must be ≥ `min`.

### R-P7: Load Range Validity
If a `LoadRange` is provided, `min` must be ≥ 0. `max` may be null or must be ≥ `min`.

### R-P8: RPE Range Validity
`RPERange.min` must be in [6.0, 10.0]. `RPERange.max` must be ≥ `min` and ≤ 10.0. Values are in 0.5 increments.

### R-P9: Percentage 1RM Range Validity
Values must be in [0.40, 1.00]. `max` ≥ `min`.

### R-P10: Order Index Integrity
When sessions, groups, items, or sets are reordered, the `orderIndex` values must be recalculated using the lexicographic rank algorithm so that `a.orderIndex < b.orderIndex` iff entity A appears before entity B in display order.

### R-P11: Session Template Import Generates New IDs
When importing a session template into a workout plan, all entities created (groups, items, sets) must receive newly generated IDs. The template's IDs are never reused in the planning hierarchy.

---

## 4. Session Activation Rules

### R-A1: One Active Session at a Time
Before creating a new WorkoutSession, the system must check for any existing session with `completedAt = null`. If found, it must be resolved (resumed or discarded) before the new session can be created.

### R-A2: Activation is Atomic
All entities created during activation (WorkoutSession, SessionExerciseGroups, SessionExerciseItems, SessionSets) must be written in a single atomic transaction.

### R-A3: Exercise Substitution Propagation
When a planned exercise item is substituted during activation (from Phase 1 choices), `SessionExerciseItem.originalExerciseId` must be set to the originally planned exercise ID, and `SessionExerciseItem.exerciseId` must be set to the chosen replacement exercise ID.

### R-A4: Set Pre-Population is Best-Effort
Historical values (load, count, to-failure) are used to pre-populate session sets. If no history is found, sets are created with all values null. This is never an error.

### R-A5: Warmup Sets are Derived, Not Stored in Planning
Auto-calculated warmup sets are computed on-the-fly during display. Only custom `warmupSets` configured on a `PlannedExerciseItem` are stored. The automated algorithm's output is informational.

---

## 5. Session Execution Rules

### R-X1: Compliance Requires Plan Linkage
Compliance status (`ComplianceStatus`) is only computed for session sets that have a linked `plannedSetId`. Sets added ad-hoc during a session (quick add) have no planned set linkage and therefore have no compliance status.

### R-X2: Fatigue Progression Requires Planned Profile
Fatigue analysis is only computed when the linked `PlannedSet` has a `FatigueProgressionProfile`. Without one, `FatigueProgressionStatus.notApplicable` is returned.

### R-X3: RPE is Optional in Simple Mode
When `simpleMode = true`, the RPE input field is not shown. RPE values remain null for all sets in a simple-mode session. All RPE-dependent features (fatigue analysis, RPE-based load suggestion, compliance RPE check) are suppressed.

### R-X4: Completion Before Skipping
A set can only be either completed (`isCompleted = true`) or skipped (`isSkipped = true`), not both. Once marked completed, it cannot be skipped (only uncompleted).

### R-X5: Uncomplete Only Last Set
The "Uncomplete" action is only available for the most recently completed set within a given exercise item. It is not possible to selectively uncomplete an arbitrary set.

### R-X6: Round Completion in Interleaved Groups
A "round" in an interleaved group is defined as one completed or skipped set per exercise item. The round completes when all items in the group have contributed one set.

### R-X7: Rest Timer Source for Cluster
For cluster groups:
- After a working set (before the first mini-set): use inter-mini-set rest.
- Between mini-sets: use inter-mini-set rest.
- After the last mini-set (before the next working set): use the planned `restSecondsRange` midpoint.

### R-X8: Set Count Advisor Ceiling Mapping
RPE ceiling values by fatigue sensitivity:
- `low` → 10.0 (never triggers on RPE alone)
- `medium` → 9.5
- `high` → 9.0

### R-X9: Session Discard is Irreversible
Discarding a session permanently deletes the `WorkoutSession` and all its child entities. There is no undo.

---

## 6. Session Completion Rules

### R-F1: Empty Item Removal
At session completion, any `SessionExerciseItem` with zero completed sets (all sets are skipped or none were added) is deleted, along with all its sets.

### R-F2: Empty Group Removal
After removing empty items, any `SessionExerciseGroup` with zero remaining items is deleted.

### R-F3: Exercise Version Snapshot
`SessionExerciseItem.exerciseVersionId` must be set to the current `ExerciseVersion.id` for the item's exercise at the time of completion. This ensures historical integrity.

### R-F4: e1RM Computation Conditions
e1RM is computed for a set only if all of the following are true:
- `actualLoad` is not null and > 0
- `actualCount` is not null and > 0
- `actualRPE` is not null and > 0

### R-F5: Relative Intensity Requires Body Weight
`SessionSet.relativeIntensity` is computed only if a valid body weight record exists. `relativeIntensity = e1RM / bodyWeight`.

### R-F6: Aggregate Computation
- `totalSets`: count of completed sets.
- `totalReps`: sum of `actualCount` for all completed sets where `counterType = reps`.
- `totalLoad`: sum of `actualLoad × actualCount` for all completed sets where `counterType = reps`.
- `totalDuration`: sum of `actualCount` (converted to seconds) for all completed sets where `counterType = seconds` or `minutes`.
- `primaryMusclesSnapshot`: union of all primary muscles from the exercise versions of completed items.
- `secondaryMusclesSnapshot`: union of all secondary muscles.

### R-F7: Performance Analysis Triggers
After session completion, the Exercise Performance Service must be triggered to compute `performanceStatus` for each item. This happens asynchronously after the session is marked complete.

---

## 7. Analytics Rules

### R-AN1: Compliance Trend Calculation
The compliance trend compares the average compliance percentage of the current date range against the immediately preceding period of equal duration. A positive trend means compliance improved; negative means it declined.

### R-AN2: Volume Weighting
In volume analytics, primary muscle contributions are weighted 1.0 per set; secondary muscle contributions are weighted 0.5 per set. This produces "weighted sets" per muscle.

### R-AN3: History Estimates for 1RM
A valid set for 1RM estimation must have:
- `isCompleted = true`
- `isSkipped = false`
- `actualLoad` > 0
- `actualCount` > 0
- `actualRPE` in [6.0, 10.0]

Only the most recent such set (scanning up to the last 5 sessions) per exercise is used.

### R-AN4: Weekly Frequency Target
The target sessions per week for the frequency chart is derived from the number of sessions in the single active workout plan.

---

## 8. 1RM Record Rules

### R-1RM1: Best Record Selection
The "best" 1RM record for an exercise (used for load suggestions) is the record with the highest `value`, regardless of method or date.

### R-1RM2: Confidence Levels
- `direct` method → confidence: `high`
- `indirect` method (from manual test) → confidence: `medium`
- History estimate (from session) → confidence: `medium`

### R-1RM3: Multiple Formulas
For indirect records, all five formulas (Brzycki, Epley, Lander, O'Connor, Lombardi) are computed. The stored `value` should be the weighted average. Individual formula estimates are stored for reference.

---

## 9. Load Suggestion Rules

### R-LS1: Method Availability
- `percentage1RM`: requires a stored `OneRepMaxRecord` AND a `percentage1RMRange` on the planned set.
- `lastSession`: requires a previous session set with valid load for this exercise.
- `plannedRPE`: requires an `rpeRange` on the planned set AND a 1RM estimate. Not available in simple mode.
- `targetXRM`: requires `targetXRM` on the planned item AND a 1RM estimate.

### R-LS2: Load Rounding
All suggested loads are rounded to the nearest 0.5 (e.g., 0.5 kg increments for kg units).

### R-LS3: Fatigue Adjustment for RPE Method
When using the `plannedRPE` method, the planned RPE is adjusted upward by `setIndex × expectedRPEIncrementPerSet`. The adjusted RPE is capped at 10.0.

---

## 10. Backup Rules

### R-B1: File Size Limit
Backup files larger than 10 MB must be rejected on import.

### R-B2: Format Validation
An imported backup must have a `version` field and a `data` field. Missing either field must reject the import.

### R-B3: Record Validation
Each record within an imported backup is validated against the expected schema for its table. Records that fail validation are counted as `failed` and not inserted.

### R-B4: Copy Strategy ID Remapping
Under the `copy` conflict strategy, all conflicting records receive new IDs. All foreign key fields referencing those conflicting IDs must also be updated in the imported records within the same import batch.

### R-B5: Import Table Order
Tables must be imported in dependency order: parent tables before their children. (See `09_data_persistence_and_multi_user.md` for the exact order.)

---

## 11. Input Validation Rules (UI Level)

| Field | Validation |
|---|---|
| Exercise name | Non-empty after trim; max 100 chars |
| Workout name | Non-empty after trim |
| Session name | Non-empty after trim |
| Template name | Non-empty after trim |
| Body weight input | Numeric; 20 ≤ value ≤ 300 kg; step 0.1 |
| Load input | Numeric; ≥ 0; step 0.5 |
| RPE input | Numeric; 6.0 ≤ value ≤ 10.0; step 0.5 |
| Count input | Integer; ≥ 1 |
| Set count range min | Integer; ≥ 1 |
| Set count range max | Integer; ≥ min or omitted |
| % 1RM range | 0.40 ≤ value ≤ 1.00 |
| Tempo string | Free text; no structural validation |
| PIN | Numeric; 4–6 digits |
| User name | Non-empty; max 100 chars |
| Gender | Must be one of: male, female, undisclosed |

---

## 12. Concurrency Model

The application is single-user, single-device, with no concurrent data access. All data operations are sequential. No locking mechanisms are required.

However, within a single user session, in-memory state (e.g., the session planning edit state) and persisted database state may temporarily diverge. The `UnsavedChangesBar` pattern manages this divergence and ensures the user explicitly commits or discards before the in-memory state is lost.
