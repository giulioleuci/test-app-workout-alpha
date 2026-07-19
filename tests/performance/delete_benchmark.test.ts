import 'fake-indexeddb/auto';
import { nanoid } from 'nanoid';
import { describe, it, expect, beforeEach } from 'vitest';

import { ExerciseGroupType, SetType, ToFailureIndicator } from '@/domain/enums';
import dayjs from '@/lib/dayjs';

import { testDb as db } from '../utils/testHelpers';

// 1. Sequential Delete (Current Implementation)
async function sequentialDelete(sessionId: string) {
  await db.transaction('rw', [db.workoutSessions, db.sessionExerciseGroups, db.sessionExerciseItems, db.sessionSets], async () => {
    const groups = await db.sessionExerciseGroups.where('workoutSessionId').equals(sessionId).toArray();
    for (const g of groups) {
      const items = await db.sessionExerciseItems.where('sessionExerciseGroupId').equals(g.id).toArray();
      for (const item of items) {
        await db.sessionSets.where('sessionExerciseItemId').equals(item.id).delete();
      }
      await db.sessionExerciseItems.where('sessionExerciseGroupId').equals(g.id).delete();
    }
    await db.sessionExerciseGroups.where('workoutSessionId').equals(sessionId).delete();
    await db.workoutSessions.delete(sessionId);
  });
}

// 2. Optimized Bulk Delete (Proposed Implementation)
async function bulkDelete(sessionId: string) {
  await db.transaction('rw', [db.workoutSessions, db.sessionExerciseGroups, db.sessionExerciseItems, db.sessionSets], async () => {
    // 1. Get all groups for the session
    const groups = await db.sessionExerciseGroups.where('workoutSessionId').equals(sessionId).toArray();
    const groupIds = groups.map(g => g.id);

    // 2. Get all items for these groups
    const items = await db.sessionExerciseItems.where('sessionExerciseGroupId').anyOf(groupIds).toArray();
    const itemIds = items.map(i => i.id);

    // 3. Delete all sets for these items
    await db.sessionSets.where('sessionExerciseItemId').anyOf(itemIds).delete();

    // 4. Delete all items for these groups
    await db.sessionExerciseItems.where('sessionExerciseGroupId').anyOf(groupIds).delete();

    // 5. Delete all groups for the session
    await db.sessionExerciseGroups.where('workoutSessionId').equals(sessionId).delete();

    // 6. Delete the session itself
    await db.workoutSessions.delete(sessionId);
  });
}

async function createSessionWithData() {
  const wsId = nanoid();
  await db.workoutSessions.add({
    id: wsId,
    startedAt: dayjs().toDate(),
    completedAt: dayjs().toDate(),
  });

  const groups = [];
  const items = [];
  const sets = [];

  // Create a heavy session: 50 groups, 5 items per group, 5 sets per item = 1250 sets
  for (let j = 0; j < 50; j++) {
    const gId = nanoid();
    groups.push({
      id: gId,
      workoutSessionId: wsId,
      groupType: ExerciseGroupType.Standard,
      isCompleted: false,
      orderIndex: j
    });

    for (let k = 0; k < 5; k++) {
      const itemId = nanoid();
      items.push({
        id: itemId,
        sessionExerciseGroupId: gId,
        exerciseId: 'ex-1',
        isCompleted: false,
        orderIndex: k
      });

      for (let l = 0; l < 5; l++) {
        sets.push({
          id: nanoid(),
          sessionExerciseItemId: itemId,
          setType: SetType.Working,
          orderIndex: l,
          actualLoad: null,
          actualCount: null,
          actualRPE: null,
          actualToFailure: ToFailureIndicator.None,
          expectedRPE: null,
          isCompleted: true,
          isSkipped: false,
          partials: false,
          forcedReps: 0,
        });
      }
    }
  }

  await db.sessionExerciseGroups.bulkAdd(groups);
  await db.sessionExerciseItems.bulkAdd(items);
  await db.sessionSets.bulkAdd(sets);

  return wsId;
}

describe('Delete Performance Benchmark', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map(t => t.clear()));
  });

  it('measures the improvement of bulk delete over sequential delete', { timeout: 30000 }, async () => {
    // Warm up the DB
    console.log('Warming up...');
    const warmupId = await createSessionWithData();
    await sequentialDelete(warmupId);

    // --- Benchmark Sequential Delete ---
    console.log('Starting Sequential Delete Benchmark...');
    const session1Id = await createSessionWithData();
    const start1 = performance.now();
    await sequentialDelete(session1Id);
    const end1 = performance.now();
    const time1 = end1 - start1;
    console.log(`Sequential delete time: ${time1.toFixed(2)}ms`);

    // Verify deletion
    expect(await db.workoutSessions.get(session1Id)).toBeUndefined();
    expect(await db.sessionExerciseGroups.where('workoutSessionId').equals(session1Id).count()).toBe(0);

    // --- Benchmark Bulk Delete ---
    console.log('Starting Bulk Delete Benchmark...');
    const session2Id = await createSessionWithData();
    const start2 = performance.now();
    await bulkDelete(session2Id);
    const end2 = performance.now();
    const time2 = end2 - start2;
    console.log(`Bulk delete time: ${time2.toFixed(2)}ms`);

    // Verify deletion
    expect(await db.workoutSessions.get(session2Id)).toBeUndefined();
    expect(await db.sessionExerciseGroups.where('workoutSessionId').equals(session2Id).count()).toBe(0);
    // Double check orphaned items/sets (should be none)
    // We can't easily check for orphaned items without knowing their IDs, but since we cleared DB, count should be 0 if we ran sequentially.
    // But here we run sequentially so the DB is cleared between tests? No, beforeEach clears it.
    // Wait, createSessionWithData adds to the DB.
    // After delete, the DB should be empty.
    expect(await db.sessionExerciseGroups.count()).toBe(0);
    expect(await db.sessionExerciseItems.count()).toBe(0);
    expect(await db.sessionSets.count()).toBe(0);

    console.log(`Improvement: ${((time1 - time2) / time1 * 100).toFixed(2)}%`);

    // Performance improvement assertion (optional, but good for CI)
    // expect(time2).toBeLessThan(time1);
  });
});
