import { describe, expect, it, vi } from 'vitest';

import {
  DetectBackupConflicts,
  ExportBackup,
  ImportBackup,
  ParseBackup,
  type BackupDataPort,
  type BackupFileGateway,
  type BackupSchema,
} from '@/application/backup';

function createDataPort(initial: Record<string, Record<string, unknown>[]> = {}): BackupDataPort {
  const tables = new Map(Object.entries(initial));
  return {
    getAll: async tableName => tables.get(tableName) ?? [],
    getByIds: async (tableName, ids) => (tables.get(tableName) ?? []).filter(record => ids.includes(record.id as string)),
    getExistingIds: async (tableName, ids) => (tables.get(tableName) ?? [])
      .map(record => record.id).filter((id): id is string => typeof id === 'string' && ids.includes(id)),
    writeAll: async write => write(async (tableName, record) => {
      const records = tables.get(tableName) ?? [];
      const index = records.findIndex(item => item.id === record.id);
      if (index >= 0) records[index] = record; else records.push(record);
      tables.set(tableName, records);
    }),
  };
}

describe('backup application use cases', () => {
  it('exports persistence data through a file port', async () => {
    const files: BackupFileGateway = {
      download: vi.fn(async () => undefined),
      pick: vi.fn(async () => ({ data: '', name: '' })),
    };
    const data = createDataPort({ exercises: [{ id: 'exercise-1', createdAt: new Date('2026-01-01') }] });

    await new ExportBackup(data, files).execute(['exercises']);

    expect(files.download).toHaveBeenCalledWith(expect.objectContaining({
      data: { exercises: [{ id: 'exercise-1', createdAt: '2026-01-01T00:00:00.000Z' }] },
    }));
  });

  it('parses and validates raw file text without browser APIs', () => {
    const backup: BackupSchema = { version: 1, exportedAt: '2026-01-01T00:00:00.000Z', appName: 'WorkoutTracker2', data: {} };

    expect(new ParseBackup().execute(JSON.stringify(backup))).toEqual(backup);
    expect(() => new ParseBackup().execute('{}')).toThrow('Invalid backup format');
  });

  it('detects and imports conflicts through the persistence port', async () => {
    const data = createDataPort({ exercises: [{ id: 'exercise-1', name: 'Existing' }] });
    const backup: BackupSchema = {
      version: 1, exportedAt: '2026-01-01T00:00:00.000Z', appName: 'WorkoutTracker2',
      data: { exercises: [{
        id: 'exercise-1', name: 'Replacement', type: 'compound', primaryMuscles: [], secondaryMuscles: [],
        equipment: [], movementPattern: 'other', counterType: 'reps', defaultLoadUnit: 'kg',
        createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
      }] },
    };

    const conflicts = await new DetectBackupConflicts(data).execute(backup);
    const result = await new ImportBackup(data).execute(backup, 'overwrite', conflicts);

    expect(conflicts.totalConflicts).toBe(1);
    expect(result).toMatchObject({ overwritten: 1, inserted: 0 });
    await expect(data.getAll('exercises')).resolves.toEqual([expect.objectContaining({ name: 'Replacement' })]);
  });
});
