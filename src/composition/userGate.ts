import { UserGateCoordinator } from '@/application/userGate';
import { systemCommands } from '@/composition/system';
import { userCommands } from '@/composition/users';
export const userGateCoordinator = new UserGateCoordinator(systemCommands, userCommands);
