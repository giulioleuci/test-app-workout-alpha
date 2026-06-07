import { describe, it, expect } from 'vitest';

import { ExerciseGroupType } from '@/domain/enums';
import { computeTraversalOrder } from '@/services/traversal';

describe('Traversal Service', () => {
  describe('Sequential Traversal (Standard, Warmup, Cluster)', () => {
    it('should traverse exercises sequentially for Standard group', () => {
      const itemConfigs = [
        { blockCounts: [2] }, // Exercise 0: 1 block of 2 sets
        { blockCounts: [3] }  // Exercise 1: 1 block of 3 sets
      ];
      const result = computeTraversalOrder(ExerciseGroupType.Standard, itemConfigs);

      expect(result).toEqual([
        { itemIndex: 0, setIndex: 0, innerIndex: 0 },
        { itemIndex: 0, setIndex: 0, innerIndex: 1 },
        { itemIndex: 1, setIndex: 0, innerIndex: 0 },
        { itemIndex: 1, setIndex: 0, innerIndex: 1 },
        { itemIndex: 1, setIndex: 0, innerIndex: 2 },
      ]);
    });

    it('should traverse exercises sequentially for Warmup group', () => {
      const itemConfigs = [{ blockCounts: [1] }, { blockCounts: [1] }];
      const result = computeTraversalOrder(ExerciseGroupType.Warmup, itemConfigs);

      expect(result).toEqual([
        { itemIndex: 0, setIndex: 0, innerIndex: 0 },
        { itemIndex: 1, setIndex: 0, innerIndex: 0 },
      ]);
    });

    it('should traverse exercises sequentially for Cluster group', () => {
      const itemConfigs = [{ blockCounts: [3] }];
      const result = computeTraversalOrder(ExerciseGroupType.Cluster, itemConfigs);

      expect(result).toEqual([
        { itemIndex: 0, setIndex: 0, innerIndex: 0 },
        { itemIndex: 0, setIndex: 0, innerIndex: 1 },
        { itemIndex: 0, setIndex: 0, innerIndex: 2 },
      ]);
    });
  });

  describe('Interleaved Traversal (Superset, Circuit, Amrap, Emom)', () => {
    it('should interleave exercises for Superset group', () => {
      const itemConfigs = [{ blockCounts: [2] }, { blockCounts: [2] }];
      const result = computeTraversalOrder(ExerciseGroupType.Superset, itemConfigs);

      expect(result).toEqual([
        { itemIndex: 0, setIndex: 0, innerIndex: 0, round: 0 },
        { itemIndex: 1, setIndex: 0, innerIndex: 0, round: 0 },
        { itemIndex: 0, setIndex: 0, innerIndex: 1, round: 1 },
        { itemIndex: 1, setIndex: 0, innerIndex: 1, round: 1 },
      ]);
    });

    it('should handle different set counts in interleaved traversal', () => {
      const itemConfigs = [{ blockCounts: [3] }, { blockCounts: [1] }, { blockCounts: [2] }];
      const result = computeTraversalOrder(ExerciseGroupType.Circuit, itemConfigs);

      expect(result).toEqual([
        // Round 0
        { itemIndex: 0, setIndex: 0, innerIndex: 0, round: 0 },
        { itemIndex: 1, setIndex: 0, innerIndex: 0, round: 0 },
        { itemIndex: 2, setIndex: 0, innerIndex: 0, round: 0 },
        // Round 1
        { itemIndex: 0, setIndex: 0, innerIndex: 1, round: 1 },
        { itemIndex: 2, setIndex: 0, innerIndex: 1, round: 1 },
        // Round 2
        { itemIndex: 0, setIndex: 0, innerIndex: 2, round: 2 },
      ]);
    });

    it('should fall back to sequential if only one exercise is present even for interleaved types', () => {
      const itemConfigs = [{ blockCounts: [3] }];
      const result = computeTraversalOrder(ExerciseGroupType.Superset, itemConfigs);

      expect(result).toEqual([
        { itemIndex: 0, setIndex: 0, innerIndex: 0 },
        { itemIndex: 0, setIndex: 0, innerIndex: 1 },
        { itemIndex: 0, setIndex: 0, innerIndex: 2 },
      ]);
    });
  });

  describe('Edge Cases', () => {
    it('should return empty array for empty itemConfigs', () => {
      const result = computeTraversalOrder(ExerciseGroupType.Standard, []);
      expect(result).toEqual([]);
    });

    it('should handle zero sets correctly', () => {
      const itemConfigs = [{ blockCounts: [0] }, { blockCounts: [2] }, { blockCounts: [0] }];
      const result = computeTraversalOrder(ExerciseGroupType.Standard, itemConfigs);
      expect(result).toEqual([
        { itemIndex: 1, setIndex: 0, innerIndex: 0 },
        { itemIndex: 1, setIndex: 0, innerIndex: 1 },
      ]);
    });

    it('should handle zero sets in interleaved traversal', () => {
      const itemConfigs = [{ blockCounts: [0] }, { blockCounts: [2] }, { blockCounts: [0] }];
      const result = computeTraversalOrder(ExerciseGroupType.Superset, itemConfigs);
      expect(result).toEqual([
        { itemIndex: 1, setIndex: 0, innerIndex: 0, round: 0 },
        { itemIndex: 1, setIndex: 0, innerIndex: 1, round: 1 },
      ]);
    });
  });
});
