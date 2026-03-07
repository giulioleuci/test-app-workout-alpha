# Workout Tracker — Algorithms and Computations

This document provides precise descriptions of all non-trivial algorithms, formulas, and computational processes in the system, presented in a technology-neutral way.

---

## 1. One-Rep Max Estimation Formulas

The system uses five validated formulas to estimate 1RM from a submaximal set (given actual load `L`, actual reps `R`, and actual RPE `P`).

All formulas operate on reps-to-failure (`RTF`), which is derived from RPE using the lookup table described in Section 2.

Let `RTF = repsAtRPE10 - R_additional_reps_in_tank`, where reps in the tank is approximately `10 - P` (for simplicity in some formulas).

### Brzycki
`1RM = L × (36 / (37 - R))`

### Epley
`1RM = L × (1 + R / 30)`

### Lander
`1RM = (100 × L) / (101.3 - 2.67123 × R)`

### O'Connor
`1RM = L × (1 + 0.025 × R)`

### Lombardi
`1RM = L × R^0.10`

### Weighted Average (Used in System)
The system computes all five formulas and takes a weighted average. The specific weights may be uniform (each formula contributes 20%) or empirically tuned. The result is stored as `e1rm` on the session set and as `value` on `OneRepMaxRecord`.

`e1rm = (Brzycki + Epley + Lander + O'Connor + Lombardi) / 5`

Additionally, the system stores the min and max of the five estimates as `valueMin` and `valueMax` to express estimation uncertainty.

---

## 2. RPE / Percentage of 1RM Lookup Table

The system maintains a two-dimensional lookup table mapping `(reps, RPE)` → `percentage_of_1RM`.

### Table structure
- Rows: Reps from 1 to 12 (or higher).
- Columns: RPE values from 6.0 to 10.0 in 0.5 increments.
- Each cell: The fraction of 1RM that a given load represents when performed for that many reps at that RPE.

### Load Suggestion Algorithm
Given: `1RM_value`, `target_reps`, `target_RPE`:
1. Look up `percentage = table[target_reps][target_RPE]`.
2. `suggested_load = 1RM_value × percentage`.
3. Round to nearest 0.5 increment.
4. For range suggestions, also compute `min_load = 1RM_min × percentage` and `max_load = 1RM_max × percentage`.

### Reverse Lookup (e1RM from set)
Given: `actual_load`, `actual_reps`, `actual_RPE`:
1. Look up `percentage = table[actual_reps][actual_RPE]`.
2. `estimated_1RM = actual_load / percentage`.

This is the alternative method used in the RPE-based e1RM calculation alongside the five formula approach. The two methods are averaged or the formula-based result is preferred.

---

## 3. Warmup Set Scheme Generation

**Input**: `workingWeight`, `exerciseType` (compound_upper / compound_lower / isolation), `bodyWeight`, `isFirstForMuscle`.

### Step 1: Stress Classification

For compound movements:
- Compute `ratio = workingWeight / bodyWeight`.
- Compound upper:
  - `ratio ≥ 1.0` → high stress
  - `ratio ≥ 0.5` → medium stress
  - else → low stress
- Compound lower:
  - `ratio ≥ 1.25` → high stress
  - `ratio ≥ 0.75` → medium stress
  - else → low stress
- If `bodyWeight` is unknown → default to high stress.

For isolation: skip stress classification.

### Step 2: Select Scheme

| Scenario | Warmup Sets (percentage × reps) |
|---|---|
| Isolation + first for muscle | [60%×8, 80%×3] |
| Isolation + not first | [60%×8] |
| Compound high stress | [50%×6, 70%×4, 85%×2] |
| Compound medium stress | [60%×5, 80%×3] |
| Compound low stress | [65%×5] |

### Step 3: Reduce if Not First for Muscle

If the exercise is NOT the first one in the session to train its primary muscle group, remove the first warmup set from the selected scheme.

### Step 4: Convert to Absolute Weights

For each `(percentage, reps)` pair:
`weight = round_to_half(workingWeight × percentage)`

**Result**: An ordered list of `{ weight, reps, percent }` objects.

---

## 4. Session Navigator Traversal Algorithm

### Sequential Traversal (Standard, Warmup, Cluster groups)

For a group with items `[item_0, item_1, ..., item_n]` each with sets `[set_0, set_1, ..., set_m]`:

The traversal order is: `(item_0, set_0), (item_0, set_1), ..., (item_0, set_m), (item_1, set_0), ...`

### Interleaved Traversal (Superset, Circuit, AMRAP, EMOM groups)

For a group with items `[item_0, item_1, ..., item_n]` each with `k_i` sets:

Round `r` (0-based) consists of: `(item_0, set_r), (item_1, set_r), ..., (item_n, set_r)`.

The traversal order visits all items for round 0, then all for round 1, etc. The number of rounds equals `max(k_i)` across items.

If an item has fewer sets than the maximum round count, it contributes no step in later rounds.

### Cluster Set Traversal (within a single item)

For a cluster item with `N` working sets and `M` mini-sets per working set:

The traversal for set block is: `(working_set_0), (mini_set_0.0), (mini_set_0.1), ..., (mini_set_0.M), (working_set_1), (mini_set_1.0), ...`

### Finding the Next Target

Iterate groups in `orderIndex` order. For each group, apply the group's traversal order. Return the first `(groupIndex, itemIndex, setIndex, round)` tuple where the set is neither completed nor skipped.

---

## 5. Load Suggestion — Fatigue Adjustment

When using the `plannedRPE` suggestion method:

`adjustedRPE = min(10.0, plannedRPE + setIndex × expectedRPEIncrementPerSet)`

Where:
- `plannedRPE`: the minimum RPE from the planned set's RPE range.
- `setIndex`: the number of sets already completed for this exercise in the current session (0-based).
- `expectedRPEIncrementPerSet`: from the planned set's `FatigueProgressionProfile` (default 0.5 if not specified).

The adjusted RPE is then used in the RPE → load lookup.

---

## 6. Fatigue Progression Analysis

**Input**: Array of RPE values for completed sets of an exercise (ordered by set index). `expectedIncrement`, `tolerance` from `FatigueProgressionProfile`.

**Algorithm**:
1. If fewer than 2 completed sets → `notApplicable`.
2. Compute `actualClimb = RPE[lastSet] - RPE[secondToLastSet]`.
3. Compute `deviation = actualClimb - expectedIncrement`.
4. If `|deviation| ≤ tolerance` → `optimal`.
5. If `deviation > tolerance` → `tooFast`.
6. If `deviation < -tolerance` → `tooSlow`.

The deviation is stored in `FatigueAnalysisResult.deviation`.

---

## 7. Compliance Analysis

**Input**: `actualValue`, `plannedMin`, `plannedMax` (may be null = unbounded).

```
if actualValue == null:
    return Incomplete

effectiveMax = plannedMax ?? Infinity

if plannedMin ≤ actualValue ≤ effectiveMax:
    return WithinRange
elif actualValue < plannedMin:
    return BelowMinimum, deviation = actualValue - plannedMin  (negative)
else:
    return AboveMaximum, deviation = actualValue - effectiveMax  (positive)
```

**Overall compliance** is the worst-case of count, load, and RPE:
- If any is `Incomplete` → overall is `Incomplete`.
- If all are `WithinRange` → `FullyCompliant`.
- If any is `BelowMinimum` → `BelowMinimum` (takes priority over AboveMaximum).
- If any is `AboveMaximum` → `AboveMaximum`.

---

## 8. Set Count Advisor

**Input**: `completedSets[]`, `plannedSet`, `fatigueSensitivity`, `simpleMode`.

**Algorithm** (evaluated in order, returns on first match):
1. If `numCompleted ≥ max` → `stop` ("Max sets reached").
2. If `!simpleMode` AND `stopCriteria == 'rpeCeiling'` AND `lastRPE ≥ rpeCeiling`:
   - If `numCompleted ≥ min` → `stop`.
   - Else → `optional` (below minimum, but ceiling hit).
3. If `!simpleMode` AND last set `toFailure` is `AbsoluteFailure` or `TechnicalFailure`:
   - If `numCompleted ≥ min` → `stop`.
   - Else → `optional`.
4. If `!simpleMode` AND fatigue profile exists AND `numCompleted ≥ 2`:
   - Compute RPE climb (last two sets).
   - If `climb > expectedIncrement + 2 × tolerance`:
     - If `numCompleted ≥ min` → `stop`.
     - Else → `optional`.
5. If `numCompleted < min` → `doAnother`.
6. Else → `optional` (between min and max, no stopping condition met).

---

## 9. Session Rotation Algorithm

**Input**: Active workout's ordered session list, most recently completed `WorkoutSession`.

**Algorithm**:
1. Find `lastCompletedSession.plannedSessionId`.
2. Find the index `lastIndex` of that planned session in the ordered list.
3. If not found (e.g., session was ad-hoc) → `nextIndex = 0`.
4. Else → `nextIndex = (lastIndex + 1) % totalSessions`.
5. Return the session at `nextIndex`.

**Edge case**: If no session has ever been completed → return index 0.

---

## 10. History Matching Algorithm (Session Activation)

For each exercise item being activated, finds the most relevant historical session sets to pre-populate values.

### Tier 1 — Plan-Based Match
1. Find all `SessionExerciseItem` records with `plannedExerciseItemId` matching the current item's plan ID.
2. From these, find the most recently completed `WorkoutSession`.
3. If found and not already claimed by another item in this activation → use its sets.

### Tier 2 — Structural Best-Fit
1. Find all `SessionExerciseItem` records with `exerciseId` matching the target exercise.
2. From these, find the most recently completed `WorkoutSession`.
3. From that session, collect all items for this exercise.
4. Score each candidate item:

```
score = |candidateSets.count - plannedSets.totalMin| × 10
      + |candidateWorkingSets - plannedWorkingSets| × 5
      + |candidateAvgReps - plannedAvgReps| × 1
```

5. Select the lowest-scoring candidate (best structural match).
6. Mark the candidate as "used" so other items in the same activation don't claim the same history.

**Pre-population**: For each matched historical set, copy `actualLoad`, `actualCount`, and `actualToFailure` to the new session set. `actualRPE` is NOT pre-populated (user must provide it fresh).

---

## 11. Performance Trend Analysis

**Input**: Current session's exercise item, the single most recent previous completed session for the same `(plannedWorkoutId, plannedSessionId)` pair.

**Item matching**:
- Find items in the previous session with the same `exerciseId` (or `originalExerciseId` matching current `exerciseId`).
- Match by occurrence index within the group (if the exercise appears multiple times in a session, the Nth occurrence in the current session is compared to the Nth occurrence in the previous session).

**Metric computation** (per item):
- Compute average e1RM across all completed working sets.
- OR compute total volume-load (sum of load × count) across working sets.
- Compare current metric vs. previous metric.

**Status assignment**:
- `improving`: current > previous by a meaningful threshold.
- `stable`: within threshold.
- `stagnant`: equal or near-equal across multiple sessions (requires looking at more than one previous session — simplified to "stable" in single-comparison).
- `deteriorating`: current < previous by a meaningful threshold.
- `insufficient_data`: no previous data, or current item has no completed sets.

The exact threshold for "meaningful" is a small percentage (e.g., > 1% difference → improving/deteriorating; ≤ 1% → stable).

---

## 12. LexoRank Algorithm

LexoRank is a string-based ordering system that allows inserting items at any position without renumbering existing items.

### Properties
- Two strings can always be compared with standard lexicographic comparison.
- A new string can always be generated between any two existing strings.
- Strings do not need to be sequential integers; they are balanced base-36 or similar strings.

### Operations

**Initial rank**: A midpoint string in the alphabet (e.g., `"m"` or `"U+0001"`).

**Rank between A and B**:
```
if A and B differ by more than one character position:
    return the lexicographic midpoint string
else:
    append characters to A or B to create a string strictly between them
```

**Rank after last**: Append a character to the last string that sorts after it.

**Sequential ranks for N items**: Generate N evenly distributed strings across the available space.

**Usage in re-ordering**: When the user moves item A between item B and item C, compute `rankBetween(B.orderIndex, C.orderIndex)` and assign to A.

---

## 13. Volume Analytics Computation

### Volume by Muscle (from executed session data)
For each completed session set:
1. Identify the exercise (use version snapshot if available).
2. For each primary muscle of that exercise: add `1.0` weighted set.
3. For each secondary muscle: add `0.5` weighted set.
4. Accumulate `setsTimesReps = actualCount` and `volumeTonnage = actualLoad × actualCount` per muscle.

### Volume by Muscle Group
Map each muscle to its parent muscle group. Accumulate with the same weights.

### Volume by Movement Pattern
Look up the exercise's movement pattern. Accumulate set counts per pattern (weight 1.0).

### Volume by Objective
For each planned set linked to an executed set, look up the planned workout's `objectiveType`. Accumulate set counts.

If no planned linkage, attribute to the workout's objective if available, or exclude.

### Compliance Trend (Temporal)
1. Compute `avgCompliance` for the current period.
2. Compute `avgCompliance` for the immediately preceding period of equal duration.
3. `trend = currentAvg - previousAvg`.

---

## 14. Muscle Freshness Calculation

For each muscle in the `Muscle` enum:
1. Find the most recent completed `WorkoutSession` that has this muscle in `primaryMusclesSnapshot`.
2. Record the `completedAt` timestamp as `lastTrainedAt`.
3. Compute `hoursSinceLastTrained = floor((now - lastTrainedAt) / 3600)`.
4. If never trained: `lastTrainedAt = null`, `hoursSinceLastTrained = null`.

Sort by `hoursSinceLastTrained` ascending (most recently trained first), with untrained muscles at the end.

---

## 15. Duration Estimation (Planned Sessions)

For each exercise item in a planned session:
1. Compute `totalSetsMin = sum of setCountRange.min for all planned sets`.
2. Compute `totalSetsMax = sum of setCountRange.max for all planned sets`.
3. Estimate time per set based on counter type and count range:
   - Rep-based: `timePerSet ≈ (countRange.min + countRange.max) / 2 × 3 seconds` (approximation).
   - Time-based: `timePerSet ≈ (countRange.min + countRange.max) / 2 seconds`.
4. Add rest time: `restPerSet = (restSecondsRange.min + restSecondsRange.max) / 2` (or a default if not specified).
5. Total time = `sum of (timePerSet + restPerSet) × setCount` across all items.

Result: `{ minSeconds, maxSeconds }` → formatted as "X–Y min".
