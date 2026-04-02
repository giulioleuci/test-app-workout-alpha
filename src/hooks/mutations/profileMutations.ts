import { useMutation } from '@tanstack/react-query';

import type { UserProfile, BodyWeightRecord, UserRegulationProfile } from '@/domain/entities';
import dayjs from '@/lib/dayjs';
import { profileService } from '@/services/profileService';

export function useProfileMutations() {
  const updateProfileMutation = useMutation({
    mutationFn: async (profile: UserProfile) => {
      await profileService.upsertProfile({ ...profile, updatedAt: dayjs().toDate() });
    },
  });

  const addWeightMutation = useMutation({
    mutationFn: async (record: BodyWeightRecord) => {
      await profileService.addBodyWeightRecord(record);
    },
  });

  const updateWeightMutation = useMutation({
    mutationFn: async (record: BodyWeightRecord) => {
      await profileService.updateBodyWeightRecord(record.id, record);
    },
  });

  const deleteWeightMutation = useMutation({
    mutationFn: async (id: string) => {
      await profileService.deleteBodyWeightRecord(id);
    },
  });

  const updateRegulationMutation = useMutation({
    mutationFn: async (profile: UserRegulationProfile) => {
      await profileService.upsertRegulationProfile({ ...profile, updatedAt: dayjs().toDate() });
    },
  });

  return {
    updateProfile: updateProfileMutation.mutateAsync,
    addWeight: addWeightMutation.mutateAsync,
    updateWeight: updateWeightMutation.mutateAsync,
    deleteWeight: deleteWeightMutation.mutateAsync,
    updateRegulation: updateRegulationMutation.mutateAsync,
  };
}
