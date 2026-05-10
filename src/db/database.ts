/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
 
import Dexie, { type Table } from 'dexie';

import type {
  Exercise, ExerciseVersion, PlannedWorkout, PlannedSession, PlannedExerciseGroup,
  PlannedExerciseItem, PlannedSet, WorkoutSession, SessionExerciseGroup,
  SessionExerciseItem, SessionSet, OneRepMaxRecord, UserRegulationProfile,
  SessionTemplate, UserProfile, BodyWeightRecord, ExerciseSubstitution,
} from '@/domain/entities';
import { generateSequentialRanks } from '@/lib/lexorank';
import { calculateWeighted1RM } from '@/services/rpePercentageTable';

import { databaseLifecycle } from './core';

export class WorkoutTrackerDB extends Dexie {
  exercises!: Table<Exercise, string>;
  exerciseVersions!: Table<ExerciseVersion, string>;
  plannedWorkouts!: Table<PlannedWorkout, string>;
  plannedSessions!: Table<PlannedSession, string>;
  plannedExerciseGroups!: Table<PlannedExerciseGroup, string>;
  plannedExerciseItems!: Table<PlannedExerciseItem, string>;
  plannedSets!: Table<PlannedSet, string>;
  workoutSessions!: Table<WorkoutSession, string>;
  sessionExerciseGroups!: Table<SessionExerciseGroup, string>;
  sessionExerciseItems!: Table<SessionExerciseItem, string>;
  sessionSets!: Table<SessionSet, string>;
  oneRepMaxRecords!: Table<OneRepMaxRecord, string>;
  userRegulationProfile!: Table<UserRegulationProfile, string>;
  sessionTemplates!: Table<SessionTemplate, string>;
  userProfile!: Table<UserProfile, string>;
  bodyWeightRecords!: Table<BodyWeightRecord, string>;
  exerciseSubstitutions!: Table<ExerciseSubstitution, string>;

  constructor(dbName = 'WorkoutTracker2') {
    super(dbName);

    // Single consolidated schema version.
    // All indexes from previous incremental migrations are included here.
    // Fields added in old versions (e.g. oneRepMaxRecord.method, exercise.description,
    // exercise.keyPoints) are optional on the entity and need no index — no upgrade needed.
    this.version(1).stores({
      exercises: 'id, name, equipment, movementPattern, *primaryMuscles',
      plannedWorkouts: 'id, status, objectiveType, workType, updatedAt',
      plannedSessions: 'id, plannedWorkoutId, status, [plannedWorkoutId+dayNumber], orderIndex',
      plannedExerciseGroups: 'id, plannedSessionId, orderIndex',
      plannedExerciseItems: 'id, plannedExerciseGroupId, exerciseId, orderIndex',
      plannedSets: 'id, plannedExerciseItemId, orderIndex',
      workoutSessions: 'id, plannedSessionId, plannedWorkoutId, startedAt, completedAt',
      sessionExerciseGroups: 'id, workoutSessionId, plannedExerciseGroupId, orderIndex',
      sessionExerciseItems: 'id, sessionExerciseGroupId, exerciseId, plannedExerciseItemId, orderIndex',
      sessionSets: 'id, sessionExerciseItemId, plannedSetId, orderIndex, isCompleted',
      oneRepMaxRecords: 'id, exerciseId, recordedAt, method',
      userRegulationProfile: 'id',
      sessionTemplates: 'id, name, updatedAt',
      userProfile: 'id',
      bodyWeightRecords: 'id, recordedAt',
    });

    this.version(2).stores({
      exercises: 'id, name, equipment, movementPattern, *primaryMuscles, *variantIds',
    }).upgrade(tx => {
      return tx.table('exercises').toCollection().modify(exercise => {
        if (!exercise.variantIds) {
          exercise.variantIds = [];
        }
      });
    });

    this.version(3).stores({
      exerciseSubstitutions: 'id, plannedExerciseItemId, [plannedWorkoutId+originalExerciseId]',
    });

    this.version(4).stores({
      sessionExerciseItems: 'id, sessionExerciseGroupId, exerciseId, plannedExerciseItemId, orderIndex, completedAt, [exerciseId+completedAt]',
      sessionExerciseGroups: 'id, workoutSessionId, plannedExerciseGroupId, orderIndex, completedAt',
    });

    this.version(5).upgrade(async tx => {
      const allPlannedSessions = await tx.table('plannedSessions').toArray();
      const sessionMap = new Map(allPlannedSessions.map(ps => [ps.id, ps.plannedWorkoutId]));

      return tx.table('workoutSessions').toCollection().modify(session => {
        if (!session.plannedWorkoutId && session.plannedSessionId) {
          const wId = sessionMap.get(session.plannedSessionId);
          if (wId) {
            session.plannedWorkoutId = wId;
          }
        }
      });
    });

    this.version(6).stores({
      oneRepMaxRecords: 'id, exerciseId, recordedAt, method, [exerciseId+recordedAt]',
      workoutSessions: 'id, plannedSessionId, plannedWorkoutId, startedAt, completedAt, [plannedWorkoutId+startedAt]',
      sessionSets: 'id, sessionExerciseItemId, plannedSetId, orderIndex, isCompleted, [sessionExerciseItemId+isCompleted]',
    });

    this.version(7).stores({
      sessionSets: 'id, sessionExerciseItemId, plannedSetId, orderIndex, isCompleted, performanceStatus, [sessionExerciseItemId+isCompleted]',
      workoutSessions: 'id, plannedSessionId, plannedWorkoutId, startedAt, completedAt, [plannedWorkoutId+startedAt], [plannedWorkoutId+plannedSessionId+completedAt]',
    });

    this.version(8).upgrade(async tx => {
      // Migration for MuscleGroup enum changes
      const mapMuscleGroups = (groups: string[]) => {
        if (!groups) return [];
        const newGroups = new Set<string>();
        for (const g of groups) {
          if (g === 'upperBodyPush') {
            newGroups.add('chest');
            newGroups.add('shoulders');
            newGroups.add('arms');
          } else if (g === 'upperBodyPull') {
            newGroups.add('back');
            newGroups.add('shoulders');
            newGroups.add('arms');
          } else if (['legs', 'core', 'arms'].includes(g)) {
            newGroups.add(g);
          }
          // Preserve already migrated or new values just in case
          else if (['chest', 'back', 'shoulders'].includes(g)) {
            newGroups.add(g);
          }
        }
        return Array.from(newGroups);
      };

      await tx.table('plannedSessions').toCollection().modify(session => {
        if (session.focusMuscleGroups) {
          session.focusMuscleGroups = mapMuscleGroups(session.focusMuscleGroups);
        }
      });

      await tx.table('sessionTemplates').toCollection().modify(template => {
        if (template.content?.focusMuscleGroups) {
          template.content.focusMuscleGroups = mapMuscleGroups(template.content.focusMuscleGroups);
        }
      });
    });

    this.version(9).stores({ // keeping same indexes
    }).upgrade(async tx => {
      // 1. Map exercises for Snapshot
      const allExercises = await tx.table('exercises').toArray();
      const exerciseMap = new Map<string, any>();
      for (const e of allExercises) {
        exerciseMap.set(e.id, {
          name: e.name, type: e.type,
          primaryMuscles: e.primaryMuscles || [],
          secondaryMuscles: e.secondaryMuscles || [],
          equipment: e.equipment || [],
          movementPattern: e.movementPattern,
          counterType: e.counterType
        });
      }

      // 2. Backfill SessionExerciseItem snapshots
      await tx.table('sessionExerciseItems').toCollection().modify(item => {
        const snap = exerciseMap.get(item.exerciseId);
        if (snap && !item.exerciseSnapshot) {
          item.exerciseSnapshot = snap;
        }
      });

      // 3. Backfill e1rm in SessionSet
      await tx.table('sessionSets').toCollection().modify(set => {
        if (!set.e1rm && set.actualLoad != null && set.actualLoad > 0 &&
          set.actualCount != null && set.actualCount > 0 &&
          set.actualRPE != null && set.actualRPE >= 6 && set.actualRPE <= 10) {
          const estimatedRes = calculateWeighted1RM(set.actualLoad, set.actualCount, set.actualRPE);
          const estimated = estimatedRes ? estimatedRes.media : 0;
          if (estimated && estimated > 0) {
            set.e1rm = estimated;
          }
        }
      });

      // 4. Backfill WorkoutSession totals
      const groups = await tx.table('sessionExerciseGroups').toArray();
      const items = await tx.table('sessionExerciseItems').toArray();
      const sets = await tx.table('sessionSets').toArray();

      const itemToGroup = new Map(items.map(i => [i.id, i.sessionExerciseGroupId]));
      const groupToSession = new Map(groups.map(g => [g.id, g.workoutSessionId]));
      const itemToSnapshot = new Map(items.map(i => [i.id, i.exerciseSnapshot || exerciseMap.get(i.exerciseId)]));

      const sessionData = new Map<string, {
        totalSets: number; totalLoad: number; totalReps: number; totalDuration: number;
        primaryMuscles: Set<string>; secondaryMuscles: Set<string>;
      }>();

      for (const set of sets) {
        if (!set.isCompleted) continue;
        const groupId = itemToGroup.get(set.sessionExerciseItemId);
        if (!groupId) continue;
        const sessionId = groupToSession.get(groupId);
        if (!sessionId) continue;

        if (!sessionData.has(sessionId)) {
          sessionData.set(sessionId, {
            totalSets: 0, totalLoad: 0, totalReps: 0, totalDuration: 0,
            primaryMuscles: new Set(), secondaryMuscles: new Set()
          });
        }
        const sd = sessionData.get(sessionId)!;

        sd.totalSets += 1;

        const snap = itemToSnapshot.get(set.sessionExerciseItemId);
        const counterType = snap ? snap.counterType : 'reps';
        const actualCount = set.actualCount || 0;
        const actualLoad = set.actualLoad || 0;

        if (counterType === 'seconds' || counterType === 'minutes' || counterType === 'time') {
          sd.totalDuration += (counterType === 'minutes') ? actualCount * 60 : actualCount;
        } else if (counterType === 'reps') {
          sd.totalReps += actualCount;
          sd.totalLoad += (actualCount * actualLoad);
        }

        if (snap) {
          snap.primaryMuscles.forEach((m: string) => sd.primaryMuscles.add(m));
          snap.secondaryMuscles.forEach((m: string) => sd.secondaryMuscles.add(m));
        }
      }

      await tx.table('workoutSessions').toCollection().modify(session => {
        const sd = sessionData.get(session.id);
        if (sd) {
          session.totalSets = sd.totalSets;
          session.totalLoad = Math.round(sd.totalLoad);
          session.totalReps = sd.totalReps;
          session.totalDuration = sd.totalDuration;
          session.primaryMusclesSnapshot = Array.from(sd.primaryMuscles);
          session.secondaryMusclesSnapshot = Array.from(sd.secondaryMuscles);
        } else if (session.completedAt && session.totalSets === undefined) {
          session.totalSets = 0;
          session.totalLoad = 0;
          session.totalReps = 0;
          session.totalDuration = 0;
          session.primaryMusclesSnapshot = [];
          session.secondaryMusclesSnapshot = [];
        }
      });
    });

    this.version(10).stores({
      exercises: 'id, name, equipment, movementPattern, *primaryMuscles, *variantIds, isArchived',
      plannedWorkouts: 'id, status, objectiveType, workType, updatedAt, isArchived',
    }).upgrade(async tx => {
      await tx.table('exercises').toCollection().modify(exercise => {
        if (exercise.isArchived === undefined) {
          exercise.isArchived = false;
        }
      });
      await tx.table('plannedWorkouts').toCollection().modify(workout => {
        if (workout.isArchived === undefined) {
          workout.isArchived = false;
        }
      });
    });

    this.version(11).stores({
      sessionSets: 'id, sessionExerciseItemId, plannedSetId, orderIndex, isCompleted, [sessionExerciseItemId+isCompleted]',
      sessionExerciseItems: 'id, sessionExerciseGroupId, exerciseId, plannedExerciseItemId, orderIndex, completedAt, performanceStatus, [exerciseId+completedAt]',
    }).upgrade(async tx => {
      // Clear old set performance statuses (optional, but keeps db clean)
      await tx.table('sessionSets').toCollection().modify(set => {
        delete set.performanceStatus;
      });
    });

    this.version(12).stores({
      exerciseVersions: 'id, exerciseId, versionTimestamp',
      sessionExerciseItems: 'id, sessionExerciseGroupId, exerciseId, exerciseVersionId, plannedExerciseItemId, orderIndex, completedAt, performanceStatus, [exerciseId+completedAt]',
      oneRepMaxRecords: 'id, exerciseId, exerciseVersionId, recordedAt, method, [exerciseId+recordedAt]',
    }).upgrade(async tx => {
      const now = new Date();

      // 1. Create ExerciseVersions for all existing Exercises
      const allExercises = await tx.table('exercises').toArray();
      const latestVersionByExerciseId = new Map<string, string>();
      const exerciseVersionsToAdd: any[] = [];

      for (const ex of allExercises) {
        const versionId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);

        exerciseVersionsToAdd.push({
          id: versionId,
          exerciseId: ex.id,
          name: ex.name,
          type: ex.type,
          primaryMuscles: ex.primaryMuscles || [],
          secondaryMuscles: ex.secondaryMuscles || [],
          equipment: ex.equipment || [],
          movementPattern: ex.movementPattern,
          counterType: ex.counterType,
          versionTimestamp: ex.updatedAt || now
        });

        latestVersionByExerciseId.set(ex.id, versionId);
      }

      if (exerciseVersionsToAdd.length > 0) {
        await tx.table('exerciseVersions').bulkAdd(exerciseVersionsToAdd);
      }

      // 2. Migrate SessionExerciseItems
      await tx.table('sessionExerciseItems').toCollection().modify(item => {
        let versionIdToUse = latestVersionByExerciseId.get(item.exerciseId);

        // If it had a snapshot that differs from the current exercise state (which is rare but possible),
        // we ideally create a historical version for it to truly preserve SCD2.
        // For simplicity and to not explode the DB size if there were minor snapshot bugs, 
        // we will link it to the current latest version, UNLESS we want strict historical accuracy.
        // Let's create a specific historical version if we have a snapshot and it doesn't match the current exercise name/type.
        if (item.exerciseSnapshot) {
          const currentExVersion = exerciseVersionsToAdd.find(ev => ev.id === versionIdToUse);
          if (currentExVersion &&
            (currentExVersion.name !== item.exerciseSnapshot.name ||
              currentExVersion.type !== item.exerciseSnapshot.type ||
              currentExVersion.counterType !== item.exerciseSnapshot.counterType)) {

            const historicalVersionId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
            tx.table('exerciseVersions').add({
              id: historicalVersionId,
              exerciseId: item.exerciseId,
              name: item.exerciseSnapshot.name,
              type: item.exerciseSnapshot.type,
              primaryMuscles: item.exerciseSnapshot.primaryMuscles || [],
              secondaryMuscles: item.exerciseSnapshot.secondaryMuscles || [],
              equipment: item.exerciseSnapshot.equipment || [],
              movementPattern: item.exerciseSnapshot.movementPattern,
              counterType: item.exerciseSnapshot.counterType,
              versionTimestamp: item.completedAt || new Date(0) // Historical timestamp
            });
            versionIdToUse = historicalVersionId;
          }
          delete item.exerciseSnapshot;
        }

        if (versionIdToUse) {
          item.exerciseVersionId = versionIdToUse;
        }
      });

      // 3. Migrate OneRepMaxRecords
      await tx.table('oneRepMaxRecords').toCollection().modify(record => {
        const versionIdToUse = latestVersionByExerciseId.get(record.exerciseId);
        if (versionIdToUse) {
          record.exerciseVersionId = versionIdToUse;
        }
      });
    });

    // Version 13: Migrating orderIndex from number to string (LexoRank)
    this.version(13).upgrade(async tx => {
      // Helper function to reorder items within a parenthood efficiently
      const reorderTable = async (tableName: string, parentKey: string) => {
        const allItems = await tx.table(tableName).toArray();
        const grouped = new Map<string, any[]>();

        for (const item of allItems) {
          const key = item[parentKey] || 'orphan';
          if (!grouped.has(key)) grouped.set(key, []);
          grouped.get(key)!.push(item);
        }

        for (const [_, items] of grouped.entries()) {
          // Sort by the old numeric orderIndex to preserve visual ordering
          items.sort((a, b) => (typeof a.orderIndex === 'number' ? a.orderIndex : 0) - (typeof b.orderIndex === 'number' ? b.orderIndex : 0));
          const ranks = generateSequentialRanks(items.length);
          for (let i = 0; i < items.length; i++) {
            items[i].orderIndex = ranks[i];
            await tx.table(tableName).put(items[i]);
          }
        }
      };

      await reorderTable('plannedSessions', 'plannedWorkoutId');
      await reorderTable('plannedExerciseGroups', 'plannedSessionId');
      await reorderTable('plannedExerciseItems', 'plannedExerciseGroupId');
      await reorderTable('plannedSets', 'plannedExerciseItemId');

      await reorderTable('sessionExerciseGroups', 'workoutSessionId');
      await reorderTable('sessionExerciseItems', 'sessionExerciseGroupId');
      await reorderTable('sessionSets', 'sessionExerciseItemId');

      // Update SessionTemplates JSON content structure
      await tx.table('sessionTemplates').toCollection().modify(template => {
        if (template.content && Array.isArray(template.content.groups)) {
          const groupRanks = generateSequentialRanks(template.content.groups.length);
          template.content.groups.forEach((group: any, gIdx: number) => {
            group.orderIndex = groupRanks[gIdx];
            if (Array.isArray(group.items)) {
              const itemRanks = generateSequentialRanks(group.items.length);
              group.items.forEach((item: any, iIdx: number) => {
                item.orderIndex = itemRanks[iIdx];
                if (Array.isArray(item.sets)) {
                  const setRanks = generateSequentialRanks(item.sets.length);
                  item.sets.forEach((set: any, sIdx: number) => {
                    set.orderIndex = setRanks[sIdx];
                  });
                }
              });
            }
          });
        }
      });
    });

    // Version 14: Migrate specialSetParams to modifiers array
    this.version(14).upgrade(async tx => {
      // Migrate PlannedExerciseItems
      await tx.table('plannedExerciseItems').toCollection().modify((item: any) => {
        if (item.specialSetParams?.type === 'cluster' && item.specialSetParams.params) {
          item.modifiers = [{ type: 'cluster', config: item.specialSetParams.params }];
        }
        delete item.specialSetParams;
      });

      // Migrate SessionTemplates
      await tx.table('sessionTemplates').toCollection().modify((template: any) => {
        if (template.content?.groups) {
          for (const group of template.content.groups) {
            for (const tItem of group.items || []) {
              if (tItem.specialSetParams?.type === 'cluster' && tItem.specialSetParams.params) {
                tItem.modifiers = [{ type: 'cluster', config: tItem.specialSetParams.params }];
              }
              delete tItem.specialSetParams;
            }
          }
        }
      });
    });
  }
}

export const db = new Proxy({} as WorkoutTrackerDB, {
  get(_, prop) {
    const target = databaseLifecycle.getDb() as any;
    const value = target[prop];
    if (typeof value === 'function') {
      return value.bind(target);
    }
    return value;
  },
});
