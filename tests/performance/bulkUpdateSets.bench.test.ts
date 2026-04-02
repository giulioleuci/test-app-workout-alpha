import { LexoRank } from 'lexorank';
function generateTestRank(index: number) { let rank = LexoRank.min().between(LexoRank.middle()); for(let i=0; i<index; i++) rank = rank.genNext(); return rank.toString(); }
import { describe, bench, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';

import { databaseLifecycle } from '../../src/db/core';
import { db } from '../../src/db/database';
import { SessionRepository } from '../../src/db/repositories/SessionRepository';

// Basic setup
beforeAll(async () => {
  await databaseLifecycle.mountUser('bench-user');
  await db.open();
});

afterAll(async () => {
  await db.close();
});

describe('SessionRepository.bulkUpdateSets', () => {
  it('measures time to update 500 sets sequentially', async () => {
    // Clear and prepare data
    await db.sessionSets.clear();
    const sets = [];
    for (let i = 0; i < 500; i++) {
        sets.push({
            id: `test-set-${i}`,
            sessionExerciseItemId: 'test-item',
            orderIndex: generateTestRank(i),
            reps: 10,
            load: 100,
            rpe: 8,
            isCompleted: false,
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }
    await db.sessionSets.bulkAdd(sets as any);

    const updates = sets.map((s, i) => ({
        key: s.id,
        changes: { reps: i }
    }));

    const start = performance.now();
    await SessionRepository.bulkUpdateSets(updates);
    const end = performance.now();

    console.log(`Time taken for 500 updates: ${end - start}ms`);

    // Verify it actually worked
    const updatedSets = await db.sessionSets.toArray();
    // Sort them by orderIndex to make sure we're checking the correct elements
    updatedSets.sort((a, b) => a.orderIndex.localeCompare(b.orderIndex));
    expect(updatedSets[0].reps).toBe(0);
    expect(updatedSets[499].reps).toBe(499);
  });
});

describe('Baseline performance measurement for bulkUpdateSets', () => {
  it('measures time to update 500 sets sequentially (original code)', async () => {
    // Clear and prepare data
    await db.sessionSets.clear();
    const sets = [];
    for (let i = 0; i < 500; i++) {
        sets.push({
            id: `test-set-${i}`,
            sessionExerciseItemId: 'test-item',
            orderIndex: generateTestRank(i),
            reps: 10,
            load: 100,
            rpe: 8,
            isCompleted: false,
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }
    await db.sessionSets.bulkAdd(sets as any);

    const updates = sets.map((s, i) => ({
        key: s.id,
        changes: { reps: i }
    }));

    const start = performance.now();
    await db.transaction('rw', db.sessionSets, async () => {
        for (const u of updates) {
            await db.sessionSets.update(u.key, u.changes);
        }
    });
    const end = performance.now();

    console.log(`Time taken for 500 sequential updates (baseline code): ${end - start}ms`);

    // Verify it actually worked
    const updatedSets = await db.sessionSets.toArray();
    updatedSets.sort((a, b) => a.orderIndex.localeCompare(b.orderIndex));
    expect(updatedSets[0].reps).toBe(0);
    expect(updatedSets[499].reps).toBe(499);
  });
});
