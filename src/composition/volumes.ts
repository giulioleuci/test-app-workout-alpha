import { VolumeUseCases } from '@/application/volumes';
import { durationCommands } from '@/composition/duration';
import { volumePlanningGateway } from '@/infrastructure/planning/volumePlanningGateway';

/** Presentation-facing commands for persisted volume analysis. */
export const volumeCommands = new VolumeUseCases(volumePlanningGateway, sessionId => durationCommands.estimateSessionDuration(sessionId));
