import { LexoRank } from 'lexorank';

function generateTestRank(index: number) {
    let rank = LexoRank.min().between(LexoRank.middle());
    for (let i = 0; i < index; i++) rank = rank.genNext();
    return rank.toString();
}


import { nanoid } from 'nanoid';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { db } from '@/db/database';
import { SessionRepository } from '@/db/repositories/SessionRepository';
import type { CurrentTarget, LoadedGroup } from '@/domain/activeSessionTypes';
import type { SessionSet, SessionExerciseItem, SessionExerciseGroup, PlannedSet } from '@/domain/entities';
import { SetType, ToFailureIndicator, ExerciseGroupType } from '@/domain/enums';
import dayjs from '@/lib/dayjs';
import { profileService } from '@/services/profileService';
import { SessionExecutionService } from '@/services/sessionExecutionService';

describe('SessionExecutionService', () => {
    beforeEach(async () => {
        await db.sessionSets.clear();
        await db.sessionExerciseItems.clear();
        await db.sessionExerciseGroups.clear();
        await db.workoutSessions.clear();
        await db.exerciseSubstitutions.clear();
        vi.clearAllMocks();
    });

    const createSet = async (override: Partial<SessionSet> = {}) => {
        const set: SessionSet = {
            id: nanoid(),
            sessionExerciseItemId: 'item1',
            setType: SetType.Working,
            orderIndex: generateTestRank(0),
            isCompleted: false,
            isSkipped: false,
            actualLoad: null, actualCount: null, actualRPE: null,
            actualToFailure: ToFailureIndicator.None,
            partials: false, forcedReps: 0,
            ...override,
        };
        await db.sessionSets.add(set);
        return set;
    };

    const createMockCurrentTarget = (set: SessionSet, override: Partial<CurrentTarget> = {}): CurrentTarget => ({
        gi: 0, ii: 0, si: 0,
        set,
        item: {
            item: { id: set.sessionExerciseItemId } as SessionExerciseItem,
            sets: [set],
            plannedSets: {},
            exercise: null,
            occurrenceIndex: 0,
            ...override.item
        },
        group: {
            group: { groupType: ExerciseGroupType.Standard } as SessionExerciseGroup,
            items: [],
            ...override.group
        },
        ...override
    });

    describe('completeSet', () => {
        it('should complete a set with updates', async () => {
            const set = await createSet();
            const current = createMockCurrentTarget(set);
            const updates = { actualLoad: 100, actualCount: 10 };

            await SessionExecutionService.completeSet(set.id, updates, current);

            const updatedSet = await db.sessionSets.get(set.id);
            expect(updatedSet?.isCompleted).toBe(true);
            expect(updatedSet?.actualLoad).toBe(100);
            expect(updatedSet?.completedAt).toBeDefined();
        });

        it('should calculate e1rm and relative intensity if possible', async () => {
            const set = await createSet();
            const current = createMockCurrentTarget(set);
            const updates = { actualLoad: 100, actualCount: 5, actualRPE: 8 };

            vi.spyOn(profileService, 'getLatestBodyWeight').mockResolvedValue({ weight: 80 } as any);

            await SessionExecutionService.completeSet(set.id, updates, current);

            const updatedSet = await db.sessionSets.get(set.id);
            expect(updatedSet?.e1rm).toBeGreaterThan(0);
            expect(updatedSet?.relativeIntensity).toBeGreaterThan(0);
        });

        it('should handle missing current target (e.g. from list view)', async () => {
            const set = await createSet();
            const updates = { actualLoad: 100 };

            await SessionExecutionService.completeSet(set.id, updates, null);

            const updatedSet = await db.sessionSets.get(set.id);
            expect(updatedSet?.isCompleted).toBe(true);
            expect(updatedSet?.actualLoad).toBe(100);
        });

        it('should handle completing a set that is not the current target', async () => {
            const set1 = await createSet({ id: 's1', orderIndex: generateTestRank(0) });
            const set2 = await createSet({ id: 's2', orderIndex: generateTestRank(1) });
            const current = createMockCurrentTarget(set1); // Current is s1

            // Complete s2 instead
            await SessionExecutionService.completeSet(set2.id, { actualLoad: 50 }, current);

            const updatedSet2 = await db.sessionSets.get(set2.id);
            expect(updatedSet2?.isCompleted).toBe(true);
            expect(updatedSet2?.actualLoad).toBe(50);
        });
    });

    describe('skipSet', () => {
        it('should skip a set', async () => {
            const set = await createSet();
            await SessionExecutionService.skipSet(set.id);

            const updatedSet = await db.sessionSets.get(set.id);
            expect(updatedSet?.isSkipped).toBe(true);
        });
    });

    describe('skipRemainingSets', () => {
        it('should skip remaining sets in the item', async () => {
            const s1 = await createSet({ id: 's1', orderIndex: generateTestRank(0), isCompleted: true });
            const s2 = await createSet({ id: 's2', orderIndex: generateTestRank(1) });
            const s3 = await createSet({ id: 's3', orderIndex: generateTestRank(2) });

            const current = createMockCurrentTarget(s2, {
                si: 1,
                item: {
                    item: { id: 'item1' } as any,
                    sets: [s1, s2, s3],
                    plannedSets: {},
                    exercise: null,
                    occurrenceIndex: 0
                }
            });

            await SessionExecutionService.skipRemainingSets(current);

            const updatedS2 = await db.sessionSets.get(s2.id);
            const updatedS3 = await db.sessionSets.get(s3.id);

            expect(updatedS2?.isSkipped).toBe(true);
            expect(updatedS3?.isSkipped).toBe(true);
        });
    });

    describe('addSet', () => {
        it('should add a new set to the item', async () => {
            const s1 = await createSet({ sessionExerciseItemId: 'item1', orderIndex: generateTestRank(0) });

            await SessionExecutionService.addSet('item1');

            const sets = await SessionRepository.getSetsByItem('item1');
            expect(sets).toHaveLength(2);
            expect(sets[1].orderIndex > sets[0].orderIndex).toBe(true);
            expect(sets[1].setType).toBe(SetType.Working);
        });
    });

    describe('uncompleteSet', () => {
        it('should reset completion status', async () => {
            const s1 = await createSet({ isCompleted: true, completedAt: new Date() });

            await SessionExecutionService.uncompleteSet(s1.id);

            const updated = await db.sessionSets.get(s1.id);
            expect(updated?.isCompleted).toBe(false);
            expect(updated?.completedAt).toBeUndefined();
        });
    });

    describe('uncompleteLastSet', () => {
        it('should uncomplete the last completed set', async () => {
            const s1 = await createSet({ id: 's1', orderIndex: generateTestRank(0), isCompleted: true });
            const s2 = await createSet({ id: 's2', orderIndex: generateTestRank(1), isCompleted: true });
            const s3 = await createSet({ id: 's3', orderIndex: generateTestRank(2), isCompleted: false });

            await SessionExecutionService.uncompleteLastSet('item1');

            const updatedS2 = await db.sessionSets.get(s2.id);
            expect(updatedS2?.isCompleted).toBe(false);

            const updatedS1 = await db.sessionSets.get(s1.id);
            expect(updatedS1?.isCompleted).toBe(true); // Should remain completed
        });
    });

    describe('uncompleteLastRound', () => {
        it('should uncomplete last completed sets in a group', async () => {
            // Group with 2 items, 2 sets each. Both first sets completed.
            const s1_1 = await createSet({ id: 's1_1', sessionExerciseItemId: 'i1', orderIndex: generateTestRank(0), isCompleted: true });
            const s1_2 = await createSet({ id: 's1_2', sessionExerciseItemId: 'i1', orderIndex: generateTestRank(1), isCompleted: false });
            const s2_1 = await createSet({ id: 's2_1', sessionExerciseItemId: 'i2', orderIndex: generateTestRank(0), isCompleted: true });
            const s2_2 = await createSet({ id: 's2_2', sessionExerciseItemId: 'i2', orderIndex: generateTestRank(1), isCompleted: false });

            const loadedGroup: LoadedGroup = {
                group: { id: 'g1' } as any,
                items: [
                    { item: { id: 'i1' } as any, sets: [s1_1, s1_2] } as any,
                    { item: { id: 'i2' } as any, sets: [s2_1, s2_2] } as any
                ]
            };

            await SessionExecutionService.uncompleteLastRound(loadedGroup);

            const u1 = await db.sessionSets.get(s1_1.id);
            const u2 = await db.sessionSets.get(s2_1.id);

            expect(u1?.isCompleted).toBe(false);
            expect(u2?.isCompleted).toBe(false);
        });
    });

    describe('completeRound', () => {
        it('should complete multiple sets in a round', async () => {
            const s1 = await createSet({ id: 's1', sessionExerciseItemId: 'i1', orderIndex: generateTestRank(0) });
            const s2 = await createSet({ id: 's2', sessionExerciseItemId: 'i2', orderIndex: generateTestRank(0) });

            const group: LoadedGroup = {
                group: { id: 'g1', groupType: ExerciseGroupType.Superset } as any,
                items: [
                    { item: { id: 'i1' } as any, sets: [s1] } as any,
                    { item: { id: 'i2' } as any, sets: [s2] } as any
                ]
            };

            const setsData = {
                [s1.id]: { actualLoad: 100, actualCount: 10 },
                [s2.id]: { actualLoad: 80, actualCount: 12 }
            };

            await SessionExecutionService.completeRound(group, 0, setsData);

            const u1 = await db.sessionSets.get(s1.id);
            const u2 = await db.sessionSets.get(s2.id);

            expect(u1?.isCompleted).toBe(true);
            expect(u2?.isCompleted).toBe(true);
        });
    });

    describe('completeScreen', () => {
        it('should complete sets for items in the screen', async () => {
            const s1 = await createSet({ id: 's1', sessionExerciseItemId: 'i1', orderIndex: generateTestRank(0) });
            const s2 = await createSet({ id: 's2', sessionExerciseItemId: 'i2', orderIndex: generateTestRank(0) }); // Not in screen

            const group: LoadedGroup = {
                group: { id: 'g1', groupType: ExerciseGroupType.Superset } as any,
                items: [
                    { item: { id: 'i1' } as any, sets: [s1] } as any,
                    { item: { id: 'i2' } as any, sets: [s2] } as any
                ]
            };

            const setsData = {
                [s1.id]: { actualLoad: 100, actualCount: 10 },
            };

            await SessionExecutionService.completeScreen(group, 0, [0], setsData, false);

            const u1 = await db.sessionSets.get(s1.id);
            const u2 = await db.sessionSets.get(s2.id);

            expect(u1?.isCompleted).toBe(true);
            expect(u2?.isCompleted).toBe(false);
        });
    });

    describe('skipRound', () => {
        it('should skip sets in the specified round', async () => {
            const s1 = await createSet({ id: 's1', sessionExerciseItemId: 'i1', orderIndex: generateTestRank(0) });

            const current = createMockCurrentTarget(s1, {
                round: 0,
                group: {
                    group: { id: 'g1' } as any,
                    items: [
                        { item: { id: 'i1' } as any, sets: [s1] } as any
                    ]
                }
            });

            await SessionExecutionService.skipRound(current);

            const u1 = await db.sessionSets.get(s1.id);
            expect(u1?.isSkipped).toBe(true);
        });
    });

    describe('skipRemainingRounds', () => {
        it('should skip remaining rounds', async () => {
            const s1 = await createSet({ id: 's1', sessionExerciseItemId: 'i1', orderIndex: generateTestRank(0), isCompleted: true });
            const s2 = await createSet({ id: 's2', sessionExerciseItemId: 'i1', orderIndex: generateTestRank(1) });
            const s3 = await createSet({ id: 's3', sessionExerciseItemId: 'i1', orderIndex: generateTestRank(2) });

            const current = createMockCurrentTarget(s2, {
                round: 1,
                group: {
                    group: { id: 'g1' } as any,
                    items: [
                        { item: { id: 'i1' } as any, sets: [s1, s2, s3] } as any
                    ]
                }
            });

            await SessionExecutionService.skipRemainingRounds(current);

            const u2 = await db.sessionSets.get(s2.id);
            const u3 = await db.sessionSets.get(s3.id);

            expect(u2?.isSkipped).toBe(true);
            expect(u3?.isSkipped).toBe(true);
        });
    });

    describe('addRound', () => {
        it('should add a set to each item in the group', async () => {
            const s1 = await createSet({ sessionExerciseItemId: 'i1', orderIndex: generateTestRank(0) });
            const s2 = await createSet({ sessionExerciseItemId: 'i2', orderIndex: generateTestRank(0) });

            const group: LoadedGroup = {
                group: { id: 'g1' } as any,
                items: [
                    { item: { id: 'i1' } as any, sets: [s1] } as any,
                    { item: { id: 'i2' } as any, sets: [s2] } as any
                ]
            };

            await SessionExecutionService.addRound(group);

            const sets1 = await SessionRepository.getSetsByItem('i1');
            const sets2 = await SessionRepository.getSetsByItem('i2');

            expect(sets1).toHaveLength(2);
            expect(sets2).toHaveLength(2);
        });
    });

    describe('mutations', () => {
        it('swapItems reorders items', async () => {
            await db.sessionExerciseItems.add({ id: 'i1', orderIndex: generateTestRank(0) } as any);
            await db.sessionExerciseItems.add({ id: 'i2', orderIndex: generateTestRank(1) } as any);

            await SessionExecutionService.swapItems('i1', 'i2', generateTestRank(0), generateTestRank(1));

            const i1 = await db.sessionExerciseItems.get('i1');
            const i2 = await db.sessionExerciseItems.get('i2');

            expect(i1?.orderIndex).toBe(generateTestRank(1));
            expect(i2?.orderIndex).toBe(generateTestRank(0));
        });
    });
});
