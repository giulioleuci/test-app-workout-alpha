import { OneRepMaxRecordUseCases } from '@/application/oneRepMaxRecords';
import { oneRepMaxRecordGateway } from '@/infrastructure/history/oneRepMaxRecordGateway';

/** Presentation-facing commands for one-rep-max records and prioritized estimates. */
export const oneRepMaxRecordCommands = new OneRepMaxRecordUseCases(oneRepMaxRecordGateway);
