# Workout Tracker — Services Inventory

This document describes every service in the application. Services encapsulate business logic, computations, and data operations. They are abstracted from any storage or UI technology.

---

## 1. Session Activation Service

**Purpose**: Converts a planned session into a live workout session with all execution entities pre-populated from the plan.

**Inputs**:
- `plannedSessionId`: The planned session to execute.
- `substitutionChoices`: Optional map of `plannedExerciseItemId → exerciseId` overriding planned exercises with user-selected substitutes.

**Process**:
1. If any existing session is in progress (not completed), it is automatically finished first.
2. A new `WorkoutSession` record is created.
3. For each `PlannedExerciseGroup`, a `SessionExerciseGroup` is created.
4. For each `PlannedExerciseItem`, a `SessionExerciseItem` is created. If a substitution choice was provided, the chosen exercise is used; `originalExerciseId` is recorded.
5. Planned sets for each item are expanded into individual `SessionSet` records using the Set Expander.
6. For each exercise item, historical sets from the last matching session are found via a two-tier matching strategy (plan-based exact match first, then structural best-fit). These are used to pre-populate `actualLoad`, `actualCount`, and `actualToFailure` fields.
7. All records are saved transactionally.

**Outputs**: The ID of the newly created `WorkoutSession`.

**Errors**: Throws if the planned session is not found.

---

### Two-Phase Activation

To handle exercise substitutions gracefully, activation is split into two phases:

**Phase 1 — Prepare**: Scans all planned exercise items for the target session. For each item that has a substitution history, identifies the most recent substitution and returns it as a prompt. No data is written.

**Phase 2 — Activate**: Receives the user's decisions (keep original or use substituted exercise) and executes the full activation described above.

---

### History Matching (Set Pre-population)

When creating session sets, the system attempts to pre-populate load and count values from the user's most recent matching session:

**Tier 1 (Plan-based)**: Looks for session items that came from the same `plannedExerciseItemId`. Finds the most recently completed session among them. Uses those sets.

**Tier 2 (Structural best-fit)**: If Tier 1 finds nothing, searches all sessions containing the exercise. Scores candidate items from the most recent session by: set count difference (weight 10×), working set type distribution (weight 5×), and average rep count difference (weight 1×). The lowest-scoring candidate is used.

---

## 2. Session Finisher Service

**Purpose**: Closes a workout session, computes aggregate statistics, removes empty data, and triggers post-session analytics.

**Inputs**: `sessionId`, `completedAt` timestamp.

**Process**:
1. For each item in the session:
   - If it has zero completed sets: the item and its sets are deleted.
   - Otherwise: computes e1RM and relative intensity for each completed set (requires valid load, count, and RPE). Populates `exerciseVersionId` from the current exercise version snapshot. Marks item as completed.
2. For each group: if all items were removed, the group is deleted. Otherwise it is marked completed.
3. Computes session aggregates: `totalSets`, `totalLoad` (kg×reps for rep-based exercises), `totalReps`, `totalDuration` (seconds for time-based exercises), `primaryMusclesSnapshot`, `secondaryMusclesSnapshot`.
4. Marks the session as completed with `completedAt`.
5. Triggers the Exercise Performance Service to analyze and store trend status.

**Outputs**: No return value; all changes are persisted.

---

## 3. Session Discard Service

**Purpose**: Completely removes an in-progress session and all its data.

**Inputs**: `sessionId`.

**Process**: Cascades delete from `WorkoutSession` → `SessionExerciseGroups` → `SessionExerciseItems` → `SessionSets`.

---

## 4. Session Navigator Service

**Purpose**: Determines the position of the next incomplete set within the active session.

**Inputs**: The full loaded session state (groups → items → sets with their completion status).

**Process**: Iterates groups in order. For each group, computes the traversal order based on group type (sequential or interleaved). Returns the first set that is neither completed nor skipped.

**Outputs**: A `CurrentTarget` object containing group index, item index, set index, the set entity itself, and the current round (for interleaved groups).

---

## 5. Group Behavior Registry

**Purpose**: Defines the behavioral rules for each ExerciseGroupType.

For each group type, provides:
- **exerciseTraversal**: `sequential` (all sets of exercise A, then B) or `interleaved` (one set of A, one of B, repeat).
- **setBlockTraversal**: `sequential` or `cluster` (working set + mini-sets alternating).
- **singleExerciseOnly**: Whether the group is restricted to a single exercise item.
- **roundBasedCompletion**: Whether the group completes in "rounds" rather than per individual set.
- **restTimerStrategy**: Whether the rest timer auto-starts after each set, and any overrides for specific set-type transitions (particularly for cluster groups).

| Group Type | Exercise Traversal | Set Traversal | Single Exercise | Round-Based |
|---|---|---|---|---|
| Standard | Sequential | Sequential | No | No |
| Warmup | Sequential | Sequential | No | No |
| Superset | Interleaved | Sequential | No | Yes |
| Circuit | Interleaved | Sequential | No | Yes |
| AMRAP | Interleaved | Sequential | No | Yes |
| EMOM | Interleaved | Sequential | No | Yes |
| Cluster | Sequential | Cluster | Yes | No |

**Cluster rest timer overrides**:
- Mini-set → Mini-set: use intra-set rest (from cluster config)
- Working-set → Mini-set: use intra-set rest
- Mini-set → Working-set: use planned inter-set rest

---

## 6. Set Expander Service

**Purpose**: Converts a `PlannedSet` block (e.g., "3–5 sets of 6–8 reps") into individual `SessionSet` records ready for execution.

**Inputs**: Group type, array of planned sets for an item, optional history sets by type (from last session).

**Process**:
1. For each planned set block, creates `setCountRange.min` individual session sets of the appropriate type.
2. For cluster group type: inserts `ClusterMiniSet` type sets after each working set, based on the cluster modifier config.
3. Pre-populates `actualLoad`, `actualCount`, `actualToFailure` from matching history sets where available.
4. Sets `expectedRPE` from the planned RPE range minimum.

**Outputs**: An ordered array of individual session set objects.

---

## 7. Compliance Analyzer Service

**Purpose**: Compares a completed session set against its planned targets to determine compliance.

**Inputs**: A completed `SessionSet`, its corresponding `PlannedSet`.

**Process**: For each planned parameter (count range, load range, RPE range), compares the actual value against the min/max bounds:
- Within bounds → `withinRange`
- Below minimum → `belowMinimum`
- Above maximum → `aboveMaximum`
- Null actual value → `incomplete`

Overall compliance is the worst-case across all parameters. All parameters within range → `fullyCompliant`.

**Outputs**: A `SetComplianceResult` with `overall` status and per-parameter detail.

---

## 8. Fatigue Analyzer Service

**Purpose**: Computes whether the user's RPE progression across sets matches the expected fatigue profile.

**Inputs**: All completed sets for an exercise item (in order), the planned `FatigueProgressionProfile`, and the current set index.

**Process**: Compares the RPE increase from the previous set to the current set against the expected increment. If the actual climb deviates beyond tolerance, reports `tooFast` or `tooSlow`. If data is insufficient (< 2 sets), reports `notApplicable`.

**Outputs**: A `FatigueAnalysisResult` with status, expected and actual RPE values, and deviation.

---

## 9. Set Count Advisor Service

**Purpose**: Advises whether the user should perform another set, based on plan constraints, fatigue, and stop criteria.

**Inputs**: Completed sets for the current exercise item, the planned set block, user's fatigue sensitivity setting, simple mode flag.

**Logic** (evaluated in order):
1. If completed sets ≥ `setCountRange.max` → `stop` (max sets reached).
2. If stop criteria is `rpeCeiling` and last RPE ≥ ceiling → `stop` or `optional` (depending on whether minimum was reached).
3. If last set reached `absoluteFailure` or `technicalFailure` → `stop` or `optional`.
4. If fatigue profile exists and RPE climb > expected + 2× tolerance → `stop` or `optional`.
5. If completed sets < `setCountRange.min` → `doAnother`.
6. Otherwise → `optional`.

**Outputs**: A `SetCountAdvisorResult` with advice, reasoning string, counts, and RPE ceiling.

---

## 10. Load Suggestion Engine

**Purpose**: Generates one or more load recommendations for the next set, each using a different method.

**Methods available**:

### Method 1: Percentage of 1RM
- Requires: planned `percentage1RMRange` and a stored `OneRepMaxRecord`.
- Computes: `1RM value × percentage_min`, rounded to 0.5 kg increment.

### Method 2: Last Session
- Requires: recorded load from the most recent matching session.
- Suggests the same load with reasoning string showing the previous performance.
- Confidence: medium.

### Method 3: Planned RPE Table
- Requires: planned `rpeRange`, rep count, and 1RM estimate.
- Adjusts planned RPE upward based on set index and fatigue profile.
- Uses RPE/percentage lookup table to derive load.
- Returns a suggested value with min/max bounds.
- Not available in simple mode.

### Method 4: Target XRM
- Requires: `targetXRM` on the planned exercise item and a 1RM estimate.
- Computes the load for X reps at RPE 10 using the lookup table.
- Returns value with min/max bounds.

**Outputs**: An array of `LoadSuggestion` objects, each with: method, suggested load, confidence level, reasoning string, and optional min/max range.

**Context object** (`LoadSuggestionContext`) includes: planned set, planned item, previous sets in session, exercise ID, best 1RM (with confidence), last session performance, simple mode flag.

---

## 11. One-Rep Max Estimator Service

**Purpose**: Estimates 1RM from historical session data without requiring a direct test.

**Inputs**: Optional exercise ID (for single exercise) or all exercises (batch).

**Process**: For each exercise, scans the most recent completed sets (up to 5 sessions) for a set with valid load, count (> 0), and RPE (6–10). Applies a weighted average 1RM formula (Brzycki, Epley, Lander, O'Connor, Lombardi). Returns the estimate alongside the source set's load, reps, RPE, and date.

**Outputs**: `HistoryEstimate` per exercise: `{ value, unit, load, reps, rpe, date }`.

---

## 12. Warmup Calculator Service

**Purpose**: Generates an automatic warmup set scheme based on the working weight, exercise type, and session context.

**Classification**:
- `isolation` → simple warmup scheme regardless of load ratio.
- `compound_upper` → high stress if load/bodyweight ≥ 1.0, medium if ≥ 0.5, low otherwise.
- `compound_lower` → high stress if load/bodyweight ≥ 1.25, medium if ≥ 0.75, low otherwise.
- If body weight is unknown → defaults to high stress.

**Schemes** (as percentage of working weight × reps):

| Scenario | Sets |
|---|---|
| Isolation, first for muscle | 60%×8, 80%×3 |
| Isolation, not first for muscle | 60%×8 |
| Compound high stress | 50%×6, 70%×4, 85%×2 |
| Compound medium stress | 60%×5, 80%×3 |
| Compound low stress | 65%×5 |

If the exercise is not the first for its primary muscle group in the session, the first warmup set is removed.

**Custom warmup**: If the planned exercise item has `warmupSets` configured, those override the automatic scheme.

**Outputs**: Array of `WarmupSet` objects: `{ weight, reps, percent }`.

---

## 13. RPE / Percentage Table Service

**Purpose**: Converts between RPE, rep count, and percentage of 1RM for load suggestions.

**Core operations**:

- **Calculate weighted e1RM**: Given actual load, reps, and RPE, estimates 1RM using a weighted combination of Brzycki, Epley, Lander, O'Connor, and Lombardi formulas. Returns a central estimate plus min/max from the formula spread.
- **Suggest load**: Given a 1RM estimate, target reps, and target RPE, returns the suggested load (central value plus min/max bounds) by reversing the 1RM formula.

All weights are rounded to 0.5 kg increments.

---

## 14. Compliance Calculator (Analytics)

**Purpose**: Aggregates compliance status across all sets in a date range.

**Process**: Counts occurrences of each `ComplianceStatus` value. Computes the percentage of sets that are `fullyCompliant` or `withinRange`. Compares against the previous equivalent period to produce a trend delta.

---

## 15. Volume Analyzer Service (Planned)

**Purpose**: Computes planned training volume for sessions and workout plans from the planning hierarchy.

**Method**: For each planned exercise item, fetches associated exercises and set blocks. Accumulates weighted set counts:
- Primary muscle → weight 1.0
- Secondary muscle → weight 0.5

Organizes volume by muscle, muscle group, movement pattern, and objective.

**Outputs**: A `SessionVolumeAnalysis` (per session) or `WorkoutVolumeAnalysis` (aggregated across all sessions), each with `byMuscle`, `byMuscleGroup`, `byMovementPattern`, `byObjective` arrays and a `MuscleOverlapData` matrix showing which muscles are shared across sessions.

---

## 16. Analytics Service

**Purpose**: Aggregates historical session data into multi-dimensional analytics.

**Inputs**: Date range, optional filter by workout ID, session ID, group ID, or exercise item ID.

**Process**: Loads completed sessions in range in batches of 50. For each batch:
- Fetches groups, items, sets, exercises, and exercise versions.
- Resolves historical exercise identity (uses version snapshot if available).
- Accumulates: compliance distribution, RPE accuracy, load progression per exercise, volume by muscle/group/movement/objective, session summary list.

Also fetches 1RM records, body weight records, and estimates 1RM from history for all exercises.

**Outputs**: An `AnalyticsData` object containing:
- `compliance`: distribution + average + trend
- `load`: load progression per exercise + history estimates + 1RM records
- `volume`: by muscle, group, movement, objective + total sets + averages
- `frequency`: weekly frequency + target sessions per week + total sessions
- `sessionHistory`: chronological list of session summaries
- `bodyWeight`: all body weight records in range
- `rpe`: RPE accuracy points + average deviation + trend

---

## 17. Dashboard Service

**Purpose**: Provides data for the home dashboard.

**Functions**:

### Dashboard Stats
Returns total count of exercises and workout plans.

### Last Workout Summary
Returns detailed information about the most recently completed session: name, workout name, exercise list with best loads, total volume, average RPE, duration, primary and secondary muscles.

### Training Calendar
Returns a map of date strings to calendar entries (session name, start time, end time) for a given month.

### Consistency Heatmap
Returns a list of date strings with session counts for the last 365 days.

### Muscle Freshness
Returns all muscles ordered by how recently they were trained. For each muscle, reports the last trained timestamp and hours elapsed. Muscles never trained appear last.

---

## 18. Session Rotation Service

**Purpose**: Determines the next planned session to suggest to the user.

**Process**:
1. Finds the single active workout plan.
2. Gets all sessions ordered by `orderIndex`.
3. Finds the most recently completed `WorkoutSession` linked to this workout.
4. Identifies which planned session was last completed.
5. Returns the next session in the rotation (wraps around with modulo).
6. If no session has ever been completed → suggests the first session.

**Outputs**: A `NextSessionSuggestion` with the workout, session, position in rotation, total sessions, and last completed date.

**Extended version** (`NextSessionSuggestionDetail`) also includes: volume analysis, equipment list, exercise count, set count range, and duration estimate.

---

## 19. Duration Estimator Service

**Purpose**: Estimates how long a planned session will take based on its set count, rest times, and execution time.

**Process**: For each planned set block, estimates time per set (execution time + rest time). Sums across all items and groups.

**Outputs**: A duration range (min and max seconds), formatted as a human-readable label (e.g., "45–60 min").

---

## 20. Exercise Performance Service

**Purpose**: Analyzes how the user's performance on each exercise item has changed compared to the previous equivalent session.

**Inputs**: Completed session ID.

**Process**: For each session item, finds the same planned exercise slot in the most recent previous completed session (same workout, same planned session, same occurrence index). Computes an aggregate metric (e.g., average e1RM or volume-load). Compares against the previous equivalent to determine the trend. Stores `performanceStatus` and `hasRangeConstraint` on `SessionExerciseItem`.

**Outputs**: Writes `performanceStatus` directly to `SessionExerciseItem` records.

---

## 21. Exercise History Service

**Purpose**: Retrieves historical performance for a specific exercise, optionally filtered to a specific planned item slot.

**Inputs**: Exercise ID, optional planned item ID, optional session ID scope.

**Outputs**: Historical sets sorted by date, grouped by session.

---

## 22. Backup Service

**Purpose**: Exports and imports all user data as a structured JSON file.

### Export
- Accepts a list of table names to include (or exports all tables).
- Serializes all records, converting Date values to ISO-8601 strings.
- Wraps in a `BackupSchema` envelope with version, export timestamp, and app identifier.
- Returns a file blob suitable for download (max recommended 10 MB).

### Import
- Parses the JSON file and validates the envelope format.
- Detects conflicts: records in the file whose IDs already exist in the local database.
- Reports conflicts per table with count and IDs.
- Applies the chosen conflict resolution strategy (`copy`, `ignore`, or `overwrite`).
- Processes tables in dependency order (parent tables before child tables).
- For `copy` strategy, remaps all conflicting IDs and updates all foreign key references.
- Applies legacy migrations (e.g., converts single-string `equipment` fields to arrays).
- Validates each record against a schema before inserting.

### File Format (BackupSchema)
```
{
  version: 1,
  exportedAt: "ISO-8601 string",
  appName: "WorkoutTracker2",
  data: {
    [tableName]: Array of records
  }
}
```

**Export categories** (user can select subsets):
- Exercises (exercises, exercise versions)
- Workouts (planned workouts, sessions, groups, items, sets)
- Sessions (workout sessions, session groups, items, sets)
- One-Rep Max records
- User profile + body weight
- Regulation profile
- Session templates

---

## 23. CSV Exercise Service

**Purpose**: Imports and exports exercise library entries as flat CSV files.

**Export format columns**: `exercise`, `equipment`, `type`, `pattern`, `counter`, `load_unit`, `primary_muscles`, `secondary_muscles`, `description`, `key_points`, `variants`. Arrays are semicolon-separated.

**Import**: Parses CSV, validates required fields, resolves conflicts by name (case-insensitive match). Applies the selected conflict strategy (`ignore`, `overwrite`, `copy`).

**Conflict detection**: Reports exercises whose names already exist in the library.

---

## 24. CSV Workout Service

**Purpose**: Imports and exports workout plan hierarchies as flat CSV files.

**Format**: One row per PlannedSet, with columns for workout, session, group, item, and all set parameters.

**Import**: Reconstructs the full five-level hierarchy from flat rows, creating or linking all entities.

---

## 25. Session Template Service

**Purpose**: Manages reusable session structure templates.

**Serialize session to template**: Reads a planned session's full hierarchy and converts it to a `SessionTemplateContent` object.

**Create template**: Wraps content in a `SessionTemplate` record and persists it.

**Import template into workout**: Creates a new `PlannedSession` within the target workout, then recreates all groups, items, and sets from the template content. All entities receive new IDs.

**Clone session**: Duplicates an existing planned session within the same workout, creating all new entities with fresh IDs.

---

## 26. Authentication Service

**Purpose**: Manages PIN-based user protection.

**Hashing**: Computes a SHA-256 hex digest of a numeric PIN string.

**Verification**: Hashes the candidate PIN and compares it to the stored hash.

**Storage**: The hash is stored on `GlobalUser.pinHash`. Null indicates no PIN is set.

---

## 27. System Maintenance Service

**Purpose**: Administrative operations on the database (developer / danger zone).

**Operations**:
- **Reset database**: Deletes all tables in the current user's database and reloads the application.
- **Load fixtures**: Inserts pre-defined sample exercises, workout plans, and sessions.
- **Clear selected data**: Clears specific data categories (by table group) while preserving others.

---

## 28. User Service

**Purpose**: Manages GlobalUser accounts.

**Operations**: Create user (with optional PIN), update user, change PIN, remove PIN, delete user (cascades to all per-user data), switch active user.

---

## 29. Profile Service

**Purpose**: Manages per-user profile and body weight data.

**Operations**: Get/update user profile, add body weight record, update body weight record, delete body weight record, get latest body weight, get body weight records in date range.

---

## 30. Objective Scoring Service

**Purpose**: Scores a planned set block against each ObjectiveType based on rep ranges, RPE ranges, and set counts.

**Usage**: Used in volume analysis to attribute sets to training objectives.

---

## 31. Rest Timer Resolver Service

**Purpose**: Determines how many seconds of rest to apply after a set is completed.

**Inputs**: The completed set, the next set, the group type, the planned set's rest range, and cluster configuration.

**Logic**: If the group has a rest override for the completed-set-type → next-set-type transition, uses the override source (intra-set rest or planned rest). Otherwise uses the midpoint of the planned `restSecondsRange`.

---

## 32. Native Device Service

**Purpose**: Abstracts platform-specific features (file system, sharing, status bar) for mobile native targets.

**Capabilities**:
- Detect if running as a native app vs. browser.
- Download a backup file using the native share sheet or file system.
- Pick and read a JSON file from the native file system.

When not running natively, falls back to standard browser file download and file input mechanisms.
