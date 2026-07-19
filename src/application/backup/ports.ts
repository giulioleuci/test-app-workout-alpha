import type {
  BackupSchema,
  TableName,
} from './types';

/** Persistence boundary used by backup application commands. */
export interface BackupDataPort {
  getAll(tableName: TableName): Promise<unknown[]>;
  getByIds(tableName: TableName, ids: string[]): Promise<unknown[]>;
  getExistingIds(tableName: TableName, ids: string[]): Promise<string[]>;
  writeAll(write: (put: (tableName: TableName, record: Record<string, unknown>) => Promise<void>) => Promise<void>): Promise<void>;
}

/** File boundary. Native and browser behavior belongs to its infrastructure adapter. */
export interface BackupFileGateway {
  download(backup: BackupSchema): Promise<void>;
  pick(): Promise<{ data: string; name: string }>;
}
