import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { WorkoutSession, SessionExerciseGroup, SessionExerciseItem, SessionSet } from '@/domain/entities';
import dayjs from '@/lib/dayjs';
import { discardSession } from '@/services/sessionFinisher';

import { testDb as db } from '../../utils/testHelpers';

describe('discardSession', () => {
  beforeEach(async () => {
    await db.open();
    await db.workoutSessions.clear();
    await db.sessionExerciseGroups.clear();
    await db.sessionExerciseItems.clear();
    await db.sessionSets.clear();
  });

  afterEach(async () => {
    // await db.delete();
  });

  it('should completely remove a session and all its related data', async () => {
    // 1. Setup Data
    const sessionId = 'session-123';
    const groupId = 'group-1';
    const itemId = 'item-1';
    const setId = 'set-1';

    await db.workoutSessions.add({
      id: sessionId,
      startedAt: dayjs().toDate(),
    } as WorkoutSession);

    await db.sessionExerciseGroups.add({
      id: groupId,
      workoutSessionId: sessionId,
    } as SessionExerciseGroup);

    await db.sessionExerciseItems.add({
      id: itemId,
      sessionExerciseGroupId: groupId,
    } as SessionExerciseItem);

    await db.sessionSets.add({
      id: setId,
      sessionExerciseItemId: itemId,
      isCompleted: true,
    } as SessionSet);

    // Verify data exists
    expect(await db.workoutSessions.count()).toBe(1);
    expect(await db.sessionExerciseGroups.count()).toBe(1);
    expect(await db.sessionExerciseItems.count()).toBe(1);
    expect(await db.sessionSets.count()).toBe(1);

    // 2. Call discardSession
    await discardSession(sessionId);

    // 3. Verify data is removed
    expect(await db.workoutSessions.count()).toBe(0);
    expect(await db.sessionExerciseGroups.count()).toBe(0);
    expect(await db.sessionExerciseItems.count()).toBe(0);
    expect(await db.sessionSets.count()).toBe(0);
  });

  it('should handle session with multiple groups and items', async () => {
    const sessionId = 'session-multi';

    // Create 2 groups
    const g1 = 'g1';
    const g2 = 'g2';

    // Create items for each group
    const i1 = 'i1'; // in g1
    const i2 = 'i2'; // in g1
    const i3 = 'i3'; // in g2

    // Create sets
    const s1 = 's1'; // in i1
    const s2 = 's2'; // in i2
    const s3 = 's3'; // in i3

    await db.workoutSessions.add({ id: sessionId } as WorkoutSession);

    await db.sessionExerciseGroups.bulkAdd([
      { id: g1, workoutSessionId: sessionId },
      { id: g2, workoutSessionId: sessionId }
    ] as SessionExerciseGroup[]);

    await db.sessionExerciseItems.bulkAdd([
      { id: i1, sessionExerciseGroupId: g1 },
      { id: i2, sessionExerciseGroupId: g1 },
      { id: i3, sessionExerciseGroupId: g2 }
    ] as SessionExerciseItem[]);

    await db.sessionSets.bulkAdd([
        { id: s1, sessionExerciseItemId: i1 },
        { id: s2, sessionExerciseItemId: i2 },
        { id: s3, sessionExerciseItemId: i3 }
    ] as SessionSet[]);

    expect(await db.workoutSessions.count()).toBe(1);
    expect(await db.sessionExerciseGroups.count()).toBe(2);
    expect(await db.sessionExerciseItems.count()).toBe(3);
    expect(await db.sessionSets.count()).toBe(3);

    await discardSession(sessionId);

    expect(await db.workoutSessions.count()).toBe(0);
    expect(await db.sessionExerciseGroups.count()).toBe(0);
    expect(await db.sessionExerciseItems.count()).toBe(0);
    expect(await db.sessionSets.count()).toBe(0);
  });

  it('should handle session with no groups', async () => {
    const sessionId = 'session-empty';
    await db.workoutSessions.add({ id: sessionId } as WorkoutSession);

    await discardSession(sessionId);

    expect(await db.workoutSessions.count()).toBe(0);
  });
});
