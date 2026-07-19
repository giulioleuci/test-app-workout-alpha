
import 'fake-indexeddb/auto';
import { nanoid } from 'nanoid';
import { describe, it, expect, beforeEach } from 'vitest';

import dayjs from '@/lib/dayjs';

import { testDb as db } from '../utils/testHelpers';

describe('Dashboard Last Session Query Benchmark', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map(t => t.clear()));

    const sessions = [];
    const baseDate = dayjs('2023-01-01T12:00:00Z');

    // Generate 2000 sessions
    // 1500 completed, 500 active (no completedAt)
    for (let i = 0; i < 2000; i++) {
      const isCompleted = i < 1500;
      const startedAt = baseDate.add(i, 'day');
      sessions.push({
        id: nanoid(),
        startedAt: startedAt.toDate(),
        completedAt: isCompleted ? startedAt.add(1, 'hour').toDate() : undefined,
      });
    }

    // Randomize insertion order to ensure sorting is actually doing work
    sessions.sort(() => Math.random() - 0.5);

    await db.workoutSessions.bulkAdd(sessions);
  });

  it('compares performance of last session retrieval', async () => {
    // Old Method
    const startOld = performance.now();
    const allCompleted = await db.workoutSessions
      .filter(ws => ws.completedAt != null)
      .sortBy('completedAt');

    let lastOld;
    if (allCompleted.length > 0) {
      lastOld = allCompleted[allCompleted.length - 1];
    }
    const endOld = performance.now();
    const timeOld = endOld - startOld;

    console.log(`Old method time: ${timeOld.toFixed(2)}ms`);

    // New Method
    const startNew = performance.now();
    const lastNew = await db.workoutSessions
      .orderBy('completedAt')
      .reverse()
      .first();
    const endNew = performance.now();
    const timeNew = endNew - startNew;

    console.log(`New method time: ${timeNew.toFixed(2)}ms`);
    console.log(`Speedup: ${(timeOld / timeNew).toFixed(2)}x`);

    // Verification
    expect(lastNew).toBeDefined();
    expect(lastOld).toBeDefined();
    expect(lastNew?.id).toBe(lastOld?.id);

    // In fake-indexeddb, the difference might be small or even noisy,
    // but the algorithmic complexity improvement is what we are aiming for.
    // We expect it to be faster or comparable (if overhead is high),
    // but definitely O(1) vs O(N).
  });
});
