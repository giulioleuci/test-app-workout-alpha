import { SessionTemplateUseCases } from '@/application/sessionTemplates';
import { sessionTemplateGateway } from '@/infrastructure/planning/sessionTemplateGateway';

/** Presentation-facing planned-session template commands. */
export const sessionTemplateCommands = new SessionTemplateUseCases(sessionTemplateGateway);
