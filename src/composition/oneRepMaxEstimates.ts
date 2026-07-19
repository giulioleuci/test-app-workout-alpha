import { OneRepMaxEstimateUseCases } from '@/application/oneRepMaxEstimates';
import { oneRepMaxHistoryGateway } from '@/infrastructure/history/oneRepMaxHistoryGateway';

/** Presentation-facing commands for history-derived one-rep-max estimates. */
export const oneRepMaxEstimateCommands = new OneRepMaxEstimateUseCases(oneRepMaxHistoryGateway);
