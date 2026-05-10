/**
 * Repository for User Profile and Body Metrics.
 * Owns tables: userProfile, userRegulationProfile, bodyWeightRecords
 */
import type { UserProfile, UserRegulationProfile, BodyWeightRecord } from '@/domain/entities';

import { db } from '../database';

export class UserProfileRepository {
  // User Profile
  static async getProfile(): Promise<UserProfile | undefined> {
    return db.userProfile.toCollection().first();
  }

  static async upsertProfile(profile: UserProfile): Promise<string> {
    return db.userProfile.put(profile);
  }

  // User Regulation Profile
  static async getRegulationProfile(): Promise<UserRegulationProfile | undefined> {
    return db.userRegulationProfile.toCollection().first();
  }

  static async upsertRegulationProfile(profile: UserRegulationProfile): Promise<string> {
    return db.userRegulationProfile.put(profile);
  }

  // Body Weight Records
  static async getLatestBodyWeight(): Promise<BodyWeightRecord | undefined> {
    return db.bodyWeightRecords.orderBy('recordedAt').reverse().first();
  }

  static async getBodyWeightRecords(fromDate?: Date, toDate?: Date): Promise<BodyWeightRecord[]> {
    let query = db.bodyWeightRecords.orderBy('recordedAt');

    // Dexie ranges are inclusive by default
    if (fromDate && toDate) {
      // @ts-expect-error
      query = query.filter(r => r.recordedAt >= fromDate && r.recordedAt <= toDate);
    } else if (fromDate) {
      // @ts-expect-error
      query = query.filter(r => r.recordedAt >= fromDate);
    } else if (toDate) {
      // @ts-expect-error
      query = query.filter(r => r.recordedAt <= toDate);
    }

    return query.toArray();
  }

  static async addBodyWeightRecord(record: BodyWeightRecord): Promise<string> {
    return db.bodyWeightRecords.add(record);
  }

  static async deleteBodyWeightRecord(id: string): Promise<void> {
    await db.bodyWeightRecords.delete(id);
  }

  static async updateBodyWeightRecord(id: string, changes: Partial<BodyWeightRecord>): Promise<number> {
    return db.bodyWeightRecords.update(id, changes);
  }
}
