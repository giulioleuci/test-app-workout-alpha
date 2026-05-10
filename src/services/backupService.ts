import { isPlainObject, isArray, mapValues, cloneDeep, uniq } from 'lodash-es';
import { nanoid } from 'nanoid';

import { db } from '@/db/database';
import { t } from '@/i18n/t';
import dayjs from '@/lib/dayjs';

import { validateRecord } from './backupValidation';

import type { Table } from 'dexie';

// ===== Types =====

export type TableName =
  | 'exercises' | 'exerciseVersions' | 'plannedWorkouts' | 'plannedSessions'
  | 'plannedExerciseGroups' | 'plannedExerciseItems' | 'plannedSets'
  | 'workoutSessions' | 'sessionExerciseGroups' | 'sessionExerciseItems'
  | 'sessionSets' | 'oneRepMaxRecords' | 'userRegulationProfile'
  | 'sessionTemplates' | 'userProfile' | 'bodyWeightRecords';

export type ConflictStrategy = 'copy' | 'ignore' | 'overwrite';

export interface BackupSchema {
  version: number;
  exportedAt: string;
  appName: string;
  data: Partial<Record<TableName, unknown[]>>;
}

export interface ConflictReport {
  totalConflicts: number;
  byTable: Partial<Record<TableName, { count: number; ids: string[] }>>;
}

export interface ImportResult {
  inserted: number;
  skipped: number;
  overwritten: number;
  copied: number;
  failed: number;
}

// ===== Constants =====

export const MAX_BACKUP_SIZE = 10 * 1024 * 1024; // 10MB

export const ALL_TABLES: TableName[] = [
  'exercises', 'exerciseVersions', 'plannedWorkouts', 'plannedSessions',
  'plannedExerciseGroups', 'plannedExerciseItems', 'plannedSets',
  'workoutSessions', 'sessionExerciseGroups', 'sessionExerciseItems',
  'sessionSets', 'oneRepMaxRecords', 'userRegulationProfile',
  'sessionTemplates', 'userProfile', 'bodyWeightRecords',
];

export interface ExportCategory {
  label: string;
  tables: TableName[];
}

export const EXPORT_CATEGORIES: ExportCategory[] = [
  { label: t('backup.categories.exercises'), tables: ['exercises', 'exerciseVersions'] },
  { label: t('backup.categories.workouts'), tables: ['plannedWorkouts', 'plannedSessions', 'plannedExerciseGroups', 'plannedExerciseItems', 'plannedSets'] },
  { label: t('backup.categories.sessions'), tables: ['workoutSessions', 'sessionExerciseGroups', 'sessionExerciseItems', 'sessionSets'] },
  { label: t('backup.categories.oneRM'), tables: ['oneRepMaxRecords'] },
  { label: t('backup.categories.userProfile'), tables: ['userProfile', 'bodyWeightRecords'] },
  { label: t('backup.categories.regulationProfile'), tables: ['userRegulationProfile'] },
  { label: t('backup.categories.templates'), tables: ['sessionTemplates'] },
];

// Date fields to serialize/deserialize
const DATE_FIELDS = new Set([
  'createdAt', 'updatedAt', 'startedAt', 'completedAt', 'recordedAt',
]);

const FK_FIELDS: Record<string, TableName> = {
  plannedWorkoutId: 'plannedWorkouts',
  plannedSessionId: 'plannedSessions',
  plannedExerciseGroupId: 'plannedExerciseGroups',
  plannedExerciseItemId: 'plannedExerciseItems',
  plannedSetId: 'plannedSets',
  exerciseId: 'exercises',
  exerciseVersionId: 'exerciseVersions',
  workoutSessionId: 'workoutSessions',
  sessionExerciseGroupId: 'sessionExerciseGroups',
  sessionExerciseItemId: 'sessionExerciseItems',
};

// ===== Helpers =====

function getTable(name: TableName): Table {
  return (db as unknown as Record<string, Table>)[name];
}

function serializeDates(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (isArray(obj)) return obj.map(serializeDates);
  if (isPlainObject(obj)) {
    return mapValues(obj as Record<string, unknown>, (value) =>
      value instanceof Date ? value.toISOString() : serializeDates(value)
    );
  }
  return obj;
}

function deserializeDates(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (isArray(obj)) return obj.map(deserializeDates);
  if (isPlainObject(obj)) {
    return mapValues(obj as Record<string, unknown>, (value, key) => {
      if (DATE_FIELDS.has(key) && typeof value === 'string') {
        return dayjs(value).toDate();
      }
      return deserializeDates(value);
    });
  }
  return obj;
}

// ===== Export Functions =====

export async function exportTables(tableNames: TableName[]): Promise<BackupSchema> {
  const data: Partial<Record<TableName, unknown[]>> = {};
  for (const name of tableNames) {
    const records = await getTable(name).toArray();
    data[name] = serializeDates(records) as unknown[];
  }
  return {
    version: 1,
    exportedAt: dayjs().toISOString(),
    appName: 'WorkoutTracker2',
    data,
  };
}

export async function exportAll(): Promise<BackupSchema> {
  return exportTables(ALL_TABLES);
}

export async function exportEntities(tableName: TableName, ids: string[]): Promise<BackupSchema> {
  const records = await getTable(tableName).where('id').anyOf(ids).toArray();
  return {
    version: 1,
    exportedAt: dayjs().toISOString(),
    appName: 'WorkoutTracker2',
    data: { [tableName]: serializeDates(records) as unknown[] },
  };
}

// ===== Import Functions =====

export async function detectConflicts(backup: BackupSchema): Promise<ConflictReport> {
  const report: ConflictReport = { totalConflicts: 0, byTable: {} };

  for (const [tableName, records] of Object.entries(backup.data)) {
    if (!records || records.length === 0) continue;
    const table = getTable(tableName as TableName);
    const ids = uniq(records
      .filter((r): r is Record<string, unknown> => isPlainObject(r))
      .map((r) => (r).id)
      .filter((id): id is string => typeof id === 'string'));

    if (ids.length === 0) continue;

    const existing = await table.where('id').anyOf(ids).primaryKeys();
    if (existing.length > 0) {
      report.byTable[tableName as TableName] = {
        count: existing.length,
        ids: existing as string[],
      };
      report.totalConflicts += existing.length;
    }
  }

  return report;
}

export async function importData(
  backup: BackupSchema,
  strategy: ConflictStrategy,
  conflicts: ConflictReport,
): Promise<ImportResult> {
  const result: ImportResult = { inserted: 0, skipped: 0, overwritten: 0, copied: 0, failed: 0 };

  // For "copy" strategy, build a remap table for all conflicting IDs
  const idRemap = new Map<string, string>();
  if (strategy === 'copy') {
    for (const [, info] of Object.entries(conflicts.byTable)) {
      if (!info) continue;
      for (const oldId of info.ids) {
        idRemap.set(oldId, nanoid());
      }
    }
  }

  // Helper to remap a single record
  function remapRecord(record: Record<string, unknown>): Record<string, unknown> {
    const remapped = cloneDeep(record);
    // Remap own ID if conflicting
    const id = remapped.id as string;
    if (idRemap.has(id)) {
      remapped.id = idRemap.get(id)!;
    }
    // Remap FK fields
    for (const fkField of Object.keys(FK_FIELDS)) {
      const val = remapped[fkField];
      if (typeof val === 'string' && idRemap.has(val)) {
        remapped[fkField] = idRemap.get(val)!;
      }
    }
    return remapped;
  }

  // Process tables in dependency order
  const orderedTables: TableName[] = [
    'exercises', 'exerciseVersions', 'userRegulationProfile', 'userProfile', 'bodyWeightRecords',
    'oneRepMaxRecords',
    'plannedWorkouts', 'plannedSessions', 'plannedExerciseGroups',
    'plannedExerciseItems', 'plannedSets',
    'workoutSessions', 'sessionExerciseGroups', 'sessionExerciseItems', 'sessionSets',
    'sessionTemplates',
  ];

  await db.transaction('rw', db.tables, async () => {
    for (const tableName of orderedTables) {
      const records = backup.data[tableName];
      if (!records || records.length === 0) continue;

      const table = getTable(tableName);
      const conflictInfo = conflicts.byTable[tableName];
      const conflictIds = new Set(conflictInfo?.ids ?? []);

      for (const rawRecord of records) {
        let record = deserializeDates(rawRecord) as Record<string, unknown>;
        if (!record || typeof record !== 'object') continue;

        // Migrate legacy single-string equipment to array
        if (tableName === 'exercises' && record.equipment && typeof record.equipment === 'string') {
          record = { ...record, equipment: [record.equipment] };
        }

        const validated = validateRecord(tableName, record);
        if (!validated) {
          result.failed++;
          continue;
        }
        record = validated;

        const id = record.id;
        const isConflicting = typeof id === 'string' && conflictIds.has(id);

        if (!isConflicting) {
          // No conflict — but still remap FKs if copy strategy
          const finalRecord = strategy === 'copy' ? remapRecord(record) : record;
          await table.put(finalRecord);
          result.inserted++;
        } else {
          switch (strategy) {
            case 'ignore':
              result.skipped++;
              break;
            case 'overwrite':
              await table.put(record);
              result.overwritten++;
              break;
            case 'copy': {
              const remapped = remapRecord(record);
              await table.put(remapped);
              result.copied++;
              break;
            }
          }
        }
      }
    }
  });

  return result;
}

// ===== File Helpers =====

export function prepareBackupDownload(backup: BackupSchema, filename?: string): { blob: Blob; filename: string } {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const suggestedFilename = filename ?? `workout-backup-${dayjs().format('YYYY-MM-DD')}.json`;
  return { blob, filename: suggestedFilename };
}

export function parseBackupFile(file: File): Promise<BackupSchema> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_BACKUP_SIZE) {
      reject(new Error(t('backup.errors.fileTooLarge', { size: (MAX_BACKUP_SIZE / (1024 * 1024)).toFixed(0) })));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as BackupSchema;
        if (!parsed?.version || !parsed.data) {
          reject(new Error(t('backup.errors.invalidFormat')));
          return;
        }
        resolve(parsed);
      } catch {
        reject(new Error(t('backup.errors.parseError')));
      }
    };
    reader.onerror = () => reject(new Error(t('backup.errors.readError')));
    reader.readAsText(file);
  });
}
