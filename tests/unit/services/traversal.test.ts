import { describe, it, expect } from 'vitest';

import { ExerciseGroupType } from '@/domain/enums';
import { computeTraversalOrder } from '@/services/traversal';

describe('Traversal Service', () => {
  describe('Sequential Traversal (Standard, Warmup, Cluster)', () => {
    it('should traverse exercises sequentially for Standard group', () => {
      const itemSetCounts = [2, 3]; // Exercise 0 has 2 sets, Exercise 1 has 3 sets
      const result = computeTraversalOrder(ExerciseGroupType.Standard, itemSetCounts);

      expect(result).toEqual([
        { itemIndex: 0, setIndex: 0 },
        { itemIndex: 0, setIndex: 1 },
        { itemIndex: 1, setIndex: 0 },
        { itemIndex: 1, setIndex: 1 },
        { itemIndex: 1, setIndex: 2 },
      ]);
    });

    it('should traverse exercises sequentially for Warmup group', () => {
      const itemSetCounts = [1, 1];
      const result = computeTraversalOrder(ExerciseGroupType.Warmup, itemSetCounts);

      expect(result).toEqual([
        { itemIndex: 0, setIndex: 0 },
        { itemIndex: 1, setIndex: 0 },
      ]);
    });

    it('should traverse exercises sequentially for Cluster group', () => {
      const itemSetCounts = [3];
      const result = computeTraversalOrder(ExerciseGroupType.Cluster, itemSetCounts);

      expect(result).toEqual([
        { itemIndex: 0, setIndex: 0 },
        { itemIndex: 0, setIndex: 1 },
        { itemIndex: 0, setIndex: 2 },
      ]);
    });
  });

  describe('Interleaved Traversal (Superset, Circuit, Amrap, Emom)', () => {
    it('should interleave exercises for Superset group', () => {
      const itemSetCounts = [2, 2];
      const result = computeTraversalOrder(ExerciseGroupType.Superset, itemSetCounts);

      expect(result).toEqual([
        { itemIndex: 0, setIndex: 0, round: 0 },
        { itemIndex: 1, setIndex: 0, round: 0 },
        { itemIndex: 0, setIndex: 1, round: 1 },
        { itemIndex: 1, setIndex: 1, round: 1 },
      ]);
    });

    it('should handle different set counts in interleaved traversal', () => {
      const itemSetCounts = [3, 1, 2];
      const result = computeTraversalOrder(ExerciseGroupType.Circuit, itemSetCounts);

      expect(result).toEqual([
        // Round 0
        { itemIndex: 0, setIndex: 0, round: 0 },
        { itemIndex: 1, setIndex: 0, round: 0 },
        { itemIndex: 2, setIndex: 0, round: 0 },
        // Round 1
        { itemIndex: 0, setIndex: 1, round: 1 },
        { itemIndex: 2, setIndex: 1, round: 1 },
        // Round 2
        { itemIndex: 0, setIndex: 2, round: 2 },
      ]);
    });

    it('should fall back to sequential if only one exercise is present even for interleaved types', () => {
      const itemSetCounts = [3];
      const result = computeTraversalOrder(ExerciseGroupType.Superset, itemSetCounts);

      // The implementation has: if (behavior.exerciseTraversal === 'interleaved' && itemSetCounts.length > 1)
      expect(result).toEqual([
        { itemIndex: 0, setIndex: 0 },
        { itemIndex: 0, setIndex: 1 },
        { itemIndex: 0, setIndex: 2 },
      ]);
    });
  });

  describe('Edge Cases', () => {
    it('should return empty array for empty itemSetCounts', () => {
      const result = computeTraversalOrder(ExerciseGroupType.Standard, []);
      expect(result).toEqual([]);
    });

    it('should handle zero sets correctly', () => {
      const result = computeTraversalOrder(ExerciseGroupType.Standard, [0, 2, 0]);
      expect(result).toEqual([
        { itemIndex: 1, setIndex: 0 },
        { itemIndex: 1, setIndex: 1 },
      ]);
    });

    it('should handle zero sets in interleaved traversal', () => {
      const result = computeTraversalOrder(ExerciseGroupType.Superset, [0, 2, 0]);
      // itemSetCounts.length is 3, so it attempts interleaved.
      // Round 0: ii=1 has round < 2
      // Round 1: ii=1 has round < 2
      expect(result).toEqual([
        { itemIndex: 1, setIndex: 0, round: 0 },
        { itemIndex: 1, setIndex: 1, round: 1 },
      ]);
    });
  });
});
