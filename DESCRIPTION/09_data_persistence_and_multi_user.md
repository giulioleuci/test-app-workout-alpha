# Workout Tracker — Data Persistence and Multi-User Architecture

This document describes the data storage model, multi-user isolation, data lifecycle, and all persistence rules required to reimplement the system.

> **Flutter implementation note**: Entity IDs are generated using **`nanoid`** (21-character URL-safe random strings). Backup file serialization and deserialization uses **`json_annotation`** (`@JsonSerializable` DTOs with a custom `DateTimeConverter` for ISO-8601 timestamps). The repository layer follows the pattern described in `13_flutter_implementation_stack.md`. Each repository's `create` method calls `nanoid()` to generate a new ID before inserting.

---

## Storage Model

The application uses exclusively local, on-device storage. There is no remote database, no server, and no network dependency. All data is persisted to a local key-value store supporting indexed queries.

---

## Database Architecture: Two-Tier Isolation

### Tier 1: Global Database

A single, shared database exists for all users on the device. It contains only:
- `GlobalUser` records (all user accounts).
- `GlobalAppState` (which user is currently active).

This database is always accessible regardless of which user is active.

### Tier 2: Per-User Database

Each `GlobalUser` has their own isolated database instance, identified by the user's ID. When a user becomes active, their database is opened. All application data (exercises, plans, sessions, profiles, analytics, templates) resides in this per-user database.

When the user switches, the current per-user database is closed and the new user's database is opened. There is no data sharing between per-user databases.

---

## Per-User Database Tables

The following tables exist within each user's database:

| Table Name | Entity Type | Description |
|---|---|---|
| `exercises` | Exercise | Exercise library |
| `exerciseVersions` | ExerciseVersion | Historical snapshots of exercise definitions |
| `plannedWorkouts` | PlannedWorkout | Workout programs |
| `plannedSessions` | PlannedSession | Training days within a workout |
| `plannedExerciseGroups` | PlannedExerciseGroup | Exercise groupings within a session |
| `plannedExerciseItems` | PlannedExerciseItem | Individual exercise assignments |
| `plannedSets` | PlannedSet | Set parameter blocks |
| `workoutSessions` | WorkoutSession | Live/completed session records |
| `sessionExerciseGroups` | SessionExerciseGroup | Execution groups |
| `sessionExerciseItems` | SessionExerciseItem | Execution exercise items |
| `sessionSets` | SessionSet | Individual executed sets |
| `oneRepMaxRecords` | OneRepMaxRecord | 1RM measurements per exercise |
| `userProfile` | UserProfile | User's name and gender |
| `userRegulationProfile` | UserRegulationProfile | App behavior preferences |
| `bodyWeightRecords` | BodyWeightRecord | Body weight measurements |
| `sessionTemplates` | SessionTemplate | Reusable session structures |
| `exerciseSubstitutions` | ExerciseSubstitution | History of exercise substitutions |

---

## Indexing Requirements

Efficient queries require compound and secondary indexes. The following indexes are critical for performance:

### exercises
- Primary: `id`
- Index: `name` (for name-conflict detection during CSV import)
- Index: `isArchived` (for filtering archived exercises)

### exerciseVersions
- Primary: `id`
- Index: `exerciseId` (to find all versions for an exercise)
- Compound index: `[exerciseId, versionTimestamp]` (to find the latest version)

### plannedSessions
- Primary: `id`
- Index: `plannedWorkoutId` (to list sessions for a workout)
- Index: `orderIndex` (for ordered listing)

### plannedExerciseGroups
- Primary: `id`
- Index: `plannedSessionId`

### plannedExerciseItems
- Primary: `id`
- Index: `plannedExerciseGroupId`

### plannedSets
- Primary: `id`
- Index: `plannedExerciseItemId`

### workoutSessions
- Primary: `id`
- Index: `plannedSessionId` (to find sessions for a plan slot)
- Index: `plannedWorkoutId` (to find sessions for a workout)
- Index: `startedAt` (for date-range queries)
- Index: `completedAt` (for finding completed sessions)

### sessionExerciseGroups
- Primary: `id`
- Index: `workoutSessionId`
- Compound index: `[workoutSessionId, orderIndex]`

### sessionExerciseItems
- Primary: `id`
- Index: `sessionExerciseGroupId`
- Index: `exerciseId` (to find all sessions for a given exercise)
- Index: `plannedExerciseItemId` (for plan-based history matching)

### sessionSets
- Primary: `id`
- Index: `sessionExerciseItemId`
- Compound index: `[sessionExerciseItemId, orderIndex]`

### oneRepMaxRecords
- Primary: `id`
- Index: `exerciseId`
- Compound index: `[exerciseId, recordedAt]`

### bodyWeightRecords
- Primary: `id`
- Index: `recordedAt`

### exerciseSubstitutions
- Primary: `id`
- Index: `plannedExerciseItemId` (to find substitution history for a plan slot)
- Index: `plannedWorkoutId`

---

## Ordering Mechanism (LexoRank)

Entities that support user-defined ordering use a **lexicographic rank string** (`orderIndex`). This is a string-based fractional rank that allows inserting items between two existing items without renumbering.

**Affected entities**: `PlannedSession`, `PlannedExerciseGroup`, `PlannedExerciseItem`, `PlannedSet`, `SessionExerciseGroup`, `SessionExerciseItem`, `SessionSet`.

**Operations**:
- **Initial rank**: A starting value (e.g., `"a"` or a midpoint string).
- **Rank between two**: Given rank A and rank B, compute a string lexicographically between them.
- **Rank after last**: Given the last rank, compute a string that sorts after it.
- **Sequential ranks**: Given a count N, generate N evenly spaced ranks.

Lexicographic comparison is used for ordering: `a.orderIndex.localeCompare(b.orderIndex)`.

---

## Transactional Writes

Operations that modify multiple related entities must be performed as atomic transactions to maintain referential integrity:

- **Session activation**: Creating `WorkoutSession` + `SessionExerciseGroups` + `SessionExerciseItems` + `SessionSets` must be atomic.
- **Session finisher**: Updates to session, groups, items, and sets must be atomic.
- **Backup import**: All table writes for an import operation must be atomic.
- **Session cascade delete**: Deleting a session and all its children must be atomic.

---

## Cascade Delete Rules

| Deleted Entity | Cascades To |
|---|---|
| WorkoutSession | SessionExerciseGroup → SessionExerciseItem → SessionSet |
| PlannedWorkout | PlannedSession → PlannedExerciseGroup → PlannedExerciseItem → PlannedSet |
| PlannedSession | PlannedExerciseGroup → PlannedExerciseItem → PlannedSet |
| PlannedExerciseGroup | PlannedExerciseItem → PlannedSet |
| PlannedExerciseItem | PlannedSet |
| SessionExerciseGroup | SessionExerciseItem → SessionSet |
| SessionExerciseItem | SessionSet |
| GlobalUser | All records in their per-user database |

---

## Soft Deletion (Archiving)

Exercises and workout plans support soft deletion via the `isArchived` flag:
- Archived exercises are hidden from normal lists but remain in historical session data.
- When an exercise is referenced in a session, it is never hard-deleted.
- Archived workout plans are hidden from the active plan selector.

---

## Data Integrity at Session Completion

At the end of a session (Session Finisher Service), the following cleanup and population occurs:

1. **Empty items removed**: Any `SessionExerciseItem` with zero completed sets is deleted along with all its sets.
2. **Empty groups removed**: Any `SessionExerciseGroup` with no remaining items after cleanup is deleted.
3. **Exercise version linked**: `SessionExerciseItem.exerciseVersionId` is set to the current `ExerciseVersion.id` for each item. This ensures future analytics always reference the correct historical exercise definition.
4. **e1RM computed**: `SessionSet.e1rm` is computed (weighted average of Brzycki, Epley, Lander, O'Connor, Lombardi) for completed sets with valid load, reps, and RPE.
5. **Relative intensity**: `SessionSet.relativeIntensity = e1rm / bodyWeight` (if body weight is known).
6. **Session aggregates**: `totalSets`, `totalLoad`, `totalReps`, `totalDuration`, `primaryMusclesSnapshot`, `secondaryMusclesSnapshot` are computed and stored on `WorkoutSession`.

---

## Data Migration During Backup Import

The backup importer applies the following legacy migrations:
- **Single-string equipment field**: If an exercise record has `equipment` as a string (old format), it is converted to a single-element array.
- **Date deserialization**: ISO-8601 string fields (`createdAt`, `updatedAt`, `startedAt`, `completedAt`, `recordedAt`) are converted to date objects.

---

## Backup File Format Specification

A backup file is a JSON object with the following structure:

```
{
  "version": 1,
  "exportedAt": "<ISO-8601 timestamp>",
  "appName": "WorkoutTracker2",
  "data": {
    "<tableName>": [
      { ...record fields... },
      ...
    ],
    ...
  }
}
```

- `version`: Always `1` in the current implementation.
- `appName`: The string `"WorkoutTracker2"` used for format identification.
- `data`: A partial record mapping table names to arrays of records. Date fields are serialized as ISO-8601 strings.
- Maximum file size: 10 MB.

**Import table processing order** (respects foreign key dependencies):
1. exercises
2. exerciseVersions
3. userRegulationProfile
4. userProfile
5. bodyWeightRecords
6. oneRepMaxRecords
7. plannedWorkouts
8. plannedSessions
9. plannedExerciseGroups
10. plannedExerciseItems
11. plannedSets
12. workoutSessions
13. sessionExerciseGroups
14. sessionExerciseItems
15. sessionSets
16. sessionTemplates

---

## Active Session Singleton Constraint

At any given time, at most one `WorkoutSession` may have `completedAt = null` (i.e., be in progress). This is enforced at the application layer:

- Before activating a new session, the system checks for an existing active session.
- If one is found, the `PendingSessionDialog` asks the user to resume or discard it.
- If the user chooses to start a new session, the existing one is finished (via the Session Finisher) before the new one is created.

---

## Cache Invalidation

The application maintains an in-memory query cache. The following events trigger cache invalidation:

| Event | Invalidated Queries |
|---|---|
| Exercise created/updated/archived | Exercise list queries |
| Session activated | Active session queries, onboarding status |
| Session completed or discarded | Session queries, history queries, analytics queries, dashboard queries |
| Set completed/updated | Active session state (immediate) |
| Workout created/updated/deleted | Workout list queries, workout detail queries |
| Session template created/deleted | Template list queries |
| 1RM record saved/deleted | 1RM queries |
| Profile updated | Profile queries |
| Body weight record changed | Profile queries, dashboard queries |
| Regulation profile updated | Regulation profile queries |
| Database reset or selective clear | All queries |
| User switch | All queries (full invalidation) |

---

## Seed Data

On first launch (or on explicit "Load Fixtures" action in developer tools), the system can populate the database with:
- A predefined exercise library (~60+ common exercises covering all muscle groups, equipment types, and movement patterns, with full muscle assignments).
- Optional workout plan templates:
  - **Full Body**: A three-day per week full-body training plan.
  - **Push/Pull/Legs**: A six-day PPL split.
  - **Upper/Lower**: A four-day upper/lower split.

Seed data exercises include: compound movements (barbell squat, bench press, deadlift, overhead press, rows), isolation exercises (curls, extensions, lateral raises, etc.), bodyweight exercises, and cardio machine exercises.
