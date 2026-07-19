import { nanoid } from 'nanoid';

import { SessionActivationUseCases } from '@/application/sessionActivation';
import { sessionFinishingCommands } from '@/composition/sessionFinishing';
import { sessionActivationGateway } from '@/infrastructure/session/sessionActivationGateway';
import dayjs from '@/lib/dayjs';

export const sessionActivationCommands = new SessionActivationUseCases(sessionActivationGateway, sessionFinishingCommands, nanoid, () => dayjs().toDate());
