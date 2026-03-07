# Workout Tracker — System Overview

## Purpose

Workout Tracker is a fully offline, client-only personal fitness application. It allows individuals to plan structured resistance-training programs, execute and record workout sessions in real time, and review historical performance through analytics. All data is stored locally on the device; there is no backend server or network dependency.

The application is designed for serious trainees who want precise control over training parameters: load ranges, repetition ranges, RPE targets, fatigue progression, and set-type classification. It supports both a simplified mode for casual users and an advanced mode for those managing periodization.

---

## Core Capabilities

### Multi-User Management
The application supports multiple user profiles on a single device. Each user has a name, optional PIN protection, and a distinct color avatar. Only one user is active at a time. The active user's data is fully isolated from other users.

### Exercise Library
A searchable and filterable catalog of exercises. Each exercise is described by its name, muscle involvement, equipment requirements, movement pattern, and counter type (how its effort is measured — repetitions, seconds, meters, etc.). Exercises can be archived and have variant relationships to related exercises.

### Workout Planning
A hierarchical planning system: a Workout Plan contains named training Sessions; each session contains Exercise Groups; each group contains Exercise Items; each item contains one or more Set Blocks (PlannedSets) with load, repetition, RPE, and fatigue parameters defined as ranges.

### Active Session Execution
The central interaction of the app. During a session, the user progresses through exercises set by set. The system tracks performance, provides real-time compliance feedback against planned targets, suggests loads based on historical performance and 1RM estimates, and manages a rest timer. Multiple group types (Standard, Superset, Circuit, Cluster, AMRAP, EMOM, Warmup) each have distinct traversal and timing behaviors.

### History and Analytics
All completed sessions are stored. The history browser lets users review any past session in detail. The analytics module aggregates data across date ranges to produce volume, load progression, compliance, RPE accuracy, and weekly frequency reports.

### One-Rep Max (1RM) Records
Users can manually record directly-tested 1RM values or have the system estimate them from completed sets using validated formulas (Epley, Brzycki, Lander, O'Connor, Lombardi). 1RM records drive load suggestions during sessions.

### Backup and Restore
The full database can be exported to a structured JSON file and reimported, with configurable conflict resolution (copy as new, ignore conflicts, overwrite existing data).

### CSV Import/Export
Exercises and workout plans can be imported from and exported to CSV format for bulk editing.

### Settings and Personalization
Users configure load suggestion method, fatigue sensitivity, rest timer behavior, and display theme. A "simple mode" hides advanced metrics (RPE, compliance, fatigue analysis) for a streamlined experience.

---

## Application Structure Summary

```
Onboarding
  └── Create first user profile → optional seed data

Main Application (one active user at a time)
  ├── Dashboard          — overview, next session suggestion, muscle freshness, training calendar
  ├── Workout Plans      — list, create, edit workout plans and their sessions
  ├── Session Detail     — edit the exercises, groups, sets inside a planned session
  ├── Active Session     — real-time workout execution interface
  ├── Exercise Library   — browse, create, edit exercises; CSV import/export
  ├── History            — list and detail view of completed sessions
  ├── Analytics          — charts and metrics aggregated over date ranges
  ├── 1RM Records        — manage one-rep-max records per exercise
  ├── Profile            — user info, body weight tracking history
  ├── Backup             — export/import all data
  └── Settings           — preferences, appearance, data management
```

---

## Key Terminology

| Term | Meaning |
|---|---|
| **Workout Plan** | A named training program (e.g. "Push Pull Legs") containing one or more planned sessions |
| **Planned Session** | A named training day within a workout plan (e.g. "Push Day") |
| **Exercise Group** | A logical grouping of exercises within a session (Standard, Superset, Circuit, etc.) |
| **Exercise Item** | An assignment of a specific exercise within a group |
| **Planned Set** | A block of sets with parameterized targets (count range, load range, RPE range, set count range) |
| **Workout Session** | A live or completed instance of executing a planned session |
| **Session Group / Item / Set** | Execution-layer counterparts to the planned hierarchy |
| **RPE** | Rate of Perceived Exertion — a subjective effort scale from 6.0 to 10.0 |
| **1RM** | One-repetition maximum — the maximum load that can be lifted for one repetition |
| **e1RM** | Estimated 1RM — calculated from a submaximal set using load, reps, and RPE |
| **Compliance** | How closely actual set performance matched planned targets |
| **Fatigue Progression** | The expected RPE climb across sets of the same exercise |
| **Load Suggestion** | A system-generated recommended load for the next set |
| **Set Modifier** | A structured technique applied to a set: Cluster, Drop Set, Myo-Rep, Top Set, or Back-Off |
| **Simple Mode** | A user preference that hides RPE-related and advanced feedback fields |
| **Session Template** | A reusable snapshot of a session's structure (groups, items, sets) that can be imported into any plan |

---

## Data Isolation Model

The application maintains two scopes of data:

1. **Global scope**: User account records (name, PIN hash, avatar color). Shared across users. Tracks which user is currently active.

2. **Per-user scope**: All exercise, planning, session, analytics, and profile data. Each user has their own isolated database instance. Switching users closes the current database and opens the target user's database.

---

## Offline-First Design

All data operations are local. There is no network requirement for any feature. Backup/restore is the only data transfer mechanism, and it operates exclusively via local file system access.

---

## Primary Language

The application's primary display language is Italian. All translatable strings have keys in the localization system; the localization system is used for all user-visible text including labels, error messages, and confirmation dialogs.
