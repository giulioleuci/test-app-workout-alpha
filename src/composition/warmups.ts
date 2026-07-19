import { WarmupUseCases } from '@/application/warmups';
import { warmupContextGateway } from '@/infrastructure/session/warmupContextGateway';

/** Presentation-facing context-aware warmup commands. */
export const warmupCommands = new WarmupUseCases(warmupContextGateway);
