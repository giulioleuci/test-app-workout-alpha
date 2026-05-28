import { LexoRank } from 'lexorank';
import { describe, it, expect } from 'vitest';

import type { PlannedSet } from '@/domain/entities';
import { CounterType, SetType, ToFailureIndicator } from '@/domain/enums';
import { estimateSetExecutionSeconds, estimateSetBlockSeconds } from '@/services/durationCalculators';

// ─── helpers ──────────────────────────────────────────────────────────────────

let rankCursor = LexoRank.min().between(LexoRank.middle());
const nextRank = () => {
  const r = rankCursor.toString();
  rankCursor = rankCursor.genNext();
  return r;
};

const makeSet = (overrides: Partial<PlannedSet> = {}): PlannedSet => ({
  id: 'ps1',
  plannedExerciseItemId: 'pei1',
  setCountRange: { min: 3, max: 3 },
  countRange: { min: 10, max: 10, toFailure: ToFailureIndicator.None },
  setType: SetType.Working,
  orderIndex: nextRank(),
  ...overrides,
} as PlannedSet);

// ─── estimateSetExecutionSeconds ──────────────────────────────────────────────

describe('estimateSetExecutionSeconds', () => {
  it('estimates reps-based execution at 4 s/rep', () => {
    const set = makeSet({ countRange: { min: 5, max: 10, toFailure: ToFailureIndicator.None } });
    const result = estimateSetExecutionSeconds(set, CounterType.Reps);
    expect(result.minSeconds).toBe(20); // 5 * 4
    expect(result.maxSeconds).toBe(40); // 10 * 4
  });

  it('falls back to 2×min for max when max is null (reps)', () => {
    const set = makeSet({ countRange: { min: 5, max: null, toFailure: ToFailureIndicator.None } });
    const result = estimateSetExecutionSeconds(set, CounterType.Reps);
    expect(result.maxSeconds).toBe(40); // 5 * 2 * 4
  });

  it('estimates seconds-based execution as-is', () => {
    const set = makeSet({ countRange: { min: 30, max: 60, toFailure: ToFailureIndicator.None } });
    const result = estimateSetExecutionSeconds(set, CounterType.Seconds);
    expect(result.minSeconds).toBe(30);
    expect(result.maxSeconds).toBe(60);
  });

  it('estimates minutes-based execution in seconds', () => {
    const set = makeSet({ countRange: { min: 1, max: 2, toFailure: ToFailureIndicator.None } });
    const result = estimateSetExecutionSeconds(set, CounterType.Minutes);
    expect(result.minSeconds).toBe(60);
    expect(result.maxSeconds).toBe(120);
  });

  it('estimates distance in km', () => {
    const set = makeSet({ countRange: { min: 1, max: 2, toFailure: ToFailureIndicator.None } });
    const result = estimateSetExecutionSeconds(set, CounterType.DistanceKMeter);
    expect(result.minSeconds).toBe(1 * 5 * 60);
    expect(result.maxSeconds).toBe(2 * 10 * 60);
  });

  it('estimates distance in meters', () => {
    const set = makeSet({ countRange: { min: 1000, max: 2000, toFailure: ToFailureIndicator.None } });
    const result = estimateSetExecutionSeconds(set, CounterType.DistanceMeter);
    expect(result.minSeconds).toBe(5 * 60); // 1000m = 1km
    expect(result.maxSeconds).toBe(2 * 10 * 60); // 2km
  });
});

// ─── estimateSetBlockSeconds ─────────────────────────────────────────────────

describe('estimateSetBlockSeconds', () => {
  it('calculates a simple block: sets × execution + rest between sets', () => {
    const set = makeSet({
      setCountRange: { min: 3, max: 3 },
      countRange: { min: 10, max: 10, toFailure: ToFailureIndicator.None },
      restSecondsRange: { min: 60, max: 60, isFixed: true },
    });
    const result = estimateSetBlockSeconds(set, CounterType.Reps);
    // exec per set = 10*4 = 40s; 3 sets = 3*40 + 2*60 rest = 120 + 120 = 240
    expect(result.minSeconds).toBe(240);
    expect(result.maxSeconds).toBe(240);
  });

  it('uses DEFAULT_REST_SECONDS when restSecondsRange is absent', () => {
    const set = makeSet({
      setCountRange: { min: 2, max: 2 },
      countRange: { min: 5, max: 5, toFailure: ToFailureIndicator.None },
    });
    const result = estimateSetBlockSeconds(set, CounterType.Reps);
    // exec = 5*4 = 20s; 2 sets = 2*20 + 1*90 = 130
    expect(result.minSeconds).toBe(130);
  });

  it('uses max set count for maxSeconds', () => {
    const set = makeSet({
      setCountRange: { min: 2, max: 4 },
      countRange: { min: 5, max: 10, toFailure: ToFailureIndicator.None },
      restSecondsRange: { min: 60, max: 90, isFixed: false },
    });
    const result = estimateSetBlockSeconds(set, CounterType.Reps);
    // minSeconds: 2*20 + 1*60 = 100
    expect(result.minSeconds).toBe(100);
    // maxSeconds: 4*40 + 3*90 = 160+270=430
    expect(result.maxSeconds).toBe(430);
  });

  it('calculates cluster set block correctly', () => {
    const set = makeSet({
      setCountRange: { min: 2, max: 2 },
      restSecondsRange: { min: 180, max: 180, isFixed: true },
    });
    const clusterParams = {
      miniSetReps: 3,
      miniSetCount: 4,
      interMiniSetRestSeconds: 15,
    };
    const result = estimateSetBlockSeconds(set, CounterType.Reps, clusterParams);
    // oneCluster = 4 * (3*4) + (4-1)*15 = 48 + 45 = 93
    // 2 clusters: 2*93 + 1*180 = 186 + 180 = 366
    expect(result.minSeconds).toBe(366);
    expect(result.maxSeconds).toBe(366);
  });

  it('no rest for single set block', () => {
    const set = makeSet({
      setCountRange: { min: 1, max: 1 },
      countRange: { min: 10, max: 10, toFailure: ToFailureIndicator.None },
      restSecondsRange: { min: 90, max: 90, isFixed: true },
    });
    const result = estimateSetBlockSeconds(set, CounterType.Reps);
    // 1 set: 1*40 + max(0, 0)*90 = 40
    expect(result.minSeconds).toBe(40);
    expect(result.maxSeconds).toBe(40);
  });
});
