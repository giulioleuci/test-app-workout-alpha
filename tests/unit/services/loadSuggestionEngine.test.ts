import { LexoRank } from 'lexorank';

function generateTestRank(index: number) {
  let rank = LexoRank.min().between(LexoRank.middle());
  for(let i=0; i<index; i++) rank = rank.genNext();
  return rank.toString();
}


import { nanoid } from 'nanoid';
import { describe, it, expect, beforeEach } from 'vitest';

import 'fake-indexeddb/auto';

import dayjs from '@/lib/dayjs';

import { db } from '@/db/database';
import { getLoadSuggestions, type LoadSuggestionContext } from '@/services/loadSuggestionEngine';

describe('Load Suggestion Engine', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  const exerciseId = 'ex-1';

  async function createPlannedData(targetXRM?: number) {
    const plannedGroupId = nanoid();
    const plannedItemId = nanoid();
    const plannedSetId = nanoid();

    await db.plannedExerciseItems.add({
      id: plannedItemId,
      plannedExerciseGroupId: plannedGroupId,
      exerciseId,
      counterType: 'reps',
      orderIndex: generateTestRank(0),
      targetXRM, // This is what we are testing
    } as any);

    const plannedSet = {
      id: plannedSetId,
      plannedExerciseItemId: plannedItemId,
      setCountRange: { min: 3, max: 3 },
      countRange: { min: 5, max: 5 },
      setType: 'working',

      orderIndex: generateTestRank(0),
    };

    return plannedSet;
  }

  async function createHistory(load: number, reps: number, rpe: number) {
    const groupId = nanoid();
    const itemId = nanoid();
    const setId = nanoid();
    const now = dayjs().toDate();

    await db.sessionExerciseGroups.add({
      id: groupId,
      workoutSessionId: nanoid(),
      orderIndex: generateTestRank(0),
      groupType: 'standard',
      completedAt: now,
      isCompleted: true,
    } as any);

    await db.sessionExerciseItems.add({
      id: itemId,
      sessionExerciseGroupId: groupId,
      exerciseId,
      orderIndex: generateTestRank(0),
      completedAt: now,
      isCompleted: true,
    } as any);

    await db.sessionSets.add({
      id: setId,
      sessionExerciseItemId: itemId,
      isCompleted: true,
      isSkipped: false,
      actualLoad: load,
      actualCount: reps,
      actualRPE: rpe,
      orderIndex: generateTestRank(0),
      completedAt: dayjs().toDate(),
    } as any);
  }

  it('suggests load based on targetXRM', async () => {
    // Setup history: 100kg x 1 @ RPE 10 => 1RM = 100kg
    await createHistory(100, 1, 10);

    // Setup plan with targetXRM = 5
    const plannedSet = await createPlannedData(5);

    const ctx: LoadSuggestionContext = {
      exerciseId,
      plannedSet: plannedSet as any,
      plannedExerciseItem: { targetXRM: 5 } as any,
      previousSetsInSession: [],
      best1RM: { value: 100, confidence: 'high' },
      lastSessionPerformance: null,
    };

    const suggestions = await getLoadSuggestions(ctx);

    // We expect a suggestion from targetXRM
    const suggestion = suggestions.find(s => s.method === 'targetXRM');
    expect(suggestion).toBeDefined();

    // 5 reps @ RPE 10
    // 1RM = 100.
    // 5RM = 91.0
    expect(suggestion?.suggestedLoad).toBeCloseTo(91, 1);
    expect(suggestion?.reasoning).toContain('Target 5RM based on 1RM');
  });

  it('does not suggest targetXRM if not configured', async () => {
    await createHistory(100, 1, 10);
    const plannedSet = await createPlannedData(undefined); // No targetXRM

    const ctx: LoadSuggestionContext = {
      exerciseId,
      plannedSet: plannedSet as any,
      previousSetsInSession: [],
      best1RM: { value: 100, confidence: 'high' },
      lastSessionPerformance: null,
    };

    const suggestions = await getLoadSuggestions(ctx);
    const suggestion = suggestions.find(s => s.method === 'targetXRM');
    expect(suggestion).toBeUndefined();
  });

  it('suggests load based on exact occurrence and set matching (lastSession mode)', async () => {
    // Setup history:
    // Session 1 (Completed):
    //   Group 1: Exercise A (Occ 0)
    //     Set 1: 100kg
    //     Set 2: 110kg
    //   Group 2: Exercise A (Occ 1)
    //     Set 1: 120kg
    //     Set 2: 130kg

    const sessionId = nanoid();
    const groupId1 = nanoid();
    const groupId2 = nanoid();
    const itemId1 = nanoid();
    const itemId2 = nanoid();

    // Create Session
    const now = dayjs();
    await db.workoutSessions.add({
      id: sessionId,
      startedAt: now.subtract(100, 'second').toDate(),
      completedAt: now.subtract(50, 'second').toDate(),
    } as any);

    // Create Groups
    await db.sessionExerciseGroups.bulkAdd([
      { id: groupId1, workoutSessionId: sessionId, orderIndex: generateTestRank(0), completedAt: now.subtract(50, 'second').toDate(), isCompleted: true } as any,
      { id: groupId2, workoutSessionId: sessionId, orderIndex: generateTestRank(1), completedAt: now.subtract(50, 'second').toDate(), isCompleted: true } as any,
    ]);

    // Create Items
    await db.sessionExerciseItems.bulkAdd([
      { id: itemId1, sessionExerciseGroupId: groupId1, exerciseId, orderIndex: generateTestRank(0), completedAt: now.subtract(50, 'second').toDate(), isCompleted: true } as any,
      { id: itemId2, sessionExerciseGroupId: groupId2, exerciseId, orderIndex: generateTestRank(0), completedAt: now.subtract(50, 'second').toDate(), isCompleted: true } as any,
    ]);

    // Create Sets with timestamps
    const baseTime = now.subtract(90, 'second');
    await db.sessionSets.bulkAdd([
      // Occ 0 Set 0 -> 100
      { id: nanoid(), sessionExerciseItemId: itemId1, isCompleted: true, actualLoad: 100, actualCount: 5, orderIndex: generateTestRank(0), completedAt: baseTime.toDate() } as any,
      // Occ 0 Set 1 -> 110
      { id: nanoid(), sessionExerciseItemId: itemId1, isCompleted: true, actualLoad: 110, actualCount: 5, orderIndex: generateTestRank(1), completedAt: baseTime.add(1, 'second').toDate() } as any,
      // Occ 1 Set 0 -> 120
      { id: nanoid(), sessionExerciseItemId: itemId2, isCompleted: true, actualLoad: 120, actualCount: 5, orderIndex: generateTestRank(0), completedAt: baseTime.add(2, 'second').toDate() } as any,
      // Occ 1 Set 1 -> 130
      { id: nanoid(), sessionExerciseItemId: itemId2, isCompleted: true, actualLoad: 130, actualCount: 5, orderIndex: generateTestRank(1), completedAt: baseTime.add(3, 'second').toDate() } as any,
    ]);

    // Test Scenario 1: Suggest for Occ 0, Set 0
    // Expected: 100
    const ctx: LoadSuggestionContext = {
      exerciseId,
      plannedSet: undefined,
      previousSetsInSession: [], // 0 sets done implies Set 0
      best1RM: null,
      lastSessionPerformance: { load: 100, reps: 5, rpe: 10 },
    };

    const suggestions = await getLoadSuggestions(ctx);
    const suggestion = suggestions.find(s => s.method === 'lastSession');

    // Currently, it picks the latest set (130kg) and applies fatigue adjustment.
    // Set index = 0 -> fatigueAdj = 0.
    // So it returns 130.
    // We want 100.

    // This assertion should fail if the bug exists
    expect(suggestion?.suggestedLoad).toBe(100);
  });
});
