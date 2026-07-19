import { describe, expect, it, vi } from 'vitest';

import { OneRepMaxRecordUseCases } from '@/application/oneRepMaxRecords';
import type { OneRepMaxRecordPort } from '@/application/oneRepMaxRecords';

function createPort(overrides: Partial<OneRepMaxRecordPort> = {}): OneRepMaxRecordPort {
  return {
    getExercises: vi.fn().mockResolvedValue([]),
    getRecordsInDateRange: vi.fn().mockResolvedValue([]),
    getBodyWeightRecords: vi.fn().mockResolvedValue([]),
    putRecord: vi.fn(),
    deleteRecord: vi.fn(),
    getLatestRecord: vi.fn(),
    getRecordsForExercise: vi.fn().mockResolvedValue([]),
    getCompletedE1RMSetsForExercise: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe('OneRepMaxRecordUseCases', () => {
  it('groups records by exercise and puts exercises with records first', async () => {
    const newer = new Date('2026-01-02');
    const older = new Date('2026-01-01');
    const port = createPort({
      getExercises: vi.fn().mockResolvedValue([
        { id: 'squat', name: 'Squat' },
        { id: 'bench', name: 'Bench press' },
      ]),
      getRecordsInDateRange: vi.fn().mockResolvedValue([
        { exerciseId: 'squat', value: 180, recordedAt: older },
        { exerciseId: 'squat', value: 190, recordedAt: newer },
      ]),
    });

    const data = await new OneRepMaxRecordUseCases(port).getGroupedData();

    expect(data.allGrouped.map(group => group.exercise.id)).toEqual(['squat', 'bench']);
    expect(data.allGrouped[0].latest?.value).toBe(190);
  });

  it('prioritizes direct records over indirect and calculated values', async () => {
    const directDate = new Date('2026-01-02');
    const port = createPort({
      getRecordsForExercise: vi.fn().mockResolvedValue([
        { value: 180, method: 'indirect', recordedAt: new Date('2026-01-03') },
        { value: 170, method: 'direct', recordedAt: directDate },
      ]),
    });
    const useCases = new OneRepMaxRecordUseCases(port);

    await expect(useCases.getPrioritized1RM('squat')).resolves.toEqual({
      value: 170,
      method: 'direct',
      recordedAt: directDate,
    });
    expect(port.getCompletedE1RMSetsForExercise).not.toHaveBeenCalled();
  });

  it('falls back to the best calculated e1RM when manual records are unavailable', async () => {
    const completedAt = new Date('2026-01-04');
    const port = createPort({
      getCompletedE1RMSetsForExercise: vi.fn().mockResolvedValue([
        { e1rm: 190, completedAt },
        { e1rm: 200, completedAt: new Date('2026-01-05') },
      ]),
    });

    await expect(new OneRepMaxRecordUseCases(port).getPrioritized1RM('squat')).resolves.toMatchObject({
      value: 200,
      method: 'calculated',
    });
  });
});
