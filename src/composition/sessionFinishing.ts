import { SessionFinishingUseCases } from '@/application/sessionFinishing';
import { exercisePerformanceCommands } from '@/composition/exercisePerformance';
import { createSessionFinishingGateway } from '@/infrastructure/session/sessionFinishingGateway';

export const sessionFinishingCommands = new SessionFinishingUseCases(
  createSessionFinishingGateway(id => exercisePerformanceCommands.analyzeSession(id)),
);
