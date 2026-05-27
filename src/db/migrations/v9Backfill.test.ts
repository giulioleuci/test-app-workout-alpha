import { describe, it, expect } from 'vitest';

import { calculateWeighted1RM } from '@/services/rpePercentageTable';

import { backfillSetE1rm, aggregateSessionTotals } from './v9Backfill';

describe('backfillSetE1rm', () => {
  it('returns undefined when e1rm already present', () => {
    expect(backfillSetE1rm({ e1rm: 100, actualLoad: 100, actualCount: 5, actualRPE: 8, sessionExerciseItemId: 'i' })).toBeUndefined();
  });

  it('returns undefined when load/count missing or non-positive', () => {
    expect(backfillSetE1rm({ actualLoad: 0, actualCount: 5, actualRPE: 8, sessionExerciseItemId: 'i' })).toBeUndefined();
    expect(backfillSetE1rm({ actualLoad: 100, actualCount: null, actualRPE: 8, sessionExerciseItemId: 'i' })).toBeUndefined();
  });

  it('returns undefined when RPE out of [6,10]', () => {
    expect(backfillSetE1rm({ actualLoad: 100, actualCount: 5, actualRPE: 5, sessionExerciseItemId: 'i' })).toBeUndefined();
    expect(backfillSetE1rm({ actualLoad: 100, actualCount: 5, actualRPE: 11, sessionExerciseItemId: 'i' })).toBeUndefined();
  });

  it('computes e1rm matching calculateWeighted1RM media', () => {
    const expected = calculateWeighted1RM(100, 5, 8).media;
    expect(backfillSetE1rm({ actualLoad: 100, actualCount: 5, actualRPE: 8, sessionExerciseItemId: 'i' })).toBe(expected);
  });
});

describe('aggregateSessionTotals', () => {
  const itemToGroup = new Map([['item1', 'group1'], ['item2', 'group1']]);
  const groupToSession = new Map([['group1', 'session1']]);
  const itemToSnapshot = new Map([
    ['item1', { counterType: 'reps', primaryMuscles: ['chest'], secondaryMuscles: ['triceps'] }],
    ['item2', { counterType: 'seconds', primaryMuscles: ['core'], secondaryMuscles: [] }],
  ]);

  it('aggregates reps/load and duration, ignoring incomplete sets', () => {
    const sets = [
      { sessionExerciseItemId: 'item1', isCompleted: true, actualLoad: 100, actualCount: 5 },
      { sessionExerciseItemId: 'item1', isCompleted: true, actualLoad: 50, actualCount: 10 },
      { sessionExerciseItemId: 'item1', isCompleted: false, actualLoad: 999, actualCount: 999 },
      { sessionExerciseItemId: 'item2', isCompleted: true, actualLoad: 0, actualCount: 30 },
    ];
    const result = aggregateSessionTotals(sets, itemToGroup, groupToSession, itemToSnapshot);
    const sd = result.get('session1')!;
    expect(sd.totalSets).toBe(3);
    expect(sd.totalReps).toBe(15);
    expect(sd.totalLoad).toBe(1000);
    expect(sd.totalDuration).toBe(30);
    expect(sd.primaryMuscles.sort()).toEqual(['chest', 'core']);
    expect(sd.secondaryMuscles).toEqual(['triceps']);
  });

  it('converts minutes to seconds', () => {
    const sets = [{ sessionExerciseItemId: 'm1', isCompleted: true, actualCount: 2, actualLoad: 0 }];
    const result = aggregateSessionTotals(
      sets,
      new Map([['m1', 'g']]),
      new Map([['g', 's']]),
      new Map([['m1', { counterType: 'minutes', primaryMuscles: [], secondaryMuscles: [] }]]),
    );
    expect(result.get('s')!.totalDuration).toBe(120);
  });
});
