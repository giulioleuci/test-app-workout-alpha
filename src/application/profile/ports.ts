import type { BodyWeightRecord, UserProfile, UserRegulationProfile } from '@/domain/entities';

/** Persistence boundary for profile and body-metric application commands. */
export interface ProfileDataPort {
  getProfile(): Promise<UserProfile | undefined>;
  upsertProfile(profile: UserProfile): Promise<string>;
  getRegulationProfile(): Promise<UserRegulationProfile | undefined>;
  upsertRegulationProfile(profile: UserRegulationProfile): Promise<string>;
  getLatestBodyWeight(): Promise<BodyWeightRecord | undefined>;
  getBodyWeightRecords(from?: Date, to?: Date): Promise<BodyWeightRecord[]>;
  addBodyWeightRecord(record: BodyWeightRecord): Promise<string>;
  updateBodyWeightRecord(id: string, record: Partial<BodyWeightRecord>): Promise<number>;
  deleteBodyWeightRecord(id: string): Promise<void>;
}
