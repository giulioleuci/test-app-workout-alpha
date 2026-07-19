import { useMutation } from '@tanstack/react-query';
import { nanoid } from 'nanoid';

import { maintenanceCommands } from '@/composition/maintenance';
import { profileCommands } from '@/composition/profile';
import { DEFAULT_REGULATION_PROFILE } from '@/domain/entities';
import { PlannedWorkoutStatus } from '@/domain/enums';
import { useInvalidation } from '@/hooks/queries/useInvalidation';
import dayjs from '@/lib/dayjs';

export function useOnboardingMutations() {
  const { invalidateAll } = useInvalidation();

  const onboardUserMutation = useMutation({
    mutationFn: async ({ name, gender, weight, seedOptions, language = 'en' }: {
      name: string, gender: 'male' | 'female' | 'undisclosed', weight: number,
      seedOptions: { exercises: boolean, fullBody: boolean, ppl: boolean, upperLower: boolean, powerlifting: boolean, calisthenics: boolean },
      language?: 'en' | 'it' | 'es' | 'fr' | 'zh'
    }) => {
      const now = dayjs().toDate();

      await profileCommands.upsertProfile({
        id: 'default',
        name: name.trim(),
        gender,
        createdAt: now,
        updatedAt: now,
      });

      await profileCommands.upsertRegulationProfile({
        ...DEFAULT_REGULATION_PROFILE,
        updatedAt: now,
      });

      if (weight > 0) {
        await profileCommands.addBodyWeightRecord({
          id: nanoid(),
          weight,
          recordedAt: now,
        });
      }

      if (seedOptions.exercises) {
        await maintenanceCommands.seedExercises(language);
      }

      const plansToSeed: { fn: (status: PlannedWorkoutStatus) => Promise<void>; selected: boolean }[] = [
        { fn: (s) => maintenanceCommands.seedFullBody2x(s, language), selected: seedOptions.fullBody },
        { fn: (s) => maintenanceCommands.seedPPL3x(s, language), selected: seedOptions.ppl },
        { fn: (s) => maintenanceCommands.seedUpperLower4x(s, language), selected: seedOptions.upperLower },
        { fn: (s) => maintenanceCommands.seedPowerlifting(s, language), selected: seedOptions.powerlifting },
        { fn: (s) => maintenanceCommands.seedCalisthenics(s, language), selected: seedOptions.calisthenics },
      ];

      const selectedPlans = plansToSeed.filter(p => p.selected);
      for (let i = 0; i < selectedPlans.length; i++) {
        const isLast = i === selectedPlans.length - 1;
        await selectedPlans[i].fn(isLast ? PlannedWorkoutStatus.Active : PlannedWorkoutStatus.Inactive);
      }
    },
    onSuccess: invalidateAll,
  });

  return {
    onboardUser: onboardUserMutation.mutateAsync,
  };
}
