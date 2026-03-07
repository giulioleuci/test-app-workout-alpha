import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';

import dayjs from '@/lib/dayjs';

import { ExerciseType, Muscle, Equipment, MovementPattern, CounterType } from '@/domain/enums';
import { generateWarmup, getWarmupExerciseType, calculateUserWarmup } from '@/services/warmupCalculator';

import type { Exercise, WarmupSetConfiguration } from '@/domain/entities';


describe('WarmupCalculator Service', () => {
  const mockExercise: Exercise = {
    id: 'ex1',
    name: 'Panca piana',
    type: ExerciseType.Compound,
    primaryMuscles: [Muscle.Chest],
    secondaryMuscles: [Muscle.Triceps],
    equipment: [Equipment.Barbell],
    movementPattern: MovementPattern.HorizontalPush,
    counterType: CounterType.Reps,
    defaultLoadUnit: 'kg',
    variantIds: [],
    createdAt: dayjs().toDate(),
    updatedAt: dayjs().toDate(),
  };

  const mockIsolationExercise: Exercise = {
    ...mockExercise,
    id: 'ex2',
    name: 'Croci manubri',
    type: ExerciseType.Isolation,
  };

  const mockLowerExercise: Exercise = {
    ...mockExercise,
    id: 'ex3',
    name: 'Squat',
    primaryMuscles: [Muscle.Quadriceps],
    type: ExerciseType.Compound,
  };

  describe('getWarmupExerciseType', () => {
    it('should classify isolation exercises correctly', () => {
      expect(getWarmupExerciseType(mockIsolationExercise)).toBe('isolation');
    });

    it('should classify compound upper exercises correctly', () => {
      expect(getWarmupExerciseType(mockExercise)).toBe('compound_upper');
    });

    it('should classify compound lower exercises correctly', () => {
      expect(getWarmupExerciseType(mockLowerExercise)).toBe('compound_lower');
    });
  });

  describe('generateWarmup', () => {
    
    it('should generate isolation warmup', async () => {
      // For isolation, if isFirst is not determined (no workoutSessionId), it defaults to true
      const sets = await generateWarmup(100, mockIsolationExercise);
      // Isolation, first for muscle: 60% x 8, 80% x 3
      expect(sets).toHaveLength(2);
      expect(sets[0]).toEqual({ weight: 60, reps: 8, percent: 60 });
      expect(sets[1]).toEqual({ weight: 80, reps: 3, percent: 80 });
    });

    it('should generate compound upper high stress warmup', async () => {
      // 100kg working weight, 80kg body weight -> ratio 1.25 (>= 1.0) -> High Stress
      const sets = await generateWarmup(100, mockExercise, undefined, 80);
      
      // High stress: 50% x 6, 70% x 4, 85% x 2
      expect(sets).toHaveLength(3);
      expect(sets[0].percent).toBe(50);
      expect(sets[1].percent).toBe(70);
      expect(sets[2].percent).toBe(85);
      expect(sets[0].weight).toBe(50);
      expect(sets[2].weight).toBe(85);
    });

    it('should generate compound lower medium stress warmup', async () => {
      // 100kg working weight, 120kg body weight -> ratio 0.83 (>= 0.75 and < 1.25) -> Medium Stress
      const sets = await generateWarmup(100, mockLowerExercise, undefined, 120);
      
      // Medium stress: 60% x 5, 80% x 3
      expect(sets).toHaveLength(2);
      expect(sets[0].percent).toBe(60);
      expect(sets[1].percent).toBe(80);
    });
  });

  describe('calculateUserWarmup', () => {
    it('should calculate user defined warmup sets correctly', () => {
      const config: WarmupSetConfiguration[] = [
        { percentOfWorkSet: 50, counter: 10, restSeconds: 60 },
        { percentOfWorkSet: 75, counter: 5, restSeconds: 90 }
      ];
      const workingWeight = 100;

      const sets = calculateUserWarmup(workingWeight, config);

      expect(sets).toHaveLength(2);
      expect(sets[0]).toEqual({ weight: 50, reps: 10, percent: 50 });
      expect(sets[1]).toEqual({ weight: 75, reps: 5, percent: 75 });
    });

    it('should round weights to nearest 0.5kg', () => {
      const config: WarmupSetConfiguration[] = [
        { percentOfWorkSet: 33.3, counter: 5, restSeconds: 60 }
      ];
      const workingWeight = 100;
      // 33.3% of 100 = 33.3 -> round to 33.5

      const sets = calculateUserWarmup(workingWeight, config);
      expect(sets[0].weight).toBe(33.5);
    });
  });
});
