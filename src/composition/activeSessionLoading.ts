import { ActiveSessionLoadingUseCases } from '@/application/activeSessionLoading'; import { activeSessionLoadingGateway } from '@/infrastructure/session/activeSessionLoadingGateway';
export const activeSessionLoadingCommands = new ActiveSessionLoadingUseCases(activeSessionLoadingGateway);
