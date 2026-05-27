import { useMutation } from '@tanstack/react-query';

import { useOnboardingMutations } from '@/hooks/mutations/onboardingMutations';
import { hashPin } from '@/services/authService';
import { systemService } from '@/services/systemService';
import { userService } from '@/services/userService';

export interface CreateUserInput {
  profileName: string;
  pin: string;
  avatarColor: string;
  athleteName: string;
  gender: 'male' | 'female' | 'undisclosed';
  weight: number;
  seedOptions: {
    exercises: boolean;
    fullBody: boolean;
    ppl: boolean;
    upperLower: boolean;
    powerlifting: boolean;
    calisthenics: boolean;
  };
  language?: 'en' | 'it' | 'es' | 'fr' | 'zh';
}

/**
 * Composes the full "create user" flow: create the global user, mount its
 * database, and run onboarding (seed + profile). Returns the new user id.
 */
export function useCreateUser() {
  const onboarding = useOnboardingMutations();

  const mutation = useMutation({
    mutationFn: async (input: CreateUserInput): Promise<string> => {
      const pinHash = input.pin ? await hashPin(input.pin) : null;
      const globalUser = await userService.createUser(input.profileName, pinHash, input.avatarColor);

      await systemService.mountUser(globalUser.id);

      await onboarding.onboardUser({
        name: input.athleteName,
        gender: input.gender,
        weight: input.weight,
        seedOptions: input.seedOptions,
        language: input.language,
      });

      return globalUser.id;
    },
  });

  return {
    createUser: mutation.mutateAsync,
    isCreating: mutation.isPending,
  };
}
