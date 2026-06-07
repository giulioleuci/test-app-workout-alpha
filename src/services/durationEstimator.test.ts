
import { describe, it, expect } from 'vitest';
import { estimateGroupDurationFromData } from './durationEstimator';
import { ExerciseGroupType, CounterType, SetType, ToFailureIndicator } from '@/domain/enums';

describe('durationEstimator bug hunting', () => {
  it('should correctly calculate duration for a standard group with 3 sets', () => {
    const mockSets = [
      {
        id: 's1',
        plannedExerciseItemId: 'i1',
        setCountRange: { min: 3, max: 3 },
        countRange: { min: 10, max: 10, toFailure: ToFailureIndicator.None },
        restSecondsRange: { min: 60, max: 60, isFixed: true },
        setType: SetType.Working,
        orderIndex: 'a',
      }
    ];

    const itemsData = [
      {
        counterType: CounterType.Reps,
        sets: mockSets,
      }
    ];

    const duration = estimateGroupDurationFromData(ExerciseGroupType.Standard, itemsData);
    // 3 sets * 40s + 2 rests * 60s = 120 + 120 = 240s
    expect(duration.minSeconds).toBe(240);
  });

  it('should correctly calculate duration for a superset with 0s rest between exercises', () => {
    const curlSets = [
      {
        id: 's1',
        plannedExerciseItemId: 'curl',
        setCountRange: { min: 3, max: 3 },
        countRange: { min: 10, max: 10, toFailure: ToFailureIndicator.None },
        restSecondsRange: { min: 0, max: 0, isFixed: true },
        setType: SetType.Working,
        orderIndex: 'a',
      }
    ];

    const frenchSets = [
      {
        id: 's2',
        plannedExerciseItemId: 'french',
        setCountRange: { min: 3, max: 3 },
        countRange: { min: 10, max: 10, toFailure: ToFailureIndicator.None },
        restSecondsRange: { min: 90, max: 90, isFixed: true },
        setType: SetType.Working,
        orderIndex: 'a',
      }
    ];

    const itemsData = [
      { counterType: CounterType.Reps, sets: curlSets },
      { counterType: CounterType.Reps, sets: frenchSets }
    ];

    const duration = estimateGroupDurationFromData(ExerciseGroupType.Superset, itemsData);
    // Manual:
    // Round 1: Curl(40) + 5s + French(40) + 90s
    // Round 2: Curl(40) + 5s + French(40) + 90s
    // Round 3: Curl(40) + 5s + French(40)
    // Total: 3*40 + 3*5 + 3*40 + 2*90 = 120 + 15 + 120 + 180 = 435s
    expect(duration.minSeconds).toBe(435);
  });

  it('should correctly calculate max duration for a standard group with a range of sets', () => {
    const mockSets = [
      {
        id: 's1',
        plannedExerciseItemId: 'i1',
        setCountRange: { min: 3, max: 5 },
        countRange: { min: 10, max: 10, toFailure: ToFailureIndicator.None },
        restSecondsRange: { min: 60, max: 60, isFixed: true },
        setType: SetType.Working,
        orderIndex: 'a',
      }
    ];

    const itemsData = [
      {
        counterType: CounterType.Reps,
        sets: mockSets,
      }
    ];

    const duration = estimateGroupDurationFromData(ExerciseGroupType.Standard, itemsData);
    // Min: 3 sets * 40s + 2 rests * 60s = 120 + 120 = 240s
    // Max: 5 sets * 40s + 4 rests * 60s = 200 + 240 = 440s
    expect(duration.minSeconds).toBe(240);
    expect(duration.maxSeconds).toBe(440);
  });
});
