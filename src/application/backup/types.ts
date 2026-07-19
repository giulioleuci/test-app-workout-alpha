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

export const ALL_TABLES: TableName[] = [
  'exercises', 'exerciseVersions', 'plannedWorkouts', 'plannedSessions',
  'plannedExerciseGroups', 'plannedExerciseItems', 'plannedSets',
  'workoutSessions', 'sessionExerciseGroups', 'sessionExerciseItems',
  'sessionSets', 'oneRepMaxRecords', 'userRegulationProfile',
  'sessionTemplates', 'userProfile', 'bodyWeightRecords',
];

export const MAX_BACKUP_SIZE = 10 * 1024 * 1024;

export interface BackupCategory {
  tables: TableName[];
}

export const BACKUP_CATEGORY_TABLES: BackupCategory[] = [
  { tables: ['exercises', 'exerciseVersions'] },
  { tables: ['plannedWorkouts', 'plannedSessions', 'plannedExerciseGroups', 'plannedExerciseItems', 'plannedSets'] },
  { tables: ['workoutSessions', 'sessionExerciseGroups', 'sessionExerciseItems', 'sessionSets'] },
  { tables: ['oneRepMaxRecords'] },
  { tables: ['userProfile', 'bodyWeightRecords'] },
  { tables: ['userRegulationProfile'] },
  { tables: ['sessionTemplates'] },
];
