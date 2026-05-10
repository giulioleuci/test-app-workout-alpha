import 'fake-indexeddb/auto';
import { LexoRank } from 'lexorank';
import { nanoid } from 'nanoid';
import { describe, it, expect, beforeEach } from 'vitest';

import { SessionRepository } from '@/db/repositories/SessionRepository';
import type { Exercise } from '@/domain/entities';
import { ExerciseType, Muscle, Equipment, MovementPattern, CounterType, ExerciseGroupType, SetType, ToFailureIndicator } from '@/domain/enums';
import dayjs from '@/lib/dayjs';

function generateTestRank(index: number) {
  let rank = LexoRank.min().between(LexoRank.middle());
  for (let i = 0; i < index; i++) rank = rank.genNext();
  return rank.toString();
}

import { testDb as db } from '../utils/testHelpers';

describe('Hydration Benchmark', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map(t => t.clear()));
  });

  it('measures getHydratedSessions performance with many exercises', async () => {
    const numExercises = 2000;
    const numSessions = 50;

    console.log(`Seeding ${numExercises} exercises...`);
    const exercises: Exercise[] = [];
    for (let i = 0; i < numExercises; i++) {
      exercises.push({
        id: nanoid(),
        name: `Exercise ${i}`,
        type: ExerciseType.Compound,
        primaryMuscles: [Muscle.Chest],
        secondaryMuscles: [],
        equipment: [Equipment.Barbell],
        movementPattern: MovementPattern.HorizontalPush,
        counterType: CounterType.Reps,
        defaultLoadUnit: 'kg',
        variantIds: [],
        createdAt: dayjs().toDate(),
        updatedAt: dayjs().toDate(),
      });
    }
    await db.exercises.bulkAdd(exercises);

    // Pick a few exercises to use in sessions
    const usedExerciseIds = exercises.slice(0, 5).map(e => e.id);

    console.log(`Seeding ${numSessions} sessions...`);
    const sessions = [];
    const groups = [];
    const items = [];
    const sets = [];

    for (let i = 0; i < numSessions; i++) {
      const wsId = nanoid();
      sessions.push({
        id: wsId,
        startedAt: dayjs().toDate(),
        completedAt: dayjs().toDate(),
      });

      for (let j = 0; j < 3; j++) {
        const gId = nanoid();
        groups.push({
          id: gId,
          workoutSessionId: wsId,
          groupType: ExerciseGroupType.Standard,
          isCompleted: false,
          orderIndex: generateTestRank(j)
        });

        for (let k = 0; k < 3; k++) {
          const itemId = nanoid();
          items.push({
            id: itemId,
            sessionExerciseGroupId: gId,
            exerciseId: usedExerciseIds[k % usedExerciseIds.length],
            isCompleted: false,
            orderIndex: generateTestRank(k)
          });

          for (let l = 0; l < 3; l++) {
            sets.push({
              id: nanoid(),
              sessionExerciseItemId: itemId,
              setType: SetType.Working,
              orderIndex: generateTestRank(l),
              actualLoad: null,
              actualCount: null,
              actualRPE: null,
              actualToFailure: ToFailureIndicator.None,
              expectedRPE: null,
              isCompleted: true,
              isSkipped: false,
              partials: false,
              forcedReps: 0,
              notes: undefined,
              completedAt: undefined,
              plannedSetId: undefined,
            });
          }
        }
      }
    }

    await db.workoutSessions.bulkAdd(sessions);
    await db.sessionExerciseGroups.bulkAdd(groups);
    await db.sessionExerciseItems.bulkAdd(items);
    await db.sessionSets.bulkAdd(sets);

    console.log('Starting measurement...');
    const start = performance.now();
    const result = await SessionRepository.getHydratedSessions(sessions);
    const end = performance.now();

    const time = end - start;
    console.log(`getHydratedSessions took ${time.toFixed(2)}ms`);

    expect(result.length).toBe(numSessions);
    expect(result[0].groups.length).toBe(3);
  });
});
