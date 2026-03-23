import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { UserProfile, BodyWeightRecord, UserRegulationProfile } from '@/domain/entities';
import dayjs from '@/lib/dayjs';
import { profileService } from '@/services/profileService';

import { dashboardKeys } from '../queries/dashboardQueries';
import { weightRecordKeys } from '../queries/workoutQueries';

export function useProfileMutations() {
  const queryClient = useQueryClient();

  const updateProfileMutation = useMutation({
    mutationFn: async (profile: UserProfile) => {
      await profileService.upsertProfile({ ...profile, updatedAt: dayjs().toDate() });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.profile() });
    },
  });

  const addWeightMutation = useMutation({
    mutationFn: async (record: BodyWeightRecord) => {
      await profileService.addBodyWeightRecord(record);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: weightRecordKeys.all });
    },
  });

  const updateWeightMutation = useMutation({
    mutationFn: async (record: BodyWeightRecord) => {
      await profileService.updateBodyWeightRecord(record.id, record);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: weightRecordKeys.all });
    },
  });

  const deleteWeightMutation = useMutation({
    mutationFn: async (id: string) => {
      await profileService.deleteBodyWeightRecord(id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: weightRecordKeys.all });
    },
  });

  const updateRegulationMutation = useMutation({
    mutationFn: async (profile: UserRegulationProfile) => {
      await profileService.upsertRegulationProfile({ ...profile, updatedAt: dayjs().toDate() });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.regulation() });
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
