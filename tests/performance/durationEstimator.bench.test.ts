import { LexoRank } from 'lexorank';
function generateTestRank(index: number) { let rank = LexoRank.min().between(LexoRank.middle()); for(let i=0; i<index; i++) rank = rank.genNext(); return rank.toString(); }

import 'fake-indexeddb/auto';
import { nanoid } from 'nanoid';
import { describe, it, expect, beforeEach } from 'vitest';

import { CounterType, ExerciseGroupType, SetType } from '@/domain/enums';
import { estimateWorkoutDuration } from '@/services/durationEstimator';

import { testDb as db } from '../utils/testHelpers';

describe('estimateWorkoutDuration benchmark', () => {
  const workoutId = nanoid();

  beforeEach(async () => {
    await Promise.all(db.tables.map(t => t.clear()));

    // Seed data
    const sessions = [];
    const groups = [];
    const items = [];
    const sets = [];

    // 1 Workout, 20 Sessions (to make the N+1 pain felt), 3 Groups/Session, 3 Items/Group, 3 Sets/Item
    // Total: 20 sessions, 60 groups, 180 items, 540 sets.

    await db.plannedWorkouts.add({
      id: workoutId,
      name: 'Benchmark Workout',
    } as any);

    for (let s = 0; s < 20; s++) {
      const sessionId = nanoid();
      sessions.push({
        id: sessionId,
        plannedWorkoutId: workoutId,
        name: `Session ${s}`,
        orderIndex: generateTestRank(s),
      });

      for (let g = 0; g < 3; g++) {
        const groupId = nanoid();
        groups.push({
          id: groupId,
          plannedSessionId: sessionId,
          groupType: ExerciseGroupType.Standard,
          orderIndex: generateTestRank(g),
        });

        for (let i = 0; i < 3; i++) {
          const itemId = nanoid();
          items.push({
            id: itemId,
            plannedExerciseGroupId: groupId,
            exerciseId: 'ex1', // dummy
            orderIndex: generateTestRank(i),
            counterType: CounterType.Reps,
          });

          for (let st = 0; st < 3; st++) {
            sets.push({
              id: nanoid(),
              plannedExerciseItemId: itemId,
              orderIndex: generateTestRank(st),
              setType: SetType.Working,
              countRange: { min: 8, max: 12 },
              restSecondsRange: { min: 60, max: 60 },
              setCountRange: { min: 1, max: 1 },
            });
          }
        }
      }
    }

    await db.plannedSessions.bulkAdd(sessions as any);
    await db.plannedExerciseGroups.bulkAdd(groups as any);
    await db.plannedExerciseItems.bulkAdd(items as any);
    await db.plannedSets.bulkAdd(sets as any);
  });

  it('measures estimateWorkoutDuration performance', async () => {
    const start = performance.now();
    const duration = await estimateWorkoutDuration(workoutId);
    const end = performance.now();
    console.log(`estimateWorkoutDuration time: ${(end - start).toFixed(2)}ms`);
    console.log(`Estimated duration:`, duration);

    expect(duration.minSeconds).toBeGreaterThan(0);
  });
});
