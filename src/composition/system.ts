import { SystemUseCases } from '@/application/system';
import { systemGateway } from '@/infrastructure/system/systemGateway';
export const systemCommands = new SystemUseCases(systemGateway);
