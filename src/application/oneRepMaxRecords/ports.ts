import type { BodyWeightRecord, Exercise, OneRepMaxRecord, SessionSet } from '@/domain/entities';

/** Persistence boundary for one-rep-max records and calculated e1RM history. */
export interface OneRepMaxRecordPort {
  getExercises(): Promise<Exercise[]>;
  getRecordsInDateRange(from: Date, to: Date): Promise<OneRepMaxRecord[]>;
  getBodyWeightRecords(from: Date, to: Date): Promise<BodyWeightRecord[]>;
  putRecord(record: OneRepMaxRecord): Promise<string>;
  deleteRecord(id: string): Promise<void>;
  getLatestRecord(exerciseId: string): Promise<OneRepMaxRecord | undefined>;
  getRecordsForExercise(exerciseId: string): Promise<OneRepMaxRecord[]>;
  getCompletedE1RMSetsForExercise(exerciseId: string): Promise<SessionSet[]>;
}
