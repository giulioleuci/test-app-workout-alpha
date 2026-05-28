# Workout Tracker 2 — Import File Reference

This document describes every field of the JSON backup/import file accepted by Workout Tracker 2. Its purpose is to enable an LLM (or any author) to craft a complete, valid import file from scratch.

---

## 1. Top-Level Envelope

Every import file is a single JSON object with the following mandatory fields:

```json
{
  "version": 1,
  "exportedAt": "2024-01-15T10:00:00.000Z",
  "appName": "WorkoutTracker2",
  "data": { ... }
}
```

| Field | Type | Description |
|---|---|---|
| `version` | `number` | Schema version. Always `1`. |
| `exportedAt` | `string` (ISO 8601) | Timestamp of export. Any valid ISO 8601 datetime string. |
| `appName` | `string` | Always `"WorkoutTracker2"`. |
| `data` | `object` | Contains one key per table included in this backup. All keys are optional — include only the tables you need. |

### `data` keys (all optional)

```
exercises · exerciseVersions · plannedWorkouts · plannedSessions
plannedExerciseGroups · plannedExerciseItems · plannedSets
workoutSessions · sessionExerciseGroups · sessionExerciseItems · sessionSets
oneRepMaxRecords · userRegulationProfile · sessionTemplates
userProfile · bodyWeightRecords
```

Each key maps to an **array** of record objects for that table.

---

## 2. Shared Conventions

### 2.1 IDs

All `id` fields are **strings** of up to **100 characters**. The application uses `nanoid()` to generate them (URL-safe alphanumeric, 21 characters by default), but any unique string within 100 characters is valid. IDs must be unique within their table.

### 2.2 Date Fields

All date/timestamp values are serialized as **ISO 8601 strings** in the JSON (e.g., `"2024-01-15T10:00:00.000Z"`). The following field names are automatically converted to `Date` objects on import:

- `createdAt`, `updatedAt`, `startedAt`, `completedAt`, `recordedAt`

The field `versionTimestamp` (in `exerciseVersions`) also follows the same ISO 8601 string format.

### 2.3 LexoRank — `orderIndex`

`orderIndex` is a **string** used to sort items within a parent container without requiring bulk renumbering. It uses the **LexoRank** algorithm: a base-36 string where lexicographic (alphabetical) ordering determines display order.

**Rules for generating valid LexoRank values:**
- Use lowercase letters (`a`–`z`) and digits (`0`–`9`).
- A rank like `"0|hzzzzz:"` is a typical middle value. Simple values like `"a"`, `"b"`, `"c"` also work.
- Items are sorted by lexicographic comparison of their `orderIndex` strings.
- The simplest valid approach for hand-crafted files is to use short strings that sort correctly: `"a"`, `"b"`, `"c"` … or `"00"`, `"01"`, `"02"` … etc.
- Each `orderIndex` must be **unique within its parent** (e.g., within a `plannedSessionId`, within a `plannedExerciseGroupId`, etc.).

**Example sequence for 3 items:** `"a"`, `"b"`, `"c"`

### 2.4 Field Lengths

| Constraint | Max characters |
|---|---|
| `id` | 100 |
| `name` | 255 |
| `description` | 5 000 |
| `notes`, `keyPoints` | 10 000 |
| `tempo` | 50 |

### 2.5 Import Processing Order

Tables are processed in dependency order. Ensure referential integrity (a child's FK must point to a record in the same file or already in the DB):

1. `exercises`, `exerciseVersions`, `userRegulationProfile`, `userProfile`, `bodyWeightRecords`
2. `oneRepMaxRecords`
3. `plannedWorkouts`, `plannedSessions`, `plannedExerciseGroups`
4. `plannedExerciseItems`, `plannedSets`
5. `workoutSessions`, `sessionExerciseGroups`, `sessionExerciseItems`, `sessionSets`
6. `sessionTemplates`

---

## 3. Enumerations

All enum values are **strings**. Use the exact string shown below.

### `Muscle`
```
"chest" | "upperBack" | "lowerBack" | "shoulders" | "quadriceps" | "hamstrings"
| "calves" | "biceps" | "triceps" | "abs" | "glutes" | "forearms" | "traps"
| "lats" | "deltoids"
```

### `MuscleGroup` _(coarser grouping used in session focus)_
```
"chest" | "back" | "shoulders" | "arms" | "legs" | "core"
```

### `MovementPattern`
```
"horizontalPush" | "horizontalPull" | "verticalPush" | "verticalPull"
| "squat" | "hinge" | "rotation" | "isometric" | "other"
```

### `CounterType` _(what unit a set counts)_
```
"reps" | "seconds" | "minutes" | "distanceMeter" | "distanceKMeter"
```

> Only `"reps"` and `"seconds"` support the "to failure" feature.  
> Only `"reps"` supports 1RM calculations.

### `Equipment`
```
"barbell" | "dumbbell" | "machine" | "cable" | "bodyweight" | "kettlebell"
| "smithMachine" | "band" | "cardioMachine" | "bench" | "pullUpBar"
| "parallelBars" | "other"
```

### `ExerciseType`
```
"compound" | "isolation"
```

### `ExerciseGroupType` _(how exercises within a group are performed)_
```
"standard" | "warmup" | "superset" | "circuit" | "amrap" | "emom" | "cluster"
```

### `SetType`
```
"warmup" | "working" | "backoff" | "clusterMiniSet"
```

### `WorkType` _(mesocycle phase)_
```
"accumulation" | "intensification" | "peak" | "deload" | "test" | "other"
```

### `ObjectiveType` _(training goal)_
```
"anatomicalAdaptation" | "hypertrophy" | "generalStrength" | "maxStrength"
| "power" | "muscularEndurance" | "workCapacity" | "rehabPrehab" | "other"
```

### `PlannedWorkoutStatus`
```
"active" | "inactive" | "archived"
```

### `PlannedSessionStatus`
```
"pending" | "active" | "completed" | "skipped"
```

### `SetType`
```
"warmup" | "working" | "backoff" | "clusterMiniSet"
```

### `ToFailureIndicator` _(how close to muscular failure a set was taken)_
```
"none" | "technicalFailure" | "absoluteFailure" | "barSpeedFailure"
```

### `ComplianceStatus` _(how actual performance compared to the plan)_
```
"fullyCompliant" | "withinRange" | "belowMinimum" | "aboveMaximum" | "incomplete"
```

### `FatigueProgressionStatus`
```
"optimal" | "tooFast" | "tooSlow" | "notApplicable"
```

---

## 4. Value Objects

These reusable objects appear as nested fields inside entity records.

### 4.1 `NumericRange`
```json
{ "min": 60, "max": 90, "isFixed": false }
```
| Field | Type | Description |
|---|---|---|
| `min` | `number` | Minimum value. |
| `max` | `number \| null` | Maximum value. `null` means "unlimited / to failure". |
| `isFixed` | `boolean` | `true` when `min === max` (exact value, no range). |

### 4.2 `RPERange`
```json
{ "min": 7.0, "max": 8.5 }
```
| Field | Type | Description |
|---|---|---|
| `min` | `number` | Minimum RPE. Typically 6.0–10.0 in 0.5 increments. |
| `max` | `number` | Maximum RPE. Must be ≥ `min`. |

### 4.3 `Percentage1RMRange`
```json
{ "min": 0.75, "max": 0.80, "basedOnEstimated1RM": true }
```
| Field | Type | Description |
|---|---|---|
| `min` | `number` | Minimum fraction. Range: 0.40–1.00. |
| `max` | `number` | Maximum fraction. Range: 0.40–1.00. |
| `basedOnEstimated1RM` | `boolean` | `true` = calculated from estimated 1RM; `false` = based on tested 1RM. |

### 4.4 `LoadRange`
```json
{ "min": 100, "max": 120, "unit": "kg" }
```
| Field | Type | Description |
|---|---|---|
| `min` | `number` | Minimum load. |
| `max` | `number \| null` | Maximum load. `null` = no upper bound. |
| `unit` | `"kg" \| "lbs"` | Load unit. |

### 4.5 `CountRange`
```json
{ "min": 8, "max": 12, "toFailure": "none" }
```
| Field | Type | Description |
|---|---|---|
| `min` | `number` | Minimum reps/seconds/distance. |
| `max` | `number \| null` | Maximum. `null` = to failure. |
| `toFailure` | `ToFailureIndicator` | Whether this count is a to-failure instruction. See `ToFailureIndicator` enum. |

### 4.6 `SetCountRange`
```json
{ "min": 3, "max": 4, "stopCriteria": "rpeCeiling" }
```
| Field | Type | Description |
|---|---|---|
| `min` | `number` | Minimum number of sets to perform. |
| `max` | `number` _(optional)_ | Maximum sets. Omit if equal to `min`. |
| `stopCriteria` | `string` _(optional)_ | Auto-regulation stop rule: `"maxSets"` \| `"rpeCeiling"` \| `"velocityLoss"` \| `"technicalBreakdown"` |

### 4.7 `FatigueProgressionProfile`
```json
{ "expectedRPEIncrementPerSet: 0.5, "tolerance": 0.5 }
```
| Field | Type | Description |
|---|---|---|
| `expectedRPEIncrementPerSet` | `number` | How much RPE should rise per set (typically 0.5 or 1.0). |
| `tolerance` | `number` | Acceptable deviation from expected increment. |

### 4.8 `WarmupSetConfiguration`
```json
{ "counter": 5, "percentOfWorkSet": 0.60, "restSeconds": 60 }
```
| Field | Type | Description |
|---|---|---|
| `counter` | `number` _(optional)_ | Reps/seconds for the warmup set. |
| `percentOfWorkSet` | `number` | Fraction of the working set load (e.g., `0.60` = 60%). |
| `restSeconds` | `number` | Rest duration after this warmup set, in seconds. |

---

## 5. Set Modifiers

`modifiers` is an **array** of modifier objects. Each modifier is a discriminated union on the `type` field. Multiple modifiers can coexist on a single `PlannedExerciseItem`.

### 5.1 `cluster`
Cluster sets: perform small sub-sets with intra-set rest.
```json
{
  "type": "cluster",
  "config": {
    "totalRepsTarget": 10,
    "miniSetReps": 2,
    "miniSetCount": 5,
    "interMiniSetRestSeconds": 20,
    "loadReductionPercent": 0,
    "miniSetToFailure": false,
    "rpeRange": { "min": 7.0, "max": 8.0 }
  }
}
```
| Field | Type | Description |
|---|---|---|
| `totalRepsTarget` | `number` | Total target reps across all mini-sets. |
| `miniSetReps` | `number` | Reps per mini-set. |
| `miniSetCount` | `number` | Number of mini-sets. |
| `interMiniSetRestSeconds` | `number` | Rest between mini-sets (seconds). |
| `loadReductionPercent` | `number` _(optional)_ | Load reduction % per mini-set. `0` = same load throughout. |
| `miniSetToFailure` | `boolean` | Whether each mini-set goes to failure. |
| `rpeRange` | `RPERange` _(optional)_ | Target RPE for mini-sets. |

### 5.2 `dropSet`
Drop set: reduce load and continue immediately.
```json
{ "type": "dropSet", "config": { "loadReductionPercent": 20, "sets": 2 } }
```
| Field | Type | Description |
|---|---|---|
| `loadReductionPercent` | `number` | How much to drop the load (%). |
| `sets` | `number` | Number of drop-set extensions. |

### 5.3 `myoRep`
Myo-rep: activation set followed by short-rest mini-sets.
```json
{ "type": "myoRep", "config": { "activationReps": 12, "miniSetReps": 4, "restSeconds": 15 } }
```
| Field | Type | Description |
|---|---|---|
| `activationReps` | `number` | Reps in the activation (first) set. |
| `miniSetReps` | `number` | Reps per subsequent mini-set. |
| `restSeconds` | `number` | Rest between mini-sets. |

### 5.4 `topSet`
Marks the set as a top (peak) set. No config required.
```json
{ "type": "topSet", "config": {} }
```

### 5.5 `backOff`
Back-off set: reduce load after a top set.
```json
{ "type": "backOff", "config": { "loadReductionPercent": 15, "rpeTarget": 7.0 } }
```
| Field | Type | Description |
|---|---|---|
| `loadReductionPercent` | `number` | Load reduction from the top set (%). |
| `rpeTarget` | `number` _(optional)_ | Target RPE for the back-off set. |

---

## 6. Table Schemas

### 6.1 `exercises`

The exercise library. Each record represents a single exercise definition.

```json
{
  "id": "ex_bench_press",
  "name": "Barbell Bench Press",
  "type": "compound",
  "primaryMuscles": ["chest"],
  "secondaryMuscles": ["triceps", "shoulders"],
  "equipment": ["barbell", "bench"],
  "movementPattern": "horizontalPush",
  "counterType": "reps",
  "defaultLoadUnit": "kg",
  "notes": "Keep scapulae retracted.",
  "description": "Classic horizontal pushing movement.",
  "keyPoints": "Tuck elbows 45°. Touch chest at bottom.",
  "variantIds": ["ex_dumbbell_press"],
  "isArchived": false,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` (≤100) | ✅ | Unique identifier. |
| `name` | `string` (≤255) | ✅ | Display name of the exercise. |
| `type` | `ExerciseType` | ✅ | `"compound"` or `"isolation"`. |
| `primaryMuscles` | `Muscle[]` | ✅ | Primary muscles targeted. |
| `secondaryMuscles` | `Muscle[]` | ✅ | Secondary muscles involved. |
| `equipment` | `Equipment[]` | ✅ | Equipment required. Must be an array. |
| `movementPattern` | `MovementPattern` | ✅ | Movement classification. |
| `counterType` | `CounterType` | ✅ | What unit sets are counted in. |
| `defaultLoadUnit` | `"kg" \| "lbs"` | ✅ | Default weight unit. |
| `notes` | `string` (≤10000) | ❌ | Free-form coaching notes. |
| `description` | `string` (≤5000) | ❌ | Longer exercise description. |
| `keyPoints` | `string` (≤10000) | ❌ | Technique cues. |
| `variantIds` | `string[]` | ❌ | IDs of related exercise variants. |
| `isArchived` | `boolean` | ❌ | Whether hidden from active library. Default: `false`. |
| `createdAt` | `string` (ISO 8601) | ✅ | Creation timestamp. |
| `updatedAt` | `string` (ISO 8601) | ✅ | Last update timestamp. |

---

### 6.2 `exerciseVersions`

Historical snapshots of an exercise's metadata (SCD Type 2). Created automatically when an exercise is edited. Required for accurate historical workout display.

```json
{
  "id": "exv_bench_press_v1",
  "exerciseId": "ex_bench_press",
  "name": "Barbell Bench Press",
  "type": "compound",
  "primaryMuscles": ["chest"],
  "secondaryMuscles": ["triceps", "shoulders"],
  "equipment": ["barbell", "bench"],
  "movementPattern": "horizontalPush",
  "counterType": "reps",
  "versionTimestamp": "2024-01-01T00:00:00.000Z"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` (≤100) | ✅ | Unique identifier. |
| `exerciseId` | `string` (≤100) | ✅ | FK → `exercises.id`. |
| `name` | `string` (≤255) | ✅ | Name at the time of this version. |
| `type` | `ExerciseType` | ✅ | Exercise type at the time of this version. |
| `primaryMuscles` | `Muscle[]` | ✅ | Primary muscles at this version. |
| `secondaryMuscles` | `Muscle[]` | ✅ | Secondary muscles at this version. |
| `equipment` | `Equipment[]` | ✅ | Equipment at this version. |
| `movementPattern` | `MovementPattern` | ✅ | Movement pattern at this version. |
| `counterType` | `CounterType` | ✅ | Counter type at this version. |
| `versionTimestamp` | `string` (ISO 8601) | ✅ | When this version snapshot was created. |

> **Note:** For each `exercise` record you import, create at least one corresponding `exerciseVersion` with matching metadata and the same `exerciseId`. This enables historical tracking.

---

### 6.3 `plannedWorkouts`

Top-level training program container (e.g., "Strength Block 1", "PPL Program").

```json
{
  "id": "pw_ppl",
  "name": "Push Pull Legs",
  "description": "Classic 6-day PPL program for intermediate lifters.",
  "objectiveType": "hypertrophy",
  "workType": "accumulation",
  "status": "active",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` (≤100) | ✅ | Unique identifier. |
| `name` | `string` (≤255) | ✅ | Program name. |
| `description` | `string` (≤5000) | ❌ | Program description. |
| `objectiveType` | `ObjectiveType` | ✅ | Training goal. |
| `workType` | `WorkType` | ✅ | Mesocycle phase. |
| `status` | `PlannedWorkoutStatus` | ✅ | `"active"`, `"inactive"`, or `"archived"`. |
| `createdAt` | `string` (ISO 8601) | ✅ | |
| `updatedAt` | `string` (ISO 8601) | ✅ | |

---

### 6.4 `plannedSessions`

Individual training days within a program (e.g., "Push Day A", "Leg Day").

```json
{
  "id": "ps_push_a",
  "plannedWorkoutId": "pw_ppl",
  "name": "Push Day A",
  "dayNumber": 1,
  "focusMuscleGroups": ["chest", "shoulders"],
  "status": "pending",
  "notes": "Focus on chest, secondary shoulders and triceps.",
  "orderIndex": "a",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` (≤100) | ✅ | Unique identifier. |
| `plannedWorkoutId` | `string` (≤100) | ✅ | FK → `plannedWorkouts.id`. |
| `name` | `string` (≤255) | ✅ | Session name. |
| `dayNumber` | `number` | ✅ | Which day in the weekly cycle (e.g., 1 = Monday). |
| `focusMuscleGroups` | `MuscleGroup[]` | ✅ | Muscle groups emphasized in this session. |
| `status` | `PlannedSessionStatus` | ✅ | `"pending"`, `"active"`, `"completed"`, or `"skipped"`. |
| `notes` | `string` (≤10000) | ❌ | Session-level notes. |
| `orderIndex` | `string` (LexoRank) | ✅ | Sort order within the parent workout. |
| `createdAt` | `string` (ISO 8601) | ✅ | |
| `updatedAt` | `string` (ISO 8601) | ✅ | |

---

### 6.5 `plannedExerciseGroups`

Groups of one or more exercises within a session. A "standard" group has one exercise; a "superset" or "circuit" group has multiple.

```json
{
  "id": "peg_bench_group",
  "plannedSessionId": "ps_push_a",
  "groupType": "standard",
  "restBetweenRoundsSeconds": 180,
  "orderIndex": "a",
  "notes": null
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` (≤100) | ✅ | Unique identifier. |
| `plannedSessionId` | `string` (≤100) | ✅ | FK → `plannedSessions.id`. |
| `groupType` | `ExerciseGroupType` | ✅ | How the group is performed. |
| `restBetweenRoundsSeconds` | `number` | ❌ | Rest between complete rounds (relevant for superset/circuit). |
| `orderIndex` | `string` (LexoRank) | ✅ | Sort order within the session. |
| `notes` | `string` (≤10000) | ❌ | Group-level notes. |

---

### 6.6 `plannedExerciseItems`

A specific exercise assigned within a group, with optional modifiers and warmup protocol.

```json
{
  "id": "pei_bench_item",
  "plannedExerciseGroupId": "peg_bench_group",
  "exerciseId": "ex_bench_press",
  "counterType": "reps",
  "modifiers": [{ "type": "topSet", "config": {} }],
  "orderIndex": "a",
  "notes": "Pause 1 second at chest.",
  "warmupSets": [
    { "counter": 10, "percentOfWorkSet": 0.40, "restSeconds": 60 },
    { "counter": 5, "percentOfWorkSet": 0.60, "restSeconds": 90 },
    { "counter": 3, "percentOfWorkSet": 0.80, "restSeconds": 120 }
  ],
  "targetXRM": 5
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` (≤100) | ✅ | Unique identifier. |
| `plannedExerciseGroupId` | `string` (≤100) | ✅ | FK → `plannedExerciseGroups.id`. |
| `exerciseId` | `string` (≤100) | ✅ | FK → `exercises.id`. |
| `counterType` | `CounterType` | ✅ | Overrides the exercise's default counter for this item. |
| `modifiers` | `SetModifier[]` | ❌ | Special set techniques. See Section 5. |
| `orderIndex` | `string` (LexoRank) | ✅ | Sort order within the group. |
| `notes` | `string` (≤10000) | ❌ | Item-level coaching notes. |
| `warmupSets` | `WarmupSetConfiguration[]` | ❌ | Warmup progression before working sets. |
| `targetXRM` | `number` | ❌ | Target rep-max for load calculations (e.g., `5` = 5RM). |

---

### 6.7 `plannedSets`

Individual set prescriptions within an exercise item. Each `PlannedSet` defines the rep/load/RPE targets and how many sets to perform.

```json
{
  "id": "pset_bench_1",
  "plannedExerciseItemId": "pei_bench_item",
  "setCountRange": { "min": 4, "max": 4 },
  "countRange": { "min": 5, "max": 5, "toFailure": "none" },
  "loadRange": { "min": 100, "max": 110, "unit": "kg" },
  "percentage1RMRange": { "min": 0.80, "max": 0.85, "basedOnEstimated1RM": true },
  "rpeRange": { "min": 7.0, "max": 8.0 },
  "restSecondsRange": { "min": 180, "max": 240, "isFixed": false },
  "fatigueProgressionProfile": { "expectedRPEIncrementPerSet": 0.5, "tolerance": 0.5 },
  "setType": "working",
  "tempo": "3-1-1-0",
  "notes": "Strict pause at bottom.",
  "orderIndex": "a"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` (≤100) | ✅ | Unique identifier. |
| `plannedExerciseItemId` | `string` (≤100) | ✅ | FK → `plannedExerciseItems.id`. |
| `setCountRange` | `SetCountRange` | ✅ | How many sets to perform. |
| `countRange` | `CountRange` | ✅ | Rep/distance/time target. |
| `loadRange` | `LoadRange` | ❌ | Absolute load target. |
| `percentage1RMRange` | `Percentage1RMRange` | ❌ | Load as fraction of 1RM. |
| `rpeRange` | `RPERange` | ❌ | Target RPE. |
| `restSecondsRange` | `NumericRange` | ❌ | Rest duration in seconds. |
| `fatigueProgressionProfile` | `FatigueProgressionProfile` | ❌ | Expected fatigue accumulation pattern. |
| `setType` | `SetType` | ✅ | `"warmup"`, `"working"`, `"backoff"`, or `"clusterMiniSet"`. |
| `tempo` | `string` (≤50) | ❌ | Tempo notation, e.g., `"3-1-1-0"` (eccentric-pause-concentric-pause). |
| `notes` | `string` (≤10000) | ❌ | Set-level notes. |
| `orderIndex` | `string` (LexoRank) | ✅ | Sort order within the exercise item. |

> `loadRange` and `percentage1RMRange` are mutually exclusive — use one or neither.

---

### 6.8 `workoutSessions`

A logged training session (actual execution, as opposed to a plan).

```json
{
  "id": "ws_2024_01_15",
  "plannedSessionId": "ps_push_a",
  "plannedWorkoutId": "pw_ppl",
  "startedAt": "2024-01-15T09:00:00.000Z",
  "completedAt": "2024-01-15T10:30:00.000Z",
  "notes": "Felt strong today.",
  "overallRPE": 7.5,
  "totalSets": 18,
  "totalLoad": 4200,
  "totalReps": 72,
  "totalDuration": 5400,
  "primaryMusclesSnapshot": ["chest"],
  "secondaryMusclesSnapshot": ["triceps", "shoulders"]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` (≤100) | ✅ | Unique identifier. |
| `plannedSessionId` | `string` (≤100) | ❌ | FK → `plannedSessions.id`. Omit for free sessions. |
| `plannedWorkoutId` | `string` (≤100) | ❌ | FK → `plannedWorkouts.id`. |
| `startedAt` | `string` (ISO 8601) | ✅ | Session start timestamp. |
| `completedAt` | `string` (ISO 8601) | ❌ | Session end timestamp. |
| `notes` | `string` (≤10000) | ❌ | Session notes. |
| `overallRPE` | `number` | ❌ | Perceived exertion for the whole session (6.0–10.0). |
| `totalSets` | `number` | ❌ | Aggregate set count (computed summary). |
| `totalLoad` | `number` | ❌ | Total volume load in kg (computed summary). |
| `totalReps` | `number` | ❌ | Total reps performed (computed summary). |
| `totalDuration` | `number` | ❌ | Session duration in seconds. |
| `primaryMusclesSnapshot` | `Muscle[]` | ❌ | Muscles trained (snapshot at session time). |
| `secondaryMusclesSnapshot` | `Muscle[]` | ❌ | Secondary muscles trained. |

---

### 6.9 `sessionExerciseGroups`

An exercise group as it was actually performed in a session.

```json
{
  "id": "seg_bench_group",
  "workoutSessionId": "ws_2024_01_15",
  "plannedExerciseGroupId": "peg_bench_group",
  "groupType": "standard",
  "orderIndex": "a",
  "isCompleted": true,
  "completedAt": "2024-01-15T10:00:00.000Z"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` (≤100) | ✅ | Unique identifier. |
| `workoutSessionId` | `string` (≤100) | ✅ | FK → `workoutSessions.id`. |
| `plannedExerciseGroupId` | `string` (≤100) | ❌ | FK → `plannedExerciseGroups.id`. Omit for ad-hoc groups. |
| `groupType` | `ExerciseGroupType` | ✅ | Group type as performed. |
| `orderIndex` | `string` (LexoRank) | ✅ | Sort order within the session. |
| `isCompleted` | `boolean` | ✅ | Whether all exercises in the group were completed. |
| `completedAt` | `string` (ISO 8601) | ❌ | When the group was finished. |

---

### 6.10 `sessionExerciseItems`

An exercise as it was actually performed within a session group.

```json
{
  "id": "sei_bench_item",
  "sessionExerciseGroupId": "seg_bench_group",
  "plannedExerciseItemId": "pei_bench_item",
  "exerciseId": "ex_bench_press",
  "exerciseVersionId": "exv_bench_press_v1",
  "orderIndex": "a",
  "isCompleted": true,
  "notes": null,
  "completedAt": "2024-01-15T09:55:00.000Z",
  "performanceStatus": "improving",
  "hasRangeConstraint": true
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` (≤100) | ✅ | Unique identifier. |
| `sessionExerciseGroupId` | `string` (≤100) | ✅ | FK → `sessionExerciseGroups.id`. |
| `plannedExerciseItemId` | `string` (≤100) | ❌ | FK → `plannedExerciseItems.id`. |
| `exerciseId` | `string` (≤100) | ✅ | FK → `exercises.id`. |
| `exerciseVersionId` | `string` (≤100) | ❌ | FK → `exerciseVersions.id`. Links to the version active at session time. |
| `orderIndex` | `string` (LexoRank) | ✅ | Sort order within the group. |
| `isCompleted` | `boolean` | ✅ | Whether this exercise was fully completed. |
| `notes` | `string` (≤10000) | ❌ | Exercise-level session notes. |
| `completedAt` | `string` (ISO 8601) | ❌ | When the exercise was completed. |
| `performanceStatus` | `string` | ❌ | Trend indicator: `"improving"` \| `"stable"` \| `"stagnant"` \| `"deteriorating"` \| `"insufficient_data"` |
| `hasRangeConstraint` | `boolean` | ❌ | Whether planned range constraints were applied. |

---

### 6.11 `sessionSets`

An individual set as actually performed.

```json
{
  "id": "sset_bench_1",
  "sessionExerciseItemId": "sei_bench_item",
  "plannedSetId": "pset_bench_1",
  "setType": "working",
  "orderIndex": "a",
  "actualLoad": 105,
  "actualCount": 5,
  "actualRPE": 7.5,
  "actualToFailure": "none",
  "expectedRPE": 7.5,
  "completedAt": "2024-01-15T09:20:00.000Z",
  "isCompleted": true,
  "isSkipped": false,
  "complianceStatus": "fullyCompliant",
  "fatigueProgressionStatus": "optimal",
  "plannedVsActual": {
    "countDeviation": 0,
    "loadDeviation": 5,
    "rpeDeviation": 0
  },
  "tempo": "3-1-1-0",
  "partials": false,
  "forcedReps": 0,
  "restSecondsBefore": 180,
  "notes": null,
  "e1rm": 140,
  "relativeIntensity": 0.75
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` (≤100) | ✅ | Unique identifier. |
| `sessionExerciseItemId` | `string` (≤100) | ✅ | FK → `sessionExerciseItems.id`. |
| `plannedSetId` | `string` (≤100) | ❌ | FK → `plannedSets.id`. Omit for ad-hoc sets. |
| `setType` | `SetType` | ✅ | Type of set performed. |
| `orderIndex` | `string` (LexoRank) | ✅ | Sort order within the exercise item. |
| `actualLoad` | `number \| null` | ✅ | Load used (kg or lbs). `null` = bodyweight / not applicable. |
| `actualCount` | `number \| null` | ✅ | Reps/seconds/distance performed. `null` = not tracked. |
| `actualRPE` | `number \| null` | ✅ | Actual RPE recorded. `null` = not recorded. |
| `actualToFailure` | `ToFailureIndicator` | ✅ | Whether and how the set was taken to failure. |
| `expectedRPE` | `number \| null` | ✅ | Target RPE from the plan. `null` = no target. |
| `completedAt` | `string` (ISO 8601) | ❌ | When this set was completed. |
| `isCompleted` | `boolean` | ✅ | Whether the set was fully executed. |
| `isSkipped` | `boolean` | ✅ | Whether the set was intentionally skipped. |
| `complianceStatus` | `ComplianceStatus` | ❌ | How performance compared to plan. |
| `fatigueProgressionStatus` | `FatigueProgressionStatus` | ❌ | How fatigue accumulated vs. expectation. |
| `plannedVsActual` | `object` | ❌ | Deviations from plan: `{ countDeviation?: number, loadDeviation?: number, rpeDeviation?: number }`. |
| `tempo` | `string` (≤50) | ❌ | Actual tempo used. |
| `partials` | `boolean` | ✅ | Whether partial reps were performed. |
| `forcedReps` | `number` | ✅ | Number of forced/assisted reps. `0` = none. |
| `restSecondsBefore` | `number` | ❌ | Actual rest taken before this set (seconds). |
| `notes` | `string` (≤10000) | ❌ | Set-level notes. |
| `e1rm` | `number` | ❌ | Estimated 1RM calculated from this set. |
| `relativeIntensity` | `number` | ❌ | Actual load as fraction of estimated 1RM. |

---

### 6.12 `oneRepMaxRecords`

1RM records, either directly tested or estimated from a working set.

```json
{
  "id": "orm_bench_1",
  "exerciseId": "ex_bench_press",
  "exerciseVersionId": "exv_bench_press_v1",
  "value": 140,
  "valueMin": 135,
  "valueMax": 145,
  "errorPercentage": 3.5,
  "unit": "kg",
  "method": "indirect",
  "testedLoad": 105,
  "testedReps": 5,
  "estimateBrzycki": 139,
  "estimateEpley": 140,
  "estimateLander": 138,
  "estimateOConner": 141,
  "estimateLombardi": 137,
  "recordedAt": "2024-01-15T10:30:00.000Z",
  "notes": "After push day A."
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` (≤100) | ✅ | Unique identifier. |
| `exerciseId` | `string` (≤100) | ✅ | FK → `exercises.id`. |
| `exerciseVersionId` | `string` (≤100) | ❌ | FK → `exerciseVersions.id`. |
| `value` | `number` | ✅ | Consensus 1RM value. |
| `valueMin` | `number` | ❌ | Lower confidence bound. |
| `valueMax` | `number` | ❌ | Upper confidence bound. |
| `errorPercentage` | `number` | ❌ | Estimation error %. |
| `unit` | `"kg" \| "lbs"` | ✅ | Load unit. |
| `method` | `"direct" \| "indirect"` | ✅ | `"direct"` = actually lifted; `"indirect"` = estimated from reps. |
| `testedLoad` | `number` | ❌ | Load used for indirect estimation. |
| `testedReps` | `number` | ❌ | Reps performed for indirect estimation. |
| `estimateBrzycki` | `number` | ❌ | 1RM via Brzycki formula. |
| `estimateEpley` | `number` | ❌ | 1RM via Epley formula. |
| `estimateLander` | `number` | ❌ | 1RM via Lander formula. |
| `estimateOConner` | `number` | ❌ | 1RM via O'Conner formula. |
| `estimateLombardi` | `number` | ❌ | 1RM via Lombardi formula. |
| `recordedAt` | `string` (ISO 8601) | ✅ | When the record was logged. |
| `notes` | `string` (≤10000) | ❌ | Notes. |

---

### 6.13 `userRegulationProfile`

App behaviour settings. Only one record, with `id: "default"`.

```json
{
  "id": "default",
  "preferredSuggestionMethod": "percentage1RM",
  "fatigueSensitivity": "medium",
  "autoStartRestTimer": true,
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | ✅ | Always `"default"`. |
| `preferredSuggestionMethod` | `string` | ✅ | How load suggestions are calculated: `"percentage1RM"` \| `"lastSession"` \| `"plannedRPE"`. |
| `fatigueSensitivity` | `string` | ✅ | Fatigue alert threshold: `"low"` \| `"medium"` \| `"high"`. |
| `autoStartRestTimer` | `boolean` | ✅ | Whether the rest timer starts automatically after a set. |
| `updatedAt` | `string` (ISO 8601) | ✅ | Last settings update timestamp. |

---

### 6.14 `userProfile`

User identity. Supports multiple profiles; each has its own `id`.

```json
{
  "id": "user_main",
  "name": "Alex",
  "gender": "male",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` (≤100) | ✅ | Unique identifier. |
| `name` | `string` (≤255) | ✅ | Display name. |
| `gender` | `string` | ✅ | `"male"` \| `"female"` \| `"undisclosed"`. |
| `createdAt` | `string` (ISO 8601) | ✅ | |
| `updatedAt` | `string` (ISO 8601) | ✅ | |

---

### 6.15 `bodyWeightRecords`

Bodyweight measurements over time, always stored in **kg**.

```json
{
  "id": "bwr_2024_01_15",
  "weight": 82.5,
  "recordedAt": "2024-01-15T07:00:00.000Z",
  "notes": "Fasted."
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` (≤100) | ✅ | Unique identifier. |
| `weight` | `number` | ✅ | Body weight in **kg**. |
| `recordedAt` | `string` (ISO 8601) | ✅ | When the measurement was taken. |
| `notes` | `string` (≤10000) | ❌ | Optional context (e.g., fasted, post-workout). |

---

### 6.16 `sessionTemplates`

Reusable session blueprints. The entire structure is stored as a nested `content` object rather than as separate DB rows.

```json
{
  "id": "tmpl_upper_a",
  "name": "Upper Body A",
  "description": "Chest and back focus template.",
  "content": {
    "focusMuscleGroups": ["chest", "back"],
    "notes": "Superset chest and back.",
    "groups": [
      {
        "groupType": "superset",
        "restBetweenRoundsSeconds": 90,
        "orderIndex": "a",
        "notes": null,
        "items": [
          {
            "exerciseId": "ex_bench_press",
            "counterType": "reps",
            "modifiers": [],
            "orderIndex": "a",
            "notes": null,
            "sets": [
              {
                "setCountRange": { "min": 3 },
                "countRange": { "min": 8, "max": 12, "toFailure": "none" },
                "rpeRange": { "min": 7.0, "max": 8.5 },
                "restSecondsRange": { "min": 90, "max": 90, "isFixed": true },
                "setType": "working",
                "orderIndex": "a"
              }
            ]
          }
        ]
      }
    ]
  },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` (≤100) | ✅ | Unique identifier. |
| `name` | `string` (≤255) | ✅ | Template name. |
| `description` | `string` (≤5000) | ❌ | Description. |
| `content` | `SessionTemplateContent` | ✅ | The template body (see below). |
| `createdAt` | `string` (ISO 8601) | ✅ | |
| `updatedAt` | `string` (ISO 8601) | ✅ | |

#### `SessionTemplateContent`

| Field | Type | Required | Description |
|---|---|---|---|
| `focusMuscleGroups` | `MuscleGroup[]` | ✅ | Muscle groups this template targets. |
| `notes` | `string` (≤10000) | ❌ | Session-level notes. |
| `groups` | `array` | ✅ | List of exercise groups. |

Each item in `groups`:

| Field | Type | Required | Description |
|---|---|---|---|
| `groupType` | `ExerciseGroupType` | ✅ | |
| `restBetweenRoundsSeconds` | `number` | ❌ | |
| `orderIndex` | `string` (LexoRank) | ✅ | |
| `notes` | `string` (≤10000) | ❌ | |
| `items` | `array` | ✅ | List of exercises in the group. |

Each item in `items`:

| Field | Type | Required | Description |
|---|---|---|---|
| `exerciseId` | `string` (≤100) | ✅ | FK → `exercises.id`. |
| `counterType` | `CounterType` | ✅ | |
| `modifiers` | `SetModifier[]` | ❌ | |
| `orderIndex` | `string` (LexoRank) | ✅ | |
| `notes` | `string` (≤10000) | ❌ | |
| `sets` | `array` | ✅ | Set prescriptions (same structure as `plannedSets` **without** `id` and `plannedExerciseItemId`). |

---

## 7. Entity Relationship Summary

```
userProfile
userRegulationProfile

exercises ─────────────────┐
exerciseVersions ──────────┤ (exerciseVersions.exerciseId → exercises.id)
                           │
plannedWorkouts            │
  └── plannedSessions      │
        └── plannedExerciseGroups
              └── plannedExerciseItems ── exerciseId → exercises.id
                    └── plannedSets

workoutSessions ── plannedSessionId → plannedSessions.id
  └── sessionExerciseGroups ── plannedExerciseGroupId → plannedExerciseGroups.id
        └── sessionExerciseItems ── exerciseId → exercises.id
                                 ── exerciseVersionId → exerciseVersions.id
                                 ── plannedExerciseItemId → plannedExerciseItems.id
              └── sessionSets ── plannedSetId → plannedSets.id

oneRepMaxRecords ── exerciseId → exercises.id
bodyWeightRecords
sessionTemplates ── (exerciseIds embedded in content.groups[].items[].exerciseId)
```

---

## 8. Minimal Valid Import File Template

The following skeleton includes all required fields for a complete, meaningful import. Copy and expand it.

```json
{
  "version": 1,
  "exportedAt": "2024-01-01T00:00:00.000Z",
  "appName": "WorkoutTracker2",
  "data": {
    "userProfile": [
      {
        "id": "user_main",
        "name": "Alex",
        "gender": "male",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "userRegulationProfile": [
      {
        "id": "default",
        "preferredSuggestionMethod": "percentage1RM",
        "fatigueSensitivity": "medium",
        "autoStartRestTimer": true,
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "exercises": [
      {
        "id": "ex_squat",
        "name": "Barbell Back Squat",
        "type": "compound",
        "primaryMuscles": ["quadriceps", "glutes"],
        "secondaryMuscles": ["hamstrings", "lowerBack"],
        "equipment": ["barbell"],
        "movementPattern": "squat",
        "counterType": "reps",
        "defaultLoadUnit": "kg",
        "variantIds": [],
        "isArchived": false,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "exerciseVersions": [
      {
        "id": "exv_squat_v1",
        "exerciseId": "ex_squat",
        "name": "Barbell Back Squat",
        "type": "compound",
        "primaryMuscles": ["quadriceps", "glutes"],
        "secondaryMuscles": ["hamstrings", "lowerBack"],
        "equipment": ["barbell"],
        "movementPattern": "squat",
        "counterType": "reps",
        "versionTimestamp": "2024-01-01T00:00:00.000Z"
      }
    ],
    "plannedWorkouts": [
      {
        "id": "pw_strength",
        "name": "Strength Block",
        "description": "12-week strength program",
        "objectiveType": "generalStrength",
        "workType": "intensification",
        "status": "active",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "plannedSessions": [
      {
        "id": "ps_lower_a",
        "plannedWorkoutId": "pw_strength",
        "name": "Lower A",
        "dayNumber": 1,
        "focusMuscleGroups": ["legs"],
        "status": "pending",
        "orderIndex": "a",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "plannedExerciseGroups": [
      {
        "id": "peg_squat_group",
        "plannedSessionId": "ps_lower_a",
        "groupType": "standard",
        "restBetweenRoundsSeconds": 240,
        "orderIndex": "a"
      }
    ],
    "plannedExerciseItems": [
      {
        "id": "pei_squat_item",
        "plannedExerciseGroupId": "peg_squat_group",
        "exerciseId": "ex_squat",
        "counterType": "reps",
        "orderIndex": "a",
        "warmupSets": [
          { "counter": 10, "percentOfWorkSet": 0.40, "restSeconds": 60 },
          { "counter": 5,  "percentOfWorkSet": 0.60, "restSeconds": 90 },
          { "counter": 3,  "percentOfWorkSet": 0.80, "restSeconds": 120 }
        ],
        "targetXRM": 5
      }
    ],
    "plannedSets": [
      {
        "id": "pset_squat_1",
        "plannedExerciseItemId": "pei_squat_item",
        "setCountRange": { "min": 5 },
        "countRange": { "min": 5, "max": 5, "toFailure": "none" },
        "rpeRange": { "min": 7.0, "max": 8.0 },
        "restSecondsRange": { "min": 240, "max": 300, "isFixed": false },
        "setType": "working",
        "orderIndex": "a"
      }
    ]
  }
}
```

---

## 9. Key Rules & Pitfalls

1. **All referenced IDs must exist.** If `plannedExerciseItems.exerciseId` = `"ex_squat"`, that ID must appear in `data.exercises`.

2. **`orderIndex` must be unique per parent.** Two `plannedSessions` in the same `plannedWorkoutId` cannot share an `orderIndex`.

3. **Always create `exerciseVersions`.** For every exercise you define, include at least one version record. Sessions that log `exerciseVersionId` will fail to render correctly without it.

4. **`userRegulationProfile` id must be `"default"`.** The app only reads the record with this fixed ID.

5. **Boolean fields are required where marked.** `partials`, `forcedReps`, `isCompleted`, `isSkipped` in `sessionSets` are required; omitting them causes validation failure.

6. **`actualLoad`, `actualCount`, `actualRPE`, `expectedRPE` in `sessionSets` accept `null`.** Use `null` (not `0`) when a value was not recorded.

7. **`equipment` is always an array**, even for a single item: `["barbell"]`, not `"barbell"`.

8. **File size limit: 10 MB.**

9. **Conflict strategies on import:** The UI offers three strategies when imported IDs already exist in the local DB:
   - `ignore` — skip conflicting records.
   - `overwrite` — replace existing records.
   - `copy` — import with remapped IDs (safe duplication).
