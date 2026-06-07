
import { describe, it, expect, beforeEach } from 'vitest';
import { loadFixtures } from '@/db/fixtures';
import { db } from '@/db/database';
import { databaseLifecycle } from '@/db/core';
import { estimateWorkoutDuration, estimateSessionDuration } from '@/services/durationEstimator';
import { PlannedWorkoutStatus } from '@/domain/enums';

describe('Fixture Duration Audit', () => {
  beforeEach(async () => {
    await databaseLifecycle.initialize();
    await databaseLifecycle.mountUser('test-user-' + Math.random());
  });

  it('should calculate reasonable durations for all fixture workouts', async () => {
    await loadFixtures('en');

    const workouts = await db.plannedWorkouts.toArray();
    console.log(`Found ${workouts.length} workouts.`);

    for (const w of workouts) {
      const duration = await estimateWorkoutDuration(w.id);
      const sessions = await db.plannedSessions.where('plannedWorkoutId').equals(w.id).toArray();
      let totalSetsMin = 0;
      let totalSetsMax = 0;

      console.log(`\nWorkout: ${w.name} (ID: ${w.id})`);
      console.log(`Total Duration: ${Math.round(duration.minSeconds/60)} - ${Math.round(duration.maxSeconds/60)} min`);

      for (const s of sessions) {
        const sDuration = await estimateSessionDuration(s.id);

        // Calculate total sets for the session
        const groups = await db.plannedExerciseGroups.where('plannedSessionId').equals(s.id).toArray();
        let sSetsMin = 0;
        let sSetsMax = 0;
        for (const g of groups) {
          const items = await db.plannedExerciseItems.where('plannedExerciseGroupId').equals(g.id).toArray();
          for (const i of items) {
            const sets = await db.plannedSets.where('plannedExerciseItemId').equals(i.id).toArray();
            for (const st of sets) {
              sSetsMin += st.setCountRange.min;
              sSetsMax += st.setCountRange.max ?? st.setCountRange.min;
            }
          }
        }
        totalSetsMin += sSetsMin;
        totalSetsMax += sSetsMax;

        console.log(`  Session: ${s.name}`);
        console.log(`    Duration: ${Math.round(sDuration.minSeconds/60)} - ${Math.round(sDuration.maxSeconds/60)} min`);
        console.log(`    Sets: ${sSetsMin} - ${sSetsMax}`);

        // Sanity check: duration should be at least some minimum per set
        if (sSetsMin > 0) {
           expect(sDuration.minSeconds).toBeGreaterThan(sSetsMin * 30); // At least 30s per set (exec + transition/rest)
        }
      }
      console.log(`  Total Sets for Workout: ${totalSetsMin} - ${totalSetsMax}`);
    }
  });
});
