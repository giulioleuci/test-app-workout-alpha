import type { Prioritized1RM } from '@/application/oneRepMaxRecords';
import type { LoadSuggestion, LoadSuggestionContext } from '@/services/loadSuggestionEngine';
import { getLoadSuggestions } from '@/services/loadSuggestionEngine';

import type { LoadSuggestionHistoryPort } from './ports';

export interface LoadSuggestionInputs {
  p1RM: Prioritized1RM | null;
  lastSetPerf: Awaited<ReturnType<LoadSuggestionHistoryPort['getLastSetPerformance']>>;
  lastGeneralPerf: Awaited<ReturnType<LoadSuggestionHistoryPort['getLastPerformance']>>;
}

export class LoadSuggestionUseCases {
  constructor(
    private readonly history: LoadSuggestionHistoryPort,
    private readonly getPrioritizedOneRepMax: (exerciseId: string) => Promise<Prioritized1RM | null>,
  ) {}

  async getSuggestionInputs(exerciseId: string, plannedSetId?: string): Promise<LoadSuggestionInputs> {
    const [p1RM, lastSetPerf, lastGeneralPerf] = await Promise.all([
      this.getPrioritizedOneRepMax(exerciseId),
      plannedSetId ? this.history.getLastSetPerformance(plannedSetId) : Promise.resolve(null),
      this.history.getLastPerformance(exerciseId),
    ]);
    return { p1RM, lastSetPerf, lastGeneralPerf };
  }

  async getLoadSuggestionContext(
    plannedSetId: string,
    sessionId: string,
    exerciseId: string,
  ): Promise<LoadSuggestionContext | null> {
    const [plannedSet, previousSets, best1RMRecord, lastSessionPerformance, profile] = await Promise.all([
      this.history.getPlannedSet(plannedSetId),
      this.history.getSetsInSessionForExercise(sessionId, exerciseId),
      this.history.getBestOneRepMax(exerciseId),
      this.history.getLastPerformance(exerciseId),
      this.history.getUserRegulationProfile(),
    ]);

    if (!plannedSet) return null;

    const plannedExerciseItem = await this.history.getPlannedExerciseItem(plannedSet.plannedExerciseItemId);
    return {
      plannedSet,
      plannedExerciseItem,
      previousSetsInSession: previousSets,
      exerciseId,
      best1RM: best1RMRecord && {
        value: best1RMRecord.value,
        valueMin: best1RMRecord.valueMin,
        valueMax: best1RMRecord.valueMax,
        confidence: best1RMRecord.method === 'direct' ? 'high' : 'medium',
      },
      lastSessionPerformance,
      simpleMode: profile?.simpleMode,
    };
  }

  async getHydratedLoadSuggestions(context: LoadSuggestionContext): Promise<LoadSuggestion[]> {
    const expandedContext = { ...context };

    if (context.best1RM === null) {
      const best1RMRecord = await this.history.getBestOneRepMax(context.exerciseId);
      if (best1RMRecord) {
        expandedContext.best1RM = {
          value: best1RMRecord.value,
          confidence: best1RMRecord.method === 'direct' ? 'high' : 'medium',
        };
      }
    }

    if (context.lastSessionPerformance === null) {
      expandedContext.lastSessionPerformance = await this.history.getLastPerformance(context.exerciseId);
    }

    return getLoadSuggestions(expandedContext);
  }
}
