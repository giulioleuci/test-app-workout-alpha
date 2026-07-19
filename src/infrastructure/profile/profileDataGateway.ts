import type { ProfileDataPort } from '@/application/profile';
import { UserProfileRepository } from '@/db/repositories/UserProfileRepository';

/** Dexie implementation of the profile persistence port. */
export const profileDataGateway: ProfileDataPort = {
  getProfile: () => UserProfileRepository.getProfile(),
  upsertProfile: profile => UserProfileRepository.upsertProfile(profile),
  getRegulationProfile: () => UserProfileRepository.getRegulationProfile(),
  upsertRegulationProfile: profile => UserProfileRepository.upsertRegulationProfile(profile),
  getLatestBodyWeight: () => UserProfileRepository.getLatestBodyWeight(),
  getBodyWeightRecords: (from, to) => UserProfileRepository.getBodyWeightRecords(from, to),
  addBodyWeightRecord: record => UserProfileRepository.addBodyWeightRecord(record),
  updateBodyWeightRecord: (id, record) => UserProfileRepository.updateBodyWeightRecord(id, record),
  deleteBodyWeightRecord: id => UserProfileRepository.deleteBodyWeightRecord(id),
};
