import { LexoRank } from 'lexorank';

function generateTestRank(index: number) {
  let rank = LexoRank.min().between(LexoRank.middle());
  for(let i=0; i<index; i++) rank = rank.genNext();
  return rank.toString();
}


import 'fake-indexeddb/auto';
import { nanoid } from 'nanoid';
import { describe, it, expect, beforeEach } from 'vitest';

import { ExerciseGroupType, SetType, ToFailureIndicator } from '@/domain/enums';
import dayjs from '@/lib/dayjs';
import { prepareSessionActivation, activateSession } from '@/services/sessionActivation';

import { testDb as db } from '../../utils/testHelpers';

describe('Two-phase session activation with substitution support', () => {
  const exerciseId = 'ex-bench';
  const substituteExerciseId = 'ex-incline';
  const exerciseId2 = 'ex-squat';
  const plannedSessionId = 'ps-1';
  const plannedWorkoutId = 'pw-1';

  beforeEach(async () => {
    await db.delete();
    await db.open();

    // Seed exercises
    await db.exercises.bulkPut([
      {
        id: exerciseId,
        name: 'Bench Press',
        primaryMuscles: [],
        secondaryMuscles: [],
        equipment: [],
        movementPattern: 'horizontalPush' as any,
        counterType: 'reps' as any,
        defaultLoadUnit: 'kg',
        variantIds: [],
        createdAt: dayjs().toDate(),
        updatedAt: dayjs().toDate(),
      } as any,
      {
        id: substituteExerciseId,
        name: 'Incline Bench Press',
        primaryMuscles: [],
        secondaryMuscles: [],
        equipment: [],
        movementPattern: 'horizontalPush' as any,
        counterType: 'reps' as any,
        defaultLoadUnit: 'kg',
        variantIds: [],
        createdAt: dayjs().toDate(),
        updatedAt: dayjs().toDate(),
      } as any,
      {
        id: exerciseId2,
        name: 'Squat',
        primaryMuscles: [],
        secondaryMuscles: [],
        equipment: [],
        movementPattern: 'squat' as any,
        counterType: 'reps' as any,
        defaultLoadUnit: 'kg',
        variantIds: [],
        createdAt: dayjs().toDate(),
        updatedAt: dayjs().toDate(),
      } as any,
    ]);
  });

  // --- Helpers ---

  async function createPlannedSessionWithItems(items: {
    itemId: string;
    exerciseId: string;
    sets: { type: SetType; min: number }[];
    orderIndex?: number;
  }[]) {
    await db.plannedSessions.put({
      id: plannedSessionId,
      plannedWorkoutId,
      name: 'Test Session',
      dayNumber: 1,
      focusMuscleGroups: [],
      status: 'active' as any,
      orderIndex: generateTestRank(0),
      createdAt: dayjs().toDate(),
      updatedAt: dayjs().toDate(),
    } as any);

    const groupId = 'pg-1';
    await db.plannedExerciseGroups.put({
      id: groupId,
      plannedSessionId,
      groupType: ExerciseGroupType.Standard,
      orderIndex: generateTestRank(0),
    });

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await db.plannedExerciseItems.put({
        id: item.itemId,
        plannedExerciseGroupId: groupId,
        exerciseId: item.exerciseId,
        counterType: 'reps' as any,
        orderIndex: item.orderIndex ?? i,
      });

      for (let j = 0; j < item.sets.length; j++) {
        await db.plannedSets.put({
          id: `ps-${item.itemId}-${j}`,
          plannedExerciseItemId: item.itemId,
          setCountRange: { min: item.sets[j].min },
          countRange: { min: 10, max: 10, toFailure: ToFailureIndicator.None },
          setType: item.sets[j].type,
          
          orderIndex: j,
        } as any);
      }
    }
  }

  async function getSetsForSession(sessionId: string) {
    const groups = await db.sessionExerciseGroups.where('workoutSessionId').equals(sessionId).toArray();
    const groupIds = groups.map(g => g.id);
    const items = await db.sessionExerciseItems
      .where('sessionExerciseGroupId').anyOf(groupIds)
      .sortBy('orderIndex');

    const result = [];
    for (const item of items) {
      const sets = await db.sessionSets
        .where('sessionExerciseItemId').equals(item.id)
        .sortBy('orderIndex');
      result.push({ item, sets });
    }
    return result;
  }

  // --- Tests for prepareSessionActivation ---

  describe('prepareSessionActivation', () => {
    it('should return substitution prompts when substitution history exists', async () => {
      const itemId = 'pi-1';
      await createPlannedSessionWithItems([
        { itemId, exerciseId, sets: [{ type: SetType.Working, min: 1 }] },
      ]);

      // Seed a substitution record
      await db.exerciseSubstitutions.add({
        id: nanoid(),
        plannedExerciseItemId: itemId,
        plannedWorkoutId,
        originalExerciseId: exerciseId,
        substitutedExerciseId: substituteExerciseId,
        sessionId: 'some-session',
        createdAt: dayjs().subtract(1, 'day').toDate(),
      });

      const result = await prepareSessionActivation(plannedSessionId);

      expect(result.substitutionPrompts).toHaveLength(1);
      expect(result.substitutionPrompts[0].plannedItemId).toBe(itemId);
      expect(result.substitutionPrompts[0].originalExerciseId).toBe(exerciseId);
      expect(result.substitutionPrompts[0].originalExerciseName).toBe('Bench Press');
      expect(result.substitutionPrompts[0].suggestedExerciseId).toBe(substituteExerciseId);
      expect(result.substitutionPrompts[0].suggestedExerciseName).toBe('Incline Bench Press');
      expect(result.substitutionPrompts[0].lastUsedDate).toBeInstanceOf(Date);
    });

    it('should return the most recent substitution when multiple exist', async () => {
      const itemId = 'pi-1';
      await createPlannedSessionWithItems([
        { itemId, exerciseId, sets: [{ type: SetType.Working, min: 1 }] },
      ]);

      // Seed two substitution records — older one first
      await db.exerciseSubstitutions.bulkAdd([
        {
          id: nanoid(),
          plannedExerciseItemId: itemId,
          plannedWorkoutId,
          originalExerciseId: exerciseId,
          substitutedExerciseId: exerciseId2, // Squat (older)
          sessionId: 'session-old',
          createdAt: dayjs().subtract(7, 'day').toDate(),
        },
        {
          id: nanoid(),
          plannedExerciseItemId: itemId,
          plannedWorkoutId,
          originalExerciseId: exerciseId,
          substitutedExerciseId: substituteExerciseId, // Incline (newer)
          sessionId: 'session-new',
          createdAt: dayjs().subtract(1, 'day').toDate(),
        },
      ]);

      const result = await prepareSessionActivation(plannedSessionId);

      expect(result.substitutionPrompts).toHaveLength(1);
      // Should pick the most recent (Incline Bench Press)
      expect(result.substitutionPrompts[0].suggestedExerciseId).toBe(substituteExerciseId);
      expect(result.substitutionPrompts[0].suggestedExerciseName).toBe('Incline Bench Press');
    });

    it('should return empty prompts when no substitution history exists', async () => {
      await createPlannedSessionWithItems([
        { itemId: 'pi-1', exerciseId, sets: [{ type: SetType.Working, min: 1 }] },
      ]);

      const result = await prepareSessionActivation(plannedSessionId);

      expect(result.substitutionPrompts).toHaveLength(0);
    });

    it('should return prompts only for items that have substitution history', async () => {
      await createPlannedSessionWithItems([
        { itemId: 'pi-1', exerciseId, sets: [{ type: SetType.Working, min: 1 }] },
        { itemId: 'pi-2', exerciseId: exerciseId2, sets: [{ type: SetType.Working, min: 1 }] },
      ]);

      // Only add substitution for the first item
      await db.exerciseSubstitutions.add({
        id: nanoid(),
        plannedExerciseItemId: 'pi-1',
        plannedWorkoutId,
        originalExerciseId: exerciseId,
        substitutedExerciseId: substituteExerciseId,
        sessionId: 'some-session',
        createdAt: dayjs().toDate(),
      });

      const result = await prepareSessionActivation(plannedSessionId);

      expect(result.substitutionPrompts).toHaveLength(1);
      expect(result.substitutionPrompts[0].plannedItemId).toBe('pi-1');
    });
  });

  // --- Tests for activateSession with substitution choices ---

  describe('activateSession with substitutionChoices', () => {
    it('should use substituted exercise and set originalExerciseId', async () => {
      await createPlannedSessionWithItems([
        { itemId: 'pi-1', exerciseId, sets: [{ type: SetType.Working, min: 1 }] },
      ]);

      const choices = new Map<string, string>();
      choices.set('pi-1', substituteExerciseId);

      const sessionId = await activateSession(plannedSessionId, choices);
      const results = await getSetsForSession(sessionId);

      expect(results).toHaveLength(1);
      // The exerciseId should be the substituted one
      expect(results[0].item.exerciseId).toBe(substituteExerciseId);
      // originalExerciseId should be set to the planned exercise
      expect(results[0].item.originalExerciseId).toBe(exerciseId);
      // plannedExerciseItemId should still reference the original plan
      expect(results[0].item.plannedExerciseItemId).toBe('pi-1');
    });

    it('should not set originalExerciseId when choice matches planned exercise', async () => {
      await createPlannedSessionWithItems([
        { itemId: 'pi-1', exerciseId, sets: [{ type: SetType.Working, min: 1 }] },
      ]);

      // Choice is the same as the planned exercise
      const choices = new Map<string, string>();
      choices.set('pi-1', exerciseId);

      const sessionId = await activateSession(plannedSessionId, choices);
      const results = await getSetsForSession(sessionId);

      expect(results).toHaveLength(1);
      expect(results[0].item.exerciseId).toBe(exerciseId);
      expect(results[0].item.originalExerciseId).toBeUndefined();
    });

    it('should handle mixed substitution and non-substitution items', async () => {
      await createPlannedSessionWithItems([
        { itemId: 'pi-1', exerciseId, sets: [{ type: SetType.Working, min: 1 }] },
        { itemId: 'pi-2', exerciseId: exerciseId2, sets: [{ type: SetType.Working, min: 1 }] },
      ]);

      // Only substitute the first item
      const choices = new Map<string, string>();
      choices.set('pi-1', substituteExerciseId);

      const sessionId = await activateSession(plannedSessionId, choices);
      const results = await getSetsForSession(sessionId);

      expect(results).toHaveLength(2);
      // First item: substituted
      expect(results[0].item.exerciseId).toBe(substituteExerciseId);
      expect(results[0].item.originalExerciseId).toBe(exerciseId);
      // Second item: not in choices, uses planned exercise
      expect(results[1].item.exerciseId).toBe(exerciseId2);
      expect(results[1].item.originalExerciseId).toBeUndefined();
    });
  });

  // --- Backward compatibility ---

  describe('activateSession backward compatibility (no substitutionChoices)', () => {
    it('should work exactly as before when substitutionChoices is not provided', async () => {
      await createPlannedSessionWithItems([
        { itemId: 'pi-1', exerciseId, sets: [{ type: SetType.Working, min: 1 }] },
      ]);

      const sessionId = await activateSession(plannedSessionId);
      const results = await getSetsForSession(sessionId);

      expect(results).toHaveLength(1);
      expect(results[0].item.exerciseId).toBe(exerciseId);
      expect(results[0].item.originalExerciseId).toBeUndefined();
      expect(results[0].item.plannedExerciseItemId).toBe('pi-1');
    });

    it('should work exactly as before when substitutionChoices is undefined', async () => {
      await createPlannedSessionWithItems([
        { itemId: 'pi-1', exerciseId, sets: [{ type: SetType.Working, min: 1 }] },
        { itemId: 'pi-2', exerciseId: exerciseId2, sets: [{ type: SetType.Working, min: 1 }] },
      ]);

      const sessionId = await activateSession(plannedSessionId, undefined);
      const results = await getSetsForSession(sessionId);

      expect(results).toHaveLength(2);
      expect(results[0].item.exerciseId).toBe(exerciseId);
      expect(results[0].item.originalExerciseId).toBeUndefined();
      expect(results[1].item.exerciseId).toBe(exerciseId2);
      expect(results[1].item.originalExerciseId).toBeUndefined();
    });

    it('should work exactly as before when substitutionChoices is an empty map', async () => {
      await createPlannedSessionWithItems([
        { itemId: 'pi-1', exerciseId, sets: [{ type: SetType.Working, min: 1 }] },
      ]);

      const sessionId = await activateSession(plannedSessionId, new Map());
      const results = await getSetsForSession(sessionId);

      expect(results).toHaveLength(1);
      expect(results[0].item.exerciseId).toBe(exerciseId);
      expect(results[0].item.originalExerciseId).toBeUndefined();
    });
  });
});
