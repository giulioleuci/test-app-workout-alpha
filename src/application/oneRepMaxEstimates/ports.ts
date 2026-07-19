import type { Exercise, SessionExerciseItem, SessionSet } from '@/domain/entities';

export interface OneRepMaxHistoryPort {
  getExercises(): Promise<Exercise[]>;
  getItemsByExercise(
    exerciseId: string,
    options: { toDate: Date; desc: boolean; limit: number },
  ): Promise<SessionExerciseItem[]>;
  getSetsByItem(itemId: string): Promise<SessionSet[]>;
}
