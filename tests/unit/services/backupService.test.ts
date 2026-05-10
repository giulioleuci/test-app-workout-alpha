import { LexoRank } from 'lexorank';

function generateTestRank(index: number) {
  let rank = LexoRank.min().between(LexoRank.middle());
  for (let i = 0; i < index; i++) rank = rank.genNext();
  return rank.toString();
}


import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';

import dayjs from '@/lib/dayjs';
import {
  exportAll, exportTables, detectConflicts, importData,
  type BackupSchema,
} from '@/services/backupService';

import { testDb as db } from '../../utils/testHelpers';

describe('backupService', () => {
  beforeEach(async () => {
    // Clear all tables
    await Promise.all(db.tables.map(t => t.clear()));

    // Seed some exercises
    await db.exercises.bulkPut([
      {
        id: 'ex-1',
        name: 'Bench Press',
        primaryMuscles: ['chest'],
        secondaryMuscles: ['triceps'],
        equipment: ['barbell'],
        movementPattern: 'horizontalPush',
        counterType: 'reps',
        defaultLoadUnit: 'kg',
        createdAt: dayjs('2026-01-01').toDate(),
        updatedAt: dayjs('2026-01-01').toDate(),
      } as any,
      {
        id: 'ex-2',
        name: 'Squat',
        primaryMuscles: ['quadriceps'],
        secondaryMuscles: ['glutes'],
        equipment: ['barbell'],
        movementPattern: 'squat',
        counterType: 'reps',
        defaultLoadUnit: 'kg',
        createdAt: dayjs('2026-01-01').toDate(),
        updatedAt: dayjs('2026-01-01').toDate(),
      } as any,
    ]);
  });

  it('exportAll returns all tables with correct schema', async () => {
    const backup = await exportAll();
    expect(backup.version).toBe(1);
    expect(backup.appName).toBe('WorkoutTracker2');
    expect(backup.data.exercises).toHaveLength(2);
    // Dates should be serialized as strings
    expect(typeof (backup.data.exercises![0] as any).createdAt).toBe('string');
  });

  it('exportTables exports only selected tables', async () => {
    const backup = await exportTables(['exercises']);
    expect(backup.data.exercises).toHaveLength(2);
    expect(backup.data.plannedWorkouts).toBeUndefined();
  });

  it('detectConflicts finds duplicate IDs', async () => {
    const backup: BackupSchema = {
      version: 1,
      exportedAt: dayjs().toISOString(),
      appName: 'WorkoutTracker2',
      data: {
        exercises: [
          { id: 'ex-1', name: 'Duplicate' } as any,
          { id: 'ex-new', name: 'Brand New' } as any,
        ],
      },
    };
    const report = await detectConflicts(backup);
    expect(report.totalConflicts).toBe(1);
    expect(report.byTable.exercises?.count).toBe(1);
    expect(report.byTable.exercises?.ids).toContain('ex-1');
  });

  it('importData with "ignore" skips conflicting records', async () => {
    const backup: BackupSchema = {
      version: 1,
      exportedAt: dayjs().toISOString(),
      appName: 'WorkoutTracker2',
      data: {
        exercises: [
          { id: 'ex-1', name: 'Changed Name', primaryMuscles: ['chest'], secondaryMuscles: [], equipment: ['barbell'], movementPattern: 'horizontalPush', counterType: 'reps', defaultLoadUnit: 'kg', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
          { id: 'ex-new', name: 'New Exercise', primaryMuscles: ['biceps'], secondaryMuscles: [], equipment: ['dumbbell'], movementPattern: 'other', counterType: 'reps', defaultLoadUnit: 'kg', createdAt: '2026-02-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z' },
        ],
      },
    };

    const conflicts = await detectConflicts(backup);
    const result = await importData(backup, 'ignore', conflicts);

    expect(result.skipped).toBe(1);
    expect(result.inserted).toBe(1);

    // Original should be unchanged
    const original = await db.exercises.get('ex-1');
    expect(original?.name).toBe('Bench Press');

    // New one should be inserted
    const newEx = await db.exercises.get('ex-new');
    expect(newEx?.name).toBe('New Exercise');
  });

  it('importData with "overwrite" replaces conflicting records', async () => {
    const backup: BackupSchema = {
      version: 1,
      exportedAt: dayjs().toISOString(),
      appName: 'WorkoutTracker2',
      data: {
        exercises: [
          { id: 'ex-1', name: 'Overwritten Name', primaryMuscles: ['chest'], secondaryMuscles: [], equipment: ['barbell'], movementPattern: 'horizontalPush', counterType: 'reps', defaultLoadUnit: 'kg', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-02-14T00:00:00.000Z' },
        ],
      },
    };

    const conflicts = await detectConflicts(backup);
    const result = await importData(backup, 'overwrite', conflicts);

    expect(result.overwritten).toBe(1);
    const updated = await db.exercises.get('ex-1');
    expect(updated?.name).toBe('Overwritten Name');
  });

  it('importData with "copy" creates new IDs for conflicts', async () => {
    const backup: BackupSchema = {
      version: 1,
      exportedAt: dayjs().toISOString(),
      appName: 'WorkoutTracker2',
      data: {
        exercises: [
          { id: 'ex-1', name: 'Copied Exercise', primaryMuscles: ['chest'], secondaryMuscles: [], equipment: ['barbell'], movementPattern: 'horizontalPush', counterType: 'reps', defaultLoadUnit: 'kg', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
        ],
      },
    };

    const conflicts = await detectConflicts(backup);
    const result = await importData(backup, 'copy', conflicts);

    expect(result.copied).toBe(1);

    // Original should still exist
    const original = await db.exercises.get('ex-1');
    expect(original?.name).toBe('Bench Press');

    // There should now be 3 exercises total
    const all = await db.exercises.toArray();
    expect(all).toHaveLength(3);
    const copy = all.find(e => e.name === 'Copied Exercise');
    expect(copy).toBeDefined();
    expect(copy!.id).not.toBe('ex-1');
  });

  it('importData with "copy" remaps foreign keys', async () => {
    // Create a workout + session with known IDs
    await db.plannedWorkouts.put({
      id: 'pw-1', name: 'Test Workout', objectiveType: 'hypertrophy', workType: 'accumulation',
      status: 'active', createdAt: dayjs().toDate(), updatedAt: dayjs().toDate(),
    } as any);

    const backup: BackupSchema = {
      version: 1,
      exportedAt: dayjs().toISOString(),
      appName: 'WorkoutTracker2',
      data: {
        plannedWorkouts: [
          { id: 'pw-1', name: 'Imported Workout', objectiveType: 'hypertrophy', workType: 'accumulation', status: 'active', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
        ],
        plannedSessions: [
          { id: 'ps-1', plannedWorkoutId: 'pw-1', name: 'Day 1', dayNumber: 1, focusMuscleGroups: [], status: 'active', orderIndex: generateTestRank(0), createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
        ],
      },
    };

    const conflicts = await detectConflicts(backup);
    expect(conflicts.byTable.plannedWorkouts?.count).toBe(1);

    const result = await importData(backup, 'copy', conflicts);
    expect(result.copied).toBe(1); // pw-1 was copied
    expect(result.inserted).toBe(1); // ps-1 was inserted (no conflict)

    // The session's FK should point to the NEW workout ID, not pw-1
    const sessions = await db.plannedSessions.toArray();
    const importedSession = sessions.find(s => s.name === 'Day 1');
    expect(importedSession).toBeDefined();

    // The imported workout has a new ID
    const workouts = await db.plannedWorkouts.toArray();
    const copiedWorkout = workouts.find(w => w.name === 'Imported Workout');
    expect(copiedWorkout).toBeDefined();
    expect(copiedWorkout!.id).not.toBe('pw-1');

    // Session FK should match copied workout's new ID
    expect(importedSession!.plannedWorkoutId).toBe(copiedWorkout!.id);
  });

  it('importData skips records that fail schema validation', async () => {
    const backup: BackupSchema = {
      version: 1,
      exportedAt: dayjs().toISOString(),
      appName: 'WorkoutTracker2',
      data: {
        exercises: [
          { id: 'ex-invalid', name: 'Invalid', primaryMuscles: 'chest' } as any, // Invalid type for primaryMuscles (should be array)
        ],
      },
    };

    const conflicts = await detectConflicts(backup);
    const result = await importData(backup, 'ignore', conflicts);

    expect(result.failed).toBe(1);
    expect(result.inserted).toBe(0);

    const ex = await db.exercises.get('ex-invalid');
    expect(ex).toBeUndefined();
  });

  it('importData handles legacy exercises without description/keyPoints', async () => {
    const backup: BackupSchema = {
      version: 1,
      exportedAt: dayjs().toISOString(),
      appName: 'WorkoutTracker2',
      data: {
        exercises: [
          {
            id: 'ex-legacy',
            name: 'Legacy Exercise',
            primaryMuscles: ['chest'],
            secondaryMuscles: [],
            equipment: ['barbell'],
            movementPattern: 'horizontalPush',
            counterType: 'reps',
            defaultLoadUnit: 'kg',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            // description and keyPoints are missing
          } as any,
        ],
      },
    };

    const conflicts = await detectConflicts(backup);
    const result = await importData(backup, 'ignore', conflicts);

    expect(result.inserted).toBe(1);
    const imported = await db.exercises.get('ex-legacy');
    expect(imported).toBeDefined();
    expect(imported?.name).toBe('Legacy Exercise');
    expect(imported?.description).toBeUndefined();
    expect(imported?.keyPoints).toBeUndefined();
  });
});
