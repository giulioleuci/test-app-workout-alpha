# Workout Tracker — Enumeration Reference

This document defines all enumerated types used throughout the system. Each enum is described with its values, the semantic meaning of each value, and how it is used across the domain model and services.

---

## Muscle

Represents individual anatomical muscle targets.

| Value | Meaning |
|---|---|
| `chest` | Pectoralis major and minor |
| `upperBack` | Mid and upper trapezius, rhomboids |
| `lowerBack` | Erector spinae, lower trapezius |
| `shoulders` | General shoulder muscles |
| `quadriceps` | Front of the thigh |
| `hamstrings` | Back of the thigh |
| `calves` | Gastrocnemius and soleus |
| `biceps` | Biceps brachii |
| `triceps` | Triceps brachii |
| `abs` | Rectus abdominis, obliques |
| `glutes` | Gluteus maximus, medius, minimus |
| `forearms` | Wrist flexors and extensors |
| `traps` | Trapezius (upper) |
| `lats` | Latissimus dorsi |
| `deltoids` | Deltoid muscles (anterior, lateral, posterior) |

**Usage**: Assigned to exercises as `primaryMuscles` (main movers) and `secondaryMuscles` (assisters). Used for volume attribution, muscle freshness calculation, and session muscle snapshot at completion.

---

## MuscleGroup

A higher-level grouping of related muscles.

| Value | Muscles Included |
|---|---|
| `chest` | chest |
| `back` | lats, upperBack, traps |
| `shoulders` | deltoids, shoulders |
| `arms` | biceps, triceps, forearms |
| `legs` | quadriceps, hamstrings, glutes, calves |
| `core` | abs, lowerBack |

**Usage**: Used on `PlannedSession.focusMuscleGroups` to label a session's primary training focus. Used in volume analysis grouping.

---

## MovementPattern

Classifies the biomechanical movement category of an exercise.

| Value | Description |
|---|---|
| `horizontalPush` | Pushing horizontally away from the body (e.g. bench press, push-up) |
| `horizontalPull` | Pulling horizontally toward the body (e.g. row) |
| `verticalPush` | Pushing upward (e.g. overhead press) |
| `verticalPull` | Pulling downward (e.g. pull-up, lat pulldown) |
| `squat` | Knee-dominant lower-body movement |
| `hinge` | Hip-dominant lower-body movement (e.g. deadlift) |
| `rotation` | Rotational or anti-rotational movement |
| `isometric` | Static holds (no concentric/eccentric motion) |
| `other` | Does not fit a primary pattern |

**Usage**: Assigned to exercises. Used in analytics volume breakdown by movement pattern.

---

## CounterType

Defines what metric is used to measure exercise effort/volume.

| Value | Description | 1RM Support | To-Failure Support |
|---|---|---|---|
| `reps` | Repetitions | Yes | Yes |
| `seconds` | Duration in seconds | No | Yes |
| `minutes` | Duration in minutes | No | No |
| `distanceMeter` | Distance in meters | No | No |
| `distanceKMeter` | Distance in kilometers | No | No |

**Usage**: Assigned to both exercises and exercise items within a plan. Determines how the counter field is displayed during session execution and how volume tonnage is calculated (only reps-based exercises accumulate load × reps tonnage).

---

## Equipment

Physical equipment required to perform an exercise.

| Value | Description |
|---|---|
| `barbell` | Standard barbell |
| `dumbbell` | Dumbbells |
| `machine` | Weight or resistance machine |
| `cable` | Cable pulley system |
| `bodyweight` | No external load required |
| `kettlebell` | Kettlebell |
| `smithMachine` | Smith machine (guided barbell) |
| `band` | Resistance band |
| `cardioMachine` | Treadmill, bike, rower, etc. |
| `bench` | Flat or adjustable bench |
| `pullUpBar` | Pull-up or chin-up bar |
| `parallelBars` | Parallel dip bars |
| `other` | Other equipment |

**Usage**: Assigned to exercises as an array (multiple equipment pieces may be required). Used for filtering in the exercise list and in session detail display.

---

## ExerciseGroupType

Defines the structural and behavioral type of an exercise group within a session.

| Value | Description | Exercise Traversal | Set Traversal | Single Exercise |
|---|---|---|---|---|
| `standard` | Normal set-by-set execution | Sequential | Sequential | No |
| `warmup` | Warm-up exercises | Sequential | Sequential | No |
| `superset` | Alternating between exercises per set | Interleaved | Sequential | No |
| `circuit` | Multiple exercises in a round | Interleaved | Sequential | No |
| `amrap` | As many rounds as possible | Interleaved | Sequential | No |
| `emom` | Every minute on the minute | Interleaved | Sequential | No |
| `cluster` | A main working set followed by mini-sets with short intra-set rest | Sequential | Cluster | Yes |

**Usage**: Determines how the session navigator traverses sets and items during execution. Controls rest timer override behavior for Cluster groups. See Services → Group Behavior for full traversal rules.

---

## ExerciseType

Classification of an exercise by mechanical involvement.

| Value | Description |
|---|---|
| `compound` | Multi-joint movement involving multiple muscle groups |
| `isolation` | Single-joint movement targeting one primary muscle |

**Usage**: Affects warm-up scheme generation. Compound upper and compound lower exercises use more elaborate warm-up protocols based on load-to-body-weight ratio. Isolation exercises receive simpler warm-up schemes.

---

## SetType

Classifies the role of an individual set within a training plan or session.

| Value | Description |
|---|---|
| `warmup` | A sub-maximal preparatory set before working weight |
| `working` | The main effort set at target load |
| `backoff` | A reduced-intensity set performed after working sets |
| `clusterMiniSet` | A mini-set within a cluster block (short intra-set rest protocol) |

**Usage**: Each session set has a `setType`. The set type governs rest timer source selection for cluster groups. Volume tonnage calculations and compliance assessments are typically applied to working sets.

---

## WorkType

Describes the macrocycle phase or training emphasis of a workout plan.

| Value | Description |
|---|---|
| `accumulation` | High volume, moderate intensity — building work capacity |
| `intensification` | Moderate volume, higher intensity — building strength |
| `peak` | Low volume, maximal intensity — peaking for a test |
| `deload` | Reduced volume and intensity — recovery week |
| `test` | Max-effort testing day |
| `other` | Does not fit a standard phase |

**Usage**: Assigned to `PlannedWorkout` to characterize the overall training phase. Informational; not currently used in load suggestion algorithms but available for future periodization logic.

---

## ObjectiveType

The primary training goal of a workout plan.

| Value | Description |
|---|---|
| `anatomicalAdaptation` | Foundational conditioning for beginners or post-injury |
| `hypertrophy` | Maximizing muscle growth through volume |
| `generalStrength` | Developing overall strength across movement patterns |
| `maxStrength` | Maximizing one-repetition maximum performance |
| `power` | Explosive force production |
| `muscularEndurance` | Maintaining force output over many repetitions |
| `workCapacity` | General cardiovascular and metabolic conditioning |
| `rehabPrehab` | Injury rehabilitation or prevention |
| `other` | Non-standard objective |

**Usage**: Assigned to `PlannedWorkout`. Used in the analytics volume-by-objective distribution chart.

---

## ComplianceStatus

The result of comparing actual set performance against planned targets.

| Value | Meaning |
|---|---|
| `fullyCompliant` | All measured parameters (count, load, RPE) are exactly at or within their planned ranges |
| `withinRange` | All parameters are within acceptable range bounds |
| `belowMinimum` | At least one parameter fell below its minimum target |
| `aboveMaximum` | At least one parameter exceeded its maximum target |
| `incomplete` | At least one parameter was not recorded (null) |

**Usage**: Computed by the Compliance Analyzer Service for each completed set. Stored on `SessionSet.complianceStatus`. Displayed as a color-coded badge during and after session execution. Aggregated into compliance analytics.

---

## FatigueProgressionStatus

The result of comparing the actual RPE climb across sets against the expected fatigue progression profile.

| Value | Meaning |
|---|---|
| `optimal` | RPE is climbing at the expected rate (within tolerance) |
| `tooFast` | RPE is climbing faster than expected — likely over-fatigued or load too high |
| `tooSlow` | RPE is climbing slower than expected — may indicate underperformance or conservative effort |
| `notApplicable` | Insufficient sets or RPE data to compute progression |

**Usage**: Computed by the Fatigue Analyzer Service after each completed set in an exercise. Stored on `SessionSet.fatigueProgressionStatus`. Used by the Set Count Advisor to influence advice on whether to continue adding sets.

---

## ToFailureIndicator

Describes the type of volitional or technical failure reached on a set.

| Value | Meaning |
|---|---|
| `none` | No failure — set was stopped before reaching any limit |
| `technicalFailure` | Form broke down; the rep was completed but technique deteriorated |
| `absoluteFailure` | Could not complete the rep; bar or body came to a stop |
| `barSpeedFailure` | Bar or movement speed dropped significantly indicating maximal effort |

**Usage**: Recorded per session set. Used by the Set Count Advisor to recommend stopping additional sets when failure has been reached. Influences compliance assessment.

---

## PlannedWorkoutStatus

Lifecycle state of a planned workout program.

| Value | Meaning |
|---|---|
| `active` | The current workout program in use; used for next-session suggestion |
| `inactive` | Exists but not currently active |
| `archived` | Soft-deleted; hidden from normal lists |

**Usage**: Only one workout should be `active` at a time. The session rotation algorithm uses `active` status to find the relevant workout.

---

## PlannedSessionStatus

State of a planned session within a workout.

| Value | Meaning |
|---|---|
| `pending` | Not yet started or scheduled |
| `active` | Currently in progress (a live session is executing this) |
| `completed` | Has been executed at least once |
| `skipped` | Was intentionally skipped |

**Usage**: Assigned at the planned session level. During session activation, the corresponding planned session status can be updated. Note: multiple workout sessions can reference the same planned session (repeating sessions in a rotation).

---

## Input Step Constants

Fixed increment values for numeric input fields in the UI:

| Field | Step |
|---|---|
| Body weight | 0.1 kg |
| RPE | 0.5 |
| Load | 0.5 kg/lbs |
| Rep / set count | 1 |

---

## SetModifierType

Composable technique modifiers that can be attached to a planned exercise item. An item may have multiple modifiers simultaneously.

| Value | Description |
|---|---|
| `cluster` | A cluster set: one working set followed by mini-sets with intra-set rest |
| `dropSet` | After the main set, reduce load by a percentage and perform additional sets |
| `myoRep` | Activation set followed by rest-pause mini-sets to accumulate volume |
| `topSet` | A maximum-effort reference set (e.g. for daily max) |
| `backOff` | A follow-up set at reduced load, typically used after a heavy top set |

**Usage**: Stored on `PlannedExerciseItem.modifiers`. Consumed by the set expander and active session UI to generate derived sets and control progression display.

---

## SetCountAdvice

The recommendation produced by the Set Count Advisor regarding whether to continue performing sets.

| Value | Meaning |
|---|---|
| `doAnother` | Below minimum target — more sets are required |
| `optional` | Between minimum and maximum — additional sets are at the user's discretion |
| `stop` | Maximum sets reached, RPE ceiling hit, failure detected, or fatigue climbing too fast |

---

## SuggestionMethod

The algorithm used to generate a load recommendation for an upcoming set.

| Value | Source of Suggestion |
|---|---|
| `percentage1RM` | Derived from the stored best 1RM multiplied by the planned percentage range |
| `lastSession` | Based on the load used in the most recent matching session for this exercise |
| `plannedRPE` | Calculated from the planned RPE target and rep count using the RPE/percentage table |
| `targetXRM` | Derived from the planned target rep maximum (e.g., 5RM) using the 1RM estimate |

---

## PerformanceTrendStatus

The trend of performance across consecutive executions of the same planned exercise slot.

| Value | Meaning |
|---|---|
| `improving` | Average e1RM or volume increased compared to the previous session |
| `stable` | Performance is statistically unchanged |
| `stagnant` | Performance has plateaued over multiple sessions |
| `deteriorating` | Performance has declined |
| `insufficient_data` | Not enough historical data to determine a trend |

**Usage**: Computed and stored on `SessionExerciseItem.performanceStatus` after session completion. Displayed as a badge in the active session and history views.

---

## ConflictStrategy (Backup Import)

How to handle records in an import file that conflict (same ID) with existing data.

| Value | Behavior |
|---|---|
| `copy` | Assign a new ID to the conflicting record and insert as a new entry; all foreign key references are remapped accordingly |
| `ignore` | Skip the conflicting record; keep the existing record unchanged |
| `overwrite` | Replace the existing record with the imported record |

---

## WarmupExerciseType (Internal)

Used internally by the warm-up calculation service.

| Value | Meaning |
|---|---|
| `compound_upper` | Upper-body compound movement |
| `compound_lower` | Lower-body compound movement |
| `isolation` | Single-joint isolation movement |

Determines the stress classification thresholds and the warm-up set scheme applied.
