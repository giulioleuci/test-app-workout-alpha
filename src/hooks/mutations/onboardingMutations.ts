import { useMutation, useQueryClient } from '@tanstack/react-query';
import { nanoid } from 'nanoid';

import { DEFAULT_REGULATION_PROFILE } from '@/domain/entities';
import { PlannedWorkoutStatus } from '@/domain/enums';
import dayjs from '@/lib/dayjs';
import { profileService } from '@/services/profileService';
import { SystemMaintenanceService } from '@/services/systemMaintenanceService';

import { dashboardKeys } from '../queries/dashboardQueries';
import { onboardingKeys } from '../queries/onboardingQueries';

export function useOnboardingMutations() {
  const queryClient = useQueryClient();

  const onboardUserMutation = useMutation({
    mutationFn: async ({ name, gender, weight, seedOptions }: {
      name: string, gender: 'male' | 'female' | 'undisclosed', weight: number,
      seedOptions: { exercises: boolean, fullBody: boolean, ppl: boolean, upperLower: boolean }
    }) => {
      const now = dayjs().toDate();

      // 1. Create user profile
      await profileService.upsertProfile({
        id: 'default',
        name: name.trim(),
        gender,
        createdAt: now,
        updatedAt: now,
      });

      // 1b. Initialize default regulation profile
      await profileService.upsertRegulationProfile({
        ...DEFAULT_REGULATION_PROFILE,
        updatedAt: now,
      });

      // 2. Add body weight if provided
      if (weight > 0) {
        await profileService.addBodyWeightRecord({
          id: nanoid(),
          weight,
          recordedAt: now,
        });
      }

      // 3. Seed exercises if selected
      if (seedOptions.exercises) {
        await SystemMaintenanceService.seedExercises();
      }

      // 4. Seed plans
      const plansToSeed: { fn: (status: PlannedWorkoutStatus) => Promise<void>; selected: boolean }[] = [
        { fn: (s) => SystemMaintenanceService.seedFullBody2x(s), selected: seedOptions.fullBody },
        { fn: (s) => SystemMaintenanceService.seedPPL3x(s), selected: seedOptions.ppl },
        { fn: (s) => SystemMaintenanceService.seedUpperLower4x(s), selected: seedOptions.upperLower },
      ];

      const selectedPlans = plansToSeed.filter(p => p.selected);
      for (let i = 0; i < selectedPlans.length; i++) {
        const isLast = i === selectedPlans.length - 1;
        await selectedPlans[i].fn(isLast ? PlannedWorkoutStatus.Active : PlannedWorkoutStatus.Inactive);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: onboardingKeys.all });
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });

  return {
    onboardUser: onboardUserMutation.mutateAsync,
  };
}
