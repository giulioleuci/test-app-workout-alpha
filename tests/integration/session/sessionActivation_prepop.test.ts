import { LexoRank } from 'lexorank';

function generateTestRank(index: number) {
  let rank = LexoRank.min().between(LexoRank.middle());
  for (let i = 0; i < index; i++) rank = rank.genNext();
  return rank.toString();
}


import 'fake-indexeddb/auto';
import { nanoid } from 'nanoid';
import { describe, it, expect, beforeEach } from 'vitest';

import { ExerciseGroupType, SetType, ToFailureIndicator } from '@/domain/enums';
import dayjs from '@/lib/dayjs';
import { activateSession } from '@/services/sessionActivation';

import { testDb as db } from '../../utils/testHelpers';

describe('activateSession with history prepopulation', () => {
  const exerciseId = 'ex-1';
  const exerciseId2 = 'ex-2';
  const plannedSessionId = 'ps-1';
  const plannedWorkoutId = 'pw-1';

  beforeEach(async () => {
    await db.delete();
    await db.open();

    // Seed exercises
    await db.exercises.bulkPut([
      {
        id: exerciseId,
        name: 'Bench Press',
        primaryMuscles: [],
        secondaryMuscles: [],
        equipment: [],
        movementPattern: 'horizontalPush' as any,
        counterType: 'reps' as any,
        defaultLoadUnit: 'kg',
        createdAt: dayjs().toDate(),
        updatedAt: dayjs().toDate(),
      } as any,
      {
        id: exerciseId2,
        name: 'Squat',
        primaryMuscles: [],
        secondaryMuscles: [],
        equipment: [],
        movementPattern: 'squat' as any,
        counterType: 'reps' as any,
        defaultLoadUnit: 'kg',
        createdAt: dayjs().toDate(),
        updatedAt: dayjs().toDate(),
      } as any
    ]);
  });

  // Flexible helper to create a planned session with multiple items
  async function createPlannedSessionWithItems(items: {
    itemId: string,
    exerciseId: string,
    sets: { type: SetType, min: number }[],
    orderIndex?: string
  }[]) {
    await db.plannedSessions.put({
      id: plannedSessionId,
      plannedWorkoutId,
      name: 'Test Session',
      dayNumber: 1,
      focusMuscleGroups: [],
      status: 'active' as any,
      orderIndex: generateTestRank(0),
      createdAt: dayjs().toDate(),
      updatedAt: dayjs().toDate(),
    } as any);

    const groupId = 'pg-1';
    await db.plannedExerciseGroups.put({
      id: groupId,
      plannedSessionId,
      groupType: ExerciseGroupType.Standard,
      orderIndex: generateTestRank(0),
    });

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await db.plannedExerciseItems.put({
        id: item.itemId,
        plannedExerciseGroupId: groupId,
        exerciseId: item.exerciseId,
        counterType: 'reps' as any,
        orderIndex: item.orderIndex ?? generateTestRank(i),
      });

      for (let j = 0; j < item.sets.length; j++) {
        await db.plannedSets.put({
          id: `ps-${item.itemId}-${j}`,
          plannedExerciseItemId: item.itemId,
          setCountRange: { min: item.sets[j].min },
          countRange: { min: 10, max: 10, toFailure: ToFailureIndicator.None },
          setType: item.sets[j].type,

          orderIndex: generateTestRank(j),
        } as any);
      }
    }
  }

  // Flexible helper to create a historical session with multiple items
  async function createHistoricalSessionWithItems(
    items: {
      plannedItemId?: string, // To simulate Tier 1 matching
      exerciseId: string,
      sets: { type: SetType, load: number, count: number }[],
      orderIndex?: string
    }[],
    plannedSessionIdOverride = 'other-plan'
  ) {
    const sessionId = nanoid();
    const now = dayjs();
    const completedAt = now.subtract(100, 'second');

    await db.workoutSessions.put({
      id: sessionId,
      plannedSessionId: plannedSessionIdOverride,
      startedAt: completedAt.subtract(1, 'hour').toDate(),
      completedAt: completedAt.toDate(),
    } as any);

    const groupId = nanoid();
    await db.sessionExerciseGroups.put({
      id: groupId,
      workoutSessionId: sessionId,
      groupType: ExerciseGroupType.Standard,
      orderIndex: generateTestRank(0),
      isCompleted: true,
    });

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemId = nanoid();
      await db.sessionExerciseItems.put({
        id: itemId,
        sessionExerciseGroupId: groupId,
        plannedExerciseItemId: item.plannedItemId,
        exerciseId: item.exerciseId,
        orderIndex: item.orderIndex ?? generateTestRank(i),
        isCompleted: true,
        completedAt: completedAt.toDate(),
      });

      for (let j = 0; j < item.sets.length; j++) {
        await db.sessionSets.put({
          id: nanoid(),
          sessionExerciseItemId: itemId,
          setType: item.sets[j].type,
          orderIndex: generateTestRank(j),
          actualLoad: item.sets[j].load,
          actualCount: item.sets[j].count,
          actualRPE: 8,
          actualToFailure: ToFailureIndicator.None,
          isCompleted: true,
          isSkipped: false,
          partials: false,
          forcedReps: 0,
        } as any);
      }
    }
  }

  async function getSetsForSession(sessionId: string) {
    const groups = await db.sessionExerciseGroups.where('workoutSessionId').equals(sessionId).toArray();
    const groupIds = groups.map(g => g.id);
    const items = await db.sessionExerciseItems
      .where('sessionExerciseGroupId').anyOf(groupIds)
      .sortBy('orderIndex');

    const result = [];
    for (const item of items) {
      const sets = await db.sessionSets
        .where('sessionExerciseItemId').equals(item.id)
        .sortBy('orderIndex');
      result.push({ item, sets });
    }
    return result;
  }

  // --- Tests ---

  it('should prepopulate sets from history when counts match', async () => {
    await createPlannedSessionWithItems([{ itemId: 'pi-1', exerciseId, sets: [{ type: SetType.Working, min: 1 }] }]);
    await createHistoricalSessionWithItems([{ exerciseId, sets: [{ type: SetType.Working, load: 100, count: 5 }] }]);

    const sessionId = await activateSession(plannedSessionId);
    const results = await getSetsForSession(sessionId);

    expect(results).toHaveLength(1);
    expect(results[0].sets[0].actualLoad).toBe(100);
  });

  it('should increase set count if history has more sets', async () => {
    await createPlannedSessionWithItems([{ itemId: 'pi-1', exerciseId, sets: [{ type: SetType.Working, min: 1 }] }]);
    await createHistoricalSessionWithItems([{
      exerciseId,
      sets: [
        { type: SetType.Working, load: 100, count: 5 },
        { type: SetType.Working, load: 100, count: 5 },
        { type: SetType.Working, load: 100, count: 5 }
      ]
    }]);

    const sessionId = await activateSession(plannedSessionId);
    const results = await getSetsForSession(sessionId);

    expect(results[0].sets).toHaveLength(3);
  });

  it('should respect plan min count if history has fewer sets', async () => {
    await createPlannedSessionWithItems([{ itemId: 'pi-1', exerciseId, sets: [{ type: SetType.Working, min: 3 }] }]);
    await createHistoricalSessionWithItems([{ exerciseId, sets: [{ type: SetType.Working, load: 100, count: 5 }] }]);

    const sessionId = await activateSession(plannedSessionId);
    const results = await getSetsForSession(sessionId);

    expect(results[0].sets).toHaveLength(3);
    expect(results[0].sets[0].actualLoad).toBe(100);
    expect(results[0].sets[1].actualLoad).toBeNull();
  });

  it('should correctly handle mixed set types (Warmup vs Working)', async () => {
    await createPlannedSessionWithItems([{
      itemId: 'pi-1',
      exerciseId,
      sets: [
        { type: SetType.Warmup, min: 1 },
        { type: SetType.Working, min: 1 }
      ]
    }]);
    await createHistoricalSessionWithItems([{
      exerciseId,
      sets: [
        { type: SetType.Warmup, load: 50, count: 10 },
        { type: SetType.Working, load: 100, count: 5 }
      ]
    }]);

    const sessionId = await activateSession(plannedSessionId);
    const results = await getSetsForSession(sessionId);

    expect(results[0].sets[0].setType).toBe(SetType.Warmup);
    expect(results[0].sets[0].actualLoad).toBe(50);
    expect(results[0].sets[1].setType).toBe(SetType.Working);
    expect(results[0].sets[1].actualLoad).toBe(100);
  });

  it('Tier 1: should match specific slots when plan is reused (Duplicate Exercises)', async () => {
    // Plan: Two Bench Press slots
    await createPlannedSessionWithItems([
      { itemId: 'slot-A', exerciseId, sets: [{ type: SetType.Working, min: 1 }] },
      { itemId: 'slot-B', exerciseId, sets: [{ type: SetType.Working, min: 1 }] }
    ]);

    // History: Previous execution of SAME plan
    await createHistoricalSessionWithItems(
      [
        { plannedItemId: 'slot-A', exerciseId, sets: [{ type: SetType.Working, load: 100, count: 5 }] },
        { plannedItemId: 'slot-B', exerciseId, sets: [{ type: SetType.Working, load: 80, count: 8 }] }
      ],
      plannedSessionId
    );

    const sessionId = await activateSession(plannedSessionId);
    const results = await getSetsForSession(sessionId);

    expect(results).toHaveLength(2);
    // Slot A (Index 0) should get 100kg
    expect(results[0].item.plannedExerciseItemId).toBe('slot-A');
    expect(results[0].sets[0].actualLoad).toBe(100);

    // Slot B (Index 1) should get 80kg
    expect(results[1].item.plannedExerciseItemId).toBe('slot-B');
    expect(results[1].sets[0].actualLoad).toBe(80);
  });

  it('Tier 2 Fallback: should match by occurrence index when plannedItemId does not match', async () => {
    // New Plan: Two Bench Press slots (New IDs)
    await createPlannedSessionWithItems([
      { itemId: 'new-A', exerciseId, sets: [{ type: SetType.Working, min: 1 }] },
      { itemId: 'new-B', exerciseId, sets: [{ type: SetType.Working, min: 1 }] }
    ]);

    // History: Previous session (different plan) with 2 Bench Press items
    await createHistoricalSessionWithItems(
      [
        { exerciseId, sets: [{ type: SetType.Working, load: 100, count: 10 }] }, // Occurrence 0
        { exerciseId, sets: [{ type: SetType.Working, load: 80, count: 10 }] }   // Occurrence 1
      ],
      'old-plan'
    );

    const sessionId = await activateSession(plannedSessionId);
    const results = await getSetsForSession(sessionId);

    expect(results).toHaveLength(2);
    expect(results[0].sets[0].actualLoad).toBe(100);
    expect(results[1].sets[0].actualLoad).toBe(80);
  });

  it('Tier 2 Fallback: Positional Symmetry with Mixed Exercises', async () => {
    // History: Bench (A), Squat (B), Bench (C)
    await createHistoricalSessionWithItems(
      [
        { exerciseId, sets: [{ type: SetType.Working, load: 100, count: 5 }] }, // Bench #1
        { exerciseId: exerciseId2, sets: [{ type: SetType.Working, load: 150, count: 5 }] }, // Squat #1
        { exerciseId, sets: [{ type: SetType.Working, load: 90, count: 5 }] } // Bench #2
      ],
      'old-plan'
    );

    // New Plan: Bench (X), Bench (Y) (No Squat)
    await createPlannedSessionWithItems([
      { itemId: 'new-X', exerciseId, sets: [{ type: SetType.Working, min: 1 }] },
      { itemId: 'new-Y', exerciseId, sets: [{ type: SetType.Working, min: 1 }] }
    ]);

    const sessionId = await activateSession(plannedSessionId);
    const results = await getSetsForSession(sessionId);

    expect(results).toHaveLength(2);
    // new-X (Bench #1) should match Bench #1 from history (100kg)
    expect(results[0].sets[0].actualLoad).toBe(100);

    // new-Y (Bench #2) should match Bench #2 from history (90kg)
    expect(results[1].sets[0].actualLoad).toBe(90);
  });

  it('Tier 2: Fewer occurrences in history', async () => {
    // History: 1 Bench Press (100kg)
    await createHistoricalSessionWithItems(
      [{ exerciseId, sets: [{ type: SetType.Working, load: 100, count: 5 }] }],
      'old-plan'
    );

    // Plan: 2 Bench Press items
    await createPlannedSessionWithItems([
      { itemId: 'new-1', exerciseId, sets: [{ type: SetType.Working, min: 1 }] },
      { itemId: 'new-2', exerciseId, sets: [{ type: SetType.Working, min: 1 }] }
    ]);

    const sessionId = await activateSession(plannedSessionId);
    const results = await getSetsForSession(sessionId);

    // 1st Item -> Matches history
    expect(results[0].sets[0].actualLoad).toBe(100);

    // 2nd Item -> No history available -> Empty/Null
    expect(results[1].sets[0].actualLoad).toBeNull();
  });

  it('Tier 2: No history', async () => {
    // Plan: 1 Bench Press
    await createPlannedSessionWithItems([
      { itemId: 'new-1', exerciseId, sets: [{ type: SetType.Working, min: 1 }] }
    ]);

    const sessionId = await activateSession(plannedSessionId);
    const results = await getSetsForSession(sessionId);

    expect(results[0].sets[0].actualLoad).toBeNull();
  });
});
