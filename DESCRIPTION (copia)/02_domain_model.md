# Workout Tracker — Domain Model

This document describes every entity in the system: its attributes, types, constraints, relationships, and lifecycle. All types are described abstractly; there is no reference to any specific programming language or storage technology.

---

## Entity Overview

The domain is divided into five layers:

1. **Identity layer** — global user accounts
2. **Exercise library** — the catalog of exercises
3. **Planning hierarchy** — workout plans, sessions, groups, items, and set blocks
4. **Execution hierarchy** — live and completed workout sessions
5. **Reference and profile data** — 1RM records, body weight, user preferences, templates

---

## 1. Identity Layer

### GlobalUser

Represents a person who uses the application on this device. Multiple global users may exist; only one is active at a time.

| Attribute | Type | Constraints |
|---|---|---|
| `id` | String (UUID) | Required, unique |
| `name` | String | Required, non-empty |
| `pinHash` | String or null | Optional; SHA-256 hex digest of a numeric PIN |
| `avatarColor` | String (hex color) | Required; chosen from a predefined palette of 8 colors |
| `createdAt` | Timestamp | Required, immutable |

**Relationships**: One GlobalUser → many per-user data records (exercises, plans, sessions, etc.) in an isolated database.

**Lifecycle**: Created during onboarding or user creation. Never deleted through normal UI (requires explicit "Delete Account" action which cascades to all per-user data). PIN can be added, changed, or removed.

**Constraints**: At least one GlobalUser must always exist. The application prevents deleting the last user.

---

### GlobalAppState

A singleton record tracking which user is currently active.

| Attribute | Type | Constraints |
|---|---|---|
| `id` | Literal `"singleton"` | Fixed, exactly one record |
| `lastActiveUserId` | String or null | References a GlobalUser ID |

---

## 2. Exercise Library

### Exercise

A reusable definition of a physical exercise available in the user's library.

| Attribute | Type | Constraints |
|---|---|---|
| `id` | String (UUID) | Required, unique |
| `name` | String | Required, non-empty, max 200 chars |
| `type` | ExerciseType | Required |
| `primaryMuscles` | Array of Muscle | Required, min 1 item |
| `secondaryMuscles` | Array of Muscle | Required, may be empty |
| `equipment` | Array of Equipment | Required, may be empty |
| `movementPattern` | MovementPattern | Required |
| `counterType` | CounterType | Required |
| `defaultLoadUnit` | `"kg"` or `"lbs"` | Required |
| `notes` | String | Optional |
| `description` | String | Optional |
| `keyPoints` | String | Optional; coaching cues |
| `variantIds` | Array of Exercise IDs | Optional; related exercise variants |
| `isArchived` | Boolean | Optional; default false |
| `createdAt` | Timestamp | Required |
| `updatedAt` | Timestamp | Required |

**Relationships**:
- Self-referencing many-to-many through `variantIds` (exercise variants).
- Referenced by `PlannedExerciseItem.exerciseId`, `SessionExerciseItem.exerciseId`, `OneRepMaxRecord.exerciseId`.
- An exercise may have zero or more `ExerciseVersion` snapshots.

**Lifecycle**: Created by user. Can be edited (triggers a new ExerciseVersion snapshot). Can be archived (hidden from lists but retained in historical data). Cannot be permanently deleted through the UI if referenced in past sessions.

---

### ExerciseVersion

An immutable snapshot of an exercise's state at a specific point in time. Created automatically whenever an exercise is edited.

| Attribute | Type | Constraints |
|---|---|---|
| `id` | String (UUID) | Required, unique |
| `exerciseId` | String | Required; references Exercise |
| `name` | String | Snapshot of name at version time |
| `type` | ExerciseType | Snapshot |
| `primaryMuscles` | Array of Muscle | Snapshot |
| `secondaryMuscles` | Array of Muscle | Snapshot |
| `equipment` | Array of Equipment | Snapshot |
| `movementPattern` | MovementPattern | Snapshot |
| `counterType` | CounterType | Snapshot |
| `versionTimestamp` | Timestamp | Required; when the snapshot was created |

**Purpose**: Ensures that historical session data accurately reflects what the exercise looked like when a session was performed, even if the exercise definition has since changed.

**Relationships**: Many ExerciseVersions → one Exercise. Referenced by `SessionExerciseItem.exerciseVersionId`.

---

## 3. Planning Hierarchy

The planning hierarchy is a five-level tree: Workout → Session → Group → Item → Set.

### PlannedWorkout

The top-level plan container representing a complete training program.

| Attribute | Type | Constraints |
|---|---|---|
| `id` | String (UUID) | Required, unique |
| `name` | String | Required, non-empty |
| `description` | String | Optional |
| `objectiveType` | ObjectiveType | Required |
| `workType` | WorkType | Required |
| `status` | PlannedWorkoutStatus | Required; default `active` |
| `isArchived` | Boolean | Optional; default false |
| `createdAt` | Timestamp | Required |
| `updatedAt` | Timestamp | Required |

**Relationships**: One PlannedWorkout → many PlannedSessions.

**Lifecycle**: Created, activated/deactivated, archived. Only one workout should carry status `active` at a time (enforced by application logic, not a hard DB constraint).

---

### PlannedSession

A named training day within a workout plan (e.g., "Push Day", "Leg Day").

| Attribute | Type | Constraints |
|---|---|---|
| `id` | String (UUID) | Required, unique |
| `plannedWorkoutId` | String | Required; references PlannedWorkout |
| `name` | String | Required, non-empty |
| `dayNumber` | Integer | Required; display order (1-based) |
| `focusMuscleGroups` | Array of MuscleGroup | Required, may be empty |
| `status` | PlannedSessionStatus | Required; default `pending` |
| `notes` | String | Optional; displayed to user at session start |
| `orderIndex` | String (LexoRank) | Required; used for reordering |
| `createdAt` | Timestamp | Required |
| `updatedAt` | Timestamp | Required |

**Relationships**: Many PlannedSessions → one PlannedWorkout. One PlannedSession → many PlannedExerciseGroups.

**Ordering**: Sessions within a workout are ordered by `orderIndex` (lexicographic rank string enabling O(1) reordering without renumbering).

**Lifecycle**: Created within a workout. Can be reordered, renamed, duplicated, saved as template, deleted. Deleting cascades to all child groups, items, and sets.

---

### PlannedExerciseGroup

A logical grouping of one or more exercises within a session.

| Attribute | Type | Constraints |
|---|---|---|
| `id` | String (UUID) | Required, unique |
| `plannedSessionId` | String | Required; references PlannedSession |
| `groupType` | ExerciseGroupType | Required |
| `restBetweenRoundsSeconds` | Integer | Optional; rest between full rounds (relevant for interleaved groups) |
| `orderIndex` | String (LexoRank) | Required |
| `notes` | String | Optional |

**Relationships**: Many PlannedExerciseGroups → one PlannedSession. One PlannedExerciseGroup → many PlannedExerciseItems.

**Constraints**: Groups of type `cluster` must contain exactly one PlannedExerciseItem.

---

### PlannedExerciseItem

An assignment of a specific exercise within a group, optionally configured with modifiers and warmup configuration.

| Attribute | Type | Constraints |
|---|---|---|
| `id` | String (UUID) | Required, unique |
| `plannedExerciseGroupId` | String | Required; references PlannedExerciseGroup |
| `exerciseId` | String | Required; references Exercise |
| `counterType` | CounterType | Required; may differ from Exercise default |
| `modifiers` | Array of SetModifier | Optional |
| `orderIndex` | String (LexoRank) | Required |
| `notes` | String | Optional |
| `warmupSets` | Array of WarmupSetConfiguration | Optional; custom warmup override |
| `targetXRM` | Integer | Optional; e.g. 5 means "5-rep max target" for load calculation |

**Relationships**: Many PlannedExerciseItems → one PlannedExerciseGroup. One PlannedExerciseItem → many PlannedSets.

---

### WarmupSetConfiguration

A single entry in a user-defined warmup scheme for an exercise item.

| Attribute | Type | Constraints |
|---|---|---|
| `id` | String | Optional |
| `counter` | Integer | Optional; number of reps for this warmup set |
| `percentOfWorkSet` | Number (0–100) | Required; percentage of the working weight |
| `restSeconds` | Integer | Required; rest after this warmup set in seconds |

---

### PlannedSet

A block of sets with parameterized targets within an exercise item. One PlannedSet typically represents multiple actual sets (e.g., "3–5 sets of 6–8 reps at RPE 7–8").

| Attribute | Type | Constraints |
|---|---|---|
| `id` | String (UUID) | Required, unique |
| `plannedExerciseItemId` | String | Required; references PlannedExerciseItem |
| `setCountRange` | SetCountRange | Required; how many sets to perform |
| `countRange` | CountRange | Required; target reps/seconds/distance range |
| `loadRange` | LoadRange | Optional; target load range |
| `percentage1RMRange` | Percentage1RMRange | Optional; load expressed as % of 1RM |
| `rpeRange` | RPERange | Optional; target Rate of Perceived Exertion |
| `restSecondsRange` | NumericRange | Optional; planned rest between sets |
| `fatigueProgressionProfile` | FatigueProgressionProfile | Optional; expected RPE climb per set |
| `setType` | SetType | Required |
| `tempo` | String | Optional; e.g. "3-1-2-0" (eccentric-pause-concentric-pause) |
| `notes` | String | Optional |
| `orderIndex` | String (LexoRank) | Required |

**Relationships**: Many PlannedSets → one PlannedExerciseItem.

---

## 3a. Value Objects (Planning)

### NumericRange
`{ min: Number, max: Number|null, isFixed: Boolean }`
A general numeric range. `max = null` implies unbounded (to failure). `isFixed = true` means min === max.

### RPERange
`{ min: Number (6.0–10.0), max: Number (6.0–10.0) }`
RPE values in 0.5 increments.

### Percentage1RMRange
`{ min: Number (0.40–1.00), max: Number (0.40–1.00), basedOnEstimated1RM: Boolean }`
Load expressed as a fraction of 1RM.

### LoadRange
`{ min: Number, max: Number|null, unit: "kg"|"lbs" }`
Absolute load range in a specific unit.

### CountRange
`{ min: Integer, max: Integer|null, toFailure: ToFailureIndicator }`
Repetition or duration range. `max = null` means "to failure".

### SetCountRange
`{ min: Integer, max: Integer|undefined, stopCriteria: "maxSets"|"rpeCeiling"|"velocityLoss"|"technicalBreakdown"|undefined }`
Number of sets to perform and optional stopping criterion.

### FatigueProgressionProfile
`{ expectedRPEIncrementPerSet: Number, tolerance: Number }`
The expected RPE increase from one set to the next within the same exercise.

### SetModifier
A discriminated union with a `type` field and a `config` object:

| Modifier Type | Config Fields |
|---|---|
| `cluster` | `totalRepsTarget`, `miniSetReps`, `miniSetCount`, `interMiniSetRestSeconds`, `loadReductionPercent?`, `miniSetToFailure`, `rpeRange?` |
| `dropSet` | `loadReductionPercent`, `sets` |
| `myoRep` | `activationReps`, `miniSetReps`, `restSeconds` |
| `topSet` | (no config fields currently) |
| `backOff` | `loadReductionPercent`, `rpeTarget?` |

---

## 4. Execution Hierarchy

The execution hierarchy mirrors the planning hierarchy but captures actual performance.

### WorkoutSession

A live or completed instance of executing a planned session (or an unplanned free session).

| Attribute | Type | Constraints |
|---|---|---|
| `id` | String (UUID) | Required, unique |
| `plannedSessionId` | String | Optional; if linked to a plan |
| `plannedWorkoutId` | String | Optional; if linked to a plan |
| `startedAt` | Timestamp | Required |
| `completedAt` | Timestamp | Optional; null while in progress |
| `notes` | String | Optional |
| `overallRPE` | Number (6–10) | Optional; user's overall session RPE |
| `totalSets` | Integer | Optional; populated at completion |
| `totalLoad` | Integer | Optional; total volume-load in kg×reps |
| `totalReps` | Integer | Optional; total repetitions |
| `totalDuration` | Integer (seconds) | Optional; for time-based exercises |
| `primaryMusclesSnapshot` | Array of Muscle | Optional; snapshot at completion |
| `secondaryMusclesSnapshot` | Array of Muscle | Optional; snapshot at completion |

**Lifecycle**: Created by session activation. "In progress" while `completedAt` is null. Completed by the session finisher. Discarded by the discard action (full cascade delete). Only one session may be "in progress" at a time; activating a new session auto-completes any existing active session.

---

### SessionExerciseGroup

Execution-layer counterpart to PlannedExerciseGroup.

| Attribute | Type | Constraints |
|---|---|---|
| `id` | String (UUID) | Required, unique |
| `workoutSessionId` | String | Required; references WorkoutSession |
| `plannedExerciseGroupId` | String | Optional; links to plan |
| `groupType` | ExerciseGroupType | Required |
| `orderIndex` | String (LexoRank) | Required |
| `isCompleted` | Boolean | Required; default false |
| `completedAt` | Timestamp | Optional; set at session completion |

---

### SessionExerciseItem

Execution-layer counterpart to PlannedExerciseItem. Supports exercise substitution.

| Attribute | Type | Constraints |
|---|---|---|
| `id` | String (UUID) | Required, unique |
| `sessionExerciseGroupId` | String | Required; references SessionExerciseGroup |
| `plannedExerciseItemId` | String | Optional; links to plan |
| `exerciseId` | String | Required; actual exercise performed (may differ from plan if substituted) |
| `exerciseVersionId` | String | Optional; version snapshot at completion |
| `orderIndex` | String (LexoRank) | Required |
| `isCompleted` | Boolean | Required; default false |
| `notes` | String | Optional |
| `originalExerciseId` | String | Optional; the planned exercise if substituted |
| `completedAt` | Timestamp | Optional |
| `performanceStatus` | PerformanceTrendStatus | Optional; computed at session completion |
| `hasRangeConstraint` | Boolean | Optional; true if any planned parameter uses a range (min ≠ max) |

---

### SessionSet

A single executed set within a session item. This is the atomic unit of training data.

| Attribute | Type | Constraints |
|---|---|---|
| `id` | String (UUID) | Required, unique |
| `sessionExerciseItemId` | String | Required; references SessionExerciseItem |
| `plannedSetId` | String | Optional; links to plan |
| `setType` | SetType | Required |
| `orderIndex` | String (LexoRank) | Required |
| `actualLoad` | Number or null | Optional; weight used |
| `actualCount` | Integer or null | Optional; reps/seconds/distance performed |
| `actualRPE` | Number (6–10) or null | Optional |
| `actualToFailure` | ToFailureIndicator | Required; default `none` |
| `expectedRPE` | Number or null | Optional; pre-populated from history |
| `completedAt` | Timestamp | Optional |
| `isCompleted` | Boolean | Required; default false |
| `isSkipped` | Boolean | Required; default false |
| `complianceStatus` | ComplianceStatus | Optional; computed after completion |
| `fatigueProgressionStatus` | FatigueProgressionStatus | Optional; computed after completion |
| `plannedVsActual` | Object | Optional; deviations per parameter |
| `tempo` | String | Optional |
| `partials` | Boolean | Required; default false |
| `forcedReps` | Integer | Required; default 0 |
| `restSecondsBefore` | Integer | Optional; actual rest taken before this set |
| `notes` | String | Optional |
| `e1rm` | Number | Optional; estimated 1RM computed at completion |
| `relativeIntensity` | Number | Optional; e1RM ÷ body weight |

**plannedVsActual structure**: `{ countDeviation?: Number, loadDeviation?: Number, rpeDeviation?: Number }`

---

### ExerciseSubstitution

Records that an exercise was substituted during a session (user replaced a planned exercise with an alternative).

| Attribute | Type | Constraints |
|---|---|---|
| `id` | String (UUID) | Required, unique |
| `plannedExerciseItemId` | String | Required; which planned slot was substituted |
| `plannedWorkoutId` | String | Required |
| `originalExerciseId` | String | Required; what was planned |
| `substitutedExerciseId` | String | Required; what was actually performed |
| `sessionId` | String | Required; which session it occurred in |
| `createdAt` | Timestamp | Required |

**Purpose**: Used by the two-phase session activation to prompt the user on subsequent activations of the same planned session: "Last time you used X instead of Y — do it again?"

---

## 5. Reference and Profile Data

### OneRepMaxRecord

A recorded or estimated one-repetition maximum for an exercise.

| Attribute | Type | Constraints |
|---|---|---|
| `id` | String (UUID) | Required, unique |
| `exerciseId` | String | Required; references Exercise |
| `exerciseVersionId` | String | Optional |
| `value` | Number | Required; the 1RM value |
| `valueMin` | Number | Optional; lower bound of estimate |
| `valueMax` | Number | Optional; upper bound of estimate |
| `errorPercentage` | Number | Optional |
| `unit` | `"kg"` or `"lbs"` | Required |
| `method` | `"direct"` or `"indirect"` | Required |
| `testedLoad` | Number | Optional; load used in indirect test |
| `testedReps` | Integer | Optional |
| `estimateBrzycki` | Number | Optional |
| `estimateEpley` | Number | Optional |
| `estimateLander` | Number | Optional |
| `estimateOConner` | Number | Optional |
| `estimateLombardi` | Number | Optional |
| `recordedAt` | Timestamp | Required |
| `notes` | String | Optional |

**Relationships**: Many records per exercise. The "best" record for an exercise is determined by highest `value`.

**Method**: `direct` means the user actually lifted a 1RM. `indirect` means it was estimated from a submaximal test set.

---

### UserProfile

The personal profile of the active user (per-user database).

| Attribute | Type | Constraints |
|---|---|---|
| `id` | String (UUID) | Required, unique (one per user database) |
| `name` | String | Required, non-empty |
| `gender` | `"male"` \| `"female"` \| `"undisclosed"` | Required |
| `createdAt` | Timestamp | Required |
| `updatedAt` | Timestamp | Required |

---

### BodyWeightRecord

A single body weight measurement.

| Attribute | Type | Constraints |
|---|---|---|
| `id` | String (UUID) | Required, unique |
| `weight` | Number (kg) | Required; positive |
| `recordedAt` | Timestamp | Required |
| `notes` | String | Optional |

**Relationships**: Many per user. The most recent record is used as the current body weight for 1RM relative intensity calculations and warmup stress classification.

---

### UserRegulationProfile

User preferences governing session behavior.

| Attribute | Type | Constraints | Default |
|---|---|---|---|
| `id` | String | Required; singleton `"default"` | — |
| `preferredSuggestionMethod` | `"percentage1RM"` \| `"lastSession"` \| `"plannedRPE"` | Required | `percentage1RM` |
| `fatigueSensitivity` | `"low"` \| `"medium"` \| `"high"` | Required | `medium` |
| `autoStartRestTimer` | Boolean | Required | `true` |
| `simpleMode` | Boolean | Required | `false` |
| `updatedAt` | Timestamp | Required | — |

**fatigueSensitivity** controls the RPE ceiling thresholds in the Set Count Advisor:
- `low` → stops at RPE 10
- `medium` → stops at RPE 9.5
- `high` → stops at RPE 9.0

---

### SessionTemplate

A reusable, named snapshot of a session's group/item/set structure.

| Attribute | Type | Constraints |
|---|---|---|
| `id` | String (UUID) | Required, unique |
| `name` | String | Required, non-empty |
| `description` | String | Optional |
| `content` | SessionTemplateContent | Required |
| `createdAt` | Timestamp | Required |
| `updatedAt` | Timestamp | Required |

**SessionTemplateContent structure**:
```
{
  focusMuscleGroups: MuscleGroup[],
  notes?: String,
  groups: [
    {
      groupType: ExerciseGroupType,
      restBetweenRoundsSeconds?: Integer,
      orderIndex: String,
      notes?: String,
      items: [
        {
          exerciseId: String,
          counterType: CounterType,
          modifiers?: SetModifier[],
          orderIndex: String,
          notes?: String,
          sets: PlannedSet[] (without id and plannedExerciseItemId)
        }
      ]
    }
  ]
}
```

**Purpose**: Templates allow users to save a session structure and import it into any workout plan, creating a new set of PlannedExerciseGroups/Items/Sets.

---

## Entity Relationship Summary

```
GlobalUser (global)
  └── per-user database:
        ├── UserProfile (1:1)
        ├── UserRegulationProfile (1:1)
        ├── BodyWeightRecord (1:N)
        ├── Exercise (N)
        │     └── ExerciseVersion (N per Exercise)
        ├── PlannedWorkout (N)
        │     └── PlannedSession (N per Workout)
        │           └── PlannedExerciseGroup (N per Session)
        │                 └── PlannedExerciseItem (N per Group)
        │                       └── PlannedSet (N per Item)
        ├── WorkoutSession (N)
        │     └── SessionExerciseGroup (N per Session)
        │           └── SessionExerciseItem (N per Group)
        │                 └── SessionSet (N per Item)
        ├── ExerciseSubstitution (N)
        ├── OneRepMaxRecord (N)
        └── SessionTemplate (N)
```

---

## Referential Integrity Rules

- Deleting a PlannedWorkout cascades to PlannedSessions → PlannedExerciseGroups → PlannedExerciseItems → PlannedSets.
- Deleting a WorkoutSession cascades to SessionExerciseGroups → SessionExerciseItems → SessionSets.
- Exercises are never hard-deleted if referenced in session history; they are archived instead.
- At session completion, empty items (0 completed sets) and empty groups are removed automatically.
- `exerciseVersionId` is populated on SessionExerciseItem at session completion to preserve the historical snapshot of the exercise definition.
