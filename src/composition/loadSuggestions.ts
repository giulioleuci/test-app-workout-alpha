import { LoadSuggestionUseCases } from '@/application/loadSuggestions';
import { OneRepMaxRecordUseCases } from '@/application/oneRepMaxRecords';
import { loadSuggestionHistoryGateway } from '@/infrastructure/history/loadSuggestionHistoryGateway';
import { oneRepMaxRecordGateway } from '@/infrastructure/history/oneRepMaxRecordGateway';

/** Presentation-facing commands for load-suggestion history and hydration. */
const oneRepMaxRecords = new OneRepMaxRecordUseCases(oneRepMaxRecordGateway);

export const loadSuggestionCommands = new LoadSuggestionUseCases(
  loadSuggestionHistoryGateway,
  exerciseId => oneRepMaxRecords.getPrioritized1RM(exerciseId),
);
