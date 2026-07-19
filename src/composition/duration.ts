import { DurationUseCases } from '@/application/duration';
import { durationGateway } from '@/infrastructure/planning/durationGateway';

/** Presentation-facing duration-estimation commands. */
export const durationCommands = new DurationUseCases(durationGateway);
