# Workout Tracker 2 — Architecture Refactor (All Domains) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Zod validation at the persistence layer, a `BaseRepository` pattern, TanStack Query replacing `useLiveQuery` across all domains (Exercise, WorkoutPlan, Session History, 1RM, Template, Analytics, Dashboard), and extract pure business logic into `src/services/logic/`.

**Architecture:** Repositories call `Schema.parse()` before every write; TanStack Query with `staleTime: Infinity` replaces `useLiveQuery` for all non-active-session hooks; active-session hooks (`useActiveSessionData`, `useLoadSuggestions`, `useExerciseHistory`, `usePerformanceTrend`) **retain `useLiveQuery`** because they require sub-second reactivity during live workout logging; mutations own cache invalidation via `onSuccess`.

**Tech Stack:** React 18, TypeScript, Dexie.js v4, TanStack Query v5, Zod v3 (already installed), Vitest 3, fake-indexeddb v6

---

## File Map

### Created
| File | Responsibility |
|---|---|
| `src/domain/__tests__/schemas.test.ts` | Unit tests for all Zod schemas |
| `src/domain/schemas.ts` | Zod schemas for all entities |
| `src/db/repositories/BaseRepository.ts` | Static `validateData<T>()` helper |
| `src/hooks/queries/exerciseQueries.ts` | Exercise TanStack useQuery hooks |
| `src/hooks/mutations/exerciseMutations.ts` | Exercise mutations with cache invalidation |
| `src/hooks/queries/workoutPlanQueries.ts` | WorkoutPlan TanStack useQuery hooks |
| `src/hooks/mutations/workoutPlanMutations.ts` | WorkoutPlan mutations with cache invalidation |
| `src/hooks/queries/sessionHistoryQueries.ts` | History-only TanStack useQuery hooks |
| `src/hooks/queries/oneRepMaxQueries.ts` | OneRepMax TanStack useQuery hooks |
| `src/hooks/mutations/oneRepMaxMutations.ts` | OneRepMax mutations with cache invalidation |
| `src/hooks/queries/templateQueries.ts` | Template TanStack useQuery hooks |
| `src/hooks/mutations/templateMutations.ts` | Template mutations with cache invalidation |
| `src/services/logic/oneRepMaxLogic.ts` | Pure 1RM estimation formulas |
| `src/services/logic/warmupLogic.ts` | Pure warmup scheme logic |
| `src/services/logic/__tests__/oneRepMaxLogic.test.ts` | Tests for 1RM logic |
| `src/services/logic/__tests__/warmupLogic.test.ts` | Tests for warmup logic |

### Modified
| File | Change |
|---|---|
| `src/db/repositories/ExerciseRepository.ts` | extends BaseRepository, validates add/put/update |
| `src/db/repositories/WorkoutPlanRepository.ts` | extends BaseRepository, validates addWorkout/addSession/addGroup/addItem/addSet |
| `src/db/repositories/SessionRepository.ts` | extends BaseRepository, validates createSession/addGroup/addItem/addSets/updateSet/updateSession |
| `src/db/repositories/OneRepMaxRepository.ts` | extends BaseRepository, validates add/put |
| `src/db/repositories/TemplateRepository.ts` | extends BaseRepository, validates add/update |
| `src/db/repositories/index.ts` | export BaseRepository |
| `src/lib/queryClient.ts` | staleTime: Infinity |
| `src/hooks/queries/workoutQueries.ts` | add `session` and `planSession` keys; keep as source of key constants |
| `src/hooks/queries/sessionQueries.ts` | remove migrated history hooks; keep active-session useLiveQuery hooks |
| `src/hooks/queries/analyticsQueries.ts` | replace useLiveQuery with useQuery |
| `src/hooks/queries/dashboardQueries.ts` | replace useLiveQuery with useQuery |
| `src/hooks/mutations/sessionMutations.ts` | add onSuccess cache invalidation |
| `src/hooks/mutations/workoutMutations.ts` | add onSuccess cache invalidation |
| `src/components/exercises/ExerciseForm.tsx` | use useExerciseMutations |
| `src/pages/ExerciseList.tsx` | import from exerciseQueries |
| `src/pages/WorkoutList.tsx` | import from workoutPlanQueries |
| `src/pages/WorkoutDetail.tsx` | import from workoutPlanQueries + workoutPlanMutations |
| `src/pages/HistoryList.tsx` | import from sessionHistoryQueries |
| `src/pages/HistoryDetail.tsx` | import from sessionHistoryQueries |
| `src/pages/OneRepMaxPage.tsx` | import from oneRepMaxQueries + oneRepMaxMutations |
| `src/services/warmupCalculator.ts` | delegate scheme logic to warmupLogic |
| `src/services/rpePercentageTable.ts` | re-export formulas from oneRepMaxLogic |

---

## Tasks

---

### Task 1: Zod Schemas for ALL Core Entities

**Files:**
- Create: `src/domain/__tests__/schemas.test.ts`
- Create: `src/domain/schemas.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/domain/__tests__/schemas.test.ts
import { describe, it, expect } from 'vitest';
import {
  ExerciseSchema, PlannedWorkoutSchema, PlannedSessionSchema,
  PlannedExerciseGroupSchema, PlannedExerciseItemSchema, PlannedSetSchema,
  WorkoutSessionSchema, SessionExerciseGroupSchema, SessionExerciseItemSchema,
  SessionSetSchema, OneRepMaxRecordSchema, SessionTemplateSchema,
} from '@/domain/schemas';
import {
  ExerciseType, Muscle, Equipment, MovementPattern, CounterType,
  ObjectiveType, WorkType, PlannedWorkoutStatus, PlannedSessionStatus,
  ExerciseGroupType, SetType, ToFailureIndicator, MuscleGroup,
} from '@/domain/enums';

const validExercise = {
  id: 'ex1', name: 'Bench Press', type: ExerciseType.Compound,
  primaryMuscles: [Muscle.Chest], secondaryMuscles: [],
  equipment: [Equipment.Barbell], movementPattern: MovementPattern.HorizontalPush,
  counterType: CounterType.Reps, defaultLoadUnit: 'kg' as const,
  variantIds: [], createdAt: new Date(), updatedAt: new Date(),
};

describe('ExerciseSchema', () => {
  it('parses a complete valid exercise', () => {
    const result = ExerciseSchema.parse(validExercise);
    expect(result.name).toBe('Bench Press');
  });

  it('applies empty-array defaults for optional array fields', () => {
    const { primaryMuscles: _pm, secondaryMuscles: _sm, equipment: _eq, variantIds: _vi, ...rest } = validExercise;
    const result = ExerciseSchema.parse(rest);
    expect(result.primaryMuscles).toEqual([]);
    expect(result.variantIds).toEqual([]);
  });

  it('throws on empty name', () => {
    expect(() => ExerciseSchema.parse({ ...validExercise, name: '' })).toThrow();
  });

  it('throws on invalid movementPattern', () => {
    expect(() => ExerciseSchema.parse({ ...validExercise, movementPattern: 'INVALID' })).toThrow();
  });
});

describe('PlannedWorkoutSchema', () => {
  it('parses a valid planned workout', () => {
    const result = PlannedWorkoutSchema.parse({
      id: 'w1', name: 'PPL', objectiveType: ObjectiveType.Hypertrophy,
      workType: WorkType.Accumulation, status: PlannedWorkoutStatus.Active,
      createdAt: new Date(), updatedAt: new Date(),
    });
    expect(result.name).toBe('PPL');
  });

  it('throws on empty name', () => {
    expect(() => PlannedWorkoutSchema.parse({
      id: 'w1', name: '', objectiveType: ObjectiveType.Hypertrophy,
      workType: WorkType.Accumulation, status: PlannedWorkoutStatus.Active,
      createdAt: new Date(), updatedAt: new Date(),
    })).toThrow();
  });
});

describe('PlannedSessionSchema', () => {
  it('parses a valid planned session', () => {
    const result = PlannedSessionSchema.parse({
      id: 's1', plannedWorkoutId: 'w1', name: 'Push Day', dayNumber: 1,
      focusMuscleGroups: [MuscleGroup.Chest], status: PlannedSessionStatus.Pending,
      orderIndex: '0|a', createdAt: new Date(), updatedAt: new Date(),
    });
    expect(result.name).toBe('Push Day');
  });
});

describe('PlannedExerciseGroupSchema', () => {
  it('parses a valid group', () => {
    const result = PlannedExerciseGroupSchema.parse({
      id: 'g1', plannedSessionId: 's1',
      groupType: ExerciseGroupType.Standard, orderIndex: '0|a',
    });
    expect(result.groupType).toBe(ExerciseGroupType.Standard);
  });
});

describe('PlannedExerciseItemSchema', () => {
  it('parses a valid item', () => {
    const result = PlannedExerciseItemSchema.parse({
      id: 'i1', plannedExerciseGroupId: 'g1', exerciseId: 'ex1',
      counterType: CounterType.Reps, orderIndex: '0|a',
    });
    expect(result.exerciseId).toBe('ex1');
  });
});

describe('PlannedSetSchema', () => {
  it('parses a valid set', () => {
    const result = PlannedSetSchema.parse({
      id: 'ps1', plannedExerciseItemId: 'i1',
      setCountRange: { min: 3, max: 4 },
      countRange: { min: 8, max: 12, toFailure: ToFailureIndicator.None },
      setType: SetType.Working, orderIndex: '0|a',
    });
    expect(result.setType).toBe(SetType.Working);
  });
});

describe('WorkoutSessionSchema', () => {
  it('parses minimal session', () => {
    const result = WorkoutSessionSchema.parse({ id: 'sess1', startedAt: new Date() });
    expect(result.id).toBe('sess1');
  });
});

describe('SessionExerciseGroupSchema', () => {
  it('parses a valid session group', () => {
    const result = SessionExerciseGroupSchema.parse({
      id: 'sg1', workoutSessionId: 'sess1',
      groupType: ExerciseGroupType.Standard, orderIndex: '0|a', isCompleted: false,
    });
    expect(result.isCompleted).toBe(false);
  });
});

describe('SessionExerciseItemSchema', () => {
  it('parses a valid session item', () => {
    const result = SessionExerciseItemSchema.parse({
      id: 'si1', sessionExerciseGroupId: 'sg1', exerciseId: 'ex1',
      orderIndex: '0|a', isCompleted: false,
    });
    expect(result.exerciseId).toBe('ex1');
  });
});

describe('SessionSetSchema', () => {
  it('parses a valid session set', () => {
    const result = SessionSetSchema.parse({
      id: 'set1', sessionExerciseItemId: 'si1', setType: SetType.Working,
      orderIndex: '0|a', actualLoad: 80, actualCount: 5, actualRPE: 8,
      actualToFailure: ToFailureIndicator.None, expectedRPE: 8,
      isCompleted: true, isSkipped: false, partials: false, forcedReps: 0,
    });
    expect(result.actualLoad).toBe(80);
  });

  it('allows null for load/count/rpe', () => {
    const result = SessionSetSchema.parse({
      id: 'set1', sessionExerciseItemId: 'si1', setType: SetType.Working,
      orderIndex: '0|a', actualLoad: null, actualCount: null, actualRPE: null,
      actualToFailure: ToFailureIndicator.None, expectedRPE: null,
      isCompleted: false, isSkipped: false, partials: false, forcedReps: 0,
    });
    expect(result.actualLoad).toBeNull();
  });
});

describe('OneRepMaxRecordSchema', () => {
  it('parses a valid record', () => {
    const result = OneRepMaxRecordSchema.parse({
      id: 'orm1', exerciseId: 'ex1', value: 120, unit: 'kg',
      method: 'direct', recordedAt: new Date(),
    });
    expect(result.value).toBe(120);
  });

  it('throws on non-positive value', () => {
    expect(() => OneRepMaxRecordSchema.parse({
      id: 'orm1', exerciseId: 'ex1', value: 0, unit: 'kg',
      method: 'direct', recordedAt: new Date(),
    })).toThrow();
  });
});

describe('SessionTemplateSchema', () => {
  it('parses a valid template', () => {
    const result = SessionTemplateSchema.parse({
      id: 't1', name: 'Push Template',
      content: { focusMuscleGroups: [], groups: [] },
      createdAt: new Date(), updatedAt: new Date(),
    });
    expect(result.name).toBe('Push Template');
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- src/domain/__tests__/schemas.test.ts
```

Expected: `FAIL — Cannot find module '@/domain/schemas'`

- [ ] **Step 3: Create `src/domain/schemas.ts`**

```typescript
// src/domain/schemas.ts
import { z } from 'zod';
import {
  ExerciseType, Muscle, Equipment, MovementPattern, CounterType, MuscleGroup,
  ObjectiveType, WorkType, PlannedWorkoutStatus, PlannedSessionStatus,
  ExerciseGroupType, SetType, ToFailureIndicator, ComplianceStatus,
  FatigueProgressionStatus,
} from './enums';

// ===== Shared Value Object Schemas =====

export const NumericRangeSchema = z.object({
  min: z.number(),
  max: z.number().nullable(),
  isFixed: z.boolean(),
});

export const RPERangeSchema = z.object({
  min: z.number().min(4).max(10),
  max: z.number().min(4).max(10),
});

export const LoadRangeSchema = z.object({
  min: z.number().nonnegative(),
  max: z.number().nonnegative().nullable(),
  unit: z.enum(['kg', 'lbs']),
});

export const CountRangeSchema = z.object({
  min: z.number().int().nonnegative(),
  max: z.number().int().nonnegative().nullable(),
  toFailure: z.nativeEnum(ToFailureIndicator),
});

export const SetCountRangeSchema = z.object({
  min: z.number().int().positive(),
  max: z.number().int().positive().optional(),
  stopCriteria: z.enum(['maxSets', 'rpeCeiling', 'velocityLoss', 'technicalBreakdown']).optional(),
});

const Percentage1RMRangeSchema = z.object({
  min: z.number().min(0).max(1),
  max: z.number().min(0).max(1),
  basedOnEstimated1RM: z.boolean(),
});

const FatigueProgressionProfileSchema = z.object({
  expectedRPEIncrementPerSet: z.number().positive(),
  tolerance: z.number().nonnegative(),
});

// Permissive schema for SetModifier — validates shape without full config typing
const SetModifierSchema = z.object({
  type: z.enum(['cluster', 'dropSet', 'myoRep', 'topSet', 'backOff']),
  config: z.record(z.unknown()),
});

const WarmupSetConfigurationSchema = z.object({
  id: z.string().optional(),
  counter: z.number().int().nonnegative().optional(),
  percentOfWorkSet: z.number().min(0).max(100),
  restSeconds: z.number().nonnegative(),
});

// ===== Exercise Domain =====

export const ExerciseVersionSchema = z.object({
  id: z.string().min(1),
  exerciseId: z.string().min(1),
  name: z.string().min(1),
  type: z.nativeEnum(ExerciseType),
  primaryMuscles: z.array(z.nativeEnum(Muscle)),
  secondaryMuscles: z.array(z.nativeEnum(Muscle)),
  equipment: z.array(z.nativeEnum(Equipment)),
  movementPattern: z.nativeEnum(MovementPattern),
  counterType: z.nativeEnum(CounterType),
  versionTimestamp: z.date(),
});

export const ExerciseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  type: z.nativeEnum(ExerciseType),
  primaryMuscles: z.array(z.nativeEnum(Muscle)).default([]),
  secondaryMuscles: z.array(z.nativeEnum(Muscle)).default([]),
  equipment: z.array(z.nativeEnum(Equipment)).default([]),
  movementPattern: z.nativeEnum(MovementPattern),
  counterType: z.nativeEnum(CounterType),
  defaultLoadUnit: z.enum(['kg', 'lbs']),
  notes: z.string().optional(),
  description: z.string().optional(),
  keyPoints: z.string().optional(),
  variantIds: z.array(z.string()).default([]),
  isArchived: z.boolean().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ===== Planning Domain =====

export const PlannedWorkoutSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  objectiveType: z.nativeEnum(ObjectiveType),
  workType: z.nativeEnum(WorkType),
  status: z.nativeEnum(PlannedWorkoutStatus),
  isArchived: z.boolean().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const PlannedSessionSchema = z.object({
  id: z.string().min(1),
  plannedWorkoutId: z.string().min(1),
  name: z.string().min(1),
  dayNumber: z.number().int().nonnegative(),
  focusMuscleGroups: z.array(z.nativeEnum(MuscleGroup)),
  status: z.nativeEnum(PlannedSessionStatus),
  notes: z.string().optional(),
  orderIndex: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const PlannedExerciseGroupSchema = z.object({
  id: z.string().min(1),
  plannedSessionId: z.string().min(1),
  groupType: z.nativeEnum(ExerciseGroupType),
  restBetweenRoundsSeconds: z.number().nonnegative().optional(),
  orderIndex: z.string().min(1),
  notes: z.string().optional(),
});

export const PlannedExerciseItemSchema = z.object({
  id: z.string().min(1),
  plannedExerciseGroupId: z.string().min(1),
  exerciseId: z.string().min(1),
  counterType: z.nativeEnum(CounterType),
  modifiers: z.array(SetModifierSchema).optional(),
  orderIndex: z.string().min(1),
  notes: z.string().optional(),
  warmupSets: z.array(WarmupSetConfigurationSchema).optional(),
  targetXRM: z.number().int().positive().optional(),
});

export const PlannedSetSchema = z.object({
  id: z.string().min(1),
  plannedExerciseItemId: z.string().min(1),
  setCountRange: SetCountRangeSchema,
  countRange: CountRangeSchema,
  loadRange: LoadRangeSchema.optional(),
  percentage1RMRange: Percentage1RMRangeSchema.optional(),
  rpeRange: RPERangeSchema.optional(),
  restSecondsRange: NumericRangeSchema.optional(),
  fatigueProgressionProfile: FatigueProgressionProfileSchema.optional(),
  setType: z.nativeEnum(SetType),
  tempo: z.string().optional(),
  notes: z.string().optional(),
  orderIndex: z.string().min(1),
});

// ===== Execution Domain =====

export const WorkoutSessionSchema = z.object({
  id: z.string().min(1),
  plannedSessionId: z.string().optional(),
  plannedWorkoutId: z.string().optional(),
  startedAt: z.date(),
  completedAt: z.date().optional(),
  notes: z.string().optional(),
  overallRPE: z.number().min(0).max(10).optional(),
  totalSets: z.number().int().nonnegative().optional(),
  totalLoad: z.number().nonnegative().optional(),
  totalReps: z.number().int().nonnegative().optional(),
  totalDuration: z.number().nonnegative().optional(),
  primaryMusclesSnapshot: z.array(z.nativeEnum(Muscle)).optional(),
  secondaryMusclesSnapshot: z.array(z.nativeEnum(Muscle)).optional(),
});

export const SessionExerciseGroupSchema = z.object({
  id: z.string().min(1),
  workoutSessionId: z.string().min(1),
  plannedExerciseGroupId: z.string().optional(),
  groupType: z.nativeEnum(ExerciseGroupType),
  orderIndex: z.string().min(1),
  isCompleted: z.boolean(),
  completedAt: z.date().optional(),
});

export const SessionExerciseItemSchema = z.object({
  id: z.string().min(1),
  sessionExerciseGroupId: z.string().min(1),
  plannedExerciseItemId: z.string().optional(),
  exerciseId: z.string().min(1),
  exerciseVersionId: z.string().optional(),
  orderIndex: z.string().min(1),
  isCompleted: z.boolean(),
  notes: z.string().optional(),
  originalExerciseId: z.string().optional(),
  completedAt: z.date().optional(),
  performanceStatus: z.enum(['improving', 'stable', 'stagnant', 'deteriorating', 'insufficient_data']).optional(),
  hasRangeConstraint: z.boolean().optional(),
});

export const SessionSetSchema = z.object({
  id: z.string().min(1),
  sessionExerciseItemId: z.string().min(1),
  plannedSetId: z.string().optional(),
  setType: z.nativeEnum(SetType),
  orderIndex: z.string().min(1),
  actualLoad: z.number().nullable(),
  actualCount: z.number().int().nullable(),
  actualRPE: z.number().nullable(),
  actualToFailure: z.nativeEnum(ToFailureIndicator),
  expectedRPE: z.number().nullable(),
  completedAt: z.date().optional(),
  isCompleted: z.boolean(),
  isSkipped: z.boolean(),
  complianceStatus: z.nativeEnum(ComplianceStatus).optional(),
  fatigueProgressionStatus: z.nativeEnum(FatigueProgressionStatus).optional(),
  plannedVsActual: z.object({
    countDeviation: z.number().optional(),
    loadDeviation: z.number().optional(),
    rpeDeviation: z.number().optional(),
  }).optional(),
  tempo: z.string().optional(),
  partials: z.boolean(),
  forcedReps: z.number().int().nonnegative(),
  restSecondsBefore: z.number().nonnegative().optional(),
  notes: z.string().optional(),
  e1rm: z.number().nonnegative().optional(),
  relativeIntensity: z.number().optional(),
});

// ===== OneRepMax Domain =====

export const OneRepMaxRecordSchema = z.object({
  id: z.string().min(1),
  exerciseId: z.string().min(1),
  exerciseVersionId: z.string().optional(),
  value: z.number().positive(),
  valueMin: z.number().positive().optional(),
  valueMax: z.number().positive().optional(),
  errorPercentage: z.number().nonnegative().optional(),
  unit: z.enum(['kg', 'lbs']),
  method: z.enum(['direct', 'indirect']),
  testedLoad: z.number().positive().optional(),
  testedReps: z.number().int().positive().optional(),
  estimateBrzycki: z.number().positive().optional(),
  estimateEpley: z.number().positive().optional(),
  estimateLander: z.number().positive().optional(),
  estimateOConner: z.number().positive().optional(),
  estimateLombardi: z.number().positive().optional(),
  recordedAt: z.date(),
  notes: z.string().optional(),
});

// ===== Template Domain =====

const TemplateSetSchema = z.object({
  setCountRange: SetCountRangeSchema,
  countRange: CountRangeSchema,
  loadRange: LoadRangeSchema.optional(),
  percentage1RMRange: Percentage1RMRangeSchema.optional(),
  rpeRange: RPERangeSchema.optional(),
  restSecondsRange: NumericRangeSchema.optional(),
  setType: z.nativeEnum(SetType),
  tempo: z.string().optional(),
  notes: z.string().optional(),
  orderIndex: z.string().min(1),
});

const TemplateItemSchema = z.object({
  exerciseId: z.string().min(1),
  counterType: z.nativeEnum(CounterType),
  modifiers: z.array(SetModifierSchema).optional(),
  orderIndex: z.string().min(1),
  notes: z.string().optional(),
  sets: z.array(TemplateSetSchema),
});

const TemplateGroupSchema = z.object({
  groupType: z.nativeEnum(ExerciseGroupType),
  restBetweenRoundsSeconds: z.number().nonnegative().optional(),
  orderIndex: z.string().min(1),
  notes: z.string().optional(),
  items: z.array(TemplateItemSchema),
});

const SessionTemplateContentSchema = z.object({
  focusMuscleGroups: z.array(z.nativeEnum(MuscleGroup)),
  notes: z.string().optional(),
  groups: z.array(TemplateGroupSchema),
});

export const SessionTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  content: SessionTemplateContentSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- src/domain/__tests__/schemas.test.ts
```

Expected: `PASS — all tests`

- [ ] **Step 5: Commit**

```bash
git add src/domain/schemas.ts src/domain/__tests__/schemas.test.ts
git commit -m "feat: Zod schemas for all domain entities"
```

---

### Task 2: BaseRepository with Static Validation Helper

**Files:**
- Create: `src/db/repositories/BaseRepository.ts`
- Modify: `src/db/repositories/index.ts`

- [ ] **Step 1: Create `src/db/repositories/BaseRepository.ts`**

```typescript
// src/db/repositories/BaseRepository.ts
import { ZodError, type ZodType } from 'zod';

/**
 * Base class for all Dexie repositories.
 * Call `this.validateData(Schema, data)` before any write operation.
 */
export class BaseRepository {
  protected static validateData<T>(schema: ZodType<T>, data: unknown): T {
    try {
      return schema.parse(data);
    } catch (err) {
      if (err instanceof ZodError) {
        const fields = err.errors
          .map(e => `${e.path.join('.') || 'root'}: ${e.message}`)
          .join('; ');
        throw new Error(`Repository validation failed — ${fields}`);
      }
      throw err;
    }
  }
}
```

- [ ] **Step 2: Add export to `src/db/repositories/index.ts`**

Replace the file contents:

```typescript
export * from './BaseRepository';
export * from './types';
export * from './ExerciseRepository';
export * from './UserProfileRepository';
export * from './WorkoutPlanRepository';
export * from './SessionRepository';
export * from './OneRepMaxRepository';
export * from './TemplateRepository';
```

- [ ] **Step 3: Commit**

```bash
git add src/db/repositories/BaseRepository.ts src/db/repositories/index.ts
git commit -m "feat: add BaseRepository with static validateData helper"
```

---

### Task 3: ExerciseRepository — Validation on Every Write

**Files:**
- Modify: `src/db/repositories/ExerciseRepository.ts`
- Modify: `src/db/repositories/__tests__/ExerciseRepository.test.ts`

- [ ] **Step 1: Add two failing validation tests**

Open `src/db/repositories/__tests__/ExerciseRepository.test.ts` and add inside the existing `describe` block:

```typescript
it('rejects add() when name is empty string', async () => {
  const ex = { ...createExercise('Test'), name: '' };
  await expect(ExerciseRepository.add(ex)).rejects.toThrow('Repository validation failed');
});

it('rejects update() when name is set to empty string', async () => {
  const ex = createExercise('Squat');
  await ExerciseRepository.add(ex);
  await expect(
    ExerciseRepository.update(ex.id, { name: '' })
  ).rejects.toThrow('Repository validation failed');
});
```

- [ ] **Step 2: Run to confirm new tests fail**

```bash
npm test -- src/db/repositories/__tests__/ExerciseRepository.test.ts
```

Expected: 2 new tests `FAIL`, all existing pass.

- [ ] **Step 3: Refactor `ExerciseRepository.ts`**

Replace the entire file with:

```typescript
/**
 * Repository for Exercise-related operations.
 * Owns tables: exercises, exerciseVersions
 * All write operations validate via ExerciseSchema / ExerciseVersionSchema.
 */
import { nanoid } from 'nanoid';

import type { Exercise, ExerciseVersion } from '@/domain/entities';
import { ExerciseSchema, ExerciseVersionSchema } from '@/domain/schemas';

import { db } from '../database';
import { BaseRepository } from './BaseRepository';
import type { ExerciseFilters } from './types';

export class ExerciseRepository extends BaseRepository {
  static async getById(id: string): Promise<Exercise | undefined> {
    return db.exercises.get(id);
  }

  static async getLatestVersion(exerciseId: string): Promise<ExerciseVersion | undefined> {
    const versions = await db.exerciseVersions
      .where('exerciseId').equals(exerciseId)
      .sortBy('versionTimestamp');
    return versions[versions.length - 1];
  }

  static async getVersion(versionId: string): Promise<ExerciseVersion | undefined> {
    return db.exerciseVersions.get(versionId);
  }

  static async getByIds(ids: string[]): Promise<Exercise[]> {
    const exercises = await db.exercises.bulkGet(ids);
    return exercises.filter((e): e is Exercise => !!e);
  }

  static async getAll(): Promise<Exercise[]> {
    return db.exercises.filter(e => !e.isArchived).toArray();
  }

  static async count(): Promise<number> {
    return db.exercises.filter(e => !e.isArchived).count();
  }

  static async add(exercise: Exercise): Promise<string> {
    this.validateData(ExerciseSchema, exercise);
    const now = new Date();
    await db.transaction('rw', [db.exercises, db.exerciseVersions], async () => {
      await db.exercises.add(exercise);
      const version: ExerciseVersion = {
        id: nanoid(),
        exerciseId: exercise.id,
        name: exercise.name,
        type: exercise.type,
        primaryMuscles: exercise.primaryMuscles || [],
        secondaryMuscles: exercise.secondaryMuscles || [],
        equipment: exercise.equipment || [],
        movementPattern: exercise.movementPattern,
        counterType: exercise.counterType,
        versionTimestamp: now,
      };
      this.validateData(ExerciseVersionSchema, version);
      await db.exerciseVersions.add(version);
    });
    return exercise.id;
  }

  static async put(exerciseData: Omit<Exercise, 'createdAt' | 'updatedAt'> & { id?: string }): Promise<string> {
    if (!exerciseData.id) {
      return this.add(exerciseData as Omit<Exercise, 'createdAt' | 'updatedAt'> & { id: string });
    }
    await this.update(exerciseData.id, exerciseData);
    return exerciseData.id;
  }

  static async update(id: string, changes: Partial<Exercise>): Promise<number> {
    this.validateData(ExerciseSchema.partial(), changes);
    return await db.transaction('rw', [db.exercises, db.exerciseVersions], async () => {
      const current = await db.exercises.get(id);
      if (!current) return 0;
      const latestVersion = await this.getLatestVersion(id);
      const needsNewVersion = latestVersion && (
        (changes.name !== undefined && changes.name !== latestVersion.name) ||
        (changes.type !== undefined && changes.type !== latestVersion.type) ||
        (changes.movementPattern !== undefined && changes.movementPattern !== latestVersion.movementPattern) ||
        (changes.counterType !== undefined && changes.counterType !== latestVersion.counterType) ||
        (changes.primaryMuscles !== undefined && JSON.stringify(changes.primaryMuscles) !== JSON.stringify(latestVersion.primaryMuscles)) ||
        (changes.secondaryMuscles !== undefined && JSON.stringify(changes.secondaryMuscles) !== JSON.stringify(latestVersion.secondaryMuscles)) ||
        (changes.equipment !== undefined && JSON.stringify(changes.equipment) !== JSON.stringify(latestVersion.equipment))
      );
      if (needsNewVersion) {
        const newVersion: ExerciseVersion = {
          id: nanoid(),
          exerciseId: id,
          name: changes.name ?? current.name,
          type: changes.type ?? current.type,
          primaryMuscles: changes.primaryMuscles ?? current.primaryMuscles,
          secondaryMuscles: changes.secondaryMuscles ?? current.secondaryMuscles,
          equipment: changes.equipment ?? current.equipment,
          movementPattern: changes.movementPattern ?? current.movementPattern,
          counterType: changes.counterType ?? current.counterType,
          versionTimestamp: new Date(),
        };
        this.validateData(ExerciseVersionSchema, newVersion);
        await db.exerciseVersions.add(newVersion);
      }
      return await db.exercises.update(id, changes);
    });
  }

  static async delete(id: string): Promise<void> {
    await db.transaction('rw', [db.exercises, db.exerciseVersions], async () => {
      await db.exerciseVersions.where('exerciseId').equals(id).delete();
      await db.exercises.delete(id);
    });
  }

  static async countUsage(id: string): Promise<number> {
    const sessionItemsCount = await db.sessionExerciseItems.where('exerciseId').equals(id).count();
    const plannedItemsCount = await db.plannedExerciseItems.where('exerciseId').equals(id).count();
    const oneRepMaxCount = await db.oneRepMaxRecords.where('exerciseId').equals(id).count();
    let templatesCount = 0;
    const templates = await db.sessionTemplates.toArray();
    for (const template of templates) {
      if (template.content.groups.some(g => g.items.some(i => i.exerciseId === id))) {
        templatesCount++;
      }
    }
    return sessionItemsCount + plannedItemsCount + oneRepMaxCount + templatesCount;
  }

  static async archive(id: string): Promise<number> {
    return db.exercises.update(id, { isArchived: true });
  }

  static async smartDelete(id: string): Promise<void> {
    const usageCount = await this.countUsage(id);
    if (usageCount > 0) {
      await this.archive(id);
    } else {
      await this.delete(id);
    }
  }

  static async bulkGet(ids: string[]): Promise<(Exercise | undefined)[]> {
    return db.exercises.bulkGet(ids);
  }

  static async findByName(name: string): Promise<Exercise | undefined> {
    return db.exercises.where('name').equals(name).filter(e => !e.isArchived).first();
  }

  static async search(query: string): Promise<Exercise[]> {
    const normalizedQuery = query.toLowerCase();
    return db.exercises
      .filter(e => !e.isArchived && e.name.toLowerCase().includes(normalizedQuery))
      .toArray();
  }

  static async getExercisesByCriteria(filters: ExerciseFilters): Promise<Exercise[]> {
    const excludeArchived = filters.isArchived !== true;
    const searchLower = filters.search?.toLowerCase();
    const matchesFilters = (e: Exercise): boolean => {
      if (excludeArchived && e.isArchived) return false;
      if (filters.equipment?.length) {
        const eqArray = Array.isArray(e.equipment) ? e.equipment : [e.equipment];
        if (!filters.equipment.some(eq => eqArray.includes(eq))) return false;
      }
      if (filters.movementPattern?.length && !filters.movementPattern.includes(e.movementPattern)) return false;
      if (searchLower && !e.name.toLowerCase().includes(searchLower)) return false;
      return true;
    };
    if (filters.muscleGroups?.length) {
      const results = await db.exercises
        .where('primaryMuscles').anyOf(filters.muscleGroups)
        .filter(matchesFilters).toArray();
      const seen = new Set<string>();
      return results.filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; });
    }
    return db.exercises.filter(matchesFilters).toArray();
  }
}
```

- [ ] **Step 4: Run all ExerciseRepository tests**

```bash
npm test -- src/db/repositories/__tests__/ExerciseRepository.test.ts
```

Expected: `PASS — all 7 tests`

- [ ] **Step 5: Commit**

```bash
git add src/db/repositories/ExerciseRepository.ts src/db/repositories/__tests__/ExerciseRepository.test.ts
git commit -m "feat: ExerciseRepository extends BaseRepository, validates writes"
```

---

### Task 4: WorkoutPlanRepository — Validation on Writes

**Files:**
- Modify: `src/db/repositories/WorkoutPlanRepository.ts`
- Modify: `src/db/repositories/__tests__/WorkoutPlanRepository.test.ts`

- [ ] **Step 1: Add failing validation tests**

Add at the end of the existing `describe` block in `WorkoutPlanRepository.test.ts`:

```typescript
it('rejects addWorkout() when name is empty', async () => {
  const workout = { ...createWorkout(), name: '' };
  await expect(WorkoutPlanRepository.addWorkout(workout)).rejects.toThrow('Repository validation failed');
});

it('rejects addSession() when name is empty', async () => {
  const workout = createWorkout();
  await WorkoutPlanRepository.addWorkout(workout);
  const session: PlannedSession = {
    id: nanoid(), plannedWorkoutId: workout.id, name: '',
    dayNumber: 1, focusMuscleGroups: [], status: PlannedSessionStatus.Pending,
    orderIndex: generateTestRank(0), createdAt: new Date(), updatedAt: new Date(),
  };
  await expect(WorkoutPlanRepository.addSession(session)).rejects.toThrow('Repository validation failed');
});
```

- [ ] **Step 2: Run to confirm they fail**

```bash
npm test -- src/db/repositories/__tests__/WorkoutPlanRepository.test.ts
```

Expected: 2 new tests `FAIL`.

- [ ] **Step 3: Update `WorkoutPlanRepository.ts` — add extends + validation**

Add these imports at the top of the file:

```typescript
import {
  PlannedWorkoutSchema, PlannedSessionSchema, PlannedExerciseGroupSchema,
  PlannedExerciseItemSchema, PlannedSetSchema,
} from '@/domain/schemas';
import { BaseRepository } from './BaseRepository';
```

Change the class declaration:

```typescript
export class WorkoutPlanRepository extends BaseRepository {
```

Then add `this.validateData(...)` calls before each DB write. The five write methods to update:

```typescript
static async addWorkout(workout: PlannedWorkout): Promise<string> {
  this.validateData(PlannedWorkoutSchema, workout);
  return db.plannedWorkouts.add(workout);
}

static async updateWorkout(id: string, changes: Partial<PlannedWorkout>): Promise<number> {
  this.validateData(PlannedWorkoutSchema.partial(), changes);
  return db.plannedWorkouts.update(id, changes);
}

static async addSession(session: PlannedSession): Promise<string> {
  this.validateData(PlannedSessionSchema, session);
  return db.plannedSessions.add(session);
}

static async addGroup(group: PlannedExerciseGroup): Promise<string> {
  this.validateData(PlannedExerciseGroupSchema, group);
  return db.plannedExerciseGroups.add(group);
}

static async addItem(item: PlannedExerciseItem): Promise<string> {
  this.validateData(PlannedExerciseItemSchema, item);
  return db.plannedExerciseItems.add(item);
}

static async addSet(set: PlannedSet): Promise<string> {
  this.validateData(PlannedSetSchema, set);
  return db.plannedSets.add(set);
}
```

- [ ] **Step 4: Run all WorkoutPlanRepository tests**

```bash
npm test -- src/db/repositories/__tests__/WorkoutPlanRepository.test.ts
```

Expected: `PASS — all tests`

- [ ] **Step 5: Commit**

```bash
git add src/db/repositories/WorkoutPlanRepository.ts src/db/repositories/__tests__/WorkoutPlanRepository.test.ts
git commit -m "feat: WorkoutPlanRepository extends BaseRepository, validates writes"
```

---

### Task 5: SessionRepository — Validation on Writes

**Files:**
- Modify: `src/db/repositories/SessionRepository.ts`
- Modify: `src/db/repositories/__tests__/SessionRepository.test.ts`

- [ ] **Step 1: Add failing validation tests**

Add at the end of the existing `describe` block in `SessionRepository.test.ts`:

```typescript
it('rejects createSession() when id is empty', async () => {
  const session = { ...createSession(), id: '' };
  await expect(SessionRepository.createSession(session)).rejects.toThrow('Repository validation failed');
});

it('rejects updateSet() when forcedReps is negative', async () => {
  // updateSet with invalid partial data
  await expect(
    SessionRepository.updateSet('any-id', { forcedReps: -1 })
  ).rejects.toThrow('Repository validation failed');
});
```

- [ ] **Step 2: Run to confirm they fail**

```bash
npm test -- src/db/repositories/__tests__/SessionRepository.test.ts
```

Expected: 2 new tests `FAIL`.

- [ ] **Step 3: Update `SessionRepository.ts` — add extends + validation**

Add imports at the top:

```typescript
import {
  WorkoutSessionSchema, SessionExerciseGroupSchema,
  SessionExerciseItemSchema, SessionSetSchema,
} from '@/domain/schemas';
import { BaseRepository } from './BaseRepository';
```

Change class declaration:

```typescript
export class SessionRepository extends BaseRepository {
```

Add validation to write methods:

```typescript
static async createSession(session: WorkoutSession): Promise<string> {
  this.validateData(WorkoutSessionSchema, session);
  return db.workoutSessions.add(session);
}

static async updateSession(id: string, changes: Partial<WorkoutSession>): Promise<number> {
  this.validateData(WorkoutSessionSchema.partial(), changes);
  return db.workoutSessions.update(id, changes);
}

static async addGroup(group: SessionExerciseGroup): Promise<string> {
  this.validateData(SessionExerciseGroupSchema, group);
  return db.sessionExerciseGroups.add(group);
}

static async addItem(item: SessionExerciseItem): Promise<string> {
  this.validateData(SessionExerciseItemSchema, item);
  return db.sessionExerciseItems.add(item);
}

static async addSets(sets: SessionSet[]): Promise<string> {
  sets.forEach(set => this.validateData(SessionSetSchema, set));
  return db.sessionSets.bulkAdd(sets);
}

static async updateSet(id: string, changes: Partial<SessionSet>): Promise<number> {
  this.validateData(SessionSetSchema.partial(), changes);
  return db.sessionSets.update(id, changes);
}
```

- [ ] **Step 4: Run all SessionRepository tests**

```bash
npm test -- src/db/repositories/__tests__/SessionRepository.test.ts
```

Expected: `PASS — all tests`

- [ ] **Step 5: Commit**

```bash
git add src/db/repositories/SessionRepository.ts src/db/repositories/__tests__/SessionRepository.test.ts
git commit -m "feat: SessionRepository extends BaseRepository, validates writes"
```

---

### Task 6: OneRepMaxRepository + TemplateRepository — Validation

**Files:**
- Modify: `src/db/repositories/OneRepMaxRepository.ts`
- Modify: `src/db/repositories/TemplateRepository.ts`

No separate test files exist for these repositories. The test coverage comes from the integration tests written in Tasks 17 and 19.

- [ ] **Step 1: Update `OneRepMaxRepository.ts`**

Add imports at the top:

```typescript
import { OneRepMaxRecordSchema } from '@/domain/schemas';
import { BaseRepository } from './BaseRepository';
```

Change class declaration and update write methods:

```typescript
export class OneRepMaxRepository extends BaseRepository {
  // ... all existing read methods unchanged ...

  static async add(record: OneRepMaxRecord): Promise<string> {
    this.validateData(OneRepMaxRecordSchema, record);
    return db.oneRepMaxRecords.add(record);
  }

  static async put(record: OneRepMaxRecord): Promise<string> {
    this.validateData(OneRepMaxRecordSchema, record);
    return db.oneRepMaxRecords.put(record);
  }

  static async delete(id: string): Promise<void> {
    await db.oneRepMaxRecords.delete(id);
  }
}
```

- [ ] **Step 2: Update `TemplateRepository.ts`**

Add imports at the top:

```typescript
import { SessionTemplateSchema } from '@/domain/schemas';
import { BaseRepository } from './BaseRepository';
```

Change class declaration and update write methods:

```typescript
export class TemplateRepository extends BaseRepository {
  // ... all existing read methods unchanged ...

  static async add(template: SessionTemplate): Promise<string> {
    this.validateData(SessionTemplateSchema, template);
    return db.sessionTemplates.add(template);
  }

  static async update(id: string, changes: Partial<SessionTemplate>): Promise<number> {
    this.validateData(SessionTemplateSchema.partial(), changes);
    return db.sessionTemplates.update(id, changes);
  }

  static async delete(id: string): Promise<void> {
    await db.sessionTemplates.delete(id);
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/db/repositories/OneRepMaxRepository.ts src/db/repositories/TemplateRepository.ts
git commit -m "feat: OneRepMaxRepository and TemplateRepository extend BaseRepository, validate writes"
```

---

### Task 7: QueryClient — staleTime Infinity

**Files:**
- Modify: `src/lib/queryClient.ts`

- [ ] **Step 1: Replace `src/lib/queryClient.ts`**

```typescript
import { QueryClient } from '@tanstack/react-query';

/**
 * Offline-first QueryClient.
 *
 * staleTime: Infinity — IndexedDB data is always fresh. Never auto-refetches.
 * Cache is invalidated exclusively by mutations via invalidateQueries().
 *
 * gcTime: 30 min — keep unused query results across page navigation.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: 30 * 60 * 1000,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/queryClient.ts
git commit -m "perf: staleTime=Infinity for offline-first cache — no auto-refetch"
```

---

### Task 8: Exercise Domain — Query + Mutation Hooks + Page Updates

**Files:**
- Create: `src/hooks/queries/exerciseQueries.ts`
- Create: `src/hooks/mutations/exerciseMutations.ts`
- Modify: `src/components/exercises/ExerciseForm.tsx`
- Modify: `src/pages/ExerciseList.tsx`

- [ ] **Step 1: Create `src/hooks/queries/exerciseQueries.ts`**

```typescript
// src/hooks/queries/exerciseQueries.ts
import { useQuery } from '@tanstack/react-query';

import {
  getAllExercises, getEnhancedExerciseCatalog, type ExerciseCatalogOptions,
} from '@/services/exerciseService';

import { exerciseKeys } from './workoutQueries';

export { exerciseKeys } from './workoutQueries';

export function useExerciseList() {
  return useQuery({
    queryKey: exerciseKeys.list(),
    queryFn: getAllExercises,
    staleTime: Infinity,
  });
}

export function useEnhancedExerciseCatalog(options?: ExerciseCatalogOptions) {
  return useQuery({
    queryKey: exerciseKeys.catalog(options),
    queryFn: () => getEnhancedExerciseCatalog(options),
    staleTime: Infinity,
  });
}
```

- [ ] **Step 2: Create `src/hooks/mutations/exerciseMutations.ts`**

```typescript
// src/hooks/mutations/exerciseMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Exercise } from '@/domain/entities';
import { exerciseKeys } from '@/hooks/queries/exerciseQueries';
import { upsertExercise, deleteExercise } from '@/services/exerciseService';

export function useExerciseMutations() {
  const queryClient = useQueryClient();

  const saveExerciseMutation = useMutation({
    mutationFn: (exercise: Exercise) => upsertExercise(exercise),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: exerciseKeys.all });
    },
  });

  const deleteExerciseMutation = useMutation({
    mutationFn: (id: string) => deleteExercise(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: exerciseKeys.all });
    },
  });

  return {
    saveExercise: saveExerciseMutation.mutateAsync,
    deleteExercise: deleteExerciseMutation.mutateAsync,
    isSaving: saveExerciseMutation.isPending,
    isDeleting: deleteExerciseMutation.isPending,
  };
}
```

- [ ] **Step 3: Update `ExerciseForm.tsx` — replace useWorkoutMutations**

In `src/components/exercises/ExerciseForm.tsx`:

Remove:
```typescript
import { useWorkoutMutations } from '@/hooks/mutations/workoutMutations';
```

Add:
```typescript
import { useExerciseMutations } from '@/hooks/mutations/exerciseMutations';
```

Change (inside the `ExerciseForm` function body):
```typescript
// Before:
const mutations = useWorkoutMutations();
// After:
const mutations = useExerciseMutations();
```

- [ ] **Step 4: Update `ExerciseList.tsx` — single import swap**

In `src/pages/ExerciseList.tsx`, change:
```typescript
// Before:
import { useExerciseList } from '@/hooks/queries/workoutQueries';
// After:
import { useExerciseList } from '@/hooks/queries/exerciseQueries';
```

- [ ] **Step 5: Verify TypeScript compiles and full test suite passes**

```bash
npx tsc --noEmit && npm test
```

Expected: No type errors, all tests pass.

- [ ] **Step 6: Manual smoke test**

```bash
npm run dev
```

Navigate to Exercises page. Create an exercise — it should appear without refresh. Edit it — name updates immediately. Delete it — it disappears immediately.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/queries/exerciseQueries.ts src/hooks/mutations/exerciseMutations.ts src/components/exercises/ExerciseForm.tsx src/pages/ExerciseList.tsx
git commit -m "feat: exercise domain — useQuery hooks + invalidating mutations, remove useLiveQuery"
```

---

### Task 9: Add Query Keys for WorkoutPlan + Extend workoutQueries.ts

**Files:**
- Modify: `src/hooks/queries/workoutQueries.ts`

The existing `workoutKeys` needs a `session` key for planned session detail queries. We add it here so all downstream query files can import from one place.

- [ ] **Step 1: Add `session` and `planSession` keys to `workoutKeys`**

In `src/hooks/queries/workoutQueries.ts`, replace the `workoutKeys` declaration:

```typescript
export const workoutKeys = {
  all: ['workouts'] as const,
  list: () => [...workoutKeys.all, 'list'] as const,
  detail: (id: string) => [...workoutKeys.all, 'detail', id] as const,
  session: (id: string) => [...workoutKeys.all, 'session', id] as const,
  insights: (id: string) => [...workoutKeys.all, 'insights', id] as const,
};
```

Also update `sessionVolumeKeys` to use a cleaner naming:

```typescript
export const sessionVolumeKeys = {
  all: ['sessionVolume'] as const,
  detail: (sessionId: string) => [...sessionVolumeKeys.all, sessionId] as const,
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/queries/workoutQueries.ts
git commit -m "chore: add session key to workoutKeys for planned session detail queries"
```

---

### Task 10: WorkoutPlan Domain — Query Hooks

**Files:**
- Create: `src/hooks/queries/workoutPlanQueries.ts`

- [ ] **Step 1: Create `src/hooks/queries/workoutPlanQueries.ts`**

```typescript
// src/hooks/queries/workoutPlanQueries.ts
import { useQuery } from '@tanstack/react-query';

import { getAllTemplates, getTemplateDetail } from '@/services/templateService';
import { getSessionVolumeAndDuration } from '@/services/volumeAnalyzer';
import { getWorkoutListData, getPlannedSessionDetail, getWorkoutDetail, getRoutineInsights } from '@/services/workoutService';

import { workoutKeys, templateKeys, sessionVolumeKeys } from './workoutQueries';

export { workoutKeys, templateKeys, sessionVolumeKeys } from './workoutQueries';

export function useWorkoutList() {
  return useQuery({
    queryKey: workoutKeys.list(),
    queryFn: getWorkoutListData,
    staleTime: Infinity,
  });
}

export function useWorkoutDetail(id?: string) {
  return useQuery({
    queryKey: workoutKeys.detail(id ?? ''),
    queryFn: () => getWorkoutDetail(id!),
    enabled: !!id,
    staleTime: Infinity,
  });
}

export function usePlannedSessionDetail(sessionId?: string) {
  return useQuery({
    queryKey: workoutKeys.session(sessionId ?? ''),
    queryFn: () => getPlannedSessionDetail(sessionId!),
    enabled: !!sessionId,
    staleTime: Infinity,
  });
}

export function useSessionTemplates() {
  return useQuery({
    queryKey: templateKeys.list(),
    queryFn: async () => {
      const templates = await getAllTemplates();
      return templates.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    },
    staleTime: Infinity,
  });
}

export function useTemplateDetail(templateId?: string) {
  return useQuery({
    queryKey: templateKeys.detail(templateId ?? ''),
    queryFn: () => getTemplateDetail(templateId!),
    enabled: !!templateId,
    staleTime: Infinity,
  });
}

export function useSessionVolume(sessionId: string | null | undefined) {
  return useQuery({
    queryKey: sessionVolumeKeys.detail(sessionId ?? ''),
    queryFn: () => getSessionVolumeAndDuration(sessionId!),
    enabled: !!sessionId,
    staleTime: Infinity,
  });
}

export function useRoutineInsights(workoutId?: string) {
  return useQuery({
    queryKey: workoutKeys.insights(workoutId ?? ''),
    queryFn: () => getRoutineInsights(workoutId!),
    enabled: !!workoutId,
    staleTime: Infinity,
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/queries/workoutPlanQueries.ts
git commit -m "feat: workoutPlanQueries.ts — useWorkoutList/Detail/Session via TanStack useQuery"
```

---

### Task 11: WorkoutPlan Domain — Mutation Hooks with Cache Invalidation

**Files:**
- Create: `src/hooks/mutations/workoutPlanMutations.ts`

- [ ] **Step 1: Create `src/hooks/mutations/workoutPlanMutations.ts`**

```typescript
// src/hooks/mutations/workoutPlanMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { PlannedWorkout } from '@/domain/entities';
import { ObjectiveType, WorkType, PlannedWorkoutStatus } from '@/domain/enums';
import { workoutKeys, templateKeys } from '@/hooks/queries/workoutPlanQueries';
import { dashboardKeys } from '@/hooks/queries/dashboardQueries';
import { deleteTemplate, updateTemplate } from '@/services/templateService';
import {
  activateWorkout, deactivateWorkout, archiveWorkout, restoreWorkout,
  removeWorkout, updateWorkout, createWorkout, saveWorkoutSessions,
} from '@/services/workoutService';

export function useWorkoutPlanMutations() {
  const queryClient = useQueryClient();

  const invalidateWorkouts = () => {
    queryClient.invalidateQueries({ queryKey: workoutKeys.all });
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
  };

  const activateMutation = useMutation({
    mutationFn: (id: string) => activateWorkout(id),
    onSuccess: invalidateWorkouts,
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => deactivateWorkout(id),
    onSuccess: invalidateWorkouts,
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => archiveWorkout(id),
    onSuccess: invalidateWorkouts,
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => restoreWorkout(id),
    onSuccess: invalidateWorkouts,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeWorkout(id),
    onSuccess: invalidateWorkouts,
  });

  const updateWorkoutMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<PlannedWorkout> }) =>
      updateWorkout(id, updates),
    onSuccess: invalidateWorkouts,
  });

  const createWorkoutMutation = useMutation({
    mutationFn: (params: {
      name: string;
      description?: string;
      objectiveType: ObjectiveType;
      workType: WorkType;
      status: PlannedWorkoutStatus;
    }) => createWorkout(params),
    onSuccess: invalidateWorkouts,
  });

  const saveWorkoutSessionsMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: ({ workoutId, sessions, originalSessions }: { workoutId: string; sessions: any[]; originalSessions: any[] }) =>
      saveWorkoutSessions(workoutId, sessions, originalSessions),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workoutKeys.all }),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: templateKeys.all }),
  });

  const updateTemplateMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: ({ id, name, description, content }: { id: string; name: string; description?: string; content: any }) =>
      updateTemplate(id, { name, description, content }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: templateKeys.all }),
  });

  return {
    activate: activateMutation.mutateAsync,
    deactivate: deactivateMutation.mutateAsync,
    archive: archiveMutation.mutateAsync,
    restore: restoreMutation.mutateAsync,
    remove: removeMutation.mutateAsync,
    updateWorkout: updateWorkoutMutation.mutateAsync,
    createWorkout: createWorkoutMutation.mutateAsync,
    saveWorkoutSessions: saveWorkoutSessionsMutation.mutateAsync,
    deleteTemplate: deleteTemplateMutation.mutateAsync,
    updateTemplate: updateTemplateMutation.mutateAsync,
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/mutations/workoutPlanMutations.ts
git commit -m "feat: workoutPlanMutations.ts — all workout mutations with onSuccess invalidation"
```

---

### Task 12: WorkoutPlan Domain — Update Pages

**Files:**
- Modify: `src/pages/WorkoutList.tsx`
- Modify: `src/pages/WorkoutDetail.tsx`

- [ ] **Step 1: Update `WorkoutList.tsx`**

Find the import of `useWorkoutList` and replace it:

```typescript
// Before:
import { useWorkoutList } from '@/hooks/queries/workoutQueries';
// After:
import { useWorkoutList } from '@/hooks/queries/workoutPlanQueries';
```

If `WorkoutList.tsx` calls any workout mutations, also replace:
```typescript
// Before:
import { useWorkoutMutations } from '@/hooks/mutations/workoutMutations';
// After:
import { useWorkoutPlanMutations } from '@/hooks/mutations/workoutPlanMutations';
// And update the hook call:
const mutations = useWorkoutPlanMutations();
```

- [ ] **Step 2: Update `WorkoutDetail.tsx`**

Replace:
```typescript
// Before:
import { useWorkoutDetail, useSessionDetail, useRoutineInsights } from '@/hooks/queries/workoutQueries';
// After:
import { useWorkoutDetail, usePlannedSessionDetail, useRoutineInsights } from '@/hooks/queries/workoutPlanQueries';
```

Update any calls from `useSessionDetail(id)` to `usePlannedSessionDetail(id)`.

Replace workout mutation imports similarly to Step 1.

- [ ] **Step 3: Verify TypeScript compiles and full test suite passes**

```bash
npx tsc --noEmit && npm test
```

- [ ] **Step 4: Manual smoke test**

```bash
npm run dev
```

Navigate to WorkoutList. Create a new workout — it should appear without refresh. Open a workout detail. Update its name — it should update immediately.

- [ ] **Step 5: Commit**

```bash
git add src/pages/WorkoutList.tsx src/pages/WorkoutDetail.tsx
git commit -m "refactor: WorkoutList and WorkoutDetail use workoutPlanQueries/Mutations"
```

---

### Task 13: Session History Domain — Query Hooks

> **Key architectural decision:** `useActiveSessionData`, `useLoadSuggestions`, `useExerciseHistory`, and `usePerformanceTrend` in `sessionQueries.ts` **retain `useLiveQuery`**. These hooks are used during live workout logging where Dexie's reactive subscriptions provide necessary sub-second reactivity that TanStack Query polling cannot match. Only the history/analytics hooks (non-realtime) migrate to `useQuery`.

**Files:**
- Create: `src/hooks/queries/sessionHistoryQueries.ts`
- Modify: `src/hooks/queries/sessionQueries.ts`

- [ ] **Step 1: Add pagination keys to `sessionKeys`**

In `src/hooks/queries/sessionQueries.ts`, update `sessionKeys`:

```typescript
export const sessionKeys = {
  all: ['sessions'] as const,
  active: (id: string | null) => [...sessionKeys.all, 'active', id] as const,
  suggestions: (exerciseId: string, context: LoadSuggestionContext) => [...sessionKeys.all, 'suggestions', exerciseId, context] as const,
  performanceTrend: (exerciseId: string, sessionId: string) => [...sessionKeys.all, 'performance', exerciseId, sessionId] as const,
  historyPage: (page: number, pageSize: number) => [...sessionKeys.all, 'history', page, pageSize] as const,
  detail: (id: string) => [...sessionKeys.all, 'detail', id] as const,
  filteredHistory: (filters: HistoryFilters) => [...sessionKeys.all, 'filteredHistory', filters] as const,
};
```

Remove the `history: ()` key (it lacked pagination params and is replaced by `historyPage`).

- [ ] **Step 2: Create `src/hooks/queries/sessionHistoryQueries.ts`**

```typescript
// src/hooks/queries/sessionHistoryQueries.ts
/**
 * TanStack useQuery hooks for session HISTORY (completed sessions).
 *
 * Active-session hooks (useActiveSessionData, useLoadSuggestions,
 * useExerciseHistory, usePerformanceTrend) remain in sessionQueries.ts
 * with useLiveQuery for sub-second reactivity during live workout logging.
 */
import { useQuery } from '@tanstack/react-query';

import { getHistoryPage, getHistoryDetail, getFilteredHistory, type HistoryFilters } from '@/services/historyService';

import { sessionKeys } from './sessionQueries';

export { sessionKeys } from './sessionQueries';

export function useHistoryList(page: number, pageSize: number) {
  return useQuery({
    queryKey: sessionKeys.historyPage(page, pageSize),
    queryFn: () => getHistoryPage(page, pageSize),
    staleTime: Infinity,
  });
}

export function useHistoryDetail(sessionId?: string) {
  return useQuery({
    queryKey: sessionKeys.detail(sessionId ?? ''),
    queryFn: () => getHistoryDetail(sessionId!),
    enabled: !!sessionId,
    staleTime: Infinity,
  });
}

export function useFilteredHistory(filters: HistoryFilters) {
  return useQuery({
    queryKey: sessionKeys.filteredHistory(filters),
    queryFn: () => getFilteredHistory(filters),
    staleTime: Infinity,
  });
}
```

- [ ] **Step 3: Remove migrated hooks from `sessionQueries.ts`**

In `src/hooks/queries/sessionQueries.ts`, delete the `useHistoryList`, `useHistoryDetail`, and `useFilteredHistory` function bodies (they are now in `sessionHistoryQueries.ts`). Keep all active-session hooks (`useExerciseHistory`, `useActiveSessionData`, `useLoadSuggestions`, `usePerformanceTrend`) unchanged.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/queries/sessionHistoryQueries.ts src/hooks/queries/sessionQueries.ts
git commit -m "feat: sessionHistoryQueries.ts — history hooks via useQuery; active-session keeps useLiveQuery"
```

---

### Task 14: Session History Domain — Mutation Hooks with Invalidation + Page Updates

**Files:**
- Modify: `src/hooks/mutations/sessionMutations.ts`
- Modify: `src/pages/HistoryList.tsx`
- Modify: `src/pages/HistoryDetail.tsx`

- [ ] **Step 1: Update `sessionMutations.ts` — add onSuccess invalidation**

Replace the file contents:

```typescript
// src/hooks/mutations/sessionMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { WorkoutSession, SessionSet, PlannedExerciseGroup, PlannedExerciseItem, PlannedSet } from '@/domain/entities';
import { analyticsKeys } from '@/hooks/queries/analyticsQueries';
import { dashboardKeys } from '@/hooks/queries/dashboardQueries';
import { sessionKeys } from '@/hooks/queries/sessionHistoryQueries';
import { workoutKeys } from '@/hooks/queries/workoutPlanQueries';
import {
  deleteHistorySession, updateHistorySessionMeta, updateSessionSet, deleteSessionSet, addSessionSet,
} from '@/services/historyService';
import { updateSessionStructure } from '@/services/workoutService';

export function useSessionMutations() {
  const queryClient = useQueryClient();

  const invalidateHistory = () => {
    queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
  };

  const saveSessionMutation = useMutation({
    mutationFn: async ({
      sessionId, name, dayNumber, notes, groups, items, sets,
      removedGroupIds, removedItemIds, removedSetIds,
    }: {
      sessionId: string; name: string; dayNumber: number; notes?: string;
      groups: PlannedExerciseGroup[]; items: PlannedExerciseItem[]; sets: PlannedSet[];
      removedGroupIds: string[]; removedItemIds: string[]; removedSetIds: string[];
    }) => {
      await updateSessionStructure(
        sessionId, { name, dayNumber, notes },
        { groups, items, sets },
        { removedGroupIds, removedItemIds, removedSetIds }
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workoutKeys.all }),
  });

  const deleteSessionMutation = useMutation({
    mutationFn: (id: string) => deleteHistorySession(id),
    onSuccess: invalidateHistory,
  });

  const updateSessionMetaMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<WorkoutSession> }) =>
      updateHistorySessionMeta(id, updates),
    onSuccess: invalidateHistory,
  });

  const updateSessionSetMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; sessionId: string; updates: Partial<SessionSet> }) =>
      updateSessionSet(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionKeys.all }),
  });

  const deleteSessionSetMutation = useMutation({
    mutationFn: ({ id }: { id: string; sessionId: string }) => deleteSessionSet(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionKeys.all }),
  });

  const addSessionSetMutation = useMutation({
    mutationFn: ({ set }: { sessionId: string; set: SessionSet }) => addSessionSet(set),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionKeys.all }),
  });

  return {
    saveSession: saveSessionMutation.mutateAsync,
    deleteSession: deleteSessionMutation.mutateAsync,
    updateSessionMeta: updateSessionMetaMutation.mutateAsync,
    updateSessionSet: updateSessionSetMutation.mutateAsync,
    deleteSessionSet: deleteSessionSetMutation.mutateAsync,
    addSessionSet: addSessionSetMutation.mutateAsync,
  };
}
```

- [ ] **Step 2: Update `HistoryList.tsx` imports**

```typescript
// Before:
import { useHistoryList } from '@/hooks/queries/sessionQueries';
// After:
import { useHistoryList } from '@/hooks/queries/sessionHistoryQueries';
```

- [ ] **Step 3: Update `HistoryDetail.tsx` imports**

```typescript
// Before:
import { useHistoryDetail } from '@/hooks/queries/sessionQueries';
import { useSessionMutations } from '@/hooks/mutations/sessionMutations';
// After (no change to sessionMutations import — hook name unchanged):
import { useHistoryDetail } from '@/hooks/queries/sessionHistoryQueries';
import { useSessionMutations } from '@/hooks/mutations/sessionMutations';
```

- [ ] **Step 4: Verify TypeScript compiles and tests pass**

```bash
npx tsc --noEmit && npm test
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/mutations/sessionMutations.ts src/pages/HistoryList.tsx src/pages/HistoryDetail.tsx
git commit -m "feat: session history mutations with cache invalidation; pages use sessionHistoryQueries"
```

---

### Task 15: OneRepMax Domain — Query + Mutation Hooks + Page Update

**Files:**
- Create: `src/hooks/queries/oneRepMaxQueries.ts`
- Create: `src/hooks/mutations/oneRepMaxMutations.ts`
- Modify: `src/pages/OneRepMaxPage.tsx`

- [ ] **Step 1: Create `src/hooks/queries/oneRepMaxQueries.ts`**

```typescript
// src/hooks/queries/oneRepMaxQueries.ts
import { useQuery } from '@tanstack/react-query';

import { getGroupedData } from '@/services/oneRepMaxService';

import { oneRepMaxKeys } from './workoutQueries';

export { oneRepMaxKeys } from './workoutQueries';

export function useOneRepMaxData() {
  return useQuery({
    queryKey: oneRepMaxKeys.list(),
    queryFn: getGroupedData,
    staleTime: Infinity,
  });
}
```

- [ ] **Step 2: Create `src/hooks/mutations/oneRepMaxMutations.ts`**

```typescript
// src/hooks/mutations/oneRepMaxMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { OneRepMaxRecord } from '@/domain/entities';
import { oneRepMaxKeys } from '@/hooks/queries/oneRepMaxQueries';
import { exerciseKeys } from '@/hooks/queries/exerciseQueries';
import { upsertRecord, deleteRecord } from '@/services/oneRepMaxService';

export function useOneRepMaxMutations() {
  const queryClient = useQueryClient();

  const saveRecordMutation = useMutation({
    mutationFn: (record: OneRepMaxRecord) => upsertRecord(record),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: oneRepMaxKeys.all });
      // Exercise history queries may show 1RM estimates — invalidate too
      queryClient.invalidateQueries({ queryKey: exerciseKeys.all });
    },
  });

  const deleteRecordMutation = useMutation({
    mutationFn: (id: string) => deleteRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: oneRepMaxKeys.all });
    },
  });

  return {
    saveRecord: saveRecordMutation.mutateAsync,
    deleteRecord: deleteRecordMutation.mutateAsync,
    isSaving: saveRecordMutation.isPending,
  };
}
```

- [ ] **Step 3: Update `OneRepMaxPage.tsx` imports**

```typescript
// Before:
import { useOneRepMaxData } from '@/hooks/queries/workoutQueries';
import { useWorkoutMutations } from '@/hooks/mutations/workoutMutations';
// After:
import { useOneRepMaxData } from '@/hooks/queries/oneRepMaxQueries';
import { useOneRepMaxMutations } from '@/hooks/mutations/oneRepMaxMutations';
// Update hook call inside the component:
const mutations = useOneRepMaxMutations();
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/queries/oneRepMaxQueries.ts src/hooks/mutations/oneRepMaxMutations.ts src/pages/OneRepMaxPage.tsx
git commit -m "feat: oneRepMax domain — useQuery + invalidating mutations, remove useLiveQuery"
```

---

### Task 16: Template Domain — Query + Mutation Hooks

**Files:**
- Create: `src/hooks/queries/templateQueries.ts`
- Create: `src/hooks/mutations/templateMutations.ts`

Note: `useSessionTemplates` and `useTemplateDetail` already exist in `workoutPlanQueries.ts` (Task 10). This task creates dedicated template mutation hooks. The query hooks are already covered.

- [ ] **Step 1: Create `src/hooks/mutations/templateMutations.ts`**

```typescript
// src/hooks/mutations/templateMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { templateKeys } from '@/hooks/queries/workoutPlanQueries';
import { workoutKeys } from '@/hooks/queries/workoutPlanQueries';
import { deleteTemplate, updateTemplate } from '@/services/templateService';

export function useTemplateMutations() {
  const queryClient = useQueryClient();

  const invalidateTemplates = () => {
    queryClient.invalidateQueries({ queryKey: templateKeys.all });
    // Templates affect workout plan views that import them
    queryClient.invalidateQueries({ queryKey: workoutKeys.all });
  };

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: invalidateTemplates,
  });

  const updateTemplateMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: ({ id, name, description, content }: { id: string; name: string; description?: string; content: any }) =>
      updateTemplate(id, { name, description, content }),
    onSuccess: invalidateTemplates,
  });

  return {
    deleteTemplate: deleteTemplateMutation.mutateAsync,
    updateTemplate: updateTemplateMutation.mutateAsync,
    isDeleting: deleteTemplateMutation.isPending,
    isUpdating: updateTemplateMutation.isPending,
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/mutations/templateMutations.ts
git commit -m "feat: templateMutations.ts — delete/update with cache invalidation"
```

---

### Task 17: Analytics Queries — useLiveQuery → useQuery

**Files:**
- Modify: `src/hooks/queries/analyticsQueries.ts`

- [ ] **Step 1: Replace `analyticsQueries.ts`**

```typescript
// src/hooks/queries/analyticsQueries.ts
import { useQuery } from '@tanstack/react-query';

import { fetchAnalyticsData, getMuscleVolumeDistribution } from '@/services/analyticsService';
import { getExercisesByIds } from '@/services/exerciseService';
import { getAllWorkouts, getWorkoutSessions, getWorkoutSessionGroups, getWorkoutGroupItems } from '@/services/workoutService';

export const analyticsKeys = {
  all: ['analytics'] as const,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filters: (filters: any) => [...analyticsKeys.all, 'data', filters] as const,
  workouts: () => [...analyticsKeys.all, 'workouts'] as const,
  sessions: (workoutId?: string) => [...analyticsKeys.all, 'sessions', { workoutId }] as const,
  groups: (sessionId?: string) => [...analyticsKeys.all, 'groups', { sessionId }] as const,
  items: (groupId?: string) => [...analyticsKeys.all, 'items', { groupId }] as const,
  muscleVolume: (from: Date, to: Date, workoutId?: string) => [...analyticsKeys.all, 'muscleVolume', from, to, workoutId] as const,
};

export function useAnalyticsData(filters: {
  fromDate: Date; toDate: Date; workoutId?: string; sessionId?: string;
  plannedGroupId?: string; plannedExerciseItemId?: string;
}) {
  return useQuery({
    queryKey: analyticsKeys.filters(filters),
    queryFn: () => fetchAnalyticsData(
      filters.fromDate, filters.toDate, filters.workoutId,
      filters.sessionId, filters.plannedGroupId, filters.plannedExerciseItemId
    ),
    staleTime: Infinity,
  });
}

export function useAnalyticsWorkouts() {
  return useQuery({
    queryKey: analyticsKeys.workouts(),
    queryFn: getAllWorkouts,
    staleTime: Infinity,
  });
}

export function useAnalyticsSessions(workoutId?: string) {
  return useQuery({
    queryKey: analyticsKeys.sessions(workoutId),
    queryFn: () => workoutId ? getWorkoutSessions(workoutId) : Promise.resolve([]),
    enabled: !!workoutId,
    staleTime: Infinity,
  });
}

export function useAnalyticsGroups(sessionId?: string) {
  return useQuery({
    queryKey: analyticsKeys.groups(sessionId),
    queryFn: () => sessionId ? getWorkoutSessionGroups(sessionId) : Promise.resolve([]),
    enabled: !!sessionId,
    staleTime: Infinity,
  });
}

export function useAnalyticsItems(groupId?: string) {
  return useQuery({
    queryKey: analyticsKeys.items(groupId),
    queryFn: async () => {
      if (!groupId) return [];
      const items = await getWorkoutGroupItems(groupId);
      const exIds = items.map(i => i.exerciseId);
      const exercises = await getExercisesByIds(exIds);
      const exMap = new Map(exercises.filter(Boolean).map(e => [e.id, e]));
      return items.map(i => ({ ...i, exercise: exMap.get(i.exerciseId) }));
    },
    enabled: !!groupId,
    staleTime: Infinity,
  });
}

export function useMuscleVolumeDistribution(from: Date, to: Date, workoutId?: string) {
  return useQuery({
    queryKey: analyticsKeys.muscleVolume(from, to, workoutId),
    queryFn: () => getMuscleVolumeDistribution(from, to, workoutId),
    staleTime: Infinity,
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/queries/analyticsQueries.ts
git commit -m "refactor: analyticsQueries — replace useLiveQuery with TanStack useQuery"
```

---

### Task 18: Dashboard Queries — useLiveQuery → useQuery

**Files:**
- Modify: `src/hooks/queries/dashboardQueries.ts`

- [ ] **Step 1: Replace `dashboardQueries.ts`**

```typescript
// src/hooks/queries/dashboardQueries.ts
import { useQuery } from '@tanstack/react-query';

import { DEFAULT_REGULATION_PROFILE } from '@/domain/entities';
import {
  getLastWorkoutSummary, buildTrainingCalendar, getDashboardStats,
  getConsistencyHeatmap, getMuscleFreshness,
} from '@/services/dashboardService';
import { profileService } from '@/services/profileService';
import { getNextSessionSuggestionDetail } from '@/services/sessionRotation';

import { weightRecordKeys } from './workoutQueries';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  suggestion: () => [...dashboardKeys.all, 'suggestion'] as const,
  lastWorkout: () => [...dashboardKeys.all, 'lastWorkout'] as const,
  profile: () => [...dashboardKeys.all, 'profile'] as const,
  regulation: () => [...dashboardKeys.all, 'regulation'] as const,
  heatmap: (days: number) => [...dashboardKeys.all, 'heatmap', days] as const,
  muscleFreshness: () => [...dashboardKeys.all, 'muscleFreshness'] as const,
  weightRecords: () => [...weightRecordKeys.all] as const,
};

export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: getDashboardStats,
    staleTime: Infinity,
  });
}

export function useConsistencyHeatmap(days = 365) {
  return useQuery({
    queryKey: dashboardKeys.heatmap(days),
    queryFn: () => getConsistencyHeatmap(days),
    staleTime: Infinity,
  });
}

export function useMuscleFreshness() {
  return useQuery({
    queryKey: dashboardKeys.muscleFreshness(),
    queryFn: getMuscleFreshness,
    staleTime: Infinity,
  });
}

export function useNextSessionSuggestion() {
  return useQuery({
    queryKey: dashboardKeys.suggestion(),
    queryFn: getNextSessionSuggestionDetail,
    staleTime: Infinity,
  });
}

export function useLastWorkout() {
  return useQuery({
    queryKey: dashboardKeys.lastWorkout(),
    queryFn: getLastWorkoutSummary,
    staleTime: Infinity,
  });
}

export function useUserProfile() {
  return useQuery({
    queryKey: dashboardKeys.profile(),
    queryFn: async () => {
      const profile = await profileService.getProfile();
      return profile || null;
    },
    staleTime: Infinity,
  });
}

export function useWeightRecords() {
  return useQuery({
    queryKey: dashboardKeys.weightRecords(),
    queryFn: () => profileService.getBodyWeightRecords(),
    staleTime: Infinity,
  });
}

export function useUserRegulation() {
  return useQuery({
    queryKey: dashboardKeys.regulation(),
    queryFn: async () => {
      const profile = await profileService.getRegulationProfile();
      return profile || { ...DEFAULT_REGULATION_PROFILE, updatedAt: new Date() };
    },
    staleTime: Infinity,
  });
}

export function useTrainingCalendar(month: Date) {
  return useQuery({
    queryKey: [...dashboardKeys.all, 'calendar', month.toISOString()],
    queryFn: () => buildTrainingCalendar(month),
    staleTime: Infinity,
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles and full test suite passes**

```bash
npx tsc --noEmit && npm test
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/queries/dashboardQueries.ts
git commit -m "refactor: dashboardQueries — replace useLiveQuery with TanStack useQuery"
```

---

### Task 19: Logic Services — Pure 1RM Formulas

**Files:**
- Create: `src/services/logic/__tests__/oneRepMaxLogic.test.ts`
- Create: `src/services/logic/oneRepMaxLogic.ts`
- Modify: `src/services/rpePercentageTable.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/services/logic/__tests__/oneRepMaxLogic.test.ts
import { describe, it, expect } from 'vitest';
import {
  estimateBrzycki, estimateEpley, estimateOConner,
  estimateLombardi, computeWeighted1RM,
} from '../oneRepMaxLogic';

describe('estimateBrzycki', () => {
  it('returns null for reps > 10', () => {
    expect(estimateBrzycki(100, 11)).toBeNull();
  });

  it('returns null for reps < 1', () => {
    expect(estimateBrzycki(100, 0)).toBeNull();
  });

  it('returns load for 1 rep (1RM = load)', () => {
    // 100 * 36 / (37 - 1) = 100
    expect(estimateBrzycki(100, 1)).toBeCloseTo(100, 0);
  });

  it('computes for 5 reps at 80 kg', () => {
    // 80 * 36 / (37 - 5) = 90
    expect(estimateBrzycki(80, 5)).toBeCloseTo(90, 0);
  });
});

describe('estimateEpley', () => {
  it('returns load unchanged at 0 reps', () => {
    expect(estimateEpley(100, 0)).toBeCloseTo(100, 0);
  });

  it('computes for 10 reps at 70 kg', () => {
    // 70 * (1 + 0.0333 * 10) ≈ 93.31
    expect(estimateEpley(70, 10)).toBeCloseTo(93.31, 0);
  });
});

describe('estimateOConner', () => {
  it('computes for 5 reps at 100 kg', () => {
    // 100 * (1 + 0.025 * 5) = 112.5
    expect(estimateOConner(100, 5)).toBeCloseTo(112.5, 0);
  });
});

describe('estimateLombardi', () => {
  it('returns null for reps > 6', () => {
    expect(estimateLombardi(100, 7)).toBeNull();
  });

  it('computes for 3 reps at 100 kg', () => {
    // 100 * 3^0.10 ≈ 111.6
    expect(estimateLombardi(100, 3)).toBeCloseTo(111.6, 0);
  });
});

describe('computeWeighted1RM', () => {
  it('result is greater than the input load', () => {
    const { media } = computeWeighted1RM(100, 5);
    expect(media).toBeGreaterThan(100);
  });

  it('errorPercentage is between 0 and 20', () => {
    const { errorPercentage } = computeWeighted1RM(80, 3);
    expect(errorPercentage).toBeGreaterThanOrEqual(0);
    expect(errorPercentage).toBeLessThanOrEqual(20);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- src/services/logic/__tests__/oneRepMaxLogic.test.ts
```

Expected: `FAIL — Cannot find module '../oneRepMaxLogic'`

- [ ] **Step 3: Create `src/services/logic/oneRepMaxLogic.ts`**

```typescript
// src/services/logic/oneRepMaxLogic.ts
/**
 * Pure 1RM estimation formulas.
 * No side effects — safe to call in Vitest without mocks.
 */

export function estimateBrzycki(load: number, reps: number): number | null {
  if (reps > 10 || reps < 1) return null;
  return load * 36 / (37 - reps);
}

export function estimateEpley(load: number, reps: number): number {
  return load * (1 + 0.0333 * reps);
}

export function estimateOConner(load: number, reps: number): number {
  return load * (1 + 0.025 * reps);
}

export function estimateLombardi(load: number, reps: number): number | null {
  if (reps > 6 || reps < 1) return null;
  return load * Math.pow(reps, 0.10);
}

export interface WeightedEstimate {
  media: number;
  errorPercentage: number;
}

/**
 * Weighted average of available 1RM estimates.
 * Brzycki gets double weight (≤10 reps); Lombardi included only for ≤6 reps.
 */
export function computeWeighted1RM(load: number, reps: number): WeightedEstimate {
  const estimates: number[] = [];

  const brzycki = estimateBrzycki(load, reps);
  if (brzycki !== null) estimates.push(brzycki, brzycki); // double weight

  const lombardi = estimateLombardi(load, reps);
  if (lombardi !== null) estimates.push(lombardi);

  estimates.push(estimateEpley(load, reps));
  estimates.push(estimateOConner(load, reps));

  const media = estimates.reduce((sum, v) => sum + v, 0) / estimates.length;
  const min = Math.min(...estimates);
  const max = Math.max(...estimates);
  const errorPercentage = media > 0 ? ((max - min) / media) * 100 / 2 : 0;

  return {
    media: Math.round(media * 10) / 10,
    errorPercentage: Math.round(errorPercentage * 10) / 10,
  };
}
```

- [ ] **Step 4: Re-export from `rpePercentageTable.ts`**

In `src/services/rpePercentageTable.ts`, find and **remove** the function bodies for `estimateBrzycki`, `estimateEpley`, `estimateOConner`, `estimateLombardi`. Replace with re-exports:

```typescript
// Re-export pure estimation formulas from their canonical module
export {
  estimateBrzycki, estimateEpley, estimateOConner, estimateLombardi,
  computeWeighted1RM, type WeightedEstimate,
} from './logic/oneRepMaxLogic';
```

Update the existing `calculateWeighted1RM` function in that file (if present) to call `computeWeighted1RM` from the new module.

- [ ] **Step 5: Run tests**

```bash
npm test -- src/services/logic/__tests__/oneRepMaxLogic.test.ts && npm test
```

Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add src/services/logic/oneRepMaxLogic.ts src/services/logic/__tests__/oneRepMaxLogic.test.ts src/services/rpePercentageTable.ts
git commit -m "refactor: extract pure 1RM formulas to services/logic/oneRepMaxLogic.ts"
```

---

### Task 20: Logic Services — Pure Warmup Scheme Logic

**Files:**
- Create: `src/services/logic/__tests__/warmupLogic.test.ts`
- Create: `src/services/logic/warmupLogic.ts`
- Modify: `src/services/warmupCalculator.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/services/logic/__tests__/warmupLogic.test.ts
import { describe, it, expect } from 'vitest';
import { buildWarmupScheme, type WarmupInput } from '../warmupLogic';

describe('buildWarmupScheme', () => {
  it('3 sets for high-stress compound (first for muscle)', () => {
    const input: WarmupInput = { exerciseType: 'compound_upper', isFirst: true, bodyWeightRatio: 1.2 };
    const sets = buildWarmupScheme(input);
    expect(sets).toHaveLength(3);
    expect(sets[0].percent).toBe(50);
    expect(sets[1].percent).toBe(70);
    expect(sets[2].percent).toBe(85);
  });

  it('removes first set when not first for muscle', () => {
    const input: WarmupInput = { exerciseType: 'compound_upper', isFirst: false, bodyWeightRatio: 1.2 };
    const sets = buildWarmupScheme(input);
    expect(sets).toHaveLength(2);
    expect(sets[0].percent).toBe(70);
  });

  it('2 sets for medium-stress compound (first)', () => {
    const input: WarmupInput = { exerciseType: 'compound_upper', isFirst: true, bodyWeightRatio: 0.6 };
    const sets = buildWarmupScheme(input);
    expect(sets).toHaveLength(2);
    expect(sets[0].percent).toBe(60);
    expect(sets[1].percent).toBe(80);
  });

  it('1 set for low-stress compound (first)', () => {
    const input: WarmupInput = { exerciseType: 'compound_upper', isFirst: true, bodyWeightRatio: 0.3 };
    const sets = buildWarmupScheme(input);
    expect(sets).toHaveLength(1);
    expect(sets[0].percent).toBe(65);
  });

  it('2 sets for isolation, first for muscle', () => {
    const input: WarmupInput = { exerciseType: 'isolation', isFirst: true, bodyWeightRatio: null };
    const sets = buildWarmupScheme(input);
    expect(sets).toHaveLength(2);
    expect(sets[0].percent).toBe(60);
    expect(sets[1].percent).toBe(80);
  });

  it('1 set for isolation, not first', () => {
    const input: WarmupInput = { exerciseType: 'isolation', isFirst: false, bodyWeightRatio: null };
    const sets = buildWarmupScheme(input);
    expect(sets).toHaveLength(1);
    expect(sets[0].percent).toBe(60);
  });

  it('falls back to high stress when bodyWeightRatio is null', () => {
    const input: WarmupInput = { exerciseType: 'compound_lower', isFirst: true, bodyWeightRatio: null };
    const sets = buildWarmupScheme(input);
    expect(sets).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- src/services/logic/__tests__/warmupLogic.test.ts
```

Expected: `FAIL — Cannot find module '../warmupLogic'`

- [ ] **Step 3: Create `src/services/logic/warmupLogic.ts`**

```typescript
// src/services/logic/warmupLogic.ts
/**
 * Pure warmup scheme logic.
 * No DB access. Caller provides exerciseType, isFirst, bodyWeightRatio.
 */

export type WarmupExerciseType = 'compound_upper' | 'compound_lower' | 'isolation';

export interface WarmupInput {
  exerciseType: WarmupExerciseType;
  isFirst: boolean;
  /** workingWeight / bodyWeight, or null if bodyWeight unknown */
  bodyWeightRatio: number | null;
}

export interface WarmupSetSpec {
  percent: number; // e.g. 50 = 50% of working weight
  reps: number;
}

export function buildWarmupScheme(input: WarmupInput): WarmupSetSpec[] {
  const { exerciseType, isFirst, bodyWeightRatio } = input;

  if (exerciseType === 'isolation') {
    return isFirst
      ? [{ percent: 60, reps: 8 }, { percent: 80, reps: 3 }]
      : [{ percent: 60, reps: 8 }];
  }

  const highThreshold = exerciseType === 'compound_lower' ? 1.25 : 1.0;
  const medThreshold = exerciseType === 'compound_lower' ? 0.75 : 0.5;

  const highStress = bodyWeightRatio === null || bodyWeightRatio >= highThreshold;
  const medStress = !highStress && bodyWeightRatio !== null && bodyWeightRatio >= medThreshold;

  let scheme: WarmupSetSpec[];
  if (highStress) {
    scheme = [{ percent: 50, reps: 6 }, { percent: 70, reps: 4 }, { percent: 85, reps: 2 }];
  } else if (medStress) {
    scheme = [{ percent: 60, reps: 5 }, { percent: 80, reps: 3 }];
  } else {
    scheme = [{ percent: 65, reps: 5 }];
  }

  return !isFirst && scheme.length > 1 ? scheme.slice(1) : scheme;
}
```

- [ ] **Step 4: Update `warmupCalculator.ts` to delegate to `buildWarmupScheme`**

In `src/services/warmupCalculator.ts`, add the import:

```typescript
import { buildWarmupScheme } from './logic/warmupLogic';
```

Inside `generateWarmup()`, replace the stress-classification block and `warmupScheme` construction (lines ~119–188) with:

```typescript
  const ratio = (bw !== null && bw > 0) ? workingWeight / bw : null;
  const specs = buildWarmupScheme({ exerciseType, isFirst, bodyWeightRatio: ratio });

  return specs.map(spec => ({
    weight: roundToHalf(workingWeight * spec.percent / 100),
    reps: spec.reps,
    percent: spec.percent,
  }));
```

- [ ] **Step 5: Run tests**

```bash
npm test -- src/services/logic/__tests__/warmupLogic.test.ts && npm test
```

Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add src/services/logic/warmupLogic.ts src/services/logic/__tests__/warmupLogic.test.ts src/services/warmupCalculator.ts
git commit -m "refactor: extract pure warmup scheme logic to services/logic/warmupLogic.ts"
```

---

### Task 21: Final Verification — Full Test Suite + TypeScript + Lint

- [ ] **Step 1: Run the complete test suite**

```bash
npm test
```

Expected: All tests pass. Note the count — it should be higher than before this refactor due to new validation and logic tests.

- [ ] **Step 2: Run TypeScript type-checking**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Run linting**

```bash
npm run lint
```

Expected: No new lint errors (fix any introduced by the refactor).

- [ ] **Step 4: Smoke test the app**

```bash
npm run dev
```

Verify each page loads without console errors:
1. Dashboard — stats and calendar render
2. Exercises — list loads, create/edit/delete works without refresh
3. Workout list — creates and loads correctly
4. History list — past sessions load
5. 1RM page — records load
6. Analytics — charts render

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: complete architecture refactor — all domains use validated repos, TanStack Query, and pure logic services"
```

---

## Constraint Verification

| Constraint | How it is met |
|---|---|
| 100% offline — no network calls | All code reads/writes Dexie.js only |
| Zero regressions — no DB schema changes | Database version and indexes untouched |
| SCD Type 2 preserved | ExerciseRepository.update() version logic is unchanged |
| Active session reactivity preserved | `useActiveSessionData`, `useLoadSuggestions`, `useExerciseHistory`, `usePerformanceTrend` retain `useLiveQuery` |
| Capacitor/WebView optimized | `staleTime: Infinity` eliminates all background refetch overhead |
