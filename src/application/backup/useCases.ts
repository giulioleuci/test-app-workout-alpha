import { cloneDeep, isArray, isPlainObject, mapValues, uniq } from 'lodash-es';
import { nanoid } from 'nanoid';

import dayjs from '@/lib/dayjs';
import { validateRecord } from '@/services/backupValidation';

import { ALL_TABLES, type BackupSchema, type ConflictReport, type ConflictStrategy, type ImportResult, type TableName } from './types';

import type { BackupDataPort, BackupFileGateway } from './ports';

const DATE_FIELDS = new Set([
  'createdAt', 'updatedAt', 'startedAt', 'completedAt', 'recordedAt', 'versionTimestamp',
]);

const FK_FIELDS: Record<string, TableName> = {
  plannedWorkoutId: 'plannedWorkouts', plannedSessionId: 'plannedSessions',
  plannedExerciseGroupId: 'plannedExerciseGroups', plannedExerciseItemId: 'plannedExerciseItems',
  plannedSetId: 'plannedSets', exerciseId: 'exercises', exerciseVersionId: 'exerciseVersions',
  workoutSessionId: 'workoutSessions', sessionExerciseGroupId: 'sessionExerciseGroups',
  sessionExerciseItemId: 'sessionExerciseItems',
};

function serializeDates(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (isArray(value)) return value.map(serializeDates);
  if (isPlainObject(value)) return mapValues(value as Record<string, unknown>, serializeDates);
  return value;
}

function deserializeDates(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (isArray(value)) return value.map(deserializeDates);
  if (isPlainObject(value)) {
    return mapValues(value as Record<string, unknown>, (entry, key) =>
      DATE_FIELDS.has(key) && typeof entry === 'string' ? dayjs(entry).toDate() : deserializeDates(entry));
  }
  return value;
}

export class ExportBackup {
  constructor(private readonly data: BackupDataPort, private readonly files: BackupFileGateway) {}

  async execute(tableNames?: TableName[]): Promise<void> {
    const data: Partial<Record<TableName, unknown[]>> = {};
    for (const tableName of tableNames?.length ? tableNames : ALL_TABLES) {
      data[tableName] = serializeDates(await this.data.getAll(tableName)) as unknown[];
    }
    const backup: BackupSchema = {
      version: 1, exportedAt: dayjs().toISOString(), appName: 'WorkoutTracker2', data,
    };
    await this.files.download(backup);
  }
}

export class ParseBackup {
  execute(data: string): BackupSchema {
    try {
      const backup = JSON.parse(data) as BackupSchema;
      if (!backup?.version || !backup.data) throw new Error('Invalid backup format');
      return backup;
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid backup format') throw error;
      throw new Error('Unable to parse backup file');
    }
  }
}

export class DetectBackupConflicts {
  constructor(private readonly data: BackupDataPort) {}

  async execute(backup: BackupSchema): Promise<ConflictReport> {
    const report: ConflictReport = { totalConflicts: 0, byTable: {} };
    for (const [tableName, records] of Object.entries(backup.data)) {
      if (!records?.length) continue;
      const ids = uniq(records.filter((record): record is Record<string, unknown> => isPlainObject(record))
        .map(record => record.id).filter((id): id is string => typeof id === 'string'));
      if (!ids.length) continue;
      const existing = await this.data.getExistingIds(tableName as TableName, ids);
      if (existing.length) {
        report.byTable[tableName as TableName] = { count: existing.length, ids: existing };
        report.totalConflicts += existing.length;
      }
    }
    return report;
  }
}

export class ImportBackup {
  constructor(private readonly data: BackupDataPort) {}

  async execute(
    backup: BackupSchema,
    strategy: ConflictStrategy,
    conflicts: ConflictReport,
  ): Promise<ImportResult> {
    const result: ImportResult = { inserted: 0, skipped: 0, overwritten: 0, copied: 0, failed: 0 };
    const idRemap = new Map<string, string>();
    if (strategy === 'copy') {
      for (const info of Object.values(conflicts.byTable)) {
        for (const oldId of info?.ids ?? []) idRemap.set(oldId, nanoid());
      }
    }
    const remapRecord = (record: Record<string, unknown>) => {
      const remapped = cloneDeep(record);
      if (typeof remapped.id === 'string' && idRemap.has(remapped.id)) remapped.id = idRemap.get(remapped.id);
      for (const field of Object.keys(FK_FIELDS)) {
        const value = remapped[field];
        if (typeof value === 'string' && idRemap.has(value)) {
          remapped[field] = idRemap.get(value);
        }
      }
      return remapped;
    };
    const orderedTables: TableName[] = [
      'exercises', 'exerciseVersions', 'userRegulationProfile', 'userProfile', 'bodyWeightRecords',
      'oneRepMaxRecords', 'plannedWorkouts', 'plannedSessions', 'plannedExerciseGroups',
      'plannedExerciseItems', 'plannedSets', 'workoutSessions', 'sessionExerciseGroups',
      'sessionExerciseItems', 'sessionSets', 'sessionTemplates',
    ];
    await this.data.writeAll(async put => {
      for (const tableName of orderedTables) {
        for (const rawRecord of backup.data[tableName] ?? []) {
          let record = deserializeDates(rawRecord) as Record<string, unknown>;
          if (!isPlainObject(record)) continue;
          if (tableName === 'exercises' && typeof record.equipment === 'string') record = { ...record, equipment: [record.equipment] };
          const validated = validateRecord(tableName, record);
          if (!validated) { result.failed++; continue; }
          const conflicting = typeof validated.id === 'string' && conflicts.byTable[tableName]?.ids.includes(validated.id);
          if (!conflicting) { await put(tableName, strategy === 'copy' ? remapRecord(validated) : validated); result.inserted++; continue; }
          if (strategy === 'ignore') { result.skipped++; continue; }
          await put(tableName, strategy === 'copy' ? remapRecord(validated) : validated);
          if (strategy === 'copy') result.copied++; else result.overwritten++;
        }
      }
    });
    return result;
  }
}
