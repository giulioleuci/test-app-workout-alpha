import { SessionMutationUseCases } from '@/application/sessionMutation';
import {
  sessionMutationExerciseGateway,
  sessionMutationPersistenceGateway,
} from '@/infrastructure/session/sessionMutationGateway';

export const sessionMutationCommands = new SessionMutationUseCases(
  sessionMutationPersistenceGateway,
  sessionMutationExerciseGateway,
);
