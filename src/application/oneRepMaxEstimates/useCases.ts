import type { HistoryEstimate } from '@/domain/analytics-types';
import dayjs from '@/lib/dayjs';
import { calculateWeighted1RM } from '@/services/rpePercentageTable';

import type { OneRepMaxHistoryPort } from './ports';

export class OneRepMaxEstimateUseCases {
  constructor(private readonly history: OneRepMaxHistoryPort) {}

  async estimateAllFromHistory(): Promise<Record<string, HistoryEstimate>> {
    const entries = await Promise.all((await this.history.getExercises()).map(async exercise => {
      const estimate = await this.fetchHistoryEstimate(exercise.id, exercise.defaultLoadUnit);
      return estimate ? [exercise.id, estimate] as const : null;
    }));
    return Object.fromEntries(entries.filter((entry): entry is [string, HistoryEstimate] => entry !== null));
  }

  async estimateFromHistoryForExercise(exerciseId: string): Promise<number | null> {
    return (await this.fetchHistoryEstimate(exerciseId, 'kg'))?.value ?? null;
  }

  private async fetchHistoryEstimate(exerciseId: string, unit: 'kg' | 'lbs'): Promise<HistoryEstimate | null> {
    const items = await this.history.getItemsByExercise(exerciseId, {
      toDate: dayjs().toDate(), desc: true, limit: 5,
    });
    for (const item of items) {
      const validSets = (await this.history.getSetsByItem(item.id)).filter(set =>
        set.isCompleted
        && !set.isSkipped
        && set.actualLoad != null && set.actualLoad > 0
        && set.actualCount != null && set.actualCount > 0
        && set.actualRPE != null && set.actualRPE >= 6 && set.actualRPE <= 10,
      );
      validSets.sort((left, right) => right.orderIndex - left.orderIndex);
      const bestSet = validSets[0];
      if (!bestSet) continue;

      const calculated = calculateWeighted1RM(bestSet.actualLoad!, bestSet.actualCount!, bestSet.actualRPE!);
      const value = bestSet.e1rm ?? calculated.media;
      if (value > 0) {
        return {
          value,
          unit,
          load: bestSet.actualLoad!,
          reps: bestSet.actualCount!,
          rpe: bestSet.actualRPE!,
          date: item.completedAt ?? dayjs(0).toDate(),
        };
      }
    }
    return null;
  }
}
