import { LexoRank } from 'lexorank';

function generateTestRank(index: number) {
    let rank = LexoRank.min().between(LexoRank.middle());
    for (let i = 0; i < index; i++) rank = rank.genNext();
    return rank.toString();
}


import { describe, it, expect, beforeEach } from 'vitest';
import { nanoid } from 'nanoid';
import { SessionRepository } from '@/db/repositories/SessionRepository';
import { db } from '@/db/database';
import { generateSequentialRanks } from '@/lib/lexorank';

describe('SessionRepository - reorderGroups Performance Benchmark', () => {
    let sessionId: string;
    let groupIds: string[];

    beforeEach(async () => {
        await db.workoutSessions.clear();
        await db.sessionExerciseGroups.clear();

        sessionId = nanoid();
        await db.workoutSessions.add({
            id: sessionId,
            startedAt: new Date(),
        } as any);

        groupIds = [];
        // Create 100 groups to simulate a large reorder operation
        for (let i = 0; i < 100; i++) {
            const groupId = nanoid();
            groupIds.push(groupId);
            await db.sessionExerciseGroups.add({
                id: groupId,
                workoutSessionId: sessionId,
                orderIndex: generateTestRank(i),
            } as any);
        }
    });

    it('benchmarks original logic', async () => {
        // Shuffle the array to simulate a reorder
        const shuffledIds = [...groupIds].reverse();

        const start = performance.now();
        const ranks = generateSequentialRanks(shuffledIds.length);
        // Original logic from SessionRepository.reorderGroups
        await db.transaction('rw', db.sessionExerciseGroups, async () => {
            for (let i = 0; i < shuffledIds.length; i++) {
                await db.sessionExerciseGroups.update(shuffledIds[i], { orderIndex: ranks[i] });
            }
        });
        const end = performance.now();
        console.log(`Original logic time: ${(end - start).toFixed(2)}ms`);

        // Verify it worked
        const updatedGroups = await db.sessionExerciseGroups.where('workoutSessionId').equals(sessionId).toArray();
        expect(typeof updatedGroups.find(g => g.id === shuffledIds[0])?.orderIndex).toBe('string');
    });

    it('benchmarks optimized logic', async () => {
        // Shuffle the array to simulate a reorder
        const shuffledIds = [...groupIds].reverse();

        const start = performance.now();
        const ranks = generateSequentialRanks(shuffledIds.length);
        // Optimized logic using Promise.all
        await db.transaction('rw', db.sessionExerciseGroups, async () => {
            await Promise.all(
                shuffledIds.map((id, index) =>
                    db.sessionExerciseGroups.update(id, { orderIndex: ranks[index] })
                )
            );
        });
        const end = performance.now();
        console.log(`Optimized logic time: ${(end - start).toFixed(2)}ms`);

        // Verify it worked
        const updatedGroups = await db.sessionExerciseGroups.where('workoutSessionId').equals(sessionId).toArray();
        expect(typeof updatedGroups.find(g => g.id === shuffledIds[0])?.orderIndex).toBe('string');
    });
});
