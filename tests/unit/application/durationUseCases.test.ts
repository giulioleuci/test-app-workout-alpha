import { describe, expect, it, vi } from 'vitest';

import { DurationUseCases, type DurationPort } from '@/application/duration';
import { CounterType, ExerciseGroupType, SetType } from '@/domain/enums';

describe('DurationUseCases', () => {
  it('queries duration inputs through its port and returns an empty range for missing data', async () => {
    const port: DurationPort = {
      getItemWithSets: vi.fn(() => Promise.resolve({
        item: { counterType: CounterType.Reps, modifiers: undefined },
        sets: [{
          setCountRange: { min: 1 }, countRange: { min: 8, max: 8, toFailure: false },
          setType: SetType.Working, orderIndex: 'a',
        }],
      } as unknown as Awaited<ReturnType<DurationPort['getItemWithSets']>>)),
      getGroupWithItems: vi.fn(() => Promise.resolve(null)),
      getSessionSource: vi.fn(() => Promise.resolve(null)),
      getWorkoutSource: vi.fn(() => Promise.resolve(null)),
      getWorkoutSources: vi.fn(() => Promise.resolve([])),
    };
    const useCases = new DurationUseCases(port);

    await expect(useCases.estimateItemDuration('item-1')).resolves.toEqual(expect.objectContaining({
      minSeconds: expect.any(Number), maxSeconds: expect.any(Number),
    }));
    await expect(useCases.estimateGroupDuration('missing')).resolves.toEqual({ minSeconds: 0, maxSeconds: 0 });
    await expect(useCases.estimateSessionDuration('missing')).resolves.toEqual({ minSeconds: 0, maxSeconds: 0 });
    await expect(useCases.estimateWorkoutDuration('missing')).resolves.toEqual({ minSeconds: 0, maxSeconds: 0 });
    await expect(useCases.bulkEstimateWorkoutDurations([])).resolves.toEqual({});

    expect(port.getItemWithSets).toHaveBeenCalledWith('item-1');
    expect(port.getGroupWithItems).toHaveBeenCalledWith('missing');
    expect(port.getSessionSource).toHaveBeenCalledWith('missing');
    expect(port.getWorkoutSource).toHaveBeenCalledWith('missing');
  });

  it('aggregates durations for every hydrated workout returned by the port', async () => {
    const port: DurationPort = {
      getItemWithSets: vi.fn(() => Promise.resolve(null)),
      getGroupWithItems: vi.fn(() => Promise.resolve(null)),
      getSessionSource: vi.fn(() => Promise.resolve(null)),
      getWorkoutSource: vi.fn(() => Promise.resolve(null)),
      getWorkoutSources: vi.fn(() => Promise.resolve([{
        workout: { id: 'workout-1' },
        sessions: [{
          session: { id: 'session-1' },
          groups: [{
            group: { id: 'group-1', groupType: ExerciseGroupType.Standard },
            items: [],
          }],
        }],
      }] as unknown as Awaited<ReturnType<DurationPort['getWorkoutSources']>>)),
    };

    await expect(new DurationUseCases(port).bulkEstimateWorkoutDurations([
      { id: 'workout-1' },
    ] as unknown as Parameters<DurationPort['getWorkoutSources']>[0])).resolves.toEqual({
      'workout-1': { minSeconds: 0, maxSeconds: 0 },
    });
  });
});
