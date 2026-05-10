/**
 * Repository for One Rep Max records.
 * Owns table: oneRepMaxRecords
 */
import type { OneRepMaxRecord } from '@/domain/entities';
import { OneRepMaxRecordSchema } from '@/domain/schemas';

import { db } from '../database';
import { BaseRepository } from './BaseRepository';

export class OneRepMaxRepository extends BaseRepository {
    static async getLatestForExercise(exerciseId: string): Promise<OneRepMaxRecord | undefined> {
        return db.oneRepMaxRecords
            .where('[exerciseId+recordedAt]')
            .between([exerciseId, new Date(0)], [exerciseId, new Date(9999, 11, 31)], true, true)
            .reverse()
            .first();
    }

    static async getRecentForExercise(exerciseId: string, limit = 5): Promise<OneRepMaxRecord[]> {
        return db.oneRepMaxRecords
            .where('[exerciseId+recordedAt]')
            .between([exerciseId, new Date(0)], [exerciseId, new Date(9999, 11, 31)], true, true)
            .reverse()
            .limit(limit)
            .toArray();
    }

    static async getRecordsInDateRange(fromDate: Date, toDate: Date): Promise<OneRepMaxRecord[]> {
        return db.oneRepMaxRecords
            .where('recordedAt')
            .between(fromDate, toDate, true, true)
            .toArray();
    }

    static async getAllForExercise(exerciseId: string): Promise<OneRepMaxRecord[]> {
         return db.oneRepMaxRecords.where('exerciseId').equals(exerciseId).sortBy('recordedAt');
    }

    static async getBestRecord(exerciseId: string): Promise<OneRepMaxRecord | undefined> {
        return db.oneRepMaxRecords
            .where('exerciseId').equals(exerciseId)
            .sortBy('value')
            .then(records => records[records.length - 1]);
    }

    static async add(record: OneRepMaxRecord): Promise<string> {
        this.validateData(OneRepMaxRecordSchema, record);
        return db.oneRepMaxRecords.add(record);
    }

    static async put(record: OneRepMaxRecord): Promise<string> {
        this.validateData(OneRepMaxRecordSchema, record);
        return db.oneRepMaxRecords.put(record);
    }

    static async delete(id: string): Promise<void> {
        await db.oneRepMaxRecords.delete(id);
    }
}
