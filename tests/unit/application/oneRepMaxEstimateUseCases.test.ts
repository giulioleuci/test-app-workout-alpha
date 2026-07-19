import { describe, expect, it, vi } from 'vitest';

import { OneRepMaxEstimateUseCases, type OneRepMaxHistoryPort } from '@/application/oneRepMaxEstimates';

describe('OneRepMaxEstimateUseCases', () => {
  it('derives all exercise estimates from valid recent history through a port', async () => {
    const port: OneRepMaxHistoryPort = {
      getExercises: vi.fn(() => Promise.resolve([{ id: 'exercise-1', defaultLoadUnit: 'kg' }] as never)),
      getItemsByExercise: vi.fn(() => Promise.resolve([{ id: 'item-1', completedAt: new Date('2025-01-02') }] as never)),
      getSetsByItem: vi.fn(() => Promise.resolve([{
        isCompleted: true, isSkipped: false, actualLoad: 100, actualCount: 5, actualRPE: 8,
        e1rm: 140, orderIndex: 'b',
      }] as never)),
    };

    await expect(new OneRepMaxEstimateUseCases(port).estimateAllFromHistory()).resolves.toEqual({
      'exercise-1': expect.objectContaining({ value: 140, unit: 'kg', load: 100, reps: 5, rpe: 8 }),
    });
    expect(port.getItemsByExercise).toHaveBeenCalledWith('exercise-1', expect.objectContaining({ desc: true, limit: 5 }));
    expect(port.getSetsByItem).toHaveBeenCalledWith('item-1');
  });

  it('ignores invalid history and returns no estimate for a single exercise', async () => {
    const port: OneRepMaxHistoryPort = {
      getExercises: vi.fn(() => Promise.resolve([])),
      getItemsByExercise: vi.fn(() => Promise.resolve([{ id: 'item-1' }] as never)),
      getSetsByItem: vi.fn(() => Promise.resolve([{
        isCompleted: true, isSkipped: false, actualLoad: 0, actualCount: 5, actualRPE: 8,
      }] as never)),
    };

    await expect(new OneRepMaxEstimateUseCases(port).estimateFromHistoryForExercise('exercise-1')).resolves.toBeNull();
  });
});
