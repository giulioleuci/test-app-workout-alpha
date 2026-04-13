import { LexoRank } from 'lexorank';

function generateTestRank(index: number) {
  let rank = LexoRank.min().between(LexoRank.middle());
  for(let i=0; i<index; i++) rank = rank.genNext();
  return rank.toString();
}



import 'fake-indexeddb/auto';
import { nanoid } from 'nanoid';
import { describe, it, expect, beforeEach } from 'vitest';

import { CounterType, ExerciseGroupType, SetType } from '@/domain/enums';
import { estimateGroupDuration } from '@/services/durationEstimator';

import { testDb as db } from '../utils/testHelpers';

describe('estimateGroupDuration benchmark', () => {
  const groupId = nanoid();

  beforeEach(async () => {
    await Promise.all(db.tables.map(t => t.clear()));

    const items = [];
    const sets = [];

    await db.plannedExerciseGroups.add({
      id: groupId,
      plannedSessionId: 'session1',
      groupType: ExerciseGroupType.Standard,
      orderIndex: generateTestRank(0),
    } as any);

    // Create 500 items in the group to exacerbate the N+1 problem
    for (let i = 0; i < 500; i++) {
      const itemId = nanoid();
      items.push({
        id: itemId,
        plannedExerciseGroupId: groupId,
        exerciseId: 'ex1',
        orderIndex: i,
        counterType: CounterType.Reps,
      });

      for (let st = 0; st < 3; st++) {
        sets.push({
          id: nanoid(),
          plannedExerciseItemId: itemId,
          orderIndex: st,
          setType: SetType.Working,
          countRange: { min: 8, max: 12 },
          restSecondsRange: { min: 60, max: 60 },
          setCountRange: { min: 1, max: 1 },
        });
      }
    }

    await db.plannedExerciseItems.bulkAdd(items as any);
    await db.plannedSets.bulkAdd(sets as any);
  });

  it('measures estimateGroupDuration performance', async () => {
    const start = performance.now();
    const duration = await estimateGroupDuration(groupId);
    const end = performance.now();
    console.log(`estimateGroupDuration time: ${(end - start).toFixed(2)}ms`);

    expect(duration.minSeconds).toBeGreaterThan(0);
  });
});
