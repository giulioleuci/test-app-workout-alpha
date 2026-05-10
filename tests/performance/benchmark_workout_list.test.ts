import { LexoRank } from 'lexorank';
function generateTestRank(index: number) { let rank = LexoRank.min().between(LexoRank.middle()); for(let i=0; i<index; i++) rank = rank.genNext(); return rank.toString(); }
import 'fake-indexeddb/auto';
import { nanoid } from 'nanoid';
import { describe, it, expect, beforeEach } from 'vitest';

import type { PlannedWorkout } from '@/domain/entities';
import {
  PlannedWorkoutStatus,
  ObjectiveType,
  WorkType,
  PlannedSessionStatus,
  ExerciseGroupType,
  CounterType,
  SetType,
  ToFailureIndicator
} from '@/domain/enums';
import dayjs from '@/lib/dayjs';
import { estimateWorkoutDuration, bulkEstimateWorkoutDurations, type DurationRange } from '@/services/durationEstimator';

import { testDb as db } from '../utils/testHelpers';

// Mimic WorkoutList.tsx load function logic (the N+1 part)
async function originalLoad(workouts: PlannedWorkout[]) {
  const counts: Record<string, number> = {};
  const durs: Record<string, DurationRange> = {};
  for (const w of workouts) {
    counts[w.id] = await db.plannedSessions.where('plannedWorkoutId').equals(w.id).count();
    durs[w.id] = await estimateWorkoutDuration(w.id);
  }
  return { counts, durs };
}

async function optimizedLoad(workouts: PlannedWorkout[]) {
  // Count sessions
  const workoutIds = workouts.map(w => w.id);
  const sessions = await db.plannedSessions.where('plannedWorkoutId').anyOf(workoutIds).toArray();
  const counts: Record<string, number> = {};
  for (const s of sessions) {
    counts[s.plannedWorkoutId] = (counts[s.plannedWorkoutId] || 0) + 1;
  }

  // Calculate durations
  const durs = await bulkEstimateWorkoutDurations(workouts);
  return { counts, durs };
}

describe('WorkoutList performance benchmark', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map(t => t.clear()));
  });

  it('measures N+1 impact', async () => {
    // Seed data
    const numWorkouts = 5;
    const workouts: PlannedWorkout[] = [];
    const sessions = [];
    const groups = [];
    const items = [];
    const sets = [];

    console.log(`Seeding DB with ${numWorkouts} workouts...`);

    for (let i = 0; i < numWorkouts; i++) {
      const wId = nanoid();
      workouts.push({
        id: wId,
        name: `Workout ${i}`,
        status: PlannedWorkoutStatus.Active,
        objectiveType: ObjectiveType.GeneralStrength,
        workType: WorkType.Accumulation,
        createdAt: dayjs().toDate(),
        updatedAt: dayjs().toDate(),
      });

      for (let j = 0; j < 3; j++) {
        const sId = nanoid();
        sessions.push({
          id: sId,
          plannedWorkoutId: wId,
          dayNumber: j,
          orderIndex: generateTestRank(j),
          status: PlannedSessionStatus.Pending,
          name: `Session ${j}`,
          focusMuscleGroups: [],
          createdAt: dayjs().toDate(),
          updatedAt: dayjs().toDate(),
        });

        for (let k = 0; k < 3; k++) {
          const gId = nanoid();
          groups.push({
            id: gId,
            plannedSessionId: sId,
            orderIndex: generateTestRank(k),
            groupType: ExerciseGroupType.Standard
          });

          for (let l = 0; l < 3; l++) {
            const itemId = nanoid();
            items.push({
              id: itemId,
              plannedExerciseGroupId: gId,
              orderIndex: generateTestRank(l),
              exerciseId: 'ex1',
              counterType: CounterType.Reps
            });

            for (let m = 0; m < 3; m++) {
              sets.push({
                id: nanoid(),
                plannedExerciseItemId: itemId,
                orderIndex: generateTestRank(m),
                setCountRange: { min: 3, max: 3 },
                countRange: { min: 10, max: 10, toFailure: ToFailureIndicator.None },
                restSecondsRange: { min: 60, max: 60, isFixed: true },
                setType: SetType.Working,

              });
            }
          }
        }
      }
    }

    await db.plannedWorkouts.bulkAdd(workouts);
    await db.plannedSessions.bulkAdd(sessions);
    await db.plannedExerciseGroups.bulkAdd(groups);
    await db.plannedExerciseItems.bulkAdd(items);
    await db.plannedSets.bulkAdd(sets);

    console.log('Seeding complete. Running original load...');

    const start = performance.now();
    const result = await originalLoad(workouts);
    const end = performance.now();

    const time = end - start;
    console.log(`Original load time for ${numWorkouts} workouts: ${time.toFixed(2)}ms`);

    // Verify results count
    expect(Object.keys(result.counts).length).toBe(numWorkouts);
    expect(Object.keys(result.durs).length).toBe(numWorkouts);

    // Optimized run
    console.log('Running optimized load...');
    const start2 = performance.now();
    const result2 = await optimizedLoad(workouts);
    const end2 = performance.now();

    const time2 = end2 - start2;
    console.log(`Optimized load time for ${numWorkouts} workouts: ${time2.toFixed(2)}ms`);
    console.log(`Improvement: ${((time - time2) / time * 100).toFixed(2)}%`);

    // Verify consistency
    // Note: Due to mock implementation, counts might not return 0 for missing keys if we manually set them,
    // but here we populated all workouts so counts should match exactly.
    // However, optimizedLoad returns counts only for sessions found.
    // We should normalize counts for comparison.

    for (const w of workouts) {
      const count1 = result.counts[w.id] || 0;
      const count2 = result2.counts[w.id] || 0;
      expect(count2).toBe(count1);

      const dur1 = result.durs[w.id];
      const dur2 = result2.durs[w.id];
      expect(dur2).toEqual(dur1);
    }
  }, 20000); // 20s timeout
});
