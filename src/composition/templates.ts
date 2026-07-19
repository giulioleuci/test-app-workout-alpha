 import { nanoid } from 'nanoid';
 
import { TemplateUseCases } from '@/application/templates'; import { templateGateway } from '@/infrastructure/planning/templateGateway';export const templateCommands = new TemplateUseCases(templateGateway, nanoid, () => new Date());
