import type { BodyWeightRecord, UserProfile, UserRegulationProfile } from '@/domain/entities';

import type { ProfileDataPort } from './ports';

/** Application-facing profile commands. Their only external dependency is the port. */
export class ProfileUseCases {
  constructor(private readonly profiles: ProfileDataPort) {}

  getProfile(): Promise<UserProfile | undefined> { return this.profiles.getProfile(); }
  upsertProfile(profile: UserProfile): Promise<string> { return this.profiles.upsertProfile(profile); }
  getRegulationProfile(): Promise<UserRegulationProfile | undefined> { return this.profiles.getRegulationProfile(); }
  upsertRegulationProfile(profile: UserRegulationProfile): Promise<string> { return this.profiles.upsertRegulationProfile(profile); }
  getLatestBodyWeight(): Promise<BodyWeightRecord | undefined> { return this.profiles.getLatestBodyWeight(); }
  getBodyWeightRecords(from?: Date, to?: Date): Promise<BodyWeightRecord[]> { return this.profiles.getBodyWeightRecords(from, to); }
  addBodyWeightRecord(record: BodyWeightRecord): Promise<string> { return this.profiles.addBodyWeightRecord(record); }
  updateBodyWeightRecord(id: string, record: Partial<BodyWeightRecord>): Promise<number> { return this.profiles.updateBodyWeightRecord(id, record); }
  deleteBodyWeightRecord(id: string): Promise<void> { return this.profiles.deleteBodyWeightRecord(id); }
}
