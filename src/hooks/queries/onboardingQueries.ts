import { useQuery } from '@tanstack/react-query';

import { profileCommands } from '@/composition/profile';

export const onboardingKeys = {
  all: ['onboardingStatus'] as const,
};

export function useOnboardingStatus() {
  return useQuery({
    queryKey: onboardingKeys.all,
    queryFn: async () => {
      const profile = await profileCommands.getProfile();
      return !!profile;
    },
    staleTime: Infinity,
  });
}
