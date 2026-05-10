import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';

import { seedFullBody2x, seedExercises } from '@/db/seed';
import dayjs from '@/lib/dayjs';

import { testDb as db } from '../../utils/testHelpers';

describe('Seed History', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await seedExercises(); // Required as seedFullBody2x looks up exercises by name
  });

  it('should generate workout history when requested', async () => {
    // Act
    await seedFullBody2x(undefined, { withHistory: true });

    // Assert
    const sessionCount = await db.workoutSessions.count();
    expect(sessionCount).toBeGreaterThan(0);
    console.log(`Generated ${sessionCount} sessions`);

    const setRecords = await db.sessionSets.toArray();
    expect(setRecords.length).toBeGreaterThan(0);

    // Check progression logic
    // Find Squat exercise
    const squat = await db.exercises.where('name').equals('Squat').first();
    expect(squat).toBeDefined();

    // Find session items for Squat
    const squatItems = await db.sessionExerciseItems.where('exerciseId').equals(squat!.id).toArray();
    expect(squatItems.length).toBeGreaterThan(1);

    // Get the FIRST set of each item to track load progression
    const sets = [];
    for (const item of squatItems) {
      const set = await db.sessionSets.where('sessionExerciseItemId').equals(item.id).first();
      if (set?.completedAt) {
        sets.push(set);
      }
    }

    // Sort by completion time
    sets.sort((a, b) => dayjs(a.completedAt).diff(dayjs(b.completedAt)));

    expect(sets.length).toBeGreaterThan(1);
    console.log('Squat loads:', sets.map(s => s.actualLoad));

    // Verify overall progression (first session vs last session)
    // There are deloads in the macrocycle, so it won't be strictly monotonically increasing.
    const firstLoad = sets[0].actualLoad!;
    const lastLoad = sets[sets.length - 1].actualLoad!;
    expect(lastLoad).toBeGreaterThan(firstLoad); // Overall progression occurred
  });
});
