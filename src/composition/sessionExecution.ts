import { SessionExecutionUseCases } from '@/application/sessionExecution';
import { sessionFinishingCommands } from '@/composition/sessionFinishing';
import { sessionMutationCommands } from '@/composition/sessionMutation';
import { sessionExecutionGateway } from '@/infrastructure/session/sessionExecutionGateway';

export const sessionExecutionCommands = new SessionExecutionUseCases(
  sessionExecutionGateway,
  sessionMutationCommands,
  sessionFinishingCommands,
);
