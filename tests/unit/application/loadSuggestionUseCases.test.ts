import { describe, expect, it, vi } from 'vitest';

import { LoadSuggestionUseCases } from '@/application/loadSuggestions';
import type { LoadSuggestionHistoryPort } from '@/application/loadSuggestions';
import type { PlannedSet } from '@/domain/entities';

function createPort(overrides: Partial<LoadSuggestionHistoryPort> = {}): LoadSuggestionHistoryPort {
  return {
    getLastSetPerformance: vi.fn().mockResolvedValue(null),
    getLastPerformance: vi.fn().mockResolvedValue(null),
    getPlannedSet: vi.fn().mockResolvedValue(undefined),
    getSetsInSessionForExercise: vi.fn().mockResolvedValue([]),
    getBestOneRepMax: vi.fn().mockResolvedValue(undefined),
    getUserRegulationProfile: vi.fn().mockResolvedValue(undefined),
    getPlannedExerciseItem: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('LoadSuggestionUseCases', () => {
  it('collects the prioritized one-rep max and available performance inputs', async () => {
    const p1RM = { value: 150, method: 'direct' as const, recordedAt: new Date() };
    const lastPerformance = { load: 120, reps: 5, rpe: 8 };
    const port = createPort({ getLastPerformance: vi.fn().mockResolvedValue(lastPerformance) });
    const getPrioritizedOneRepMax = vi.fn().mockResolvedValue(p1RM);
    const useCases = new LoadSuggestionUseCases(port, getPrioritizedOneRepMax);

    await expect(useCases.getSuggestionInputs('bench')).resolves.toEqual({
      p1RM,
      lastSetPerf: null,
      lastGeneralPerf: lastPerformance,
    });
    expect(port.getLastSetPerformance).not.toHaveBeenCalled();
  });

  it('builds suggestion context from the history port', async () => {
    const plannedSet = { id: 'set-1', plannedExerciseItemId: 'item-1' } as PlannedSet;
    const port = createPort({
      getPlannedSet: vi.fn().mockResolvedValue(plannedSet),
      getBestOneRepMax: vi.fn().mockResolvedValue({
        value: 150,
        valueMin: 145,
        valueMax: 155,
        method: 'direct',
      }),
      getLastPerformance: vi.fn().mockResolvedValue({ load: 120, reps: 5, rpe: 8 }),
      getUserRegulationProfile: vi.fn().mockResolvedValue({ simpleMode: true }),
    });
    const useCases = new LoadSuggestionUseCases(port, vi.fn().mockResolvedValue(null));

    const context = await useCases.getLoadSuggestionContext('set-1', 'session-1', 'bench');

    expect(context).toMatchObject({
      plannedSet,
      exerciseId: 'bench',
      best1RM: { value: 150, valueMin: 145, valueMax: 155, confidence: 'high' },
      lastSessionPerformance: { load: 120, reps: 5, rpe: 8 },
      simpleMode: true,
    });
    expect(port.getPlannedExerciseItem).toHaveBeenCalledWith('item-1');
  });

  it('hydrates only missing historical values before calculating suggestions', async () => {
    const port = createPort({
      getBestOneRepMax: vi.fn().mockResolvedValue({ value: 150, method: 'direct' }),
      getLastPerformance: vi.fn().mockResolvedValue({ load: 120, reps: 5, rpe: 8 }),
    });
    const useCases = new LoadSuggestionUseCases(port, vi.fn().mockResolvedValue(null));

    const suggestions = await useCases.getHydratedLoadSuggestions({
      exerciseId: 'bench',
      previousSetsInSession: [],
      best1RM: null,
      lastSessionPerformance: null,
    });

    expect(port.getBestOneRepMax).toHaveBeenCalledWith('bench');
    expect(port.getLastPerformance).toHaveBeenCalledWith('bench');
    expect(suggestions).toEqual(expect.arrayContaining([
      expect.objectContaining({ method: 'lastSession', suggestedLoad: 120 }),
    ]));
  });
});
