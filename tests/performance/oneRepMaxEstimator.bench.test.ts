import 'fake-indexeddb/auto';
import { nanoid } from 'nanoid';
import { describe, it, expect, beforeEach } from 'vitest';

import { SetType, ToFailureIndicator } from '@/domain/enums';
import dayjs from '@/lib/dayjs';
import { estimateFromHistoryForExercise } from '@/services/oneRepMaxEstimator';
import { calculateWeighted1RM } from '@/services/rpePercentageTable';

import { testDb as db } from '../utils/testHelpers';

async function originalEstimateFromHistoryForExercise(exerciseId: string): Promise<number | null> {
  const items = await db.sessionExerciseItems
    .where('exerciseId').equals(exerciseId).toArray();
  if (items.length === 0) return null;

  let best: number | null = null;
  let bestDate = dayjs(0);

  for (const item of items) {
    const sets = await db.sessionSets
      .where('sessionExerciseItemId').equals(item.id)
      .filter(s => s.isCompleted && !s.isSkipped &&
        s.actualLoad != null && s.actualLoad > 0 &&
        s.actualCount != null && s.actualCount > 0 &&
        s.actualRPE != null && s.actualRPE >= 6 && s.actualRPE <= 10)
      .toArray();
    for (const s of sets) {
      const date = s.completedAt ? dayjs(s.completedAt) : dayjs(0);
      if (date.isAfter(bestDate)) {
        const est = calculateWeighted1RM(s.actualLoad!, s.actualCount!, s.actualRPE!).media;
        if (est && est > 0) { best = est; bestDate = date; }
      }
    }
  }
  return best;
}

describe('1RM Estimator Performance', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map(t => t.clear()));
  });

  it('measures N+1 vs anyOf optimization', async () => {
    const exerciseId = nanoid();
    // Increase data size to make difference more noticeable
    const numItems = 10;
    const setsPerItem = 5;

    const items = [];
    const sets = [];

    for (let i = 0; i < numItems; i++) {
      const itemId = nanoid();
      const itemCompletedAt = dayjs().subtract(numItems - i, 'day').toDate();
      items.push({
        id: itemId,
        exerciseId,
        sessionExerciseGroupId: nanoid(),
        orderIndex: i,
        isCompleted: true,
        completedAt: itemCompletedAt
      });

      for (let j = 0; j < setsPerItem; j++) {
        sets.push({
          id: nanoid(),
          sessionExerciseItemId: itemId,
          setType: SetType.Working,
          orderIndex: j,
          actualLoad: 100,
          actualCount: 5,
          actualRPE: 8, // valid RPE (6-10)
          actualToFailure: ToFailureIndicator.None,
          expectedRPE: 8,
          isCompleted: true,
          isSkipped: false,
          partials: false,
          forcedReps: 0,
          completedAt: itemCompletedAt
        });
      }
    }

    await db.sessionExerciseItems.bulkAdd(items);
    await db.sessionSets.bulkAdd(sets);

    const startOriginal = performance.now();
    const resOriginal = await originalEstimateFromHistoryForExercise(exerciseId);
    const endOriginal = performance.now();
    const timeOriginal = endOriginal - startOriginal;

    const startOptimized = performance.now();
    const resOptimized = await estimateFromHistoryForExercise(exerciseId);
    const endOptimized = performance.now();
    const timeOptimized = endOptimized - startOptimized;

    console.log(`Original Time: ${timeOriginal.toFixed(2)}ms`);
    console.log(`Optimized Time: ${timeOptimized.toFixed(2)}ms`);
    console.log(`Improvement: ${((timeOriginal - timeOptimized) / timeOriginal * 100).toFixed(2)}%`);

    expect(resOriginal).toBe(resOptimized);
    expect(resOriginal).not.toBeNull();

    // Ensure the result is actually calculated
    const expectedEst = calculateWeighted1RM(100, 5, 8).media;
    expect(resOriginal).toBe(expectedEst);
  });
});
