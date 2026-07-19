import { ProfileUseCases } from '@/application/profile';
import { profileDataGateway } from '@/infrastructure/profile/profileDataGateway';

/** Presentation-facing profile application commands. */
export const profileCommands = new ProfileUseCases(profileDataGateway);
