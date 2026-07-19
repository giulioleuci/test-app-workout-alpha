import { PerformanceUseCases } from '@/application/performance';
import { oneRepMaxEstimateCommands } from '@/composition/oneRepMaxEstimates';
import { performanceGateway } from '@/infrastructure/history/performanceGateway';

/** Presentation-facing performance analysis commands. */
export const performanceCommands = new PerformanceUseCases(performanceGateway, {
  estimateFromHistoryForExercise: exerciseId => oneRepMaxEstimateCommands.estimateFromHistoryForExercise(exerciseId),
});
