import { nanoid } from 'nanoid';
import { describe, it, expect, beforeEach } from 'vitest';

import type { Exercise } from '@/domain/entities';
import { ExerciseType, MovementPattern, CounterType, Equipment, Muscle } from '@/domain/enums';
import { exercisesToCsv, parseExerciseCsv } from '@/services/csvExerciseService';
import { addVariant, removeVariant, getVariants, removeExerciseFromAllVariants } from '@/services/exerciseVariantService';

import { testDb as db } from '../../utils/testHelpers';

function makeExercise(overrides: Partial<Exercise> = {}): Exercise {
  const now = new Date();
  return {
    id: nanoid(),
    name: `Exercise ${nanoid(4)}`,
    type: ExerciseType.Compound,
    primaryMuscles: [Muscle.Chest],
    secondaryMuscles: [],
    equipment: [Equipment.Barbell],
    movementPattern: MovementPattern.HorizontalPush,
    counterType: CounterType.Reps,
    defaultLoadUnit: 'kg',
    variantIds: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('Exercise variantIds field', () => {
  beforeEach(async () => {
    await db.exercises.clear();
  });

  it('stores and retrieves variantIds', async () => {
    const ex = makeExercise({ variantIds: ['abc', 'def'] });
    await db.exercises.add(ex);
    const stored = await db.exercises.get(ex.id);
    expect(stored?.variantIds).toEqual(['abc', 'def']);
  });

  it('defaults variantIds to empty array', async () => {
    const ex = makeExercise();
    await db.exercises.add(ex);
    const stored = await db.exercises.get(ex.id);
    expect(stored?.variantIds).toEqual([]);
  });

  it('supports multi-entry index lookup on variantIds', async () => {
    const targetId = 'target-123';
    const ex1 = makeExercise({ variantIds: [targetId] });
    const ex2 = makeExercise({ variantIds: ['other'] });
    const ex3 = makeExercise({ variantIds: [targetId, 'other'] });
    await db.exercises.bulkAdd([ex1, ex2, ex3]);

    const results = await db.exercises.where('variantIds').equals(targetId).toArray();
    const ids = results.map(r => r.id).sort();
    expect(ids).toEqual([ex1.id, ex3.id].sort());
  });
});

describe('exerciseVariantService', () => {
  beforeEach(async () => {
    await db.exercises.clear();
  });

  describe('addVariant', () => {
    it('links two exercises bidirectionally', async () => {
      const a = makeExercise();
      const b = makeExercise();
      await db.exercises.bulkAdd([a, b]);

      await addVariant(a.id, b.id);

      const storedA = await db.exercises.get(a.id);
      const storedB = await db.exercises.get(b.id);
      expect(storedA?.variantIds).toContain(b.id);
      expect(storedB?.variantIds).toContain(a.id);
    });

    it('throws on self-link', async () => {
      const a = makeExercise();
      await db.exercises.add(a);
      await expect(addVariant(a.id, a.id)).rejects.toThrow();
    });

    it('is idempotent (no duplicates)', async () => {
      const a = makeExercise();
      const b = makeExercise();
      await db.exercises.bulkAdd([a, b]);

      await addVariant(a.id, b.id);
      await addVariant(a.id, b.id);

      const storedA = await db.exercises.get(a.id);
      expect(storedA?.variantIds.filter(id => id === b.id)).toHaveLength(1);
    });

    it('throws if exercise does not exist', async () => {
      const a = makeExercise();
      await db.exercises.add(a);
      await expect(addVariant(a.id, 'nonexistent')).rejects.toThrow();
    });
  });

  describe('removeVariant', () => {
    it('removes link from both exercises', async () => {
      const a = makeExercise();
      const b = makeExercise();
      a.variantIds = [b.id];
      b.variantIds = [a.id];
      await db.exercises.bulkAdd([a, b]);

      await removeVariant(a.id, b.id);

      const storedA = await db.exercises.get(a.id);
      const storedB = await db.exercises.get(b.id);
      expect(storedA?.variantIds).not.toContain(b.id);
      expect(storedB?.variantIds).not.toContain(a.id);
    });

    it('is safe to call when link does not exist', async () => {
      const a = makeExercise();
      const b = makeExercise();
      await db.exercises.bulkAdd([a, b]);
      await expect(removeVariant(a.id, b.id)).resolves.not.toThrow();
    });
  });

  describe('getVariants', () => {
    it('returns variant exercises', async () => {
      const a = makeExercise();
      const b = makeExercise();
      const c = makeExercise();
      a.variantIds = [b.id, c.id];
      b.variantIds = [a.id];
      c.variantIds = [a.id];
      await db.exercises.bulkAdd([a, b, c]);

      const variants = await getVariants(a.id);
      const variantIds = variants.map(v => v.id).sort();
      expect(variantIds).toEqual([b.id, c.id].sort());
    });

    it('returns empty array when no variants', async () => {
      const a = makeExercise();
      await db.exercises.add(a);
      const variants = await getVariants(a.id);
      expect(variants).toEqual([]);
    });
  });

  describe('removeExerciseFromAllVariants', () => {
    it('cleans up all references when exercise is deleted', async () => {
      const a = makeExercise();
      const b = makeExercise();
      const c = makeExercise();
      a.variantIds = [b.id, c.id];
      b.variantIds = [a.id];
      c.variantIds = [a.id];
      await db.exercises.bulkAdd([a, b, c]);

      await removeExerciseFromAllVariants(a.id);

      const storedB = await db.exercises.get(b.id);
      const storedC = await db.exercises.get(c.id);
      expect(storedB?.variantIds).not.toContain(a.id);
      expect(storedC?.variantIds).not.toContain(a.id);
    });
  });
});

describe('CSV variants column', () => {
  it('exports variant names as semicolon-separated column', () => {
    const a = makeExercise({ name: 'Bench Press' });
    const b = makeExercise({ name: 'DB Bench' });
    a.variantIds = [b.id];

    const csv = exercisesToCsv([a, b]);
    expect(csv).toContain('variants');
    const lines = csv.split('\n');
    const benchLine = lines.find(l => l.includes('Bench Press'));
    expect(benchLine).toContain('DB Bench');
  });

  it('parses variants column from CSV', () => {
    const csv = 'exercise,equipment,type,pattern,counter,load_unit,primary_muscles,secondary_muscles,description,key_points,variants\nBench Press,barbell,Compound,horizontalPush,reps,kg,chest,,,,DB Bench;Incline Press';
    const rows = parseExerciseCsv(csv);
    expect(rows[0].variants).toBe('DB Bench;Incline Press');
  });
});
