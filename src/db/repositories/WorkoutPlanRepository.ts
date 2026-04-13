/**
 * Repository for Workout Plans (Routine).
 * Owns tables: plannedWorkouts, plannedSessions, plannedExerciseGroups, plannedExerciseItems, plannedSets, exerciseSubstitutions
 */
import {
    PlannedWorkout, PlannedSession, PlannedExerciseGroup, PlannedExerciseItem, PlannedSet,
    ExerciseSubstitution, Exercise
} from '@/domain/entities';
import { PlannedWorkoutStatus } from '@/domain/enums';

import { db } from '../database';
import { ExerciseRepository } from './ExerciseRepository';

import type {
    HydratedPlannedSession, HydratedPlannedGroup, HydratedPlannedItem, HydratedPlannedWorkout
} from './types';

import {
    PlannedWorkoutSchema, PlannedSessionSchema, PlannedExerciseGroupSchema,
    PlannedExerciseItemSchema, PlannedSetSchema,
} from '@/domain/schemas';
import { BaseRepository } from './BaseRepository';


export class WorkoutPlanRepository extends BaseRepository {
    // --- Workout CRUD ---

    static async getWorkout(id: string): Promise<PlannedWorkout | undefined> {
        return db.plannedWorkouts.get(id);
    }

    static async getAllWorkouts(): Promise<PlannedWorkout[]> {
        return db.plannedWorkouts.filter(w => !w.isArchived).toArray();
    }

    static async getAllWorkoutsCount(): Promise<number> {
        return db.plannedWorkouts.filter(w => !w.isArchived).count();
    }

    static async getActiveWorkouts(): Promise<PlannedWorkout[]> {
        return this.getWorkoutsByStatus(PlannedWorkoutStatus.Active);
    }

    static async getWorkoutsByStatus(status: PlannedWorkoutStatus): Promise<PlannedWorkout[]> {
        return db.plannedWorkouts
            .where('status').equals(status)
            .filter(w => !w.isArchived)
            .toArray();
    }

    static async addWorkout(workout: PlannedWorkout): Promise<string> {
        this.validateData(PlannedWorkoutSchema, workout);
        return db.plannedWorkouts.add(workout);
    }

    static async updateWorkout(id: string, changes: Partial<PlannedWorkout>): Promise<number> {
        this.validateData(PlannedWorkoutSchema.partial(), changes);
        return db.plannedWorkouts.update(id, changes);
    }

    static async deleteWorkoutCascade(id: string): Promise<void> {
        await db.transaction('rw', [
            db.plannedWorkouts, db.plannedSessions, db.plannedExerciseGroups,
            db.plannedExerciseItems, db.plannedSets, db.exerciseSubstitutions
        ], async () => {
            await db.plannedWorkouts.delete(id);
            const sessions = await db.plannedSessions.where('plannedWorkoutId').equals(id).toArray();
            for (const s of sessions) {
                await this.deleteSessionCascade(s.id);
            }
        });
    }

    static async countUsage(id: string): Promise<number> {
        return db.workoutSessions.where('plannedWorkoutId').equals(id).count();
    }

    static async archiveWorkout(id: string): Promise<number> {
        return db.plannedWorkouts.update(id, {
            isArchived: true,
            status: PlannedWorkoutStatus.Archived
        });
    }

    static async smartDeleteWorkout(id: string): Promise<void> {
        const usageCount = await this.countUsage(id);
        if (usageCount > 0) {
            await this.archiveWorkout(id);
        } else {
            await this.deleteWorkoutCascade(id);
        }
    }

    // --- Session CRUD ---

    static async getSession(id: string): Promise<PlannedSession | undefined> {
        return db.plannedSessions.get(id);
    }

    static async getSessionsByWorkout(workoutId: string): Promise<PlannedSession[]> {
        return db.plannedSessions.where('plannedWorkoutId').equals(workoutId).sortBy('orderIndex');
    }

    static async getSessionCountByWorkout(workoutId: string): Promise<number> {
        return db.plannedSessions.where('plannedWorkoutId').equals(workoutId).count();
    }

    static async addSession(session: PlannedSession): Promise<string> {
        this.validateData(PlannedSessionSchema, session);
        return db.plannedSessions.add(session);
    }

    static async deleteSessionCascade(sessionId: string): Promise<void> {
        const groups = await db.plannedExerciseGroups.where('plannedSessionId').equals(sessionId).toArray();
        for (const g of groups) {
            await this.deleteGroupCascade(g.id);
        }
        await db.plannedSessions.delete(sessionId);
    }

    static async saveFullSession(
        session: PlannedSession,
        groups: PlannedExerciseGroup[],
        items: PlannedExerciseItem[],
        sets: PlannedSet[]
    ): Promise<string> {
        await db.transaction('rw', [
            db.plannedSessions, db.plannedExerciseGroups, db.plannedExerciseItems, db.plannedSets
        ], async () => {
            await db.plannedSessions.add(session);
            await db.plannedExerciseGroups.bulkAdd(groups);
            await db.plannedExerciseItems.bulkAdd(items);
            await db.plannedSets.bulkAdd(sets);
        });
        return session.id;
    }

    static async saveFullWorkout(
        workout: PlannedWorkout,
        sessions: PlannedSession[],
        groups: PlannedExerciseGroup[],
        items: PlannedExerciseItem[],
        sets: PlannedSet[]
    ): Promise<string> {
        await db.transaction('rw', [
            db.plannedWorkouts, db.plannedSessions, db.plannedExerciseGroups,
            db.plannedExerciseItems, db.plannedSets
        ], async () => {
            await db.plannedWorkouts.put(workout);
            await db.plannedSessions.bulkAdd(sessions);
            await db.plannedExerciseGroups.bulkAdd(groups);
            await db.plannedExerciseItems.bulkAdd(items);
            await db.plannedSets.bulkAdd(sets);
        });
        return workout.id;
    }

    static async deleteWorkoutData(workoutId: string): Promise<void> {
        await db.transaction('rw', [
            db.plannedSessions, db.plannedExerciseGroups,
            db.plannedExerciseItems, db.plannedSets
        ], async () => {
            const sessions = await db.plannedSessions.where('plannedWorkoutId').equals(workoutId).primaryKeys();
            const groups = sessions.length ? await db.plannedExerciseGroups.where('plannedSessionId').anyOf(sessions).primaryKeys() : [];
            const items = groups.length ? await db.plannedExerciseItems.where('plannedExerciseGroupId').anyOf(groups).primaryKeys() : [];
            const sets = items.length ? await db.plannedSets.where('plannedExerciseItemId').anyOf(items).primaryKeys() : [];

            if (sets.length) await db.plannedSets.bulkDelete(sets);
            if (items.length) await db.plannedExerciseItems.bulkDelete(items);
            if (groups.length) await db.plannedExerciseGroups.bulkDelete(groups);
            if (sessions.length) await db.plannedSessions.bulkDelete(sessions);
        });
    }

    static async updateSessionStructure(
        sessionId: string,
        updates: Partial<PlannedSession>,
        added: { groups: PlannedExerciseGroup[], items: PlannedExerciseItem[], sets: PlannedSet[] },
        removed: { removedGroupIds: string[], removedItemIds: string[], removedSetIds: string[] }
    ): Promise<void> {
        await db.transaction('rw', [
            db.plannedSessions, db.plannedExerciseGroups,
            db.plannedExerciseItems, db.plannedSets
        ], async () => {
            await db.plannedSessions.update(sessionId, { ...updates, updatedAt: new Date() });

            if (removed.removedSetIds.length) await db.plannedSets.bulkDelete(removed.removedSetIds);
            if (removed.removedItemIds.length) await db.plannedExerciseItems.bulkDelete(removed.removedItemIds);
            if (removed.removedGroupIds.length) await db.plannedExerciseGroups.bulkDelete(removed.removedGroupIds);

            if (added.groups.length) await db.plannedExerciseGroups.bulkPut(added.groups);
            if (added.items.length) await db.plannedExerciseItems.bulkPut(added.items);
            if (added.sets.length) await db.plannedSets.bulkPut(added.sets);
        });
    }

    // --- Group/Item/Set CRUD ---

    static async getGroup(id: string): Promise<PlannedExerciseGroup | undefined> {
        return db.plannedExerciseGroups.get(id);
    }

    static async getGroupsBySession(sessionId: string): Promise<PlannedExerciseGroup[]> {
        return db.plannedExerciseGroups.where('plannedSessionId').equals(sessionId).sortBy('orderIndex');
    }

    static async bulkGetGroups(ids: string[]): Promise<PlannedExerciseGroup[]> {
        return db.plannedExerciseGroups.bulkGet(ids).then(groups => groups.filter((g): g is PlannedExerciseGroup => !!g));
    }

    static async getItem(id: string): Promise<PlannedExerciseItem | undefined> {
        return db.plannedExerciseItems.get(id);
    }

    static async getItemsByGroup(groupId: string): Promise<PlannedExerciseItem[]> {
        return db.plannedExerciseItems.where('plannedExerciseGroupId').equals(groupId).sortBy('orderIndex');
    }

    static async getItemsByGroups(groupIds: string[]): Promise<PlannedExerciseItem[]> {
        return db.plannedExerciseItems.where('plannedExerciseGroupId').anyOf(groupIds).sortBy('orderIndex');
    }

    static async bulkGetItems(ids: string[]): Promise<PlannedExerciseItem[]> {
        return db.plannedExerciseItems.bulkGet(ids).then(items => items.filter((i): i is PlannedExerciseItem => !!i));
    }

    static async getSet(id: string): Promise<PlannedSet | undefined> {
        return db.plannedSets.get(id);
    }

    static async getSetsByItem(itemId: string): Promise<PlannedSet[]> {
        return db.plannedSets.where('plannedExerciseItemId').equals(itemId).sortBy('orderIndex');
    }

    static async getSetsByItems(itemIds: string[]): Promise<PlannedSet[]> {
        return db.plannedSets.where('plannedExerciseItemId').anyOf(itemIds).sortBy('orderIndex');
    }

    static async getSetsByIds(ids: string[]): Promise<PlannedSet[]> {
        return db.plannedSets.bulkGet(ids).then(sets => sets.filter((s): s is PlannedSet => !!s));
    }

    static async addGroup(group: PlannedExerciseGroup): Promise<string> {
        this.validateData(PlannedExerciseGroupSchema, group);
        return db.plannedExerciseGroups.add(group);
    }

    static async deleteGroupCascade(groupId: string): Promise<void> {
        const items = await db.plannedExerciseItems.where('plannedExerciseGroupId').equals(groupId).toArray();
        for (const i of items) {
            await this.deleteItemCascade(i.id);
        }
        await db.plannedExerciseGroups.delete(groupId);
    }

    static async addItem(item: PlannedExerciseItem): Promise<string> {
        this.validateData(PlannedExerciseItemSchema, item);
        return db.plannedExerciseItems.add(item);
    }

    static async deleteItemCascade(itemId: string): Promise<void> {
        await db.plannedSets.where('plannedExerciseItemId').equals(itemId).delete();
        await db.exerciseSubstitutions.where('plannedExerciseItemId').equals(itemId).delete();
        await db.plannedExerciseItems.delete(itemId);
    }

    static async addSet(set: PlannedSet): Promise<string> {
        this.validateData(PlannedSetSchema, set);
        return db.plannedSets.add(set);
    }

    // --- Bulk Operations ---

    static async bulkAddGroups(groups: PlannedExerciseGroup[]): Promise<string> {
        return db.plannedExerciseGroups.bulkAdd(groups);
    }

    static async bulkAddItems(items: PlannedExerciseItem[]): Promise<string> {
        return db.plannedExerciseItems.bulkAdd(items);
    }

    static async bulkAddSets(sets: PlannedSet[]): Promise<string> {
        return db.plannedSets.bulkAdd(sets);
    }

    static async bulkUpsertSessions(sessions: PlannedSession[]): Promise<string> {
        return db.plannedSessions.bulkPut(sessions);
    }

    static async bulkDeleteBySession(sessionId: string): Promise<void> {
        await this.deleteSessionCascade(sessionId);
    }

    // --- Substitutions ---

    static async getSubstitutionsForItem(plannedExerciseItemId: string): Promise<ExerciseSubstitution[]> {
        return db.exerciseSubstitutions.where('plannedExerciseItemId').equals(plannedExerciseItemId).toArray();
    }

    static async addSubstitution(sub: ExerciseSubstitution): Promise<string> {
        return db.exerciseSubstitutions.add(sub);
    }

    // --- Duration Reads (Helper) ---

    static async getGroupWithItems(groupId: string): Promise<{ group: PlannedExerciseGroup, items: { item: PlannedExerciseItem, sets: PlannedSet[] }[] } | null> {
        const group = await db.plannedExerciseGroups.get(groupId);
        if (!group) return null;

        const items = await db.plannedExerciseItems.where('plannedExerciseGroupId').equals(groupId).sortBy('orderIndex');
        const itemsWithSets = await Promise.all(items.map(async item => {
            const sets = await db.plannedSets.where('plannedExerciseItemId').equals(item.id).sortBy('orderIndex');
            return { item, sets };
        }));

        return { group, items: itemsWithSets };
    }

    static async getItemWithSets(itemId: string): Promise<{ item: PlannedExerciseItem, sets: PlannedSet[] } | null> {
        const item = await db.plannedExerciseItems.get(itemId);
        if (!item) return null;
        const sets = await db.plannedSets.where('plannedExerciseItemId').equals(itemId).sortBy('orderIndex');
        return { item, sets };
    }

    // --- Hydration Methods ---

    static async getHydratedPlannedSession(sessionId: string): Promise<HydratedPlannedSession | null> {
        const session = await db.plannedSessions.get(sessionId);
        if (!session) return null;

        const sessions = await this.getHydratedPlannedSessions([session]);
        return sessions.length > 0 ? sessions[0] : null;
    }

    static async getHydratedPlannedSessions(sessions: PlannedSession[]): Promise<HydratedPlannedSession[]> {
        if (sessions.length === 0) return [];

        const sessionIds = sessions.map(s => s.id);
        const groups = await db.plannedExerciseGroups.where('plannedSessionId').anyOf(sessionIds).toArray();
        const groupIds = groups.map(g => g.id);

        const items = groupIds.length > 0
            ? await db.plannedExerciseItems.where('plannedExerciseGroupId').anyOf(groupIds).toArray()
            : [];
        const itemIds = items.map(i => i.id);

        const sets = itemIds.length > 0
            ? await db.plannedSets.where('plannedExerciseItemId').anyOf(itemIds).toArray()
            : [];

        const exerciseIds = Array.from(new Set(items.map(i => i.exerciseId)));
        const exercises = await ExerciseRepository.bulkGet(exerciseIds);
        const exerciseMap = Object.fromEntries(
            exercises
                .filter((e): e is Exercise => !!e)
                .map(e => [e.id, e])
        );

        const setsByItem = new Map<string, PlannedSet[]>();
        for (const s of sets) {
            if (!setsByItem.has(s.plannedExerciseItemId)) setsByItem.set(s.plannedExerciseItemId, []);
            setsByItem.get(s.plannedExerciseItemId)!.push(s);
        }
        for (const list of setsByItem.values()) list.sort((a, b) => a.orderIndex.localeCompare(b.orderIndex));

        const itemsByGroup = new Map<string, HydratedPlannedItem[]>();
        for (const i of items) {
            if (!itemsByGroup.has(i.plannedExerciseGroupId)) itemsByGroup.set(i.plannedExerciseGroupId, []);
            itemsByGroup.get(i.plannedExerciseGroupId)!.push({
                item: i,
                exercise: exerciseMap[i.exerciseId] ?? null,
                sets: setsByItem.get(i.id) ?? []
            });
        }
        for (const list of itemsByGroup.values()) list.sort((a, b) => a.item.orderIndex.localeCompare(b.item.orderIndex));

        const groupsBySession = new Map<string, HydratedPlannedGroup[]>();
        for (const g of groups) {
            if (!groupsBySession.has(g.plannedSessionId)) groupsBySession.set(g.plannedSessionId, []);
            groupsBySession.get(g.plannedSessionId)!.push({
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

    static async getHydratedPlannedWorkout(workoutId: string): Promise<HydratedPlannedWorkout | null> {
        const workout = await db.plannedWorkouts.get(workoutId);
        if (!workout) return null;
        const workouts = await this.getHydratedPlannedWorkouts([workout]);
        return workouts.length > 0 ? workouts[0] : null;
    }

    static async getHydratedPlannedWorkouts(workouts: PlannedWorkout[]): Promise<HydratedPlannedWorkout[]> {
        if (workouts.length === 0) return [];

        const workoutIds = workouts.map(w => w.id);
        const sessions = await db.plannedSessions.where('plannedWorkoutId').anyOf(workoutIds).toArray();
        sessions.sort((a, b) => a.orderIndex.localeCompare(b.orderIndex));

        const hydratedSessions = await this.getHydratedPlannedSessions(sessions);
        const sessionsByWorkout = new Map<string, HydratedPlannedSession[]>();
        for (const hs of hydratedSessions) {
            if (!sessionsByWorkout.has(hs.session.plannedWorkoutId)) sessionsByWorkout.set(hs.session.plannedWorkoutId, []);
            sessionsByWorkout.get(hs.session.plannedWorkoutId)!.push(hs);
        }

        return workouts.map(workout => ({
            workout,
            sessions: sessionsByWorkout.get(workout.id) ?? []
        }));
    }
}
