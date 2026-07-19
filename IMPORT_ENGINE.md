# Workout Tracker 2 — Import / Export Reference

This document describes **every file format** that Workout Tracker 2 can import and export, field by field. Its purpose is to let an LLM (or any author) craft a complete, valid file **from scratch** — with no access to the app source — that the app will import correctly.

The app supports two independent file channels:

| Channel | Format | Scope | Identity key | Section |
|---|---|---|---|---|
| **Backup / Restore** | JSON | The whole database, or any subset of tables, or a hand‑picked set of records | record `id` | [§A](#part-a--json-backup-format) |
| **Per‑element CSV** | CSV | One element type at a time: **Exercise library**, **Plans (workouts)**, or **History (sessions)** | human name / timestamp | [§B](#part-b--csv-formats) |

Both channels can round‑trip a full backup, a single element, or a selection. Choose JSON when you need exact, loss‑less fidelity (IDs, versions, modifiers, computed metrics). Choose CSV when you want a human‑editable spreadsheet of one element type.

> **Quick start:** to generate one importable file, decide *what* you are creating (an exercise library, a training plan, or logged history) and *which* format. For loss‑less or multi‑table data use the JSON envelope in §A. For a simple, spreadsheet‑style file use the matching CSV in §B.

---
---

# Part A — JSON Backup Format

## A.1 Top-Level Envelope

Every JSON import file is a single object:

```json
{
  "version": 1,
  "exportedAt": "2024-01-15T10:00:00.000Z",
  "appName": "WorkoutTracker2",
  "data": { ... }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `version` | `number` | ✅ | Schema version. Must be a truthy number — always `1`. The import is rejected if this is missing or `0`. |
| `exportedAt` | `string` (ISO 8601) | ❌ | Timestamp of export. Any valid ISO 8601 datetime string. Informational only. |
| `appName` | `string` | ❌ | Conventionally `"WorkoutTracker2"`. Not validated on import. |
| `data` | `object` | ✅ | One key per table included in this backup. The import is rejected if `data` is absent. |

> **Validation on load:** the file is rejected only if it is not valid JSON, exceeds the size limit, or is missing `version`/`data`. Individual records are then validated **per table** (see §A.2.7); records that fail their schema are skipped and counted as `failed`, while the rest still import.

### `data` keys (all optional — include only what you need)

```
exercises · exerciseVersions · plannedWorkouts · plannedSessions
plannedExerciseGroups · plannedExerciseItems · plannedSets
workoutSessions · sessionExerciseGroups · sessionExerciseItems · sessionSets
oneRepMaxRecords · userRegulationProfile · sessionTemplates
userProfile · bodyWeightRecords
```

Each key maps to an **array** of record objects for that table. A partial backup (e.g. only `exercises` + `exerciseVersions`) is completely valid.

---

## A.2 Shared Conventions

### A.2.1 IDs

All `id` fields are **strings** of up to **100 characters**. The app generates them with `nanoid()` (URL‑safe, 21 chars), but any unique string ≤ 100 chars is valid. IDs must be unique within their table and are the primary key used for conflict detection.

### A.2.2 Date Fields

All date/timestamp values are **ISO 8601 strings** in the JSON (e.g. `"2024-01-15T10:00:00.000Z"`). On import, the following field names — **wherever they appear, at any nesting depth** — are converted from string to `Date`:

```
createdAt · updatedAt · startedAt · completedAt · recordedAt · versionTimestamp
```

Any other field that happens to hold a date string is left as a string. The schemas only expect dates in the fields above, so use ISO 8601 strings for those and never for anything else.

### A.2.3 LexoRank — `orderIndex`

`orderIndex` is a **string** used to sort items within a parent container. Items are displayed in **lexicographic (ascending string) order** of their `orderIndex`.

**Rules for hand‑crafted values:**
- Use any strings that sort into the order you want. Lowercase letters and digits are safest.
- Simple ascending values work fine: `"a"`, `"b"`, `"c"` … or `"0"`, `"1"`, `"2"` … (use zero‑padding like `"01"`, `"02"`, `"10"` if you exceed 9 items, so `"10"` does not sort before `"2"`).
- The app's native ranks look like `"0|hzzzzz:"`, but you do **not** need that form.
- Each `orderIndex` should be **unique within its parent** (within one `plannedSessionId`, one `plannedExerciseGroupId`, etc.). Duplicates merely make order between the tied items undefined.

**Example for 3 items:** `"a"`, `"b"`, `"c"`.

### A.2.4 Field Lengths

| Constraint | Field(s) | Max characters |
|---|---|---|
| `id` | every `id` and every foreign‑key id | 100 |
| `name` | every `name` | 255 |
| `description` | `description` | 5 000 |
| `notes`, `keyPoints` | `notes`, `keyPoints` | 10 000 |
| `tempo` | `tempo` | 50 |

A record whose string exceeds its limit fails validation and is skipped.

### A.2.5 Computed / Derived Fields (ignored on import)

Some fields are **exports of computed values**. They are written out so the JSON is human‑readable, but on import they are **silently dropped** (not in the validation schema) and recomputed by the app. You may omit them entirely. Including them is harmless but has no effect. They are listed per table below and marked **“computed — ignored on import.”**

### A.2.6 Import Processing Order

Tables are written in dependency order, so a child's foreign key may point to a parent **in the same file or already in the database**:

1. `exercises`, `exerciseVersions`, `userRegulationProfile`, `userProfile`, `bodyWeightRecords`
2. `oneRepMaxRecords`
3. `plannedWorkouts`, `plannedSessions`, `plannedExerciseGroups`
4. `plannedExerciseItems`, `plannedSets`
5. `workoutSessions`, `sessionExerciseGroups`, `sessionExerciseItems`, `sessionSets`
6. `sessionTemplates`

You may list keys in `data` in any order — the app reorders them. The order only matters for understanding which parents must exist.

### A.2.7 Per-Record Validation

Each record is validated against a strict schema for its table (see §A.6 schemas). Important consequences:

- **Unknown fields are stripped.** Extra keys are removed silently, not rejected.
- **A record that fails its schema is skipped** (counted as `failed`); other records still import.
- **Required fields must be present and correctly typed**, or the whole record is dropped.
- Enum fields must use one of the **exact** string values in §A.3.

### A.2.8 Conflict Strategies

When an incoming record's `id` already exists in the local database, the UI asks you to pick one strategy applied to **all** conflicts in the file:

| Strategy | Effect |
|---|---|
| `ignore` | Skip conflicting records (keep the existing one). |
| `overwrite` | Replace the existing record with the imported one. |
| `copy` | Import the conflicting record under a **new** `nanoid` id, and rewrite any foreign keys in the file that pointed to the old id so the duplicated graph stays internally consistent. |

Foreign‑key remapping under `copy` covers these reference fields:
`plannedWorkoutId, plannedSessionId, plannedExerciseGroupId, plannedExerciseItemId, plannedSetId, exerciseId, exerciseVersionId, workoutSessionId, sessionExerciseGroupId, sessionExerciseItemId`.

> ⚠️ Do **not** rely on `copy` for `userRegulationProfile`: the app only reads the record whose id is exactly `"default"` (§A.6.13), and `copy` would give it a random id. Use `ignore` or `overwrite` for that table.

### A.2.9 Size Limit

A JSON backup file must be **≤ 10 MB**. Larger files are rejected before parsing.

---

## A.3 Enumerations

All enum values are **strings**; use the exact value shown.

### `Muscle`
```
"chest" | "upperBack" | "lowerBack" | "shoulders" | "quadriceps" | "hamstrings"
| "calves" | "biceps" | "triceps" | "abs" | "glutes" | "forearms" | "traps"
| "lats" | "deltoids"
```

### `MuscleGroup` _(coarser grouping used for session focus)_
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
> Only `"reps"` and `"seconds"` support the “to failure” feature.
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

## A.4 Value Objects

Reusable nested objects used inside entity records.

### A.4.1 `NumericRange`
```json
{ "min": 60, "max": 90, "isFixed": false }
```
| Field | Type | Required | Description |
|---|---|---|---|
| `min` | `number` | ✅ | Minimum value. |
| `max` | `number \| null` | ✅ | Maximum value. `null` means “unlimited / open‑ended”. |
| `isFixed` | `boolean` | ✅ | `true` when `min === max` (a single value, no range). |

### A.4.2 `RPERange`
```json
{ "min": 7.0, "max": 8.5 }
```
| Field | Type | Required | Description |
|---|---|---|---|
| `min` | `number` | ✅ | Minimum RPE. Typically 6.0–10.0 in 0.5 steps. |
| `max` | `number` | ✅ | Maximum RPE. Should be ≥ `min`. |

### A.4.3 `Percentage1RMRange`
```json
{ "min": 0.75, "max": 0.80, "basedOnEstimated1RM": true }
```
| Field | Type | Required | Description |
|---|---|---|---|
| `min` | `number` | ✅ | Minimum fraction (e.g. `0.75` = 75%). Typical range 0.40–1.00. |
| `max` | `number` | ✅ | Maximum fraction. |
| `basedOnEstimated1RM` | `boolean` | ✅ | `true` = derived from the estimated 1RM; `false` = from a tested 1RM. |

### A.4.4 `LoadRange`
```json
{ "min": 100, "max": 120, "unit": "kg" }
```
| Field | Type | Required | Description |
|---|---|---|---|
| `min` | `number` | ✅ | Minimum load. |
| `max` | `number \| null` | ✅ | Maximum load. `null` = no upper bound. |
| `unit` | `"kg" \| "lbs"` | ✅ | Load unit. |

### A.4.5 `CountRange`
```json
{ "min": 8, "max": 12, "toFailure": "none" }
```
| Field | Type | Required | Description |
|---|---|---|---|
| `min` | `number` | ✅ | Minimum reps/seconds/distance. |
| `max` | `number \| null` | ✅ | Maximum. `null` = open‑ended / to failure. |
| `toFailure` | `ToFailureIndicator` | ✅ | Whether this count is a to‑failure instruction. |

### A.4.6 `SetCountRange`
```json
{ "min": 3, "max": 4, "stopCriteria": "rpeCeiling" }
```
| Field | Type | Required | Description |
|---|---|---|---|
| `min` | `number` | ✅ | Minimum number of sets to perform. |
| `max` | `number` | ❌ | Maximum sets. Omit if equal to `min`. |
| `stopCriteria` | `string` | ❌ | Auto‑regulation stop rule: `"maxSets"` \| `"rpeCeiling"` \| `"velocityLoss"` \| `"technicalBreakdown"`. |

### A.4.7 `FatigueProgressionProfile`
```json
{ "expectedRPEIncrementPerSet": 0.5, "tolerance": 0.5 }
```
| Field | Type | Required | Description |
|---|---|---|---|
| `expectedRPEIncrementPerSet` | `number` | ✅ | How much RPE should rise per set (typically 0.5 or 1.0). |
| `tolerance` | `number` | ✅ | Acceptable deviation from the expected increment. |

### A.4.8 `WarmupSetConfiguration`
```json
{ "counter": 5, "percentOfWorkSet": 0.60, "restSeconds": 60 }
```
| Field | Type | Required | Description |
|---|---|---|---|
| `counter` | `number` | ❌ | Reps/seconds for the warmup set. |
| `percentOfWorkSet` | `number` | ✅ | Fraction of the working‑set load (e.g. `0.60` = 60%). |
| `restSeconds` | `number` | ✅ | Rest after this warmup set, in seconds. |

---

## A.5 Set Modifiers

`modifiers` is an **array** of modifier objects. Each is a discriminated union on `type`. Multiple modifiers can coexist on one `PlannedExerciseItem`.

### A.5.1 `cluster`
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
| Field | Type | Required | Description |
|---|---|---|---|
| `totalRepsTarget` | `number` | ✅ | Total target reps across all mini‑sets. |
| `miniSetReps` | `number` | ✅ | Reps per mini‑set. |
| `miniSetCount` | `number` | ✅ | Number of mini‑sets. |
| `interMiniSetRestSeconds` | `number` | ✅ | Rest between mini‑sets (seconds). |
| `loadReductionPercent` | `number` | ❌ | Load reduction % per mini‑set. `0` = same load throughout. |
| `miniSetToFailure` | `boolean` | ✅ | Whether each mini‑set goes to failure. |
| `rpeRange` | `RPERange` | ❌ | Target RPE for mini‑sets. |

### A.5.2 `dropSet`
```json
{ "type": "dropSet", "config": { "loadReductionPercent": 20, "sets": 2 } }
```
| Field | Type | Required | Description |
|---|---|---|---|
| `loadReductionPercent` | `number` | ✅ | How much to drop the load (%). |
| `sets` | `number` | ✅ | Number of drop‑set extensions. |

### A.5.3 `myoRep`
```json
{ "type": "myoRep", "config": { "activationReps": 12, "miniSetReps": 4, "restSeconds": 15 } }
```
| Field | Type | Required | Description |
|---|---|---|---|
| `activationReps` | `number` | ✅ | Reps in the activation (first) set. |
| `miniSetReps` | `number` | ✅ | Reps per subsequent mini‑set. |
| `restSeconds` | `number` | ✅ | Rest between mini‑sets. |

### A.5.4 `topSet`
Marks the set as a top (peak) set. Config is an empty object.
```json
{ "type": "topSet", "config": {} }
```

### A.5.5 `backOff`
```json
{ "type": "backOff", "config": { "loadReductionPercent": 15, "rpeTarget": 7.0 } }
```
| Field | Type | Required | Description |
|---|---|---|---|
| `loadReductionPercent` | `number` | ✅ | Load reduction from the top set (%). |
| `rpeTarget` | `number` | ❌ | Target RPE for the back‑off set. |

---

## A.6 Table Schemas

> Legend: ✅ required · ❌ optional · 🧮 **computed — ignored on import** (you may omit it).

### A.6.1 `exercises`

The exercise library. One record per exercise definition.

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
| `name` | `string` (≤255) | ✅ | Display name. |
| `type` | `ExerciseType` | ✅ | `"compound"` or `"isolation"`. |
| `primaryMuscles` | `Muscle[]` | ✅ | Primary muscles targeted. |
| `secondaryMuscles` | `Muscle[]` | ✅ | Secondary muscles. |
| `equipment` | `Equipment[]` | ✅ | Equipment required. Always an array. |
| `movementPattern` | `MovementPattern` | ✅ | Movement classification. |
| `counterType` | `CounterType` | ✅ | Default counting unit for sets. |
| `defaultLoadUnit` | `"kg" \| "lbs"` | ✅ | Default weight unit. |
| `notes` | `string` (≤10000) | ❌ | Coaching notes. |
| `description` | `string` (≤5000) | ❌ | Longer description. |
| `keyPoints` | `string` (≤10000) | ❌ | Technique cues. |
| `variantIds` | `string[]` | ❌ | IDs of related exercise variants (each → `exercises.id`). |
| `isArchived` | `boolean` | ❌ | Hidden from the active library. Default `false`. |
| `createdAt` | `string` (ISO 8601) | ✅ | Creation timestamp. |
| `updatedAt` | `string` (ISO 8601) | ✅ | Last‑update timestamp. |

---

### A.6.2 `exerciseVersions`

Historical snapshots of an exercise's metadata (SCD Type 2). The app creates one automatically whenever an exercise's structural data changes, and logged sessions reference the version that was active at the time. **For accurate history you should include at least one version per exercise.**

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
| `name` | `string` (≤255) | ✅ | Name at this version. |
| `type` | `ExerciseType` | ✅ | Type at this version. |
| `primaryMuscles` | `Muscle[]` | ✅ | Primary muscles at this version. |
| `secondaryMuscles` | `Muscle[]` | ✅ | Secondary muscles at this version. |
| `equipment` | `Equipment[]` | ✅ | Equipment at this version. |
| `movementPattern` | `MovementPattern` | ✅ | Movement pattern at this version. |
| `counterType` | `CounterType` | ✅ | Counter type at this version. |
| `versionTimestamp` | `string` (ISO 8601) | ✅ | When this snapshot was created. Converted to a `Date` on import. |

---

### A.6.3 `plannedWorkouts`

Top‑level program container (e.g. “Strength Block 1”, “PPL Program”).

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

### A.6.4 `plannedSessions`

Training days within a program (e.g. “Push Day A”).

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
| `dayNumber` | `number` | ✅ | Day in the cycle (e.g. 1 = first day). |
| `focusMuscleGroups` | `MuscleGroup[]` | ✅ | Emphasized muscle groups. Use `[]` if none. |
| `status` | `PlannedSessionStatus` | ✅ | `"pending"`, `"active"`, `"completed"`, `"skipped"`. |
| `notes` | `string` (≤10000) | ❌ | Session notes. |
| `orderIndex` | `string` (LexoRank) | ✅ | Sort order within the workout. |
| `createdAt` | `string` (ISO 8601) | ✅ | |
| `updatedAt` | `string` (ISO 8601) | ✅ | |

---

### A.6.5 `plannedExerciseGroups`

Groups of one or more exercises within a session. A `"standard"` group holds one exercise; `"superset"`/`"circuit"` groups hold several performed together.

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
| `restBetweenRoundsSeconds` | `number` | ❌ | Rest between complete rounds (for superset/circuit/cluster). |
| `orderIndex` | `string` (LexoRank) | ✅ | Sort order within the session. |
| `notes` | `string` (≤10000) | ❌ | Group notes. |

---

### A.6.6 `plannedExerciseItems`

A specific exercise placed in a group, with optional modifiers and warmup protocol.

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
    { "counter": 5,  "percentOfWorkSet": 0.60, "restSeconds": 90 },
    { "counter": 3,  "percentOfWorkSet": 0.80, "restSeconds": 120 }
  ],
  "targetXRM": 5
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` (≤100) | ✅ | Unique identifier. |
| `plannedExerciseGroupId` | `string` (≤100) | ✅ | FK → `plannedExerciseGroups.id`. |
| `exerciseId` | `string` (≤100) | ✅ | FK → `exercises.id`. |
| `counterType` | `CounterType` | ✅ | Counter for this item (overrides the exercise default). |
| `modifiers` | `SetModifier[]` | ❌ | Special set techniques (§A.5). |
| `orderIndex` | `string` (LexoRank) | ✅ | Sort order within the group. |
| `notes` | `string` (≤10000) | ❌ | Item‑level notes. |
| `warmupSets` | `WarmupSetConfiguration[]` | ❌ | Warmup progression before working sets. |
| `targetXRM` | `number` | ❌ | Target rep‑max for load calculations (e.g. `5` = 5RM). |

---

### A.6.7 `plannedSets`

Set prescriptions within an exercise item.

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
| `percentage1RMRange` | `Percentage1RMRange` | ❌ | Load as a fraction of 1RM. |
| `rpeRange` | `RPERange` | ❌ | Target RPE. |
| `restSecondsRange` | `NumericRange` | ❌ | Rest in seconds. |
| `fatigueProgressionProfile` | `FatigueProgressionProfile` | ❌ | Expected fatigue pattern. |
| `setType` | `SetType` | ✅ | `"warmup"`, `"working"`, `"backoff"`, `"clusterMiniSet"`. |
| `tempo` | `string` (≤50) | ❌ | Tempo notation, e.g. `"3-1-1-0"`. |
| `notes` | `string` (≤10000) | ❌ | Set notes. |
| `orderIndex` | `string` (LexoRank) | ✅ | Sort order within the item. |

> Use `loadRange` **or** `percentage1RMRange` **or** neither — prescribing both is contradictory.

---

### A.6.8 `workoutSessions`

A logged training session (actual execution).

```json
{
  "id": "ws_2024_01_15",
  "plannedSessionId": "ps_push_a",
  "plannedWorkoutId": "pw_ppl",
  "startedAt": "2024-01-15T09:00:00.000Z",
  "completedAt": "2024-01-15T10:30:00.000Z",
  "notes": "Felt strong today.",
  "overallRPE": 7.5
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` (≤100) | ✅ | Unique identifier. |
| `plannedSessionId` | `string` (≤100) | ❌ | FK → `plannedSessions.id`. Omit for free sessions. |
| `plannedWorkoutId` | `string` (≤100) | ❌ | FK → `plannedWorkouts.id`. |
| `startedAt` | `string` (ISO 8601) | ✅ | Start timestamp. |
| `completedAt` | `string` (ISO 8601) | ❌ | End timestamp. |
| `notes` | `string` (≤10000) | ❌ | Session notes. |
| `overallRPE` | `number` | ❌ | Whole‑session RPE (6.0–10.0). |
| `totalSets` · `totalLoad` · `totalReps` · `totalDuration` | `number` | 🧮 | Aggregate summaries — computed, ignored on import. |
| `primaryMusclesSnapshot` · `secondaryMusclesSnapshot` | `Muscle[]` | 🧮 | Muscle snapshots — computed, ignored on import. |

---

### A.6.9 `sessionExerciseGroups`

An exercise group as actually performed.

```json
{
  "id": "seg_bench_group",
  "workoutSessionId": "ws_2024_01_15",
  "plannedExerciseGroupId": "peg_bench_group",
  "groupType": "standard",
  "orderIndex": "a",
  "isCompleted": true
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` (≤100) | ✅ | Unique identifier. |
| `workoutSessionId` | `string` (≤100) | ✅ | FK → `workoutSessions.id`. |
| `plannedExerciseGroupId` | `string` (≤100) | ❌ | FK → `plannedExerciseGroups.id`. Omit for ad‑hoc groups. |
| `groupType` | `ExerciseGroupType` | ✅ | Group type as performed. |
| `orderIndex` | `string` (LexoRank) | ✅ | Sort order within the session. |
| `isCompleted` | `boolean` | ✅ | Whether the group was completed. |
| `completedAt` | `string` (ISO 8601) | 🧮 | When the group finished — ignored on import. |

---

### A.6.10 `sessionExerciseItems`

An exercise as actually performed within a session group.

```json
{
  "id": "sei_bench_item",
  "sessionExerciseGroupId": "seg_bench_group",
  "plannedExerciseItemId": "pei_bench_item",
  "exerciseId": "ex_bench_press",
  "exerciseVersionId": "exv_bench_press_v1",
  "orderIndex": "a",
  "isCompleted": true,
  "notes": null
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` (≤100) | ✅ | Unique identifier. |
| `sessionExerciseGroupId` | `string` (≤100) | ✅ | FK → `sessionExerciseGroups.id`. |
| `plannedExerciseItemId` | `string` (≤100) | ❌ | FK → `plannedExerciseItems.id`. |
| `exerciseId` | `string` (≤100) | ✅ | FK → `exercises.id`. |
| `exerciseVersionId` | `string` (≤100) | ❌ | FK → `exerciseVersions.id`. The version active at session time. |
| `orderIndex` | `string` (LexoRank) | ✅ | Sort order within the group. |
| `isCompleted` | `boolean` | ✅ | Whether this exercise was completed. |
| `notes` | `string` (≤10000) | ❌ | Exercise‑level session notes. |
| `completedAt` | `string` (ISO 8601) | 🧮 | Completion time — ignored on import. |
| `performanceStatus` | `string` | 🧮 | Trend indicator (`"improving"` \| `"stable"` \| `"stagnant"` \| `"deteriorating"` \| `"insufficient_data"`) — ignored on import. |
| `hasRangeConstraint` | `boolean` | 🧮 | Whether planned range constraints applied — ignored on import. |

---

### A.6.11 `sessionSets`

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
  "plannedVsActual": { "countDeviation": 0, "loadDeviation": 5, "rpeDeviation": 0 },
  "tempo": "3-1-1-0",
  "partials": false,
  "forcedReps": 0,
  "restSecondsBefore": 180,
  "notes": null
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` (≤100) | ✅ | Unique identifier. |
| `sessionExerciseItemId` | `string` (≤100) | ✅ | FK → `sessionExerciseItems.id`. |
| `plannedSetId` | `string` (≤100) | ❌ | FK → `plannedSets.id`. Omit for ad‑hoc sets. |
| `setType` | `SetType` | ✅ | Type of set performed. |
| `orderIndex` | `string` (LexoRank) | ✅ | Sort order within the item. |
| `actualLoad` | `number \| null` | ✅ | Load used. `null` = bodyweight / not applicable. |
| `actualCount` | `number \| null` | ✅ | Reps/seconds/distance performed. `null` = not tracked. |
| `actualRPE` | `number \| null` | ✅ | Actual RPE. `null` = not recorded. |
| `actualToFailure` | `ToFailureIndicator` | ✅ | Whether/how the set went to failure. |
| `expectedRPE` | `number \| null` | ✅ | Target RPE from the plan. `null` = none. |
| `completedAt` | `string` (ISO 8601) | ❌ | When the set was completed. |
| `isCompleted` | `boolean` | ✅ | Whether the set was executed. |
| `isSkipped` | `boolean` | ✅ | Whether the set was skipped. |
| `complianceStatus` | `ComplianceStatus` | ❌ | How performance compared to plan. |
| `fatigueProgressionStatus` | `FatigueProgressionStatus` | ❌ | How fatigue accumulated vs. expectation. |
| `plannedVsActual` | `object` | ❌ | `{ countDeviation?, loadDeviation?, rpeDeviation? }` (all numbers). |
| `tempo` | `string` (≤50) | ❌ | Actual tempo. |
| `partials` | `boolean` | ✅ | Whether partial reps were performed. |
| `forcedReps` | `number` | ✅ | Forced/assisted reps. `0` = none. |
| `restSecondsBefore` | `number` | ❌ | Actual rest before this set (seconds). |
| `notes` | `string` (≤10000) | ❌ | Set notes. |
| `e1rm` | `number` | 🧮 | Estimated 1RM from this set — ignored on import. |
| `relativeIntensity` | `number` | 🧮 | Load as a fraction of estimated 1RM — ignored on import. |

---

### A.6.12 `oneRepMaxRecords`

1RM records, tested directly or estimated from a working set.

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
| `value` | `number` | ✅ | Consensus 1RM. |
| `valueMin` | `number` | ❌ | Lower confidence bound. |
| `valueMax` | `number` | ❌ | Upper confidence bound. |
| `errorPercentage` | `number` | ❌ | Estimation error %. |
| `unit` | `"kg" \| "lbs"` | ✅ | Load unit. |
| `method` | `"direct" \| "indirect"` | ✅ | `"direct"` = lifted; `"indirect"` = estimated from reps. |
| `testedLoad` | `number` | ❌ | Load used for indirect estimation. |
| `testedReps` | `number` | ❌ | Reps for indirect estimation. |
| `estimateBrzycki` | `number` | ❌ | 1RM via Brzycki. |
| `estimateEpley` | `number` | ❌ | 1RM via Epley. |
| `estimateLander` | `number` | ❌ | 1RM via Lander. |
| `estimateOConner` | `number` | ❌ | 1RM via O'Conner. |
| `estimateLombardi` | `number` | ❌ | 1RM via Lombardi. |
| `recordedAt` | `string` (ISO 8601) | ✅ | When logged. |
| `notes` | `string` (≤10000) | ❌ | Notes. |

---

### A.6.13 `userRegulationProfile`

App behaviour settings. The app reads **only** the record whose `id` is `"default"`.

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
| `preferredSuggestionMethod` | `string` | ✅ | `"percentage1RM"` \| `"lastSession"` \| `"plannedRPE"`. |
| `fatigueSensitivity` | `string` | ✅ | `"low"` \| `"medium"` \| `"high"`. |
| `autoStartRestTimer` | `boolean` | ✅ | Whether the rest timer auto‑starts after a set. |
| `updatedAt` | `string` (ISO 8601) | ✅ | Last settings update. |

> The `simpleMode` toggle is managed in‑app and defaults to `false`; it is not part of the import schema.

---

### A.6.14 `userProfile`

User identity. Supports multiple profiles, each with its own `id`.

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

### A.6.15 `bodyWeightRecords`

Bodyweight measurements over time, always in **kg**.

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
| `recordedAt` | `string` (ISO 8601) | ✅ | When measured. |
| `notes` | `string` (≤10000) | ❌ | Optional context. |

---

### A.6.16 `sessionTemplates`

Reusable session blueprints. The whole structure lives in a nested `content` object (not as separate DB rows).

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
| `content` | `SessionTemplateContent` | ✅ | Template body (below). |
| `createdAt` | `string` (ISO 8601) | ✅ | |
| `updatedAt` | `string` (ISO 8601) | ✅ | |

#### `SessionTemplateContent`

| Field | Type | Required | Description |
|---|---|---|---|
| `focusMuscleGroups` | `MuscleGroup[]` | ✅ | Muscle groups this template targets. |
| `notes` | `string` (≤10000) | ❌ | Session notes. |
| `groups` | `array` | ✅ | Exercise groups (below). |

Each item in `groups`:

| Field | Type | Required | Description |
|---|---|---|---|
| `groupType` | `ExerciseGroupType` | ✅ | |
| `restBetweenRoundsSeconds` | `number` | ❌ | |
| `orderIndex` | `string` (LexoRank) | ✅ | |
| `notes` | `string` (≤10000) | ❌ | |
| `items` | `array` | ✅ | Exercises in the group (below). |

Each item in `items`:

| Field | Type | Required | Description |
|---|---|---|---|
| `exerciseId` | `string` (≤100) | ✅ | FK → `exercises.id`. |
| `counterType` | `CounterType` | ✅ | |
| `modifiers` | `SetModifier[]` | ❌ | |
| `orderIndex` | `string` (LexoRank) | ✅ | |
| `notes` | `string` (≤10000) | ❌ | |
| `sets` | `array` | ✅ | Set prescriptions — same shape as `plannedSets` **without** `id` and `plannedExerciseItemId`. |

---

## A.7 Entity Relationship Summary

```
userProfile
userRegulationProfile (id must be "default")

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

## A.8 Selective / Per-Element JSON Export

The same envelope is produced whether you export everything or a subset. The app exposes three granularities, all yielding files importable with the rules above:

1. **Full backup** — every table.
2. **By category** — pick any of these category bundles; the file contains exactly the listed tables:

   | Category | Tables included |
   |---|---|
   | Exercises | `exercises`, `exerciseVersions` |
   | Workouts (plans) | `plannedWorkouts`, `plannedSessions`, `plannedExerciseGroups`, `plannedExerciseItems`, `plannedSets` |
   | Sessions (history) | `workoutSessions`, `sessionExerciseGroups`, `sessionExerciseItems`, `sessionSets` |
   | 1RM records | `oneRepMaxRecords` |
   | User profile | `userProfile`, `bodyWeightRecords` |
   | Regulation profile | `userRegulationProfile` |
   | Templates | `sessionTemplates` |

3. **Hand‑picked records** — export a chosen set of record `id`s from a single table; the file's `data` then contains just that one key with the selected records.

When authoring a partial file by hand, simply include only the relevant `data` keys and make sure every foreign key either appears in the same file or already exists in the target database (otherwise the dependent records still import, but their links will dangle).

---
---

# Part B — CSV Formats

CSV is a **per‑element**, human‑editable alternative to JSON. Each CSV file covers exactly **one** element type and is imported/exported from that element's screen:

| CSV file | Element | Row granularity | Record identity |
|---|---|---|---|
| [Exercise library](#b1--exercise-library-csv) | Exercises | one row per exercise | exercise **name** (case‑insensitive) |
| [Plans](#b2--planned-workouts-csv) | Planned workouts | one row per planned **set** | plan **name** (case‑insensitive) |
| [History](#b3--history-sessions-csv) | Logged sessions | one row per performed **set** | session **`started_at`** timestamp |

### Conventions common to all CSV files

- **Encoding:** UTF‑8. Exports begin with a UTF‑8 BOM for Excel compatibility; this is optional on import.
- **Header row required.** The first non‑empty row must contain the column names. Order of columns does not matter — they are matched by name. Unlisted columns are ignored; missing optional columns default to empty.
- **Header matching is case‑insensitive** and trims whitespace. Legacy header aliases are accepted (noted per file).
- **Blank lines are allowed** and ignored (they are used in exports to visually separate sessions/plans).
- **Multi‑value cells** (muscles, equipment) are **semicolon‑separated**: `chest;triceps`.
- **No IDs.** Records are matched by name/timestamp, and new IDs are generated automatically on import. Likewise, CSV cannot express LexoRank — ordering follows **row order** in the file.
- **Conflict strategies** mirror JSON: `ignore`, `overwrite`, `copy`. Their exact effect per file is described below.
- **Unknown enum values fall back to a safe default** instead of failing the row (defaults noted per column).

> **CSV vs JSON — what CSV cannot express.** CSV is intentionally simplified. It cannot represent: explicit IDs, `exerciseVersions`, warmup sets, most set modifiers (only `cluster` in the plan CSV), `fatigueProgressionProfile`, `plannedVsActual`, per‑exercise `defaultLoadUnit` on plans (assumed `kg`), `focusMuscleGroups`, session/workout `description`, or computed metrics. Use JSON (Part A) when you need any of these.

---

## B.1 — Exercise Library CSV

**One row per exercise.** Identity is the exercise **name** (case‑insensitive).

### Columns

| Column | Maps to | Notes |
|---|---|---|
| `exercise` | `name` | **Required.** Legacy alias: `name`. |
| `equipment` | `equipment[]` | Semicolon‑separated `Equipment` values. Unknown values are dropped. |
| `type` | `type` | `ExerciseType`. Default if blank/unknown: `compound`. |
| `pattern` | `movementPattern` | `MovementPattern`. Default: `other`. Legacy alias: `movementpattern`. |
| `counter` | `counterType` | `CounterType`. Default: `reps`. Legacy alias: `countertype`. |
| `load_unit` | `defaultLoadUnit` | `kg` or `lbs`. Default: `kg`. Legacy alias: `defaultloadunit`. |
| `primary_muscles` | `primaryMuscles[]` | Semicolon‑separated `Muscle` values. Unknown dropped. Legacy alias: `primarymuscles`. |
| `secondary_muscles` | `secondaryMuscles[]` | Semicolon‑separated `Muscle` values. Legacy alias: `secondarymuscles`. |
| `description` | `description` | Free text. |
| `key_points` | `keyPoints` | Free text. Legacy alias: `keypoints`. |
| `variants` | `variantIds[]` | Semicolon‑separated **exercise names** (resolved to IDs after all rows are imported; links are made bidirectional). |

> The exercise `notes` (coaching notes) field is **not** part of the CSV — use `description`/`key_points`, or JSON, to carry it.

### Header & example

```csv
exercise,equipment,type,pattern,counter,load_unit,primary_muscles,secondary_muscles,description,key_points,variants
Barbell Back Squat,barbell,compound,squat,reps,kg,quadriceps;glutes,hamstrings;lowerBack,Classic squat,Brace hard,Front Squat
Front Squat,barbell,compound,squat,reps,kg,quadriceps,glutes,,,Barbell Back Squat
```

### Import behaviour

- A row whose `exercise` cell is empty is counted as `failed` and skipped.
- Matching is by name (case‑insensitive) against the existing library:
  - **No match →** inserted as a new exercise with a generated id.
  - **Match + `ignore` →** skipped.
  - **Match + `overwrite` →** the existing exercise is updated from the row (container metadata not present in the CSV is preserved; a new exercise version is created automatically if structural data changed).
  - **Match + `copy` →** imported under a new name `"<name> (2)"`, `"(3)"`, … to avoid collision.
- `variants` are resolved **after** all rows import, by name; a missing variant name is ignored.
- On import every exercise's `variantIds` starts empty and is populated solely from the `variants` column.

---

## B.2 — Planned Workouts CSV

**One row per planned set.** Plan‑, session‑, and exercise‑level metadata is **repeated on every row**. Identity is the plan **name** (case‑insensitive).

### How rows become a hierarchy

- Rows are grouped into **plans** by `plan`, then into **sessions** by `session`, in first‑seen order.
- Within a session, **groups** are formed automatically:
  - Consecutive rows with `group_type` blank (= standard) and a **different** exercise each start a new standard group containing one exercise.
  - Consecutive rows sharing a non‑standard `group_type` (e.g. `superset`) are collected into one group of multiple exercises.
- Consecutive rows with the **same** `exercise` name are merged into one exercise item with **multiple sets** (one per row).
- `dayNumber` is assigned automatically from session order; `orderIndex` everywhere follows row order.
- The **exercise must already exist** in the library (matched by name). Rows referencing an unknown exercise are skipped.
- Imported plans are created with `status = "inactive"`; `focusMuscleGroups` is empty; each item's `counterType` defaults to `reps`; `loadRange.unit` is `kg`; `percentage1RMRange.basedOnEstimated1RM` is `false`.

### Columns

| Column | Maps to | Notes |
|---|---|---|
| `plan` | `plannedWorkouts.name` | **Required.** |
| `objective` | `objectiveType` | `ObjectiveType`. Default `hypertrophy`. Legacy alias: `objectivetype`. |
| `work_type` | `workType` | `WorkType`. Default `accumulation`. Legacy alias: `worktype`. |
| `session` | `plannedSessions.name` | Session name. Legacy alias: `sessionname`. |
| `exercise` | item's exercise (by name) | Legacy alias: `exercisename`. |
| `group_type` | `plannedExerciseGroups.groupType` | Blank = `standard`. Legacy alias: `grouptype`. |
| `set_type` | `plannedSets.setType` | Blank = `working`. Legacy alias: `settype`. |
| `sets_min` / `sets_max` | `setCountRange.min` / `.max` | `sets_max` may be blank if equal to min. Aliases: `setcountmin`/`setcountmax`. |
| `count_min` / `count_max` | `countRange.min` / `.max` | A row with **both blank is skipped** (no set created). `count_max` blank ⇒ open‑ended unless equal to min. Aliases: `countmin`/`countmax`. |
| `to_failure` | `countRange.toFailure` | `''` (none) \| `technical` \| `absolute` \| `barSpeed`. |
| `load_min` / `load_max` | `loadRange.min` / `.max` (kg) | Present only if `load_min` given. |
| `pct1rm_min` / `pct1rm_max` | `percentage1RMRange.min` / `.max` | Fractions (0.80 = 80%). Aliases: `percentage1rmmin`/`percentage1rmmax`. |
| `rpe_min` / `rpe_max` | `rpeRange.min` / `.max` | |
| `rest_min` / `rest_max` | `restSecondsRange.min` / `.max` | `isFixed` is set automatically when max is blank or equals min. |
| `xrm` | item `targetXRM` | Rounded to an integer. |
| `tempo` | `plannedSets.tempo` | |
| `notes` | `plannedSets.notes` | Set‑level note. |
| `exercise_notes` | `plannedExerciseItems.notes` | Item‑level note. |
| `miniset_count` | cluster `miniSetCount` | Cluster groups only; place on the **working** set row. |
| `miniset_reps` | cluster `miniSetReps` | `totalRepsTarget` is derived as `miniset_count × miniset_reps`. |
| `miniset_rest` | cluster `interMiniSetRestSeconds` | |
| `miniset_load_pct` | cluster `loadReductionPercent` | Optional. |

**Numeric parsing:** values may include a trailing `%` or `s` (e.g. `80%`, `90s`) — these are stripped. When a `*_max` is blank it is treated as equal to `*_min` (for load/count it becomes the min; for count an explicitly open range uses `null`).

### Header & example

```csv
plan,objective,work_type,session,exercise,group_type,set_type,sets_min,sets_max,count_min,count_max,to_failure,load_min,load_max,pct1rm_min,pct1rm_max,rpe_min,rpe_max,rest_min,rest_max,xrm,tempo,notes,exercise_notes,miniset_count,miniset_reps,miniset_rest,miniset_load_pct
Strength Block,generalStrength,intensification,Lower A,Barbell Back Squat,,,5,,5,,,,,0.80,0.85,7,8,240,300,5,3-1-1-0,,Brace before each rep,,,,
Strength Block,generalStrength,intensification,Lower A,Romanian Deadlift,,,3,,8,10,,,,,,7,8,120,,,,,,,,
```

(The blank line that the exporter inserts between sessions is purely cosmetic and ignored on import.)

### Import behaviour (conflicts by plan name)

- **No match →** new plan created.
- **`ignore` →** the whole plan is skipped.
- **`overwrite` →** the existing plan's sessions/groups/items/sets are deleted and rebuilt from the CSV.
- **`copy` →** imported as a new plan named `"<plan> (2)"`, `"(3)"`, …

---

## B.3 — History (Sessions) CSV

**One row per performed set.** Session‑level metadata repeats on every row. Identity is the session **`started_at`** timestamp (compared as an ISO 8601 string).

### How rows become sessions

- Rows are grouped into sessions by `started_at` (parsed to ISO 8601; if unparseable, the raw string is used as the key).
- Within a session, groups/items are formed like the plan CSV: consecutive same‑exercise rows merge into one item with multiple sets; `group_type` runs form groups.
- `workout_name` and `session_name` are **optional links**: if they match an existing planned workout / planned session (by name), the logged session is linked to them; otherwise the session is free‑standing.
- The **exercise must already exist** in the library (by name); rows with an unknown or empty exercise are skipped. Items are marked `isCompleted: true`.

### Columns

| Column | Maps to | Notes |
|---|---|---|
| `started_at` | `workoutSessions.startedAt` | **Required.** ISO 8601 recommended (e.g. `2024-01-15T09:00:00.000Z`). Groups rows into sessions. |
| `completed_at` | `workoutSessions.completedAt` | Optional ISO 8601. |
| `workout_name` | link → planned workout | Optional, by name. |
| `session_name` | link → planned session | Optional, by name (within the linked workout). |
| `session_notes` | `workoutSessions.notes` | |
| `overall_rpe` | `workoutSessions.overallRPE` | |
| `exercise` | item's exercise (by name) | Required for a set row. |
| `group_type` | `sessionExerciseGroups.groupType` | Blank = `standard`. |
| `item_notes` | `sessionExerciseItems.notes` | |
| `set_type` | `sessionSets.setType` | Blank = `working`. |
| `load` | `sessionSets.actualLoad` | Blank ⇒ `null`. Accepts `,` or `.` decimals. |
| `reps` | `sessionSets.actualCount` | Blank ⇒ `null`. |
| `rpe` | `sessionSets.actualRPE` | Blank ⇒ `null`. |
| `to_failure` | `sessionSets.actualToFailure` | `''` \| `technical` \| `absolute` \| `barSpeed`. |
| `expected_rpe` | `sessionSets.expectedRPE` | Blank ⇒ `null`. |
| `set_completed` | `sessionSets.isCompleted` | Boolean. Blank ⇒ inferred `true` if a load or reps value is present, else `false`. |
| `set_skipped` | `sessionSets.isSkipped` | Boolean. |

**Boolean cells** accept (case‑insensitive): `true`, `1`, `yes`, `y`, `x`, `sì` as true; anything else is false.

### Header & example

```csv
started_at,completed_at,workout_name,session_name,session_notes,overall_rpe,exercise,group_type,item_notes,set_type,load,reps,rpe,to_failure,expected_rpe,set_completed,set_skipped
2024-01-15T09:00:00.000Z,2024-01-15T10:30:00.000Z,Push Pull Legs,Push Day A,Felt strong,7.5,Barbell Bench Press,,Paused,working,105,5,7.5,none,7.5,1,0
2024-01-15T09:00:00.000Z,2024-01-15T10:30:00.000Z,Push Pull Legs,Push Day A,Felt strong,7.5,Barbell Bench Press,,Paused,working,105,5,8,none,7.5,1,0
```

### Import behaviour (conflicts by `started_at`)

- **No match →** new session inserted.
- **`ignore` →** the session is skipped.
- **`overwrite` →** the existing session and all its sets are deleted (cascade) and rebuilt.
- **`copy` →** imported as a new session with `started_at` shifted by **+1 second** to avoid colliding with the original.

---
---

# Part C — Key Rules & Pitfalls

1. **All referenced names/IDs must resolve.**
   - JSON: a foreign‑key id must appear in the same file or already exist in the DB.
   - CSV: an `exercise` named in a plan/history file must already exist in the exercise library — **import the library first**.

2. **Include `exerciseVersions` for JSON history.** Every exercise should have at least one version, and any logged `sessionExerciseItems.exerciseVersionId` should point to one; otherwise history may not render correctly. (CSV history does not use versions.)

3. **`userRegulationProfile.id` must be `"default"`** and should be imported with `ignore`/`overwrite`, never `copy`.

4. **Required booleans in `sessionSets`** (`partials`, `isCompleted`, `isSkipped`) and the number `forcedReps` must be present in JSON, or the record is dropped. (In CSV history these are derived for you.)

5. **Use `null`, not `0`,** for unrecorded `actualLoad` / `actualCount` / `actualRPE` / `expectedRPE` in JSON `sessionSets`.

6. **`equipment` is always an array** in JSON (`["barbell"]`); in CSV it is a semicolon‑separated cell (`barbell;bench`).

7. **`orderIndex` must be a string** and is compared lexicographically — zero‑pad when you have 10+ siblings. CSV has no `orderIndex`; row order wins.

8. **Computed fields are ignored on import** (marked 🧮 in §A.6). Don't rely on them to carry data; the app recomputes them.

9. **JSON file size limit: 10 MB.**

10. **Pick the right channel.** JSON = exact, multi‑table, loss‑less. CSV = single element, spreadsheet‑friendly, lossy (no IDs/versions/warmups/most modifiers).

---

## C.1 Minimal Valid JSON Import Template

A complete, meaningful skeleton — copy and expand.

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
