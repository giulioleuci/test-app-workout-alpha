import type { BodyWeightRecord, Exercise, OneRepMaxRecord } from '@/domain/entities';

import type { OneRepMaxRecordPort } from './ports';

export interface GroupedOneRepMax {
  exercise: Exercise;
  latest: OneRepMaxRecord | null;
  records: OneRepMaxRecord[];
}

export interface OneRepMaxData {
  allGrouped: GroupedOneRepMax[];
  bodyWeightRecords: BodyWeightRecord[];
}

export type OneRepMaxMethod = 'direct' | 'indirect' | 'calculated';

export interface Prioritized1RM {
  value: number;
  method: OneRepMaxMethod;
  recordedAt: Date;
}

export class OneRepMaxRecordUseCases {
  constructor(private readonly records: OneRepMaxRecordPort) {}

  async getGroupedData(): Promise<OneRepMaxData> {
    const [allExercises, allRecords, bodyWeightRecords] = await Promise.all([
      this.records.getExercises(),
      this.records.getRecordsInDateRange(new Date(0), new Date()),
      this.records.getBodyWeightRecords(new Date(0), new Date()),
    ]);

    const allGrouped = allExercises.map(exercise => {
      const records = allRecords
        .filter(record => record.exerciseId === exercise.id)
        .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
      return { exercise, latest: records[0] ?? null, records };
    }).sort((a, b) => {
      if (a.latest && !b.latest) return -1;
      if (!a.latest && b.latest) return 1;
      return a.exercise.name.localeCompare(b.exercise.name);
    });

    return { allGrouped, bodyWeightRecords };
  }

  upsertRecord(record: OneRepMaxRecord): Promise<string> {
    return this.records.putRecord(record);
  }

  deleteRecord(id: string): Promise<void> {
    return this.records.deleteRecord(id);
  }

  getLatestOneRepMax(exerciseId: string): Promise<OneRepMaxRecord | undefined> {
    return this.records.getLatestRecord(exerciseId);
  }

  async getPrioritized1RM(exerciseId: string): Promise<Prioritized1RM | null> {
    const records = await this.records.getRecordsForExercise(exerciseId);
    const directRecord = records
      .filter(record => record.method === 'direct')
      .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())[0];
    if (directRecord) return { value: directRecord.value, method: 'direct', recordedAt: directRecord.recordedAt };

    const indirectRecord = records
      .filter(record => record.method === 'indirect')
      .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())[0];
    if (indirectRecord) return { value: indirectRecord.value, method: 'indirect', recordedAt: indirectRecord.recordedAt };

    const calculatedRecords = await this.records.getCompletedE1RMSetsForExercise(exerciseId);
    const bestE1RM = calculatedRecords.sort((a, b) => (b.e1rm ?? 0) - (a.e1rm ?? 0))[0];
    if (!bestE1RM || bestE1RM.e1rm === undefined) return null;
    return {
      value: bestE1RM.e1rm,
      method: 'calculated',
      recordedAt: bestE1RM.completedAt ?? new Date(),
    };
  }
}
