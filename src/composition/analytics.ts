import { AnalyticsUseCases } from '@/application/analytics';
import { oneRepMaxEstimateCommands } from '@/composition/oneRepMaxEstimates';
import { analyticsGateway } from '@/infrastructure/history/analyticsGateway';

/** Presentation-facing analytics commands, with infrastructure wired at the edge. */
export const analyticsCommands = new AnalyticsUseCases(analyticsGateway, {
  estimateAllFromHistory: () => oneRepMaxEstimateCommands.estimateAllFromHistory(),
});
