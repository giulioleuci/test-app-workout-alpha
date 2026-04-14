import { describe, it, expect } from 'vitest';

import {
  ExerciseType, Muscle, Equipment, MovementPattern, CounterType,
  ObjectiveType, WorkType, PlannedWorkoutStatus, PlannedSessionStatus,
  ExerciseGroupType, SetType, ToFailureIndicator, MuscleGroup,
} from '@/domain/enums';
import {
  ExerciseSchema, ExerciseVersionSchema, PlannedWorkoutSchema, PlannedSessionSchema,
  PlannedExerciseGroupSchema, PlannedExerciseItemSchema, PlannedSetSchema,
  WorkoutSessionSchema, SessionExerciseGroupSchema, SessionExerciseItemSchema,
  SessionSetSchema, OneRepMaxRecordSchema, SessionTemplateSchema,
} from '@/domain/schemas';

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

describe('ExerciseVersionSchema', () => {
  it('parses a valid exercise version', () => {
    const result = ExerciseVersionSchema.parse({
      id: 'v1', exerciseId: 'ex1', name: 'Bench Press',
      type: ExerciseType.Compound,
      primaryMuscles: [Muscle.Chest], secondaryMuscles: [],
      equipment: [Equipment.Barbell], movementPattern: MovementPattern.HorizontalPush,
      counterType: CounterType.Reps, versionTimestamp: new Date(),
    });
    expect(result.name).toBe('Bench Press');
  });

  it('throws on empty name', () => {
    expect(() => ExerciseVersionSchema.parse({
      id: 'v1', exerciseId: 'ex1', name: '',
      type: ExerciseType.Compound,
      primaryMuscles: [], secondaryMuscles: [],
      equipment: [], movementPattern: MovementPattern.HorizontalPush,
      counterType: CounterType.Reps, versionTimestamp: new Date(),
    })).toThrow();
  });
});

describe('SessionSetSchema — RPE range', () => {
  it('throws on actualRPE above 10', () => {
    expect(() => SessionSetSchema.parse({
      id: 'set1', sessionExerciseItemId: 'si1', setType: SetType.Working,
      orderIndex: '0|a', actualLoad: 80, actualCount: 5, actualRPE: 15,
      actualToFailure: ToFailureIndicator.None, expectedRPE: 8,
      isCompleted: true, isSkipped: false, partials: false, forcedReps: 0,
    })).toThrow();
  });

  it('throws on expectedRPE below 0', () => {
    expect(() => SessionSetSchema.parse({
      id: 'set1', sessionExerciseItemId: 'si1', setType: SetType.Working,
      orderIndex: '0|a', actualLoad: 80, actualCount: 5, actualRPE: 8,
      actualToFailure: ToFailureIndicator.None, expectedRPE: -1,
      isCompleted: true, isSkipped: false, partials: false, forcedReps: 0,
    })).toThrow();
  });
});
