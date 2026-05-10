import { UserProfileRepository } from '@/db/repositories/UserProfileRepository';
import type { UserProfile, UserRegulationProfile, BodyWeightRecord } from '@/domain/entities';

export const profileService = {
  getProfile: async (): Promise<UserProfile | undefined> => {
    return UserProfileRepository.getProfile();
  },

  upsertProfile: async (profile: UserProfile): Promise<string> => {
    return UserProfileRepository.upsertProfile(profile);
  },

  getRegulationProfile: async (): Promise<UserRegulationProfile | undefined> => {
    return UserProfileRepository.getRegulationProfile();
  },

  upsertRegulationProfile: async (profile: UserRegulationProfile): Promise<string> => {
    return UserProfileRepository.upsertRegulationProfile(profile);
  },

  updateRegulationProfile: async (profile: UserRegulationProfile): Promise<string> => {
    return UserProfileRepository.upsertRegulationProfile(profile);
  },

  getLatestBodyWeight: async (): Promise<BodyWeightRecord | undefined> => {
    return UserProfileRepository.getLatestBodyWeight();
  },

  getBodyWeightRecords: async (from?: Date, to?: Date): Promise<BodyWeightRecord[]> => {
    return UserProfileRepository.getBodyWeightRecords(from, to);
  },

  addBodyWeightRecord: async (record: BodyWeightRecord): Promise<string> => {
    return UserProfileRepository.addBodyWeightRecord(record);
  },

  updateBodyWeightRecord: async (id: string, record: Partial<BodyWeightRecord>): Promise<number> => {
    return UserProfileRepository.updateBodyWeightRecord(id, record);
  },

  deleteBodyWeightRecord: async (id: string): Promise<void> => {
    return UserProfileRepository.deleteBodyWeightRecord(id);
  }
};
