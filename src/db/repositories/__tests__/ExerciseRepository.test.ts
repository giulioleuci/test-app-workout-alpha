import 'fake-indexeddb/auto';
import { nanoid } from 'nanoid';
import { describe, it, expect, beforeEach } from 'vitest';

import { db } from '@/db/database';
import type { Exercise } from '@/domain/entities';
import { ExerciseType, Muscle, Equipment, MovementPattern, CounterType } from '@/domain/enums';

import { ExerciseRepository } from '../ExerciseRepository';


describe('ExerciseRepository', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map(t => t.clear()));
  });

  const createExercise = (name: string): Exercise => ({
    id: nanoid(),
    name,
    type: ExerciseType.Compound,
    primaryMuscles: [Muscle.Chest],
    secondaryMuscles: [],
    equipment: [Equipment.Barbell],
    movementPattern: MovementPattern.HorizontalPush,
    counterType: CounterType.Reps,
    defaultLoadUnit: 'kg',
    variantIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  it('adds and retrieves an exercise', async () => {
    const ex = createExercise('Bench Press');
    await ExerciseRepository.add(ex);

    const retrieved = await ExerciseRepository.getById(ex.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('Bench Press');
  });

  it('finds by name', async () => {
    const ex = createExercise('Squat');
    await ExerciseRepository.add(ex);

    const found = await ExerciseRepository.findByName('Squat');
    expect(found).toBeDefined();
    expect(found?.id).toBe(ex.id);
  });

  it('searches exercises', async () => {
    await ExerciseRepository.add(createExercise('Bench Press'));
    await ExerciseRepository.add(createExercise('Incline Bench'));
    await ExerciseRepository.add(createExercise('Squat'));

    const results = await ExerciseRepository.search('bench');
    expect(results.length).toBe(2);
  });

  it('updates an exercise', async () => {
    const ex = createExercise('Old Name');
    await ExerciseRepository.add(ex);

    await ExerciseRepository.update(ex.id, { name: 'New Name' });
    const updated = await ExerciseRepository.getById(ex.id);
    expect(updated?.name).toBe('New Name');
  });

  it('deletes an exercise', async () => {
    const ex = createExercise('To Delete');
    await ExerciseRepository.add(ex);

    await ExerciseRepository.delete(ex.id);
    const found = await ExerciseRepository.getById(ex.id);
    expect(found).toBeUndefined();
  });
});
