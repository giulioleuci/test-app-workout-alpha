import { LexoRank } from 'lexorank';

function generateTestRank(index: number) {
  let rank = LexoRank.min().between(LexoRank.middle());
  for (let i = 0; i < index; i++) rank = rank.genNext();
  return rank.toString();
}


import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';

import type {
  Exercise,
  WorkoutSession,
  SessionExerciseGroup,
  SessionExerciseItem,
  SessionSet,
} from '@/domain/entities';
import { ExerciseGroupType, SetType, ToFailureIndicator } from '@/domain/enums';
import {
  swapExercise,
  addExercise,
  addSuperset,
  removeExercise,
  validateSessionCompletion,
} from '@/services/sessionMutator';

import { testDb as db } from '../../utils/testHelpers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeExercise(id: string, name: string): Exercise {
  return {
    id,
    name,
    type: 'compound' as any,
    primaryMuscles: [],
    secondaryMuscles: [],
    equipment: [],
    movementPattern: 'horizontalPush' as any,
    counterType: 'reps' as any,
    defaultLoadUnit: 'kg',
    variantIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeSession(id: string): WorkoutSession {
  return {
    id,
    startedAt: new Date(),
  };
}

function makeGroup(id: string, sessionId: string, orderIndex: number | string, groupType = ExerciseGroupType.Standard): SessionExerciseGroup {
  return {
    id,
    workoutSessionId: sessionId,
    groupType,
    orderIndex: typeof orderIndex === 'number' ? generateTestRank(orderIndex) : orderIndex,
    isCompleted: false,
  };
}

function makeItem(id: string, groupId: string, exerciseId: string, orderIndex: number | string = 0): SessionExerciseItem {
  return {
    id,
    sessionExerciseGroupId: groupId,
    exerciseId,
    orderIndex: typeof orderIndex === 'number' ? generateTestRank(orderIndex) : orderIndex,
    isCompleted: false,
  };
}

function makeSet(
  id: string,
  itemId: string,
  orderIndex: number | string,
  opts: Partial<SessionSet> = {},
): SessionSet {
  return {
    id,
    sessionExerciseItemId: itemId,
    setType: SetType.Working,
    orderIndex: typeof orderIndex === 'number' ? generateTestRank(orderIndex) : orderIndex,
    actualLoad: null,
    actualCount: null,
    actualRPE: null,
    actualToFailure: ToFailureIndicator.None,
    expectedRPE: null,
    isCompleted: false,
    isSkipped: false,
    partials: false,
    forcedReps: 0,
    ...opts,
  };
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('SessionMutator', () => {
  const SESSION_ID = 'session-1';
  const EX_BENCH = 'ex-bench';
  const EX_SQUAT = 'ex-squat';
  const EX_DEADLIFT = 'ex-deadlift';
  const EX_CURL = 'ex-curl';

  beforeEach(async () => {
    // Reset all tables
    await db.delete();
    await db.open();

    // Seed exercises
    await db.exercises.bulkAdd([
      makeExercise(EX_BENCH, 'Bench Press'),
      makeExercise(EX_SQUAT, 'Squat'),
      makeExercise(EX_DEADLIFT, 'Deadlift'),
      makeExercise(EX_CURL, 'Bicep Curl'),
    ]);

    // Seed a session
    await db.workoutSessions.add(makeSession(SESSION_ID));
  });

  // =========================================================================
  // swapExercise
  // =========================================================================

  describe('swapExercise', () => {
    it('should replace the exerciseId on the item', async () => {
      const groupId = 'g1';
      const itemId = 'i1';
      await db.sessionExerciseGroups.add(makeGroup(groupId, SESSION_ID, 0));
      await db.sessionExerciseItems.add(makeItem(itemId, groupId, EX_BENCH));
      await db.sessionSets.bulkAdd([
        makeSet('s1', itemId, 0),
        makeSet('s2', itemId, 1),
        makeSet('s3', itemId, 2),
      ]);

      await swapExercise(itemId, EX_SQUAT);

      const updated = await db.sessionExerciseItems.get(itemId);
      expect(updated!.exerciseId).toBe(EX_SQUAT);
    });

    it('should set originalExerciseId to the first original exercise', async () => {
      const groupId = 'g1';
      const itemId = 'i1';
      await db.sessionExerciseGroups.add(makeGroup(groupId, SESSION_ID, 0));
      await db.sessionExerciseItems.add(makeItem(itemId, groupId, EX_BENCH));
      await db.sessionSets.bulkAdd([
        makeSet('s1', itemId, 0),
        makeSet('s2', itemId, 1),
        makeSet('s3', itemId, 2),
      ]);

      await swapExercise(itemId, EX_SQUAT);

      const updated = await db.sessionExerciseItems.get(itemId);
      expect(updated!.originalExerciseId).toBe(EX_BENCH);
    });

    it('should preserve originalExerciseId across a double swap', async () => {
      const groupId = 'g1';
      const itemId = 'i1';
      await db.sessionExerciseGroups.add(makeGroup(groupId, SESSION_ID, 0));
      await db.sessionExerciseItems.add(makeItem(itemId, groupId, EX_BENCH));
      await db.sessionSets.bulkAdd([
        makeSet('s1', itemId, 0),
        makeSet('s2', itemId, 1),
        makeSet('s3', itemId, 2),
      ]);

      // Swap to squat, then to deadlift
      await swapExercise(itemId, EX_SQUAT);
      await swapExercise(itemId, EX_DEADLIFT);

      const updated = await db.sessionExerciseItems.get(itemId);
      expect(updated!.exerciseId).toBe(EX_DEADLIFT);
      // Original should still be Bench Press, not Squat
      expect(updated!.originalExerciseId).toBe(EX_BENCH);
    });

    it('should delete incomplete sets and create new ones', async () => {
      const groupId = 'g1';
      const itemId = 'i1';
      await db.sessionExerciseGroups.add(makeGroup(groupId, SESSION_ID, 0));
      await db.sessionExerciseItems.add(makeItem(itemId, groupId, EX_BENCH));
      await db.sessionSets.bulkAdd([
        makeSet('s1', itemId, 0),
        makeSet('s2', itemId, 1),
        makeSet('s3', itemId, 2),
        makeSet('s4', itemId, 3),
        makeSet('s5', itemId, 4),
      ]);

      await swapExercise(itemId, EX_SQUAT);

      const sets = await db.sessionSets.where('sessionExerciseItemId').equals(itemId).toArray();
      // 5 incomplete deleted, max(3, 5) = 5 new created
      expect(sets.length).toBe(5);
      // All new sets should be incomplete Working sets
      for (const s of sets) {
        expect(s.setType).toBe(SetType.Working);
        expect(s.isCompleted).toBe(false);
        expect(s.isSkipped).toBe(false);
      }
    });

    it('should preserve completed and skipped sets', async () => {
      const groupId = 'g1';
      const itemId = 'i1';
      await db.sessionExerciseGroups.add(makeGroup(groupId, SESSION_ID, 0));
      await db.sessionExerciseItems.add(makeItem(itemId, groupId, EX_BENCH));
      await db.sessionSets.bulkAdd([
        makeSet('s1', itemId, 0, { isCompleted: true, actualLoad: 80, actualCount: 8 }),
        makeSet('s2', itemId, 1, { isSkipped: true }),
        makeSet('s3', itemId, 2), // incomplete
        makeSet('s4', itemId, 3), // incomplete
      ]);

      await swapExercise(itemId, EX_SQUAT);

      const sets = await db.sessionSets
        .where('sessionExerciseItemId').equals(itemId)
        .sortBy('orderIndex');

      // 2 kept (completed + skipped) + max(3, 2) = 3 new = 5 total
      expect(sets.length).toBe(5);

      // First two should be the originals
      expect(sets[0].id).toBe('s1');
      expect(sets[0].isCompleted).toBe(true);
      expect(sets[0].actualLoad).toBe(80);
      expect(sets[1].id).toBe('s2');
      expect(sets[1].isSkipped).toBe(true);

      // The rest should be new fallback sets
      for (let i = 2; i < sets.length; i++) {
        expect(sets[i].isCompleted).toBe(false);
        expect(sets[i].isSkipped).toBe(false);
        expect(sets[i].setType).toBe(SetType.Working);
      }
    });

    it('should record an ExerciseSubstitution when plannedWorkoutId is provided', async () => {
      const groupId = 'g1';
      const itemId = 'i1';
      const plannedWorkoutId = 'pw-1';
      const plannedExerciseItemId = 'pei-1';

      await db.sessionExerciseGroups.add(makeGroup(groupId, SESSION_ID, 0));
      await db.sessionExerciseItems.add({
        ...makeItem(itemId, groupId, EX_BENCH),
        plannedExerciseItemId,
      });
      await db.sessionSets.bulkAdd([
        makeSet('s1', itemId, 0),
        makeSet('s2', itemId, 1),
        makeSet('s3', itemId, 2),
      ]);

      await swapExercise(itemId, EX_SQUAT, plannedWorkoutId);

      const subs = await db.exerciseSubstitutions.toArray();
      expect(subs.length).toBe(1);
      expect(subs[0].plannedExerciseItemId).toBe(plannedExerciseItemId);
      expect(subs[0].plannedWorkoutId).toBe(plannedWorkoutId);
      expect(subs[0].originalExerciseId).toBe(EX_BENCH);
      expect(subs[0].substitutedExerciseId).toBe(EX_SQUAT);
      expect(subs[0].sessionId).toBe(SESSION_ID);
    });

    it('should NOT record substitution when item has no plannedExerciseItemId', async () => {
      const groupId = 'g1';
      const itemId = 'i1';

      await db.sessionExerciseGroups.add(makeGroup(groupId, SESSION_ID, 0));
      await db.sessionExerciseItems.add(makeItem(itemId, groupId, EX_BENCH));
      await db.sessionSets.bulkAdd([
        makeSet('s1', itemId, 0),
      ]);

      await swapExercise(itemId, EX_SQUAT, 'pw-1');

      const subs = await db.exerciseSubstitutions.toArray();
      expect(subs.length).toBe(0);
    });

    it('should throw if item does not exist', async () => {
      await expect(swapExercise('nonexistent', EX_SQUAT)).rejects.toThrow();
    });
  });

  // =========================================================================
  // addExercise
  // =========================================================================

  describe('addExercise', () => {
    it('should create group, item, and 3 fallback sets at the target position', async () => {
      const result = await addExercise(SESSION_ID, EX_BENCH, 0);

      const group = await db.sessionExerciseGroups.get(result.groupId);
      expect(group).toBeDefined();
      expect(group!.workoutSessionId).toBe(SESSION_ID);
      expect(typeof group!.orderIndex).toBe('string');
      expect(group!.groupType).toBe(ExerciseGroupType.Standard);

      const item = await db.sessionExerciseItems.get(result.itemId);
      expect(item).toBeDefined();
      expect(item!.exerciseId).toBe(EX_BENCH);
      expect(item!.sessionExerciseGroupId).toBe(result.groupId);
      expect(typeof item!.orderIndex).toBe('string');

      const sets = await db.sessionSets
        .where('sessionExerciseItemId').equals(result.itemId)
        .toArray();
      expect(sets.length).toBe(3);
      for (const s of sets) {
        expect(s.setType).toBe(SetType.Working);
        expect(s.isCompleted).toBe(false);
      }
    });

    it('should shift existing groups when inserting at an occupied index', async () => {
      // Pre-existing groups at indices 0, 1, 2
      await db.sessionExerciseGroups.bulkAdd([
        makeGroup('g0', SESSION_ID, 0),
        makeGroup('g1', SESSION_ID, 1),
        makeGroup('g2', SESSION_ID, 2),
      ]);

      // Insert at index 1
      const result = await addExercise(SESSION_ID, EX_CURL, 1);

      const groups = await db.sessionExerciseGroups
        .where('workoutSessionId').equals(SESSION_ID)
        .sortBy('orderIndex');

      expect(groups.length).toBe(4);
      expect(groups[0].id).toBe('g0');
      expect(groups[0].orderIndex.localeCompare(groups[1].orderIndex)).toBeLessThan(0);
      expect(groups[1].id).toBe(result.groupId); // newly inserted
      expect(groups[1].orderIndex.localeCompare(groups[2].orderIndex)).toBeLessThan(0);
      expect(groups[2].id).toBe('g1'); // shifted from 1 to 2
      expect(groups[2].orderIndex.localeCompare(groups[3].orderIndex)).toBeLessThan(0);
      expect(groups[3].id).toBe('g2'); // shifted from 2 to 3
    });

    it('should accept a custom groupType', async () => {
      const result = await addExercise(SESSION_ID, EX_BENCH, 0, ExerciseGroupType.Warmup);

      const group = await db.sessionExerciseGroups.get(result.groupId);
      expect(group!.groupType).toBe(ExerciseGroupType.Warmup);
    });
  });

  // =========================================================================
  // addSuperset
  // =========================================================================

  describe('addSuperset', () => {
    it('should create a Superset group with multiple items, each with 3 sets', async () => {
      const result = await addSuperset(SESSION_ID, [EX_BENCH, EX_SQUAT, EX_CURL], 0);

      const group = await db.sessionExerciseGroups.get(result.groupId);
      expect(group).toBeDefined();
      expect(group!.groupType).toBe(ExerciseGroupType.Superset);
      expect(typeof group!.orderIndex).toBe('string');

      expect(result.itemIds.length).toBe(3);

      const items = await db.sessionExerciseItems
        .where('sessionExerciseGroupId').equals(result.groupId)
        .sortBy('orderIndex');

      expect(items.length).toBe(3);
      expect(items[0].exerciseId).toBe(EX_BENCH);
      expect(items[1].exerciseId).toBe(EX_SQUAT);
      expect(items[2].exerciseId).toBe(EX_CURL);

      // Each item should have 3 sets
      for (const item of items) {
        const sets = await db.sessionSets
          .where('sessionExerciseItemId').equals(item.id)
          .toArray();
        expect(sets.length).toBe(3);
      }
    });

    it('should shift existing groups', async () => {
      await db.sessionExerciseGroups.add(makeGroup('g0', SESSION_ID, 0));

      const result = await addSuperset(SESSION_ID, [EX_BENCH, EX_SQUAT], 0);

      const groups = await db.sessionExerciseGroups
        .where('workoutSessionId').equals(SESSION_ID)
        .sortBy('orderIndex');

      expect(groups.length).toBe(2);
      expect(groups[0].id).toBe(result.groupId);
      expect(groups[0].orderIndex.localeCompare(groups[1].orderIndex)).toBeLessThan(0);
      expect(groups[1].id).toBe('g0');
    });

    it('should allow a custom groupType', async () => {
      const result = await addSuperset(SESSION_ID, [EX_BENCH, EX_SQUAT], 0, ExerciseGroupType.Circuit);

      const group = await db.sessionExerciseGroups.get(result.groupId);
      expect(group!.groupType).toBe(ExerciseGroupType.Circuit);
    });
  });

  // =========================================================================
  // removeExercise
  // =========================================================================

  describe('removeExercise', () => {
    it('should delete the item and its sets', async () => {
      const groupId = 'g1';
      const itemId = 'i1';
      const itemId2 = 'i2';

      await db.sessionExerciseGroups.add(makeGroup(groupId, SESSION_ID, 0));
      await db.sessionExerciseItems.bulkAdd([
        makeItem(itemId, groupId, EX_BENCH, 0),
        makeItem(itemId2, groupId, EX_SQUAT, 1),
      ]);
      await db.sessionSets.bulkAdd([
        makeSet('s1', itemId, 0),
        makeSet('s2', itemId, 1),
        makeSet('s3', itemId2, 0),
      ]);

      await removeExercise(itemId);

      // Item should be gone
      expect(await db.sessionExerciseItems.get(itemId)).toBeUndefined();

      // Sets for the item should be gone
      const setsForItem = await db.sessionSets
        .where('sessionExerciseItemId').equals(itemId).toArray();
      expect(setsForItem.length).toBe(0);

      // Group should still exist (has another item)
      expect(await db.sessionExerciseGroups.get(groupId)).toBeDefined();

      // Other item's sets should be untouched
      const setsForItem2 = await db.sessionSets
        .where('sessionExerciseItemId').equals(itemId2).toArray();
      expect(setsForItem2.length).toBe(1);
    });

    it('should delete the group if it becomes empty', async () => {
      const groupId = 'g1';
      const itemId = 'i1';

      await db.sessionExerciseGroups.add(makeGroup(groupId, SESSION_ID, 0));
      await db.sessionExerciseItems.add(makeItem(itemId, groupId, EX_BENCH));
      await db.sessionSets.bulkAdd([
        makeSet('s1', itemId, 0),
        makeSet('s2', itemId, 1),
      ]);

      await removeExercise(itemId);

      expect(await db.sessionExerciseGroups.get(groupId)).toBeUndefined();
    });

    it('should re-compact orderIndex on remaining groups after group deletion', async () => {
      // 3 groups: 0, 1, 2
      await db.sessionExerciseGroups.bulkAdd([
        makeGroup('g0', SESSION_ID, 0),
        makeGroup('g1', SESSION_ID, 1),
        makeGroup('g2', SESSION_ID, 2),
      ]);
      await db.sessionExerciseItems.bulkAdd([
        makeItem('i0', 'g0', EX_BENCH),
        makeItem('i1', 'g1', EX_SQUAT),
        makeItem('i2', 'g2', EX_CURL),
      ]);
      // Add sets for all items
      await db.sessionSets.bulkAdd([
        makeSet('s0', 'i0', 0),
        makeSet('s1', 'i1', 0),
        makeSet('s2', 'i2', 0),
      ]);

      // Remove the middle exercise (group g1 becomes empty)
      await removeExercise('i1');

      const groups = await db.sessionExerciseGroups
        .where('workoutSessionId').equals(SESSION_ID)
        .sortBy('orderIndex');

      expect(groups.length).toBe(2);
      expect(groups[0].id).toBe('g0');
      expect(groups[0].orderIndex.localeCompare(groups[1].orderIndex)).toBeLessThan(0);
      expect(groups[1].id).toBe('g2');
    });

    it('should throw if item does not exist', async () => {
      await expect(removeExercise('nonexistent')).rejects.toThrow();
    });
  });

  // =========================================================================
  // validateSessionCompletion
  // =========================================================================

  describe('validateSessionCompletion', () => {
    it('should return valid when all sets are completed', async () => {
      const groupId = 'g1';
      const itemId = 'i1';

      await db.sessionExerciseGroups.add(makeGroup(groupId, SESSION_ID, 0));
      await db.sessionExerciseItems.add(makeItem(itemId, groupId, EX_BENCH));
      await db.sessionSets.bulkAdd([
        makeSet('s1', itemId, 0, { isCompleted: true }),
        makeSet('s2', itemId, 1, { isCompleted: true }),
      ]);

      const result = await validateSessionCompletion(SESSION_ID);

      expect(result.isValid).toBe(true);
      expect(result.unresolvedSets.length).toBe(0);
    });

    it('should return valid when all sets are completed or skipped', async () => {
      const groupId = 'g1';
      const itemId = 'i1';

      await db.sessionExerciseGroups.add(makeGroup(groupId, SESSION_ID, 0));
      await db.sessionExerciseItems.add(makeItem(itemId, groupId, EX_BENCH));
      await db.sessionSets.bulkAdd([
        makeSet('s1', itemId, 0, { isCompleted: true }),
        makeSet('s2', itemId, 1, { isSkipped: true }),
      ]);

      const result = await validateSessionCompletion(SESSION_ID);

      expect(result.isValid).toBe(true);
      expect(result.unresolvedSets.length).toBe(0);
    });

    it('should return unresolved sets that are neither completed nor skipped', async () => {
      const groupId = 'g1';
      const itemId = 'i1';

      await db.sessionExerciseGroups.add(makeGroup(groupId, SESSION_ID, 0));
      await db.sessionExerciseItems.add(makeItem(itemId, groupId, EX_BENCH));
      await db.sessionSets.bulkAdd([
        makeSet('s1', itemId, 0, { isCompleted: true }),
        makeSet('s2', itemId, 1), // incomplete
        makeSet('s3', itemId, 2), // incomplete
      ]);

      const result = await validateSessionCompletion(SESSION_ID);

      expect(result.isValid).toBe(false);
      expect(result.unresolvedSets.length).toBe(2);
      expect(result.unresolvedSets[0].exerciseName).toBe('Bench Press');
      expect(result.unresolvedSets[0].groupIndex).toBe(generateTestRank(0));
      expect(result.unresolvedSets[0].setIndex).toBe(generateTestRank(1));
      expect(result.unresolvedSets[1].setIndex).toBe(generateTestRank(2));
    });

    it('should return valid for a session with no groups', async () => {
      const result = await validateSessionCompletion(SESSION_ID);
      expect(result.isValid).toBe(true);
      expect(result.unresolvedSets.length).toBe(0);
    });

    it('should include correct exercise name for each unresolved set', async () => {
      // Two groups with different exercises
      await db.sessionExerciseGroups.bulkAdd([
        makeGroup('g1', SESSION_ID, 0),
        makeGroup('g2', SESSION_ID, 1),
      ]);
      await db.sessionExerciseItems.bulkAdd([
        makeItem('i1', 'g1', EX_BENCH),
        makeItem('i2', 'g2', EX_SQUAT),
      ]);
      await db.sessionSets.bulkAdd([
        makeSet('s1', 'i1', 0), // incomplete bench
        makeSet('s2', 'i2', 0), // incomplete squat
      ]);

      const result = await validateSessionCompletion(SESSION_ID);

      expect(result.isValid).toBe(false);
      expect(result.unresolvedSets.length).toBe(2);

      const names = result.unresolvedSets.map(u => u.exerciseName);
      expect(names).toContain('Bench Press');
      expect(names).toContain('Squat');
    });

    it('should use "Unknown" for exercise names when exercise is missing', async () => {
      const groupId = 'g1';
      const itemId = 'i1';

      await db.sessionExerciseGroups.add(makeGroup(groupId, SESSION_ID, 0));
      await db.sessionExerciseItems.add(makeItem(itemId, groupId, 'nonexistent-exercise'));
      await db.sessionSets.add(makeSet('s1', itemId, 0));

      const result = await validateSessionCompletion(SESSION_ID);

      expect(result.isValid).toBe(false);
      expect(result.unresolvedSets[0].exerciseName).toBe('Unknown');
    });
  });
});
