import { HistoryUseCases } from '@/application/history';
import { exercisePerformanceCommands } from '@/composition/exercisePerformance';
import { createSessionHistoryGateway } from '@/infrastructure/history/sessionHistoryGateway';

/** Presentation-facing commands for session-history queries and mutations. */
export const historyCommands = new HistoryUseCases(
  createSessionHistoryGateway(id => exercisePerformanceCommands.analyzeItemOnChange(id)),
);
