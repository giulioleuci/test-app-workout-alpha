import { useMutation } from '@tanstack/react-query';

import { profileCommands } from '@/composition/profile';
import type { UserProfile, BodyWeightRecord, UserRegulationProfile } from '@/domain/entities';
import { useInvalidation } from '@/hooks/queries/useInvalidation';
import dayjs from '@/lib/dayjs';

export function useProfileMutations() {
  const { invalidateUserContext } = useInvalidation();

  const updateProfileMutation = useMutation({
    mutationFn: async (profile: UserProfile) => {
      await profileCommands.upsertProfile({ ...profile, updatedAt: dayjs().toDate() });
    },
    onSuccess: invalidateUserContext,
  });

  const addWeightMutation = useMutation({
    mutationFn: async (record: BodyWeightRecord) => {
      await profileCommands.addBodyWeightRecord(record);
    },
    onSuccess: invalidateUserContext,
  });

  const updateWeightMutation = useMutation({
    mutationFn: async (record: BodyWeightRecord) => {
      await profileCommands.updateBodyWeightRecord(record.id, record);
    },
    onSuccess: invalidateUserContext,
  });

  const deleteWeightMutation = useMutation({
    mutationFn: async (id: string) => {
      await profileCommands.deleteBodyWeightRecord(id);
    },
    onSuccess: invalidateUserContext,
  });

  const updateRegulationMutation = useMutation({
    mutationFn: async (profile: UserRegulationProfile) => {
      await profileCommands.upsertRegulationProfile({ ...profile, updatedAt: dayjs().toDate() });
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
