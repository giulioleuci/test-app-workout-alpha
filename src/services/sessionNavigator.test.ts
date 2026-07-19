
import { describe, it, expect } from 'vitest';

import type { LoadedGroup, LoadedItem } from '@/domain/activeSessionTypes';
import { ExerciseGroupType } from '@/domain/enums';
import { SessionNavigator } from '@/services/sessionNavigator';

function createMockItem(id: string, setsCount: number, completedSets = 0): LoadedItem {
  return {
    item: { id } as any,
    sets: Array.from({ length: setsCount }, (_, i) => ({
      id: `${id}-s${i}`,
      isCompleted: i < completedSets,
      isSkipped: false,
    } as any)),
    plannedSets: {},
    exercise: null,
    occurrenceIndex: 0,
  };
}

describe('SessionNavigator', () => {
  describe('findNextTarget', () => {
    it('returns null for empty groups', () => {
      const result = SessionNavigator.findNextTarget([]);
      expect(result).toBeNull();
    });

    it('finds first incomplete set in sequential group', () => {
      const item1 = createMockItem('i1', 3, 1); // 1 completed
      const item2 = createMockItem('i2', 3, 0);

      const group: LoadedGroup = {
        group: { groupType: ExerciseGroupType.Standard } as any,
        items: [item1, item2],
      };

      const result = SessionNavigator.findNextTarget([group]);

      expect(result).not.toBeNull();
      expect(result?.gi).toBe(0);
      expect(result?.ii).toBe(0);
      expect(result?.si).toBe(1); // 2nd set
    });

    it('moves to next item in sequential group when current item is done', () => {
      const item1 = createMockItem('i1', 3, 3); // All completed
      const item2 = createMockItem('i2', 3, 0);

      const group: LoadedGroup = {
        group: { groupType: ExerciseGroupType.Standard } as any,
        items: [item1, item2],
      };

      const result = SessionNavigator.findNextTarget([group]);

      expect(result).not.toBeNull();
      expect(result?.gi).toBe(0);
      expect(result?.ii).toBe(1); // Next item
      expect(result?.si).toBe(0);
    });

    it('handles interleaved groups (Superset)', () => {
      // i1: s0 done
      // i2: s0 not done
      const item1 = createMockItem('i1', 3, 1);
      const item2 = createMockItem('i2', 3, 0);

      const group: LoadedGroup = {
        group: { groupType: ExerciseGroupType.Superset } as any,
        items: [item1, item2],
      };

      const result = SessionNavigator.findNextTarget([group]);

      // Should move to item 2, set 0
      expect(result?.gi).toBe(0);
      expect(result?.ii).toBe(1);
      expect(result?.si).toBe(0);
    });

    it('handles interleaved groups (Superset) - Round 2', () => {
      // i1: s0 done, s1 not done
      // i2: s0 done, s1 not done
      const item1 = createMockItem('i1', 3, 1);
      const item2 = createMockItem('i2', 3, 1);

      const group: LoadedGroup = {
        group: { groupType: ExerciseGroupType.Superset } as any,
        items: [item1, item2],
      };

      const result = SessionNavigator.findNextTarget([group]);

      // Should wrap back to item 1, set 1
      expect(result?.gi).toBe(0);
      expect(result?.ii).toBe(0);
      expect(result?.si).toBe(1);
    });

    it('handles Cluster groups (Working Set + Mini Sets)', () => {
        // Cluster logic: usually treated as sequential but with special internal traversal if modeled that way.
        // If modeled as standard items, it follows sequential.
        // Assuming Cluster follows 'sequential' exercise traversal in our system
        const item1 = createMockItem('i1', 5, 2);

        const group: LoadedGroup = {
            group: { groupType: ExerciseGroupType.Cluster } as any,
            items: [item1]
        };

        const result = SessionNavigator.findNextTarget([group]);

        expect(result?.gi).toBe(0);
        expect(result?.ii).toBe(0);
        expect(result?.si).toBe(2);
    });

    it('moves to next group when current group is done', () => {
        const item1 = createMockItem('i1', 1, 1);
        const g1: LoadedGroup = {
            group: { groupType: ExerciseGroupType.Standard } as any,
            items: [item1]
        };

        const item2 = createMockItem('i2', 1, 0);
        const g2: LoadedGroup = {
            group: { groupType: ExerciseGroupType.Standard } as any,
            items: [item2]
        };

        const result = SessionNavigator.findNextTarget([g1, g2]);

        expect(result?.gi).toBe(1);
        expect(result?.ii).toBe(0);
        expect(result?.si).toBe(0);
    });
  });
});
