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
import { analyzeExercisePerformance } from '@/services/performanceAnalyzer';

describe('Performance Analyzer', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  const exerciseId = 'ex-1';

  async function createSession(
    date: Date,
    plannedSessionId: string | undefined,
    exerciseData: { sets: number; repsPerSet: number; load: number; rpe?: number } | null
  ) {
    const sessionId = nanoid();
    await db.workoutSessions.add({
      id: sessionId,
      startedAt: date,
      completedAt: dayjs(date).add(1, 'hour').toDate(), // +1 hour
      plannedSessionId,
    } as any);

    if (exerciseData) {
      const groupId = nanoid();
      await db.sessionExerciseGroups.add({ id: groupId, workoutSessionId: sessionId, orderIndex: generateTestRank(0), groupType: 'standard', completedAt: date, isCompleted: true } as any);

      const itemId = nanoid();
      await db.sessionExerciseItems.add({ id: itemId, sessionExerciseGroupId: groupId, exerciseId, orderIndex: generateTestRank(0), completedAt: date, isCompleted: true } as any);

      for (let i = 0; i < exerciseData.sets; i++) {
        await db.sessionSets.add({
          id: nanoid(),
          sessionExerciseItemId: itemId,
          isCompleted: true,
          isSkipped: false,
          actualCount: exerciseData.repsPerSet,
          actualLoad: exerciseData.load,
          actualRPE: exerciseData.rpe ?? 8,
          completedAt: date,
          orderIndex: i,
        } as any);
      }
    }
    return sessionId;
  }

  it('returns insufficient_data when no history exists', async () => {
    const currentId = await createSession(dayjs().toDate(), 'plan-1', { sets: 3, repsPerSet: 10, load: 100 });
    const result = await analyzeExercisePerformance(exerciseId, currentId);

    expect(result).not.toBeNull();
    expect(result?.status).toBe('insufficient_data');
    expect(result?.history).toHaveLength(1);
    expect(result?.change).toBeUndefined();
  });

  it('detects improving trend (load increase)', async () => {
    const pastDate = dayjs().subtract(7, 'day').toDate();
    const currentDate = dayjs().toDate();

    // Past session: 3x10 @ 90kg
    await createSession(pastDate, 'plan-1', { sets: 3, repsPerSet: 10, load: 90 });

    // Current session: 3x10 @ 100kg
    const currentId = await createSession(currentDate, 'plan-1', { sets: 3, repsPerSet: 10, load: 100 });

    const result = await analyzeExercisePerformance(exerciseId, currentId);

    expect(result?.status).toBe('improving');
    expect(result?.change?.load).toBeGreaterThan(0);
    expect(result?.history).toHaveLength(2);
  });

  it('detects improving trend (reps increase)', async () => {
    const pastDate = dayjs().subtract(7, 'day').toDate();
    const currentDate = dayjs().toDate();

    await createSession(pastDate, 'plan-1', { sets: 3, repsPerSet: 8, load: 100 });
    const currentId = await createSession(currentDate, 'plan-1', { sets: 3, repsPerSet: 10, load: 100 });

    const result = await analyzeExercisePerformance(exerciseId, currentId);
    expect(result?.status).toBe('improving');
    expect(result?.change?.reps).toBeGreaterThan(0);
  });

  it('detects deteriorating trend', async () => {
    const pastDate = dayjs().subtract(7, 'day').toDate();
    const currentDate = dayjs().toDate();

    await createSession(pastDate, 'plan-1', { sets: 3, repsPerSet: 10, load: 100 });
    const currentId = await createSession(currentDate, 'plan-1', { sets: 3, repsPerSet: 8, load: 90 }); // Less reps, less load

    const result = await analyzeExercisePerformance(exerciseId, currentId);
    expect(result?.status).toBe('deteriorating');
  });

  it('detects stable trend (2 consecutive same)', async () => {
    const pastDate = dayjs().subtract(7, 'day').toDate();
    const currentDate = dayjs().toDate();

    await createSession(pastDate, 'plan-1', { sets: 3, repsPerSet: 10, load: 100 });
    const currentId = await createSession(currentDate, 'plan-1', { sets: 3, repsPerSet: 10, load: 100 });

    const result = await analyzeExercisePerformance(exerciseId, currentId);
    expect(result?.status).toBe('stable');
  });

  it('detects stagnant trend (3 consecutive same)', async () => {
    const date1 = dayjs('2023-01-01').toDate();
    const date2 = dayjs('2023-01-08').toDate();
    const date3 = dayjs('2023-01-15').toDate();

    await createSession(date1, 'plan-1', { sets: 3, repsPerSet: 10, load: 100 });
    await createSession(date2, 'plan-1', { sets: 3, repsPerSet: 10, load: 100 });
    const currentId = await createSession(date3, 'plan-1', { sets: 3, repsPerSet: 10, load: 100 });

    const result = await analyzeExercisePerformance(exerciseId, currentId);
    expect(result?.status).toBe('stagnant');
    expect(result?.history).toHaveLength(3);
  });

  it('filters by plannedSessionId', async () => {
    const date1 = dayjs('2023-01-01').toDate();
    const date2 = dayjs('2023-01-08').toDate();

    // Session with DIFFERENT plan ID (should be ignored)
    await createSession(date1, 'plan-2', { sets: 5, repsPerSet: 5, load: 120 });

    // Session with SAME plan ID
    await createSession(date2, 'plan-1', { sets: 3, repsPerSet: 10, load: 90 });

    const currentId = await createSession(dayjs('2023-01-15').toDate(), 'plan-1', { sets: 3, repsPerSet: 10, load: 100 });

    const result = await analyzeExercisePerformance(exerciseId, currentId);

    // Should compare only against date2 (90kg -> 100kg = improving)
    // If it compared against date1 (120kg -> 100kg), it might be deteriorating (load wise)
    expect(result?.status).toBe('improving');
    expect(result?.history).toHaveLength(2); // Current + date2
    expect(result?.history[1].totalLoad).toBe(3 * 10 * 90);
  });

  it('returns estimated 5RM, 10RM, 12RM', async () => {
    // 100kg x 1 @ RPE 10 => 1RM = 100kg
    const currentId = await createSession(dayjs().toDate(), 'plan-1', { sets: 1, repsPerSet: 1, load: 100, rpe: 10 });

    const result = await analyzeExercisePerformance(exerciseId, currentId);

    expect(result?.estimatedRecords).toBeDefined();
    expect(result?.estimatedRecords?.rm5).toBe(91.8);
    expect(result?.estimatedRecords?.rm10).toBe(77.7);
    expect(result?.estimatedRecords?.rm12).toBe(72.1);
  });
});
