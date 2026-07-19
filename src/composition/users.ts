import { nanoid } from 'nanoid';

import { UserUseCases } from '@/application/users';
import { systemCommands } from '@/composition/system';
import { localStorageGateway } from '@/infrastructure/browser/localStorageGateway';
import { globalUserGateway } from '@/infrastructure/users/globalUserGateway';
export const userCommands = new UserUseCases(globalUserGateway, systemCommands, localStorageGateway, nanoid, () => new Date());
