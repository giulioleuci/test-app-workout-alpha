import 'fake-indexeddb/auto';
import { nanoid } from 'nanoid';
import { describe, it, expect, beforeEach } from 'vitest';

import dayjs from '@/lib/dayjs';

import { testDb as db } from '../../utils/testHelpers';

interface DaySession {
  id: string;
  startedAt: Date;
  completedAt: Date;
  sessionName: string;
}

async function originalLoad() {
  const sessions = await db.workoutSessions
    .filter(ws => ws.completedAt != null)
    .toArray();

  const map = new Map<string, DaySession[]>();
  for (const s of sessions) {
    const d = dayjs(s.completedAt);
    const key = d.format('YYYY-MM-DD');

    let sessionName = '';
    if (s.plannedSessionId) {
      const planned = await db.plannedSessions.get(s.plannedSessionId);
      sessionName = planned?.name ?? '';
    }
    if (!sessionName) {
      sessionName = dayjs(s.startedAt).format('HH:mm');
    }

    const entry: DaySession = {
      id: s.id,
      startedAt: dayjs(s.startedAt).toDate(),
      completedAt: dayjs(s.completedAt).toDate(),
      sessionName,
    };

    if (map.has(key)) {
      map.get(key)!.push(entry);
    } else {
      map.set(key, [entry]);
    }
  }
  return map;
}

// This will be our optimized version once we implement it
async function optimizedLoad() {
    const sessions = await db.workoutSessions
    .filter(ws => ws.completedAt != null)
    .toArray();

  const plannedSessionIds = [...new Set(sessions.map(s => s.plannedSessionId).filter(Boolean))] as string[];
  const plannedSessions = await db.plannedSessions.bulkGet(plannedSessionIds);
  const plannedSessionsMap = new Map(plannedSessions.filter(Boolean).map(ps => [ps!.id, ps!]));

  const map = new Map<string, DaySession[]>();
  for (const s of sessions) {
    const d = dayjs(s.completedAt);
    const key = d.format('YYYY-MM-DD');

    let sessionName = '';
    if (s.plannedSessionId) {
      const planned = plannedSessionsMap.get(s.plannedSessionId);
      sessionName = planned?.name ?? '';
    }
    if (!sessionName) {
      sessionName = dayjs(s.startedAt).format('HH:mm');
    }

    const entry: DaySession = {
      id: s.id,
      startedAt: dayjs(s.startedAt).toDate(),
      completedAt: dayjs(s.completedAt).toDate(),
      sessionName,
    };

    if (map.has(key)) {
      map.get(key)!.push(entry);
    } else {
      map.set(key, [entry]);
    }
  }
  return map;
}

describe('TrainingCalendar performance benchmark', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map(t => t.clear()));
  });

  it('measures the improvement', async () => {
    const numPlannedSessions = 100;
    const numWorkoutSessions = 200;

    const plannedSessions = [];
    for (let i = 0; i < numPlannedSessions; i++) {
      plannedSessions.push({
        id: `planned-${i}`,
        name: `Planned Session ${i}`,
        plannedWorkoutId: 'pw1',
        dayNumber: i,
        focusMuscleGroups: [],
        status: 'active' as any,
        orderIndex: i,
        createdAt: dayjs().toDate(),
        updatedAt: dayjs().toDate(),
      });
    }
    await db.plannedSessions.bulkAdd(plannedSessions);

    const workoutSessions = [];
    for (let i = 0; i < numWorkoutSessions; i++) {
      workoutSessions.push({
        id: nanoid(),
        plannedSessionId: `planned-${i % numPlannedSessions}`,
        startedAt: dayjs('2023-01-01T10:00:00').toDate(),
        completedAt: dayjs('2023-01-01T11:00:00').toDate(),
      });
    }
    await db.workoutSessions.bulkAdd(workoutSessions);

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

    expect(res1.size).toBe(1); // All on the same day in this test
    expect(res2.size).toBe(1);

    // Check if results are same (deep equal)
    const res1Array = Array.from(res1.entries());
    const res2Array = Array.from(res2.entries());
    expect(JSON.stringify(res1Array)).toBe(JSON.stringify(res2Array));

    console.log(`Improvement: ${((time1 - time2) / time1 * 100).toFixed(2)}%`);
  });
});
