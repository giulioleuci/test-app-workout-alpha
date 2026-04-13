import { LexoRank } from 'lexorank';

function generateTestRank(index: number) {
  let rank = LexoRank.min().between(LexoRank.middle());
  for(let i=0; i<index; i++) rank = rank.genNext();
  return rank.toString();
}


import { describe, it, expect, vi, beforeEach } from 'vitest';

import { WorkoutPlanRepository } from '@/db/repositories/WorkoutPlanRepository';
import { Exercise, PlannedExerciseItem, PlannedSet } from '@/domain/entities';
import { Muscle, MovementPattern, CounterType, Equipment, SetType, ExerciseType } from '@/domain/enums';
import dayjs from '@/lib/dayjs';
import { estimateSessionDuration } from '@/services/durationEstimator';
import { analyzeItemsFromData, analyzeItemsRaw, ItemWithContext, getSessionVolumeAndDuration, analyzeSessionVolume, analyzeWorkoutVolume } from '@/services/volumeAnalyzer';

vi.mock('@/db/repositories/WorkoutPlanRepository');
vi.mock('@/services/durationEstimator');

// Mock helper functions
function createMockExercise(
  id: string,
  primaryMuscles: Muscle[],
  secondaryMuscles: Muscle[],
  movementPattern: MovementPattern
): Exercise {
  return {
    id,
    name: `Exercise ${id}`,
    type: ExerciseType.Compound,
    primaryMuscles,
    secondaryMuscles,
    equipment: [Equipment.Barbell],
    movementPattern,
    counterType: CounterType.Reps,
    defaultLoadUnit: 'kg',
    variantIds: [],
    createdAt: dayjs().toDate(),
    updatedAt: dayjs().toDate(),
  };
}

function createMockItem(id: string, exerciseId: string): PlannedExerciseItem {
  return {
    id,
    plannedExerciseGroupId: 'group-1',
    exerciseId,
    counterType: CounterType.Reps,
    orderIndex: generateTestRank(0),
  };
}

function createMockSet(
  id: string,
  itemId: string,
  minSets: number,
  maxSets?: number
): PlannedSet {
  return {
    id,
    plannedExerciseItemId: itemId,
    setCountRange: { min: minSets, max: maxSets },
    countRange: { min: 8, max: 12, toFailure: 'none' as any },
    setType: SetType.Working,
    
    orderIndex: generateTestRank(0),
  };
}

// Label functions
const muscleLabelFn = (k: string) => (k ? k.toUpperCase() : '');
const groupLabelFn = (k: string) => (k ? k.toUpperCase() : '');
const patternLabelFn = (k: string) => (k ? k.toUpperCase() : '');

describe('volumeAnalyzer', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('analyzeItemsFromData', () => {
    it('should return empty analysis for empty input', () => {
      const result = analyzeItemsFromData([], muscleLabelFn, groupLabelFn, patternLabelFn);

      expect(result.byMuscle).toEqual([]);
      expect(result.byMuscleGroup).toEqual([]);
      expect(result.byMovementPattern).toEqual([]);
    });

    it('should analyze single exercise with one set', () => {
      const exercise = createMockExercise('ex1', [Muscle.Chest], [], MovementPattern.HorizontalPush);
      const item = createMockItem('item1', 'ex1');
      const set = createMockSet('set1', 'item1', 1);

      const input: ItemWithContext[] = [{ item, exercise, sets: [set] }];

      const result = analyzeItemsFromData(input, muscleLabelFn, groupLabelFn, patternLabelFn);

      // Muscle
      expect(result.byMuscle).toHaveLength(1);
      expect(result.byMuscle[0].key).toBe(Muscle.Chest);
      expect(result.byMuscle[0].volume).toEqual({ min: 1, max: 1 });

      // Pattern
      expect(result.byMovementPattern).toHaveLength(1);
      expect(result.byMovementPattern[0].key).toBe(MovementPattern.HorizontalPush);
      expect(result.byMovementPattern[0].volume).toEqual({ min: 1, max: 1 });
    });

    it('should count secondary muscles as 0.5 volume', () => {
      const exercise = createMockExercise('ex1', [Muscle.Chest], [Muscle.Triceps], MovementPattern.HorizontalPush);
      const item = createMockItem('item1', 'ex1');
      const set = createMockSet('set1', 'item1', 2); // 2 sets

      const input: ItemWithContext[] = [{ item, exercise, sets: [set] }];

      const result = analyzeItemsFromData(input, muscleLabelFn, groupLabelFn, patternLabelFn);

      // Muscles
      const chest = result.byMuscle.find(e => e.key === Muscle.Chest);
      const triceps = result.byMuscle.find(e => e.key === Muscle.Triceps);

      expect(chest).toBeDefined();
      expect(chest?.volume).toEqual({ min: 2, max: 2 });

      expect(triceps).toBeDefined();
      expect(triceps?.volume).toEqual({ min: 1, max: 1 }); // 0.5 * 2 sets
    });

    it('should handle set ranges (min/max)', () => {
      const exercise = createMockExercise('ex1', [Muscle.Chest], [], MovementPattern.HorizontalPush);
      const item = createMockItem('item1', 'ex1');
      const set = createMockSet('set1', 'item1', 2, 4); // 2-4 sets

      const input: ItemWithContext[] = [{ item, exercise, sets: [set] }];

      const result = analyzeItemsFromData(input, muscleLabelFn, groupLabelFn, patternLabelFn);

      const chest = result.byMuscle.find(e => e.key === Muscle.Chest);
      expect(chest?.volume).toEqual({ min: 2, max: 4 });
    });

    it('should aggregate volume across multiple exercises and sets', () => {
      // Ex 1: Chest (primary), Triceps (secondary) - 3 sets
      const ex1 = createMockExercise('ex1', [Muscle.Chest], [Muscle.Triceps], MovementPattern.HorizontalPush);
      const item1 = createMockItem('item1', 'ex1');
      const set1 = createMockSet('set1', 'item1', 3);

      // Ex 2: Triceps (primary) - 2 sets
      const ex2 = createMockExercise('ex2', [Muscle.Triceps], [], MovementPattern.HorizontalPush); // using Push for simplicity
      const item2 = createMockItem('item2', 'ex2');
      const set2 = createMockSet('set2', 'item2', 2);

      const input: ItemWithContext[] = [
        { item: item1, exercise: ex1, sets: [set1] },
        { item: item2, exercise: ex2, sets: [set2] }
      ];

      const result = analyzeItemsFromData(input, muscleLabelFn, groupLabelFn, patternLabelFn);

      // Chest: 3 sets (primary)
      const chest = result.byMuscle.find(e => e.key === Muscle.Chest);
      expect(chest?.volume).toEqual({ min: 3, max: 3 });

      // Triceps: 1.5 (secondary from ex1) + 2 (primary from ex2) = 3.5
      const triceps = result.byMuscle.find(e => e.key === Muscle.Triceps);
      expect(triceps?.volume).toEqual({ min: 3.5, max: 3.5 });
    });

    it('should correctly aggregate muscle groups', () => {
      // Chest belongs to Chest group
      const exercise = createMockExercise('ex1', [Muscle.Chest], [], MovementPattern.HorizontalPush);
      const item = createMockItem('item1', 'ex1');
      const set = createMockSet('set1', 'item1', 2);

      const input: ItemWithContext[] = [{ item, exercise, sets: [set] }];

      const result = analyzeItemsFromData(input, muscleLabelFn, groupLabelFn, patternLabelFn);

      // Chest group should have volume from Chest
      const group = result.byMuscleGroup.find(g => g.label === 'CHEST');
      expect(group).toBeDefined();
      expect(group?.volume).toEqual({ min: 2, max: 2 });
    });

    it('should exclude secondary muscles when excludeSecondary is true', () => {
      const exercise = createMockExercise('ex1', [Muscle.Chest], [Muscle.Triceps], MovementPattern.HorizontalPush);
      const item = createMockItem('item1', 'ex1');
      const set = createMockSet('set1', 'item1', 2);

      const input: ItemWithContext[] = [{ item, exercise, sets: [set] }];

      // Call with excludeSecondary = true
      const result = analyzeItemsFromData(input, muscleLabelFn, groupLabelFn, patternLabelFn, undefined, true);

      // Chest (primary) should be present
      const chest = result.byMuscle.find(e => e.key === Muscle.Chest);
      expect(chest).toBeDefined();
      expect(chest?.volume).toEqual({ min: 2, max: 2 });

      // Triceps (secondary) should be absent
      const triceps = result.byMuscle.find(e => e.key === Muscle.Triceps);
      expect(triceps).toBeUndefined();
    });
  });

  describe('analyzeItemsRaw', () => {
    it('should return raw keys as labels', () => {
      const exercise = createMockExercise('ex1', [Muscle.Chest], [], MovementPattern.HorizontalPush);
      const item = createMockItem('item1', 'ex1');
      const set = createMockSet('set1', 'item1', 1);

      const input: ItemWithContext[] = [{ item, exercise, sets: [set] }];

      const result = analyzeItemsRaw(input);

      expect(result.byMuscle[0].key).toBe(Muscle.Chest);
      expect(result.byMuscle[0].label).toBe(Muscle.Chest); // key == label
    });
  });

  describe('analyzeSessionVolume', () => {
    it('returns empty analysis if session not found', async () => {
      vi.mocked(WorkoutPlanRepository.getHydratedPlannedSession).mockResolvedValue(null);

      const result = await analyzeSessionVolume('s1', 'Session 1', muscleLabelFn, groupLabelFn, patternLabelFn);

      expect(result.sessionId).toBe('s1');
      expect(result.sessionName).toBe('Session 1');
      expect(result.byMuscle).toEqual([]);
    });

    it('returns session volume analysis', async () => {
      const exercise = createMockExercise('ex1', [Muscle.Chest], [], MovementPattern.HorizontalPush);
      const item = createMockItem('item1', 'ex1');
      const set = createMockSet('set1', 'item1', 1);

      const hydratedSession = {
        session: { id: 's1', name: 'Session 1' },
        groups: [
          {
            group: { id: 'g1' },
            items: [{ item, exercise, sets: [set] }]
          }
        ]
      } as any;

      vi.mocked(WorkoutPlanRepository.getHydratedPlannedSession).mockResolvedValue(hydratedSession);

      const result = await analyzeSessionVolume('s1', 'Session 1', muscleLabelFn, groupLabelFn, patternLabelFn);

      expect(result.byMuscle).toHaveLength(1);
      expect(result.byMuscle[0].key).toBe(Muscle.Chest);
    });
  });

  describe('analyzeWorkoutVolume', () => {
    it('analyzes full workout volume including overlap', async () => {
      const ex1 = createMockExercise('ex1', [Muscle.Chest], [], MovementPattern.HorizontalPush);
      const item1 = createMockItem('item1', 'ex1');
      const set1 = createMockSet('set1', 'item1', 1);

      const ex2 = createMockExercise('ex2', [Muscle.Back], [], MovementPattern.HorizontalPull);
      const item2 = createMockItem('item2', 'ex2');
      const set2 = createMockSet('set2', 'item2', 1);

      const hydratedWorkout = {
        workout: { id: 'w1', name: 'Workout 1' },
        sessions: [
          {
            session: { id: 's1', name: 'Session A' },
            groups: [{ items: [{ item: item1, exercise: ex1, sets: [set1] }] }]
          },
          {
            session: { id: 's2', name: 'Session B' },
            groups: [{ items: [{ item: item2, exercise: ex2, sets: [set2] }] }]
          }
        ]
      } as any;

      vi.mocked(WorkoutPlanRepository.getHydratedPlannedWorkout).mockResolvedValue(hydratedWorkout);

      const result = await analyzeWorkoutVolume('w1', muscleLabelFn, groupLabelFn, patternLabelFn);

      expect(result.workoutName).toBe('Workout 1');
      expect(result.sessions).toHaveLength(2);
      expect(result.total.byMuscle).toHaveLength(2); // Chest and Back

      // Check overlap data
      expect(result.muscleOverlap.sessionNames).toEqual(['Session A', 'Session B']);
      expect(result.muscleOverlap.musclePresence.has(Muscle.Chest)).toBe(true);
      expect(result.muscleOverlap.musclePresence.get(Muscle.Chest)).toEqual([1, 0]); // Present in A, not B
    });
  });

  describe('getSessionVolumeAndDuration', () => {
    it('returns null if session not found', async () => {
      vi.mocked(WorkoutPlanRepository.getHydratedPlannedSession).mockResolvedValue(null);
      vi.mocked(estimateSessionDuration).mockResolvedValue({ minSeconds: 0, maxSeconds: 0 });
      const result = await getSessionVolumeAndDuration('s1');
      expect(result).toBeNull();
    });

    it('returns volume analysis and duration', async () => {
      const exercise = createMockExercise('ex1', [Muscle.Chest], [], MovementPattern.HorizontalPush);
      const item = createMockItem('item1', 'ex1');
      const set = createMockSet('set1', 'item1', 1);

      const hydratedSession = {
        session: { id: 's1' },
        groups: [
          {
            group: { id: 'g1' },
            items: [
              {
                item,
                exercise,
                sets: [set]
              }
            ]
          }
        ]
      } as any;

      vi.mocked(WorkoutPlanRepository.getHydratedPlannedSession).mockResolvedValue(hydratedSession);
      vi.mocked(estimateSessionDuration).mockResolvedValue({ minSeconds: 60, maxSeconds: 120 });

      const result = await getSessionVolumeAndDuration('s1');

      expect(result).not.toBeNull();
      expect(result?.duration).toEqual({ minSeconds: 60, maxSeconds: 120 });
      expect(result?.analysis.byMuscle).toHaveLength(1);
      expect(result?.analysis.byMuscle[0].key).toBe(Muscle.Chest);
    });
  });
});
