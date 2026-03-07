# Workout Tracker — Documentation Index

This folder contains a complete, implementation-agnostic specification of the Workout Tracker application. The documentation is sufficient to reimplement the entire application in any technology stack (originally Flutter/Dart was the target).

All descriptions are abstracted from the original implementation. No references to specific programming languages, storage technologies, or UI frameworks are made.

---

## Document Map

| File | Contents |
|---|---|
| [00_overview.md](./00_overview.md) | System purpose, capabilities, architecture summary, key terminology, multi-user isolation model |
| [01_enums.md](./01_enums.md) | All enumerated types: Muscle, MuscleGroup, MovementPattern, CounterType, Equipment, ExerciseGroupType, ExerciseType, SetType, WorkType, ObjectiveType, ComplianceStatus, FatigueProgressionStatus, ToFailureIndicator, PlannedWorkoutStatus, PlannedSessionStatus, SetModifierType, SetCountAdvice, SuggestionMethod, PerformanceTrendStatus, ConflictStrategy |
| [02_domain_model.md](./02_domain_model.md) | All entities with full attributes, types, constraints, relationships, and lifecycle rules |
| [03_services.md](./03_services.md) | All 32 services with purpose, inputs, outputs, process description, and edge cases |
| [04_pages_catalog.md](./04_pages_catalog.md) | All pages and their components: purpose, data, actions, conditional visibility, component hierarchy |
| [05_active_session.md](./05_active_session.md) | Exhaustive specification of the Active Session feature: state model, display units, renderers, set input widget, rest timer, compliance, load suggestions, substitution, quick-add, lifecycle |
| [06_navigation_and_routing.md](./06_navigation_and_routing.md) | Complete route map, bootstrap flow, persistent navigation, session activation flow, multi-user switching, loading states |
| [07_user_journeys.md](./07_user_journeys.md) | Step-by-step workflows for all 16 major user journeys with intermediate states, success outcomes, and failure paths |
| [08_interaction_state_matrix.md](./08_interaction_state_matrix.md) | Comprehensive interaction matrices: component → user action → system response → state change → feedback |
| [09_data_persistence_and_multi_user.md](./09_data_persistence_and_multi_user.md) | Two-tier database architecture, all table definitions, indexing requirements, ordering mechanism, transactional write rules, cascade deletes, backup file format |
| [10_business_rules_and_validation.md](./10_business_rules_and_validation.md) | All business rules, validation constraints, and system invariants (numbered R-U1 through R-X9 etc.) |
| [11_design_system.md](./11_design_system.md) | Layout principles, responsive breakpoints, color system (semantic roles, themes, status colors), typography, component conventions, navigation patterns, animation conventions |
| [12_algorithms_and_computations.md](./12_algorithms_and_computations.md) | Precise descriptions of all algorithms: 1RM formulas (5 methods), RPE/percentage table, warmup generation, session navigator traversal, fatigue analysis, compliance analysis, set count advisor, session rotation, history matching, performance trends, LexoRank, volume analytics, muscle freshness, duration estimation |

---

## Quick Reference: Key Concepts

### Planning vs. Execution Hierarchy

```
PLANNING (user designs in advance):
  PlannedWorkout
    └── PlannedSession (day)
          └── PlannedExerciseGroup (type: Standard, Superset, Cluster, etc.)
                └── PlannedExerciseItem (exercise + modifiers + warmup config)
                      └── PlannedSet (set count range, rep range, load range, RPE range)

EXECUTION (recorded during a live session):
  WorkoutSession
    └── SessionExerciseGroup
          └── SessionExerciseItem (actual exercise used, trend status)
                └── SessionSet (actual load, count, RPE, compliance, e1RM)
```

### Session Activation (Two-Phase)
1. Check for prior substitutions → prompt user → collect choices
2. Activate: create all execution entities from plan, pre-populate from history

### Group Execution Modes
- **Sequential** (Standard, Warmup, Cluster): all sets of exercise A → then B → then C
- **Interleaved** (Superset, Circuit, AMRAP, EMOM): one set of A → one of B → rest → repeat (rounds)
- **Cluster**: working set → N mini-sets with short intra-set rest → full rest → repeat

### Core Metrics
- **RPE**: Rate of Perceived Exertion (6.0–10.0, step 0.5)
- **e1RM**: Estimated 1-rep max, computed from load × reps × RPE using 5 formulas
- **Compliance**: How actual performance matches planned targets (per set)
- **Weighted Sets**: Volume metric weighting primary muscles at 1.0, secondary at 0.5

---

## Reading Order for Implementation

For a Flutter/Dart reimplementation, read in this order:

1. `00_overview.md` — understand the system's purpose and scope
2. `01_enums.md` — define all Dart enums first (they are referenced everywhere)
3. `02_domain_model.md` — define all data model classes
4. `09_data_persistence_and_multi_user.md` — set up the local database layer
5. `12_algorithms_and_computations.md` — implement pure business logic functions
6. `03_services.md` — implement service layer calling data layer + algorithms
7. `10_business_rules_and_validation.md` — apply validation rules throughout
8. `06_navigation_and_routing.md` — define routing and navigation
9. `04_pages_catalog.md` + `05_active_session.md` — implement UI pages and components
10. `11_design_system.md` — apply visual design tokens and conventions
11. `07_user_journeys.md` + `08_interaction_state_matrix.md` — verify all interactions are implemented correctly
