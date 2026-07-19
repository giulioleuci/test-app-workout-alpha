import { describe, expect, it, vi } from 'vitest';

import { ExerciseUseCases, type ExerciseCatalogPort } from '@/application/exercises';
import type { Exercise, SessionExerciseItem } from '@/domain/entities';
import { CounterType, Equipment, ExerciseType, MovementPattern, Muscle } from '@/domain/enums';

const now = new Date('2026-07-17T12:00:00.000Z');

function exercise(id: string): Exercise {
  return {
    id, name: id, type: ExerciseType.Compound, primaryMuscles: [Muscle.Chest], secondaryMuscles: [],
    equipment: [Equipment.Barbell], movementPattern: MovementPattern.HorizontalPush,
    counterType: CounterType.Reps, defaultLoadUnit: 'kg', variantIds: [], createdAt: now, updatedAt: now,
  };
}

function completedItem(exerciseId: string, completedAt: Date): SessionExerciseItem {
  return {
    id: `${exerciseId}-${completedAt.getTime()}`, sessionGroupId: 'group', exerciseId,
    order: 'a', completedAt, notes: '', targetSets: [], actualSets: [],
  };
}

function createPort(records: Exercise[], items: SessionExerciseItem[] = []): ExerciseCatalogPort {
  return {
    getAll: vi.fn().mockResolvedValue(records),
    getById: vi.fn().mockImplementation(id => Promise.resolve(records.find(record => record.id === id))),
    getByIds: vi.fn().mockImplementation(ids => Promise.resolve(records.filter(record => ids.includes(record.id)))),
    add: vi.fn().mockResolvedValue('created'),
    put: vi.fn().mockResolvedValue('saved'),
    update: vi.fn().mockResolvedValue(1),
    smartDelete: vi.fn().mockResolvedValue(undefined),
    search: vi.fn().mockResolvedValue(records),
    getByCriteria: vi.fn().mockResolvedValue(records),
    getCompletedItemsSince: vi.fn().mockResolvedValue(items),
  };
}

describe('ExerciseUseCases', () => {
  it('enriches the filtered catalog with usage counts and the most recent completion', async () => {
    const bench = exercise('bench');
    const squat = exercise('squat');
    const port = createPort([bench, squat], [
      completedItem('bench', new Date('2026-06-01T10:00:00.000Z')),
      completedItem('bench', new Date('2026-07-01T10:00:00.000Z')),
    ]);
    const useCases = new ExerciseUseCases(port, () => new Date(now));

    const catalog = await useCases.getEnhancedExerciseCatalog({
      filters: { search: 'press' }, enrichWithUsage: true, usageSinceDays: 30,
    });

    expect(port.getByCriteria).toHaveBeenCalledWith({ search: 'press' });
    expect(port.getCompletedItemsSince).toHaveBeenCalledWith(new Date('2026-06-17T12:00:00.000Z'));
    expect(catalog).toEqual([
      expect.objectContaining({ id: 'bench', usageCount: 2, lastUsedAt: new Date('2026-07-01T10:00:00.000Z') }),
      expect.objectContaining({ id: 'squat', usageCount: 0, lastUsedAt: null }),
    ]);
  });

  it('delegates persistence commands through the port without selecting an infrastructure implementation', async () => {
    const port = createPort([exercise('bench')]);
    const useCases = new ExerciseUseCases(port);

    await expect(useCases.createExercise(exercise('created'))).resolves.toBe('created');
    await expect(useCases.upsertExercise({ ...exercise('saved') })).resolves.toBe('saved');
    await expect(useCases.deleteExercise('bench')).resolves.toBeUndefined();

    expect(port.add).toHaveBeenCalledWith(expect.objectContaining({ id: 'created' }));
    expect(port.put).toHaveBeenCalledWith(expect.objectContaining({ id: 'saved' }));
    expect(port.smartDelete).toHaveBeenCalledWith('bench');
  });
});
