import { useQuery } from '@tanstack/react-query';

import { profileService } from '@/services/profileService';

export const onboardingKeys = {
  all: ['onboardingStatus'] as const,
};

export function useOnboardingStatus() {
  return useQuery({
    queryKey: onboardingKeys.all,
    queryFn: async () => {
      const profile = await profileService.getProfile();
      return !!profile;
    },
    staleTime: Infinity,
  });
}
