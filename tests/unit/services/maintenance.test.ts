import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';

import { maintenanceCommands } from '@/composition/maintenance';
import { db } from '@/db/database';
import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import { ExerciseType, MovementPattern, Equipment, CounterType, Muscle } from '@/domain/enums';

describe('SystemMaintenanceService Exercise Deletion', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('should clear exercises completely and not reseed them when selected category is exercises', async () => {
    // 1. Create and save a custom exercise
    const exercise = {
      id: 'test-exercise-id',
      name: 'Test Exercise',
      type: ExerciseType.Compound,
      movementPattern: MovementPattern.Squat,
      equipment: [Equipment.Barbell],
      primaryMuscles: [Muscle.Quadriceps],
      secondaryMuscles: [Muscle.Glutes],
      counterType: CounterType.Reps,
      defaultLoadUnit: 'kg' as const,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await ExerciseRepository.add(exercise);

    const exerciseCountBefore = await db.exercises.count();
    const versionCountBefore = await db.exerciseVersions.count();
    expect(exerciseCountBefore).toBe(1);
    expect(versionCountBefore).toBe(1);

    // 2. Perform selective clear on exercises
    await maintenanceCommands.clearUserData(new Set(['exercises']), 'en');

    // 3. Verify exercises and versions are completely cleared and NOT re-seeded
    const exerciseCountAfter = await db.exercises.count();
    const versionCountAfter = await db.exerciseVersions.count();
    expect(exerciseCountAfter).toBe(0);
    expect(versionCountAfter).toBe(0);
  });
});
