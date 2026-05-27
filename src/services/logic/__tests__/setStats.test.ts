import { describe, it, expect } from 'vitest';

import type { SessionSet } from '@/domain/entities';
import { ToFailureIndicator, SetType } from '@/domain/enums';

import { calculateWeighted1RM } from '../../rpePercentageTable';
import {
  isCompletedSet, isEffectiveSet, filterCompleted, filterEffective,
  setVolume, totalVolume, computeSetEstimates,
} from '../setStats';

function makeSet(overrides: Partial<SessionSet> = {}): SessionSet {
  return {
    id: 'x',
    sessionExerciseItemId: 'i',
    setType: SetType.Working,
    orderIndex: 'a',
    actualLoad: null,
    actualCount: null,
    actualRPE: null,
    actualToFailure: ToFailureIndicator.NotToFailure,
    expectedRPE: null,
    isCompleted: false,
    isSkipped: false,
    partials: false,
    forcedReps: 0,
    ...overrides,
  };
}

describe('set predicates', () => {
  it('isCompletedSet reflects isCompleted', () => {
    expect(isCompletedSet(makeSet({ isCompleted: true }))).toBe(true);
    expect(isCompletedSet(makeSet({ isCompleted: false }))).toBe(false);
  });

  it('isEffectiveSet requires completed and not skipped', () => {
    expect(isEffectiveSet(makeSet({ isCompleted: true, isSkipped: false }))).toBe(true);
    expect(isEffectiveSet(makeSet({ isCompleted: true, isSkipped: true }))).toBe(false);
    expect(isEffectiveSet(makeSet({ isCompleted: false, isSkipped: false }))).toBe(false);
  });

  it('filterCompleted / filterEffective select the right subsets', () => {
    const sets = [
      makeSet({ id: '1', isCompleted: true, isSkipped: false }),
      makeSet({ id: '2', isCompleted: true, isSkipped: true }),
      makeSet({ id: '3', isCompleted: false, isSkipped: false }),
    ];
    expect(filterCompleted(sets).map(s => s.id)).toEqual(['1', '2']);
    expect(filterEffective(sets).map(s => s.id)).toEqual(['1']);
  });
});

describe('volume', () => {
  it('setVolume multiplies load × count, treating null as 0', () => {
    expect(setVolume(makeSet({ actualLoad: 100, actualCount: 5 }))).toBe(500);
    expect(setVolume(makeSet({ actualLoad: null, actualCount: 5 }))).toBe(0);
    expect(setVolume(makeSet({ actualLoad: 100, actualCount: null }))).toBe(0);
  });

  it('totalVolume sums set volumes', () => {
    const sets = [
      makeSet({ actualLoad: 100, actualCount: 5 }),
      makeSet({ actualLoad: 50, actualCount: 10 }),
    ];
    expect(totalVolume(sets)).toBe(1000);
  });
});

describe('computeSetEstimates', () => {
  it('returns empty object when load/reps/rpe are missing or non-positive', () => {
    expect(computeSetEstimates(null, 5, 8)).toEqual({});
    expect(computeSetEstimates(100, null, 8)).toEqual({});
    expect(computeSetEstimates(100, 5, null)).toEqual({});
    expect(computeSetEstimates(0, 5, 8)).toEqual({});
  });

  it('matches calculateWeighted1RM media for e1rm', () => {
    const expected = calculateWeighted1RM(100, 5, 8).media;
    expect(computeSetEstimates(100, 5, 8).e1rm).toBe(expected);
  });

  it('computes relativeIntensity when a positive bodyWeight is given', () => {
    const e1rm = calculateWeighted1RM(100, 5, 8).media;
    const result = computeSetEstimates(100, 5, 8, 80);
    expect(result.relativeIntensity).toBe(Math.round((e1rm / 80) * 100) / 100);
  });

  it('omits relativeIntensity when bodyWeight is missing or zero', () => {
    expect(computeSetEstimates(100, 5, 8).relativeIntensity).toBeUndefined();
    expect(computeSetEstimates(100, 5, 8, 0).relativeIntensity).toBeUndefined();
  });
});
