import { useMutation } from '@tanstack/react-query';

import type { UserProfile, BodyWeightRecord, UserRegulationProfile } from '@/domain/entities';
import { useInvalidation } from '@/hooks/queries/useInvalidation';
import dayjs from '@/lib/dayjs';
import { profileService } from '@/services/profileService';

export function useProfileMutations() {
  const { invalidateUserContext } = useInvalidation();

  const updateProfileMutation = useMutation({
    mutationFn: async (profile: UserProfile) => {
      await profileService.upsertProfile({ ...profile, updatedAt: dayjs().toDate() });
    },
    onSuccess: invalidateUserContext,
  });

  const addWeightMutation = useMutation({
    mutationFn: async (record: BodyWeightRecord) => {
      await profileService.addBodyWeightRecord(record);
    },
    onSuccess: invalidateUserContext,
  });

  const updateWeightMutation = useMutation({
    mutationFn: async (record: BodyWeightRecord) => {
      await profileService.updateBodyWeightRecord(record.id, record);
    },
    onSuccess: invalidateUserContext,
  });

  const deleteWeightMutation = useMutation({
    mutationFn: async (id: string) => {
      await profileService.deleteBodyWeightRecord(id);
    },
    onSuccess: invalidateUserContext,
  });

  const updateRegulationMutation = useMutation({
    mutationFn: async (profile: UserRegulationProfile) => {
      await profileService.upsertRegulationProfile({ ...profile, updatedAt: dayjs().toDate() });
    },
    onSuccess: invalidateUserContext,
  });

  return {
    updateProfile: updateProfileMutation.mutateAsync,
    addWeight: addWeightMutation.mutateAsync,
    updateWeight: updateWeightMutation.mutateAsync,
    deleteWeight: deleteWeightMutation.mutateAsync,
    updateRegulation: updateRegulationMutation.mutateAsync,
  };
}
