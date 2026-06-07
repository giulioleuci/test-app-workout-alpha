# Workout Duration Calculation Audit Report

This report summarizes the verification and fixes applied to the workout duration calculation logic in the Delta Workout application.

## 1. Findings and Corrections

### Interleaved Group Duration (Supersets/Circuits)
**Issue:** The previous logic for interleaved groups (Supersets, Circuits, etc.) calculated duration block-by-block instead of set-by-set. For a superset of Exercise A (3 sets) and Exercise B (3 sets), it was calculating the total duration as `(Duration of A block) + (Duration of B block) + transition`, which incorrectly grouped all sets of A together followed by all sets of B.

**Correction:**
- Modified `computeTraversalOrder` in `src/services/traversal.ts` to "unroll" set blocks into individual sets for interleaved groups. This ensures the traversal follows the actual execution order (e.g., A1 -> B1 -> A2 -> B2 -> A3 -> B3).
- Updated `estimateGroupDurationFromData` in `src/services/durationEstimator.ts` to iterate through this unrolled order, calculating execution and rest times for each individual set.

### Set Count Range Handling
**Issue:** The duration estimator was using `setCountRange.min` for both `minSeconds` and `maxSeconds` calculations, failing to account for the additional duration when a user performs the maximum number of sets in a range (e.g., 3-5 sets).

**Correction:**
- Updated `estimateGroupDurationFromData` to use separate traversal orders for minimum and maximum estimates. `minSeconds` is now based on `setCountRange.min`, and `maxSeconds` is based on `setCountRange.max`.

### Removal of Implicit Rests and Transitions
**Issue:** The logic was adding implicit rest (90s default) and hardcoded transitions (5s between items, 10s between groups) even when not explicitly specified by the user.

**Correction:**
- Updated `estimateSetBlockSeconds` and `estimateGroupDurationFromData` to use 0 as the default rest if no range is specified.
- Removed hardcoded 5s transitions between items and 10s transitions between groups.
- Duration estimates are now strictly based on user-provided data.

## 2. Logic Verification

The following levels of calculation were verified:
- **Set Level:** `estimateSetExecutionSeconds` correctly estimates execution time based on counter type (e.g., 4s per rep).
- **Exercise Level:** `estimateItemDurationFromData` sums up the duration of all set blocks for an item.
- **Group Level:** `estimateGroupDurationFromData` (now corrected) handles both sequential and interleaved patterns, using strictly programmed rests.
- **Session Level:** `estimateSessionDurationFromData` sums up group durations without implicit gaps.
- **Workout Level:** `estimateWorkoutDuration` sums up all session durations.

## 3. Fixture Audit Results

An audit of the fixture data confirms that the durations are now correctly calculated based on explicitly programmed rests:

| Workout | Sessions | Total Sets (Range) | Duration (Range) |
| :--- | :--- | :--- | :--- |
| **Strength 5×5** | Day A, Day B | 26 - 36 | 37 - 97 min |
| **Powerlifting SBD** | 3 sessions | 36 - 36 | 61 - 100 min |
| **Upper-Lower 4x** | 4 sessions | 60 - 60 | 112 - 154 min |
| **Push-Pull-Legs** | 3 sessions | 45 - 45 | 69 - 96 min |
| **Full Body 2x** | 2 sessions | 36 - 36 | 55 - 77 min |

### Focus: "Strength 5x5 - Day A - Push"
- **Sets:** 16 - 24
- **Duration:** 28 - 73 min
- **Verification:** With long explicit rest periods (up to 4-5 minutes for main lifts like Squat and Bench Press), a 16-24 set session correctly results in a 28-73 minute range. The wide range is due to both the set count range (16 vs 24) and the generous rest ranges (e.g., 150-240s for Bench, 180-300s for Squat).

## 4. Conclusion

The workout duration calculation logic is now robust and accurately reflects both sequential and interleaved execution patterns, as well as set count and rest period ranges.
