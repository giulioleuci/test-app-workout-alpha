import 'fake-indexeddb/auto';
import { nanoid } from 'nanoid';
import { describe, it, expect, beforeEach } from 'vitest';

import type { WorkoutSession, SessionExerciseGroup, SessionExerciseItem, SessionSet } from '@/domain/entities';
import { ExerciseGroupType, SetType, ToFailureIndicator } from '@/domain/enums';
import dayjs from '@/lib/dayjs';

import { testDb as db } from '../utils/testHelpers';

interface EnrichedSession {
  session: WorkoutSession;
  workoutName?: string;
  sessionName?: string;
  setCount: number;
  completedSets: number;
}

// Mocking the load function from HistoryList.tsx
async function originalLoad(): Promise<EnrichedSession[]> {
  const all = await db.workoutSessions.orderBy('startedAt').reverse().toArray();
  const enriched: EnrichedSession[] = [];
  for (const ws of all) {
    let workoutName: string | undefined;
    let sessionName: string | undefined;
    if (ws.plannedWorkoutId) { const pw = await db.plannedWorkouts.get(ws.plannedWorkoutId); workoutName = pw?.name; }
    if (ws.plannedSessionId) { const ps = await db.plannedSessions.get(ws.plannedSessionId); sessionName = ps?.name; }
    const groups = await db.sessionExerciseGroups.where('workoutSessionId').equals(ws.id).toArray();
    let setCount = 0; let completedSets = 0;
    for (const g of groups) {
      const items = await db.sessionExerciseItems.where('sessionExerciseGroupId').equals(g.id).toArray();
      for (const item of items) {
        const sets = await db.sessionSets.where('sessionExerciseItemId').equals(item.id).toArray();
        setCount += sets.length;
        completedSets += sets.filter(s => s.isCompleted).length;
      }
    }
    enriched.push({ session: ws, workoutName, sessionName, setCount, completedSets });
  }
  return enriched;
}

async function optimizedLoad(): Promise<EnrichedSession[]> {
  const all = await db.workoutSessions.orderBy('startedAt').reverse().toArray();

  const workoutIds = [...new Set(all.map(ws => ws.plannedWorkoutId).filter(Boolean))] as string[];
  const sessionIds = [...new Set(all.map(ws => ws.plannedSessionId).filter(Boolean))] as string[];

  const [workouts, plannedSessions] = await Promise.all([
    db.plannedWorkouts.bulkGet(workoutIds),
    db.plannedSessions.bulkGet(sessionIds)
  ]);

  const workoutMap = new Map(workouts.filter(Boolean).map(w => [w!.id, w]));
  const plannedSessionMap = new Map(plannedSessions.filter(Boolean).map(s => [s!.id, s]));

  const sessionIdsList = all.map(ws => ws.id);
  const allGroups = await db.sessionExerciseGroups.where('workoutSessionId').anyOf(sessionIdsList).toArray();

  const groupIds = allGroups.map(g => g.id);
  const allItems = await db.sessionExerciseItems.where('sessionExerciseGroupId').anyOf(groupIds).toArray();

  const itemIds = allItems.map(i => i.id);
  const allSets = await db.sessionSets.where('sessionExerciseItemId').anyOf(itemIds).toArray();

  // Maps for faster lookup
  const groupsBySession = new Map<string, SessionExerciseGroup[]>();
  for (const g of allGroups) {
    if (!groupsBySession.has(g.workoutSessionId)) groupsBySession.set(g.workoutSessionId, []);
    groupsBySession.get(g.workoutSessionId)!.push(g);
  }

  const itemsByGroup = new Map<string, SessionExerciseItem[]>();
  for (const i of allItems) {
    if (!itemsByGroup.has(i.sessionExerciseGroupId)) itemsByGroup.set(i.sessionExerciseGroupId, []);
    itemsByGroup.get(i.sessionExerciseGroupId)!.push(i);
  }

  const setsByItem = new Map<string, SessionSet[]>();
  for (const s of allSets) {
    if (!setsByItem.has(s.sessionExerciseItemId)) setsByItem.set(s.sessionExerciseItemId, []);
    setsByItem.get(s.sessionExerciseItemId)!.push(s);
  }

  return all.map(ws => {
    const workoutName = ws.plannedWorkoutId ? workoutMap.get(ws.plannedWorkoutId)?.name : undefined;
    const sessionName = ws.plannedSessionId ? plannedSessionMap.get(ws.plannedSessionId)?.name : undefined;

    let setCount = 0;
    let completedSets = 0;

    const groups = groupsBySession.get(ws.id) || [];
    for (const g of groups) {
      const items = itemsByGroup.get(g.id) || [];
      for (const item of items) {
        const sets = setsByItem.get(item.id) || [];
        setCount += sets.length;
        completedSets += sets.filter(s => s.isCompleted).length;
      }
    }

    return { session: ws, workoutName, sessionName, setCount, completedSets };
  });
}

describe('performance benchmark', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map(t => t.clear()));
  });

  it('measures the improvement', async () => {
    // Seed data: 50 sessions, each with 3 groups, each with 3 items, each with 3 sets
    const numSessions = 50;
    const workoutSessions = [];
    const sessionExerciseGroups = [];
    const sessionExerciseItems = [];
    const sessionSets = [];

    for (let i = 0; i < numSessions; i++) {
      const wsId = nanoid();
      const startedAt = dayjs().subtract(i, 'hour');
      workoutSessions.push({
        id: wsId,
        startedAt: startedAt.toDate(),
        completedAt: startedAt.add(30, 'minute').toDate(),
      });

      for (let j = 0; j < 3; j++) {
        const gId = nanoid();
        sessionExerciseGroups.push({
          id: gId,
          workoutSessionId: wsId,
          groupType: ExerciseGroupType.Standard,
          isCompleted: false,
          orderIndex: j
        });

        for (let k = 0; k < 3; k++) {
          const itemId = nanoid();
          sessionExerciseItems.push({
            id: itemId,
            sessionExerciseGroupId: gId,
            exerciseId: 'ex-1',
            isCompleted: false,
            orderIndex: k
          });

          for (let l = 0; l < 3; l++) {
            sessionSets.push({
              id: nanoid(),
              sessionExerciseItemId: itemId,
              setType: SetType.Working,
              orderIndex: l,
              actualLoad: null,
              actualCount: null,
              actualRPE: null,
              actualToFailure: ToFailureIndicator.None,
              expectedRPE: null,
              isCompleted: true,
              isSkipped: false,
              partials: false,
              forcedReps: 0,
            });
          }
        }
      }
    }

    await db.workoutSessions.bulkAdd(workoutSessions);
    await db.sessionExerciseGroups.bulkAdd(sessionExerciseGroups);
    await db.sessionExerciseItems.bulkAdd(sessionExerciseItems);
    await db.sessionSets.bulkAdd(sessionSets);

    const start1 = performance.now();
    const res1 = await originalLoad();
    const end1 = performance.now();
    const time1 = end1 - start1;
    console.log(`Original load time: ${time1.toFixed(2)}ms`);

    const start2 = performance.now();
    const res2 = await optimizedLoad();
    const end2 = performance.now();
    const time2 = end2 - start2;
    console.log(`Optimized load time: ${time2.toFixed(2)}ms`);

    expect(res1.length).toBe(numSessions);
    expect(res2.length).toBe(numSessions);
    expect(res1).toEqual(res2);

    console.log(`Improvement: ${((time1 - time2) / time1 * 100).toFixed(2)}%`);
  });
});
