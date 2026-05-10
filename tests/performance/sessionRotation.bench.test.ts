import { LexoRank } from 'lexorank';

function generateTestRank(index: number) {
  let rank = LexoRank.min().between(LexoRank.middle());
  for(let i=0; i<index; i++) rank = rank.genNext();
  return rank.toString();
}



import 'fake-indexeddb/auto';
import { nanoid } from 'nanoid';
import { describe, it, expect, beforeEach } from 'vitest';

import { PlannedWorkoutStatus, PlannedSessionStatus } from '@/domain/enums';
import dayjs from '@/lib/dayjs';
import { getNextSessionSuggestion } from '@/services/sessionRotation';

import { testDb as db } from '../utils/testHelpers';

describe('sessionRotation benchmark', () => {
  const workoutId = nanoid();
  const sessionIds = [nanoid(), nanoid(), nanoid()];

  beforeEach(async () => {
    await Promise.all(db.tables.map(t => t.clear()));
  });

  it('measures getNextSessionSuggestion performance (Active Frequent)', async () => {
    // Seed Active Workout
    await db.plannedWorkouts.add({
      id: workoutId,
      name: 'Benchmark Workout',
      status: PlannedWorkoutStatus.Active,
      updatedAt: dayjs().toDate(),
    } as any);

    // Seed 3 Planned Sessions
    const sessions = sessionIds.map((id, index) => ({
      id,
      plannedWorkoutId: workoutId,
      name: `Session ${index}`,
      orderIndex: generateTestRank(index),
      status: PlannedSessionStatus.Pending,
      updatedAt: dayjs().toDate(),
    }));
    await db.plannedSessions.bulkAdd(sessions as any);

    // Seed 1000 Completed Sessions for this workout + others interleaved
    const completedSessions = [];
    let currentDate = dayjs('2020-01-01');
    const otherWorkoutId = nanoid();

    for (let i = 0; i < 2000; i++) {
      if (i % 2 === 0) {
        completedSessions.push({
          id: nanoid(),
          plannedWorkoutId: workoutId,
          plannedSessionId: sessionIds[(i / 2) % 3],
          startedAt: currentDate.toDate(),
          completedAt: currentDate.add(12, 'hour').toDate(),
        });
      } else {
        completedSessions.push({
          id: nanoid(),
          plannedWorkoutId: otherWorkoutId,
          startedAt: currentDate.toDate(),
          completedAt: currentDate.add(12, 'hour').toDate(),
        });
      }
      currentDate = currentDate.add(1, 'day');
    }

    await db.workoutSessions.bulkAdd(completedSessions as any);

    const start = performance.now();
    const suggestion = await getNextSessionSuggestion();
    const end = performance.now();
    console.log(`Active Frequent time: ${(end - start).toFixed(2)}ms`);

    expect(suggestion).not.toBeNull();
    expect(suggestion?.session.id).toBe(sessionIds[1]);
  });

  it('measures getNextSessionSuggestion performance (Rare Workout)', async () => {
    // 1 Rare workout session (2 years ago)
    // 1000 Other workout sessions (recent)

    const rareWorkoutId = nanoid();
    await db.plannedWorkouts.add({
      id: rareWorkoutId,
      name: 'Rare Workout',
      status: PlannedWorkoutStatus.Active,
      updatedAt: dayjs().toDate(),
    } as any);
    const rareSessionId = nanoid();
    await db.plannedSessions.add({
      id: rareSessionId,
      plannedWorkoutId: rareWorkoutId,
      name: 'Rare Session',
      orderIndex: generateTestRank(0),
      status: PlannedSessionStatus.Pending,
      updatedAt: dayjs().toDate(),
    } as any);
    // Seed 1 old session for Rare Workout
    await db.workoutSessions.add({
      id: nanoid(),
      plannedWorkoutId: rareWorkoutId,
      plannedSessionId: rareSessionId,
      startedAt: dayjs().subtract(2, 'year').toDate(),
      completedAt: dayjs().subtract(2, 'year').toDate(),
    } as any);

    // Seed 1000 recent sessions for Other Workout
    const otherWorkoutId = nanoid();
    const recentSessions = [];
    let currentDate = dayjs().subtract(1, 'year');
    for (let i = 0; i < 1000; i++) {
      recentSessions.push({
        id: nanoid(),
        plannedWorkoutId: otherWorkoutId,
        startedAt: currentDate.toDate(),
        completedAt: currentDate.add(12, 'hour').toDate(),
      });
      currentDate = currentDate.add(1, 'day');
    }
    await db.workoutSessions.bulkAdd(recentSessions as any);

    const start = performance.now();
    // We need to trick getNextSessionSuggestion to look for rareWorkoutId
    // Since it fetches "Active" workouts, and we added Rare as Active, but we need to ensure it picks Rare.
    // The function picks the first active workout.
    // So we should ensure only Rare is active or clear others.
    // In this test, we cleared DB in beforeEach. So only Rare is Active (from this test setup).

    const suggestion = await getNextSessionSuggestion();
    const end = performance.now();
    console.log(`Rare Workout time: ${(end - start).toFixed(2)}ms`);

    expect(suggestion).not.toBeNull();
    expect(suggestion?.workout.id).toBe(rareWorkoutId);
  });
});
