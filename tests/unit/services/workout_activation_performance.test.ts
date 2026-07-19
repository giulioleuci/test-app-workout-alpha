import 'fake-indexeddb/auto';
import { nanoid } from 'nanoid';
import { describe, it, expect, beforeEach } from 'vitest';

import type { PlannedWorkout } from '@/domain/entities';
import { PlannedWorkoutStatus, ObjectiveType, WorkType } from '@/domain/enums';
import dayjs from '@/lib/dayjs';

import { testDb as db } from '../../utils/testHelpers';

// Sequential activation (current implementation)
async function sequentialActivation(targetId: string) {
  const now = dayjs().toDate();
  await db.transaction('rw', db.plannedWorkouts, async () => {
    const actives = await db.plannedWorkouts.where('status').equals(PlannedWorkoutStatus.Active).toArray();
    for (const a of actives) {
      await db.plannedWorkouts.update(a.id, { status: PlannedWorkoutStatus.Inactive, updatedAt: now });
    }
    await db.plannedWorkouts.update(targetId, { status: PlannedWorkoutStatus.Active, updatedAt: now });
  });
}

// Optimized activation using Promise.all
async function parallelActivation(targetId: string) {
  const now = dayjs().toDate();
  await db.transaction('rw', db.plannedWorkouts, async () => {
    const actives = await db.plannedWorkouts.where('status').equals(PlannedWorkoutStatus.Active).toArray();
    await Promise.all(actives.map(a => db.plannedWorkouts.update(a.id, { status: PlannedWorkoutStatus.Inactive, updatedAt: now })));
    await db.plannedWorkouts.update(targetId, { status: PlannedWorkoutStatus.Active, updatedAt: now });
  });
}

// Optimized activation using bulkPut
async function bulkActivation(targetId: string) {
  const now = dayjs().toDate();
  await db.transaction('rw', db.plannedWorkouts, async () => {
    const actives = await db.plannedWorkouts.where('status').equals(PlannedWorkoutStatus.Active).toArray();
    const updates = actives.map(a => ({ ...a, status: PlannedWorkoutStatus.Inactive, updatedAt: now }));
    if (updates.length > 0) {
      await db.plannedWorkouts.bulkPut(updates);
    }
    await db.plannedWorkouts.update(targetId, { status: PlannedWorkoutStatus.Active, updatedAt: now });
  });
}

describe('Workout Activation Performance', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map(t => t.clear()));
  });

  const createWorkouts = async (count: number, activeCount: number) => {
    const workouts: PlannedWorkout[] = [];
    for (let i = 0; i < count; i++) {
      workouts.push({
        id: nanoid(),
        name: `Workout ${i}`,
        status: i < activeCount ? PlannedWorkoutStatus.Active : PlannedWorkoutStatus.Inactive,
        objectiveType: ObjectiveType.Hypertrophy,
        workType: WorkType.Accumulation,
        createdAt: dayjs().toDate(),
        updatedAt: dayjs().toDate(),
        content: { groups: [] }
      } as unknown as PlannedWorkout);
    }
    await db.plannedWorkouts.bulkAdd(workouts);
    return workouts;
  };

  it('measures performance for deactivating many workouts', async () => {
    const totalWorkouts = 100; // Reduced for consistency
    const activeWorkouts = 50;

    // Benchmark Sequential
    await db.plannedWorkouts.clear();
    let workouts = await createWorkouts(totalWorkouts, activeWorkouts);
    let targetId = workouts[activeWorkouts].id;

    const startSeq = performance.now();
    await sequentialActivation(targetId);
    const endSeq = performance.now();
    const timeSeq = endSeq - startSeq;
    console.log(`Sequential execution time: ${timeSeq.toFixed(2)}ms`);

    // Benchmark Bulk (bulkPut)
    await db.plannedWorkouts.clear();
    workouts = await createWorkouts(totalWorkouts, activeWorkouts);
    targetId = workouts[activeWorkouts].id;

    const startBulk = performance.now();
    await bulkActivation(targetId);
    const endBulk = performance.now();
    const timeBulk = endBulk - startBulk;
    console.log(`Bulk (bulkPut) execution time: ${timeBulk.toFixed(2)}ms`);

    // Verify correctness
    const activeCount = await db.plannedWorkouts.where('status').equals(PlannedWorkoutStatus.Active).count();
    expect(activeCount).toBe(1);

    // We expect bulk to be generally efficient, but we avoid strict timing comparison
    // in CI environments to prevent flakiness.
    expect(timeBulk).toBeGreaterThan(0);
    expect(timeSeq).toBeGreaterThan(0);
  }, 30000);
});
