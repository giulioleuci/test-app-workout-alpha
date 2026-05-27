/**
 * Repository for generic, cross-table backup access.
 *
 * Backup/restore is inherently cross-cutting: it reads and writes every table
 * generically rather than through per-entity repositories. This repository owns
 * that raw Dexie access so the "only repositories touch `db`" rule holds; the
 * backupService keeps only serialization and conflict-strategy logic.
 */
import { db } from '../database';

import type { Table } from 'dexie';

function table(name: string): Table {
  return (db as unknown as Record<string, Table>)[name];
}

export class BackupRepository {
  /** All records in a table. */
  static getAll(name: string): Promise<unknown[]> {
    return table(name).toArray();
  }

  /** Records in a table whose `id` is in the given list. */
  static getByIds(name: string, ids: string[]): Promise<unknown[]> {
    return table(name).where('id').anyOf(ids).toArray();
  }

  /** Of the given ids, which already exist as primary keys in the table. */
  static async getExistingIds(name: string, ids: string[]): Promise<string[]> {
    const existing = await table(name).where('id').anyOf(ids).primaryKeys();
    return existing as string[];
  }

  /**
   * Run a read-write transaction across all tables, providing a `put` callback
   * the caller uses to write validated/remapped records.
   */
  static async writeAll(
    fn: (put: (name: string, record: unknown) => Promise<unknown>) => Promise<void>,
  ): Promise<void> {
    await db.transaction('rw', db.tables, async () => {
      await fn((name, record) => table(name).put(record));
    });
  }
}
