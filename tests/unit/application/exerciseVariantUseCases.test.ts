import { describe, expect, it } from 'vitest';

import { ExerciseVariantUseCases, type ExerciseVariantPort } from '@/application/exerciseVariants';
import type { Exercise } from '@/domain/entities';
import { CounterType, Equipment, ExerciseType, MovementPattern, Muscle } from '@/domain/enums';

function exercise(id: string, variantIds: string[] = []): Exercise {
  return {
    id, name: id, type: ExerciseType.Compound, primaryMuscles: [Muscle.Chest], secondaryMuscles: [],
    equipment: [Equipment.Barbell], movementPattern: MovementPattern.HorizontalPush,
    counterType: CounterType.Reps, defaultLoadUnit: 'kg', variantIds, createdAt: new Date(), updatedAt: new Date(),
  };
}

function createPort(records: Exercise[]): ExerciseVariantPort {
  const store = new Map(records.map(record => [record.id, record]));
  return {
    getById: id => Promise.resolve(store.get(id)),
    getByIds: ids => Promise.resolve(ids.flatMap(id => {
      const record = store.get(id);
      return record ? [record] : [];
    })),
    getAll: () => Promise.resolve([...store.values()]),
    update: (id, changes) => {
      const current = store.get(id);
      if (!current) return Promise.resolve(0);
      store.set(id, { ...current, ...changes });
      return Promise.resolve(1);
    },
  };
}

describe('ExerciseVariantUseCases', () => {
  it('maintains bidirectional links and removes stale references through a port', async () => {
    const port = createPort([exercise('a'), exercise('b'), exercise('c', ['a'])]);
    const useCases = new ExerciseVariantUseCases(port);

    await useCases.addVariant('a', 'b');
    await expect(useCases.getVariants('a')).resolves.toEqual([
      expect.objectContaining({ id: 'b' }),
    ]);
    await useCases.removeExerciseFromAllVariants('a');

    await expect(port.getById('b')).resolves.toEqual(expect.objectContaining({ variantIds: [] }));
    await expect(port.getById('c')).resolves.toEqual(expect.objectContaining({ variantIds: [] }));
  });

  it('rejects self-links and ignores an already-absent link', async () => {
    const useCases = new ExerciseVariantUseCases(createPort([exercise('a'), exercise('b')]));

    await expect(useCases.addVariant('a', 'a')).rejects.toThrow('cannot be its own variant');
    await expect(useCases.removeVariant('a', 'b')).resolves.toBeUndefined();
  });
});
