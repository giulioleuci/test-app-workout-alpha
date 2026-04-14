/**
 * Repository for Active/Completed Session operations.
 * Owns tables: workoutSessions, sessionExerciseGroups, sessionExerciseItems, sessionSets
 */
import {
    WorkoutSession, SessionExerciseGroup, SessionExerciseItem, SessionSet, Exercise, ExerciseSubstitution
} from '@/domain/entities';
import { CounterType, ExerciseType, MovementPattern } from '@/domain/enums';
import {
  WorkoutSessionSchema, SessionExerciseGroupSchema,
  SessionExerciseItemSchema, SessionSetSchema,
} from '@/domain/schemas';
import { generateSequentialRanks } from '@/lib/lexorank';

import { BaseRepository } from './BaseRepository';
import { db } from '../database';
import { ExerciseRepository } from './ExerciseRepository';
import { WorkoutPlanRepository } from './WorkoutPlanRepository';

import type {
    HydratedSession, HydratedSessionGroup, HydratedSessionItem
} from './types';

export class SessionRepository extends BaseRepository {
    // --- Transaction Support ---

    static async transaction<T>(callback: () => Promise<T>): Promise<T> {
        return db.transaction('rw', [
            db.workoutSessions, db.sessionExerciseGroups,
            db.sessionExerciseItems, db.sessionSets, db.exerciseSubstitutions,
            db.userRegulationProfile // Sometimes needed for auto-start timer checks
        ], callback);
    }

    // --- Session Lifecycle ---

    static async createSession(session: WorkoutSession): Promise<string> {
        this.validateData(WorkoutSessionSchema, session);
        return db.workoutSessions.add(session);
    }

    static async completeSession(id: string, completedAt: Date): Promise<number> {
        return db.workoutSessions.update(id, { completedAt });
    }

    static async deleteSessionCascade(id: string): Promise<void> {
        await db.transaction('rw', [
            db.workoutSessions, db.sessionExerciseGroups,
            db.sessionExerciseItems, db.sessionSets
        ], async () => {
            const groups = await db.sessionExerciseGroups.where('workoutSessionId').equals(id).toArray();
            const groupIds = groups.map(g => g.id);

            const items = await db.sessionExerciseItems.where('sessionExerciseGroupId').anyOf(groupIds).toArray();
            const itemIds = items.map(i => i.id);

            await db.sessionSets.where('sessionExerciseItemId').anyOf(itemIds).delete();
            await db.sessionExerciseItems.where('sessionExerciseGroupId').anyOf(groupIds).delete();
            await db.sessionExerciseGroups.where('workoutSessionId').equals(id).delete();
            await db.workoutSessions.delete(id);
        });
    }

    static async saveFullSession(
        session: WorkoutSession,
        groups: SessionExerciseGroup[],
        items: SessionExerciseItem[],
        sets: SessionSet[]
    ): Promise<string> {
        await db.transaction('rw', [
            db.workoutSessions, db.sessionExerciseGroups,
            db.sessionExerciseItems, db.sessionSets
        ], async () => {
            await db.workoutSessions.add(session);
            await db.sessionExerciseGroups.bulkAdd(groups);
            await db.sessionExerciseItems.bulkAdd(items);
            await db.sessionSets.bulkAdd(sets);
        });
        return session.id;
    }

    static async getSession(id: string): Promise<WorkoutSession | undefined> {
        return db.workoutSessions.get(id);
    }

    static async getSessionsByIds(ids: string[]): Promise<WorkoutSession[]> {
        const sessions = await db.workoutSessions.bulkGet(ids);
        return sessions.filter((s): s is WorkoutSession => !!s);
    }

    static async updateSession(id: string, changes: Partial<WorkoutSession>): Promise<number> {
        this.validateData(WorkoutSessionSchema.partial(), changes);
        return db.workoutSessions.update(id, changes);
    }

    // --- Queries ---

    static async count(): Promise<number> {
        return db.workoutSessions.count();
    }

    static async getPagedSessions(offset: number, limit: number): Promise<WorkoutSession[]> {
        return db.workoutSessions.orderBy('startedAt').reverse().offset(offset).limit(limit).toArray();
    }

    static async getAllSessions(): Promise<WorkoutSession[]> {
        return db.workoutSessions.toArray();
    }

    static async findPreviousSessionsForPerformance(
        plannedWorkoutId: string,
        plannedSessionId: string,
        beforeDate: Date,
        limit: number
    ): Promise<WorkoutSession[]> {
        return db.workoutSessions
            .where('[plannedWorkoutId+plannedSessionId+completedAt]')
            .between(
                [plannedWorkoutId, plannedSessionId, new Date(0)],
                [plannedWorkoutId, plannedSessionId, beforeDate],
                true, false
            )
            .reverse()
            .limit(limit)
            .toArray();
    }

    static async findNextSessionsForPerformance(
        plannedWorkoutId: string,
        plannedSessionId: string,
        afterDate: Date,
        limit: number
    ): Promise<WorkoutSession[]> {
        return db.workoutSessions
            .where('[plannedWorkoutId+plannedSessionId+completedAt]')
            .between(
                [plannedWorkoutId, plannedSessionId, afterDate],
                [plannedWorkoutId, plannedSessionId, new Date(8640000000000000)],
                false, true
            )
            .limit(limit)
            .toArray();
    }

    static async getSessionsInDateRange(
        fromDate: Date,
        toDate: Date,
        options?: { completedOnly?: boolean, workoutId?: string, sessionId?: string }
    ): Promise<WorkoutSession[]> {
        let collection: import('dexie').Collection<WorkoutSession, string>;

        if (options?.workoutId) {
            collection = db.workoutSessions.where('[plannedWorkoutId+startedAt]')
                .between([options.workoutId, fromDate], [options.workoutId, toDate], true, true);
        } else {
            collection = db.workoutSessions.where('startedAt')
                .between(fromDate, toDate, true, true);
        }

        if (options?.completedOnly) {
            collection = collection.filter(s => !!s.completedAt);
        }

        if (options?.sessionId) {
            collection = collection.filter(s => s.plannedSessionId === options.sessionId);
        }

        return collection.toArray();
    }

    static async getSessionCountByWorkout(workoutId: string): Promise<number> {
        return db.workoutSessions.where('plannedWorkoutId').equals(workoutId).count();
    }

    static async getCompletedSessionCount(): Promise<number> {
        return db.workoutSessions.filter(s => !!s.completedAt).count();
    }

    static async getLatestCompletedSession(): Promise<WorkoutSession | undefined> {
        return db.workoutSessions.orderBy('completedAt').reverse().filter(s => !!s.completedAt).first();
    }

    static async getLatestCompletedSessionByWorkout(workoutId: string): Promise<WorkoutSession | undefined> {
        const count = await db.workoutSessions.where('plannedWorkoutId').equals(workoutId).count();
        if (count < 50) {
            return db.workoutSessions.where('plannedWorkoutId').equals(workoutId)
                .filter(ws => ws.completedAt != null)
                .sortBy('completedAt')
                .then(sessions => sessions[sessions.length - 1]);
        } else {
            return db.workoutSessions.orderBy('completedAt').reverse()
                .filter(ws => ws.plannedWorkoutId === workoutId && ws.completedAt != null)
                .first();
        }
    }

    static async findLatestCompletedSessionFromIds(sessionIds: string[]): Promise<WorkoutSession | undefined> {
        const sessions = await db.workoutSessions.where('id').anyOf(sessionIds).toArray();
        return sessions
            .filter(s => !!s.completedAt)
            .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0];
    }

    static async findActiveSession(): Promise<WorkoutSession | undefined> {
        return db.workoutSessions.filter(s => !s.completedAt).first();
    }

    static async findPendingSessionInfo(): Promise<{ id: string; startedAt: Date; sessionName: string } | null> {
        const pending = await this.findActiveSession();
        if (!pending) return null;

        let sessionName = 'Sessione';
        if (pending.plannedSessionId) {
            const ps = await WorkoutPlanRepository.getSession(pending.plannedSessionId);
            if (ps) sessionName = ps.name;
        }

        return { id: pending.id, startedAt: pending.startedAt, sessionName };
    }

    static async getSessionsByWorkout(workoutId: string, options?: { completedOnly?: boolean, desc?: boolean }): Promise<WorkoutSession[]> {
        let collection = db.workoutSessions.where('plannedWorkoutId').equals(workoutId);
        if (options?.desc) {
            collection = collection.reverse();
        }
        let sessions = await collection.toArray();
        if (options?.completedOnly) {
            sessions = sessions.filter(s => !!s.completedAt);
        }
        return sessions;
    }

    // --- Group Operations ---

    static async getGroup(id: string): Promise<SessionExerciseGroup | undefined> {
        return db.sessionExerciseGroups.get(id);
    }

    static async getGroupsBySession(sessionId: string): Promise<SessionExerciseGroup[]> {
        return db.sessionExerciseGroups.where('workoutSessionId').equals(sessionId).sortBy('orderIndex');
    }

    static async getGroupsByIds(groupIds: string[]): Promise<SessionExerciseGroup[]> {
        return db.sessionExerciseGroups.where('id').anyOf(groupIds).toArray();
    }

    static async getGroupsBySessionIds(sessionIds: string[]): Promise<SessionExerciseGroup[]> {
        return db.sessionExerciseGroups.where('workoutSessionId').anyOf(sessionIds).toArray();
    }

    static async addGroup(group: SessionExerciseGroup): Promise<string> {
        this.validateData(SessionExerciseGroupSchema, group);
        return db.sessionExerciseGroups.add(group);
    }

    static async updateGroup(id: string, changes: Partial<SessionExerciseGroup>): Promise<number> {
        this.validateData(SessionExerciseGroupSchema.partial(), changes);
        return db.sessionExerciseGroups.update(id, changes);
    }

    static async deleteGroup(id: string): Promise<void> {
        await db.sessionExerciseGroups.delete(id);
    }

    static async bulkDeleteGroups(ids: string[]): Promise<void> {
        await db.sessionExerciseGroups.bulkDelete(ids);
    }

    static async reorderGroups(_sessionId: string, orderedIds: string[]): Promise<void> {
        const ranks = generateSequentialRanks(orderedIds.length);
        await db.transaction('rw', db.sessionExerciseGroups, async () => {
            await Promise.all(
                orderedIds.map((id, index) =>
                    db.sessionExerciseGroups.update(id, { orderIndex: ranks[index] })
                )
            );
        });
    }

    // --- Item Operations ---

    static async getItem(id: string): Promise<SessionExerciseItem | undefined> {
        return db.sessionExerciseItems.get(id);
    }

    static async getItemsByPlannedItem(plannedItemId: string): Promise<SessionExerciseItem[]> {
        return db.sessionExerciseItems.where('plannedExerciseItemId').equals(plannedItemId).toArray();
    }

    static async getItemsByGroup(groupId: string): Promise<SessionExerciseItem[]> {
        return db.sessionExerciseItems.where('sessionExerciseGroupId').equals(groupId).sortBy('orderIndex');
    }

    static async getItemsByGroups(groupIds: string[]): Promise<SessionExerciseItem[]> {
        return db.sessionExerciseItems.where('sessionExerciseGroupId').anyOf(groupIds).sortBy('orderIndex');
    }

    static async addItem(item: SessionExerciseItem): Promise<string> {
        this.validateData(SessionExerciseItemSchema, item);
        return db.sessionExerciseItems.add(item);
    }

    static async updateItem(id: string, changes: Partial<SessionExerciseItem>): Promise<number> {
        this.validateData(SessionExerciseItemSchema.partial(), changes);
        return db.sessionExerciseItems.update(id, changes);
    }

    static async deleteItem(id: string): Promise<void> {
        await db.sessionExerciseItems.delete(id);
    }

    static async bulkDeleteItems(ids: string[]): Promise<void> {
        await db.sessionExerciseItems.bulkDelete(ids);
    }

    static async getItemsByExercise(exerciseId: string, options?: { fromDate?: Date, toDate?: Date, limit?: number, desc?: boolean }): Promise<SessionExerciseItem[]> {
        let query = db.sessionExerciseItems.where('[exerciseId+completedAt]').between(
            [exerciseId, options?.fromDate ?? new Date(0)],
            [exerciseId, options?.toDate ?? new Date(9999, 11, 31)],
            true, true
        );

        if (options?.desc) {
            query = query.reverse();
        }

        if (options?.limit) {
            query = query.limit(options.limit);
        }

        return query.toArray();
    }

    /**
     * Efficiently find the latest session items for a batch of exercises.
     * Uses the exerciseId+completedAt index to quickly find candidates.
     */
    static async getLatestSessionItemsForExercises(exerciseIds: string[]): Promise<SessionExerciseItem[]> {
        // We'll fetch a small batch of recent items for these exercises
        // Dexie doesn't support complex 'latest per group' query easily,
        // so we fetch all recent items for these exercises and filter in memory.

        // Since we can't do "where exerciseId IN (...) ORDER BY completedAt DESC LIMIT 1 PER GROUP" easily in IndexedDB,
        // We can iterate over exerciseIds and parallelize requests.
        // Or we use bulkGet if we had IDs, but we don't.

        // Parallel fetching is acceptable here because typically a workout has 5-10 exercises.
        const promises = exerciseIds.map(eid =>
            db.sessionExerciseItems
                .where('[exerciseId+completedAt]')
                .between(
                    [eid, new Date(0)],
                    [eid, new Date(9999, 11, 31)],
                    true, true
                )
                .reverse()
                .limit(1)
                .first()
        );

        const results = await Promise.all(promises);
        return results.filter((i): i is SessionExerciseItem => !!i);
    }

    // --- Set Operations ---

    static async getSet(id: string): Promise<SessionSet | undefined> {
        return db.sessionSets.get(id);
    }

    static async getSetsByItem(itemId: string): Promise<SessionSet[]> {
        return db.sessionSets.where('sessionExerciseItemId').equals(itemId).sortBy('orderIndex');
    }

    static async getSetsByItems(itemIds: string[]): Promise<SessionSet[]> {
        return db.sessionSets.where('sessionExerciseItemId').anyOf(itemIds).sortBy('orderIndex');
    }

    static async getCompletedSetsByItem(itemId: string): Promise<SessionSet[]> {
        return db.sessionSets.where('[sessionExerciseItemId+isCompleted]').equals([itemId, 1]).sortBy('orderIndex');
    }

    static async addSets(sets: SessionSet[]): Promise<string> {
        sets.forEach(set => this.validateData(SessionSetSchema, set));
        return db.sessionSets.bulkAdd(sets);
    }

    static async updateSet(id: string, changes: Partial<SessionSet>): Promise<number> {
        this.validateData(SessionSetSchema.partial(), changes);
        return db.sessionSets.update(id, changes);
    }

    static async bulkUpdateSets(updates: { key: string; changes: Partial<SessionSet> }[]): Promise<void> {
        if (updates.length === 0) return;

        await db.transaction('rw', db.sessionSets, async () => {
            const keys = updates.map(u => u.key);
            const existingSets = await db.sessionSets.bulkGet(keys);

            const setsToPut: SessionSet[] = [];
            for (let i = 0; i < existingSets.length; i++) {
                const existing = existingSets[i];
                if (existing) {
                    setsToPut.push({ ...existing, ...updates[i].changes });
                }
            }

            if (setsToPut.length > 0) {
                await db.sessionSets.bulkPut(setsToPut);
            }
        });
    }

    static async deleteSet(id: string): Promise<void> {
        return db.sessionSets.delete(id);
    }

    static async bulkDeleteSets(ids: string[]): Promise<void> {
        await db.sessionSets.bulkDelete(ids);
    }

    static async deleteSetsByItem(itemId: string): Promise<number> {
        return db.sessionSets.where('sessionExerciseItemId').equals(itemId).delete();
    }

    static async deleteSetsByItems(itemIds: string[]): Promise<number> {
        return db.sessionSets.where('sessionExerciseItemId').anyOf(itemIds).delete();
    }

    // --- Hydration Methods ---

    static async getHydratedSession(sessionId: string): Promise<HydratedSession | null> {
        const session = await db.workoutSessions.get(sessionId);
        if (!session) return null;

        const sessions = await this.getHydratedSessions([session]);
        return sessions.length > 0 ? sessions[0] : null;
    }

    static async getHydratedSessionsByIds(ids: string[]): Promise<HydratedSession[]> {
        const sessions = await this.getSessionsByIds(ids);
        return this.getHydratedSessions(sessions);
    }

    static async getHydratedSessions(sessions: WorkoutSession[]): Promise<HydratedSession[]> {
        if (sessions.length === 0) return [];

        const sessionIds = sessions.map(s => s.id);
        const groups = await db.sessionExerciseGroups.where('workoutSessionId').anyOf(sessionIds).toArray();
        const groupIds = groups.map(g => g.id);

        const items = groupIds.length > 0
            ? await db.sessionExerciseItems.where('sessionExerciseGroupId').anyOf(groupIds).toArray()
            : [];
        const itemIds = items.map(i => i.id);

        const sets = itemIds.length > 0
            ? await db.sessionSets.where('sessionExerciseItemId').anyOf(itemIds).toArray()
            : [];

        const exerciseIds = Array.from(new Set(items.map(i => i.exerciseId)));
        const versionIds = Array.from(new Set(items.map(i => i.exerciseVersionId).filter((id): id is string => !!id)));

        const exercises = await ExerciseRepository.bulkGet(exerciseIds);
        const exerciseMap = Object.fromEntries(
            exercises
                .filter((e): e is Exercise => !!e)
                .map(e => [e.id, e])
        );

        const versions = await db.exerciseVersions.bulkGet(versionIds);
        const versionMap = Object.fromEntries(
            versions
                .filter((v): v is import('@/domain/entities').ExerciseVersion => !!v)
                .map(v => [v.id, v])
        );

        const setsByItem = new Map<string, SessionSet[]>();
        for (const s of sets) {
            if (!setsByItem.has(s.sessionExerciseItemId)) setsByItem.set(s.sessionExerciseItemId, []);
            setsByItem.get(s.sessionExerciseItemId)!.push(s);
        }
        for (const acts of setsByItem.values()) acts.sort((a, b) => a.orderIndex.localeCompare(b.orderIndex));

        const itemsByGroup = new Map<string, HydratedSessionItem[]>();
        for (const i of items) {
            if (!itemsByGroup.has(i.sessionExerciseGroupId)) itemsByGroup.set(i.sessionExerciseGroupId, []);

            let exercise = exerciseMap[i.exerciseId] ?? null;

            // If the item points to a specific version, we merge the structural data of that version
            // into the returned 'hydrated' exercise, giving the exact historical properties.
            if (i.exerciseVersionId && versionMap[i.exerciseVersionId]) {
                const ver = versionMap[i.exerciseVersionId];
                if (exercise) {
                    exercise = {
                        ...exercise,
                        name: ver.name,
                        type: ver.type,
                        primaryMuscles: ver.primaryMuscles,
                        secondaryMuscles: ver.secondaryMuscles,
                        equipment: ver.equipment,
                        movementPattern: ver.movementPattern,
                        counterType: ver.counterType,
                    };
                } else {
                    exercise = {
                        id: i.exerciseId,
                        name: ver.name,
                        type: ver.type,
                        primaryMuscles: ver.primaryMuscles || [],
                        secondaryMuscles: ver.secondaryMuscles || [],
                        equipment: ver.equipment || [],
                        movementPattern: ver.movementPattern,
                        counterType: ver.counterType,
                        defaultLoadUnit: 'kg',
                        variantIds: [],
                        isArchived: true,
                        createdAt: new Date(0),
                        updatedAt: new Date(0)
                    } as Exercise;
                }
            } else if (!exercise) {
                // Should not happen with valid DB, but fallback just in case
                exercise = {
                    id: i.exerciseId,
                    name: 'Unknown Exercise',
                    type: ExerciseType.Compound,
                    primaryMuscles: [],
                    secondaryMuscles: [],
                    equipment: [],
                    movementPattern: MovementPattern.Other,
                    counterType: CounterType.Reps,
                    defaultLoadUnit: 'kg',
                    variantIds: [],
                    isArchived: true,
                    createdAt: new Date(0),
                    updatedAt: new Date(0)
                } as Exercise;
            }

            itemsByGroup.get(i.sessionExerciseGroupId)!.push({
                item: i,
                exercise: exercise,
                sets: setsByItem.get(i.id) ?? []
            });
        }
        for (const list of itemsByGroup.values()) list.sort((a, b) => a.item.orderIndex.localeCompare(b.item.orderIndex));

        const groupsBySession = new Map<string, HydratedSessionGroup[]>();
        for (const g of groups) {
            if (!groupsBySession.has(g.workoutSessionId)) groupsBySession.set(g.workoutSessionId, []);
            groupsBySession.get(g.workoutSessionId)!.push({
                group: g,
                items: itemsByGroup.get(g.id) ?? []
            });
        }
        for (const list of groupsBySession.values()) list.sort((a, b) => a.group.orderIndex.localeCompare(b.group.orderIndex));

        return sessions.map(session => ({
            session,
            groups: groupsBySession.get(session.id) ?? []
        }));
    }

    static async getAllHydratedSessions(fromDate?: Date, toDate?: Date): Promise<HydratedSession[]> {
        let query = db.workoutSessions.toCollection();
        if (fromDate && toDate) {
            query = db.workoutSessions.where('startedAt').between(fromDate, toDate, true, true);
        } else if (fromDate) {
            query = db.workoutSessions.where('startedAt').aboveOrEqual(fromDate);
        } else if (toDate) {
            query = db.workoutSessions.where('startedAt').belowOrEqual(toDate);
        }

        const allSessions = await query.toArray();
        return this.getHydratedSessions(allSessions);
    }

    // --- Complex Mutations ---

    static async swapExercise(
        itemId: string,
        newExerciseId: string,
        deleteSetIds: string[],
        newSets: SessionSet[],
        substitution?: ExerciseSubstitution
    ): Promise<void> {
        await db.transaction('rw', [
            db.sessionExerciseItems, db.sessionSets, db.sessionExerciseGroups, db.exerciseSubstitutions
        ], async () => {
            const item = await db.sessionExerciseItems.get(itemId);
            if (!item) throw new Error(`SessionExerciseItem ${itemId} not found`);

            const originalExerciseId = item.originalExerciseId ?? item.exerciseId;

            await db.sessionExerciseItems.update(itemId, {
                exerciseId: newExerciseId,
                originalExerciseId,
            });

            if (deleteSetIds.length > 0) {
                await db.sessionSets.bulkDelete(deleteSetIds);
            }

            if (newSets.length > 0) {
                await db.sessionSets.bulkAdd(newSets);
            }

            if (substitution) {
                await db.exerciseSubstitutions.add(substitution);
            }
        });
    }

    static async addExercise(
        _sessionId: string,
        group: SessionExerciseGroup,
        item: SessionExerciseItem,
        sets: SessionSet[]
    ): Promise<void> {
        await db.transaction('rw', [
            db.sessionExerciseGroups, db.sessionExerciseItems, db.sessionSets
        ], async () => {
            await db.sessionExerciseGroups.add(group);
            await db.sessionExerciseItems.add(item);
            if (sets.length > 0) await db.sessionSets.bulkAdd(sets);
        });
    }

    static async addSuperset(
        _sessionId: string,
        group: SessionExerciseGroup,
        items: SessionExerciseItem[],
        sets: SessionSet[]
    ): Promise<void> {
        await db.transaction('rw', [
            db.sessionExerciseGroups, db.sessionExerciseItems, db.sessionSets
        ], async () => {
            await db.sessionExerciseGroups.add(group);
            await db.sessionExerciseItems.bulkAdd(items);
            if (sets.length > 0) await db.sessionSets.bulkAdd(sets);
        });
    }

    static async removeExercise(itemId: string): Promise<void> {
        await db.transaction('rw', [
            db.sessionExerciseGroups, db.sessionExerciseItems, db.sessionSets
        ], async () => {
            const item = await db.sessionExerciseItems.get(itemId);
            if (!item) throw new Error(`SessionExerciseItem ${itemId} not found`);

            await db.sessionSets.where('sessionExerciseItemId').equals(itemId).delete();
            await db.sessionExerciseItems.delete(itemId);

            const siblingCount = await db.sessionExerciseItems
                .where('sessionExerciseGroupId').equals(item.sessionExerciseGroupId)
                .count();

            if (siblingCount === 0) {
                const group = await db.sessionExerciseGroups.get(item.sessionExerciseGroupId);
                if (!group) return;

                await db.sessionExerciseGroups.delete(group.id);
            }
        });
    }

    static async getLastSetPerformance(plannedSetId: string): Promise<SessionSet | null> {
        return db.sessionSets
            .where('plannedSetId').equals(plannedSetId)
            .filter(s => s.isCompleted && !s.isSkipped && (s.actualLoad ?? 0) > 0)
            .reverse()
            .sortBy('completedAt')
            .then(sets => sets[0] || null);
    }

    static async getLastPerformance(exerciseId: string): Promise<{ load: number; reps: number; rpe: number } | null> {
        // Find all items for this exercise, ordered by completedAt
        const items = await db.sessionExerciseItems
            .where('exerciseId').equals(exerciseId)
            .filter(i => !!i.completedAt)
            .toArray();

        if (items.length === 0) return null;

        // Sort manually by completedAt descending
        items.sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0));

        const lastItem = items[0];

        const lastSets = await db.sessionSets
            .where('sessionExerciseItemId').equals(lastItem.id)
            .toArray();

        const lastSet = lastSets
            .filter(s => s.isCompleted && !s.isSkipped && (s.actualLoad ?? 0) > 0)
            .sort((a, b) => b.orderIndex.localeCompare(a.orderIndex))[0];

        if (!lastSet) {
            // If the very last item has no valid sets, try the one before it
            if (items.length > 1) {
                for (let i = 1; i < Math.min(items.length, 5); i++) {
                    const prevItem = items[i];
                    const prevSets = await db.sessionSets
                        .where('sessionExerciseItemId').equals(prevItem.id)
                        .toArray();
                    const prevSet = prevSets
                        .filter(s => s.isCompleted && !s.isSkipped && (s.actualLoad ?? 0) > 0)
                        .sort((a, b) => b.orderIndex.localeCompare(a.orderIndex))[0];
                    if (prevSet) {
                        return {
                            load: prevSet.actualLoad ?? 0,
                            reps: prevSet.actualCount ?? 0,
                            rpe: prevSet.actualRPE ?? 10
                        };
                    }
                }
            }
            return null;
        }

        return {
            load: lastSet.actualLoad ?? 0,
            reps: lastSet.actualCount ?? 0,
            rpe: lastSet.actualRPE ?? 10
        };
    }

    static async getPlannedSet(id: string) {
        return db.plannedSets.get(id);
    }

    static async getUserRegulationProfile() {
        return db.userRegulationProfile.toCollection().first();
    }

    static async getSetsInSessionForExercise(sessionId: string, exerciseId: string) {
        const groups = await db.sessionExerciseGroups.where('workoutSessionId').equals(sessionId).toArray();
        const groupIds = groups.map(g => g.id);
        const items = await db.sessionExerciseItems
            .where('sessionExerciseGroupId').anyOf(groupIds)
            .filter(i => i.exerciseId === exerciseId)
            .toArray();
        const itemIds = items.map(i => i.id);
        return db.sessionSets.where('sessionExerciseItemId').anyOf(itemIds).toArray();
    }
}
