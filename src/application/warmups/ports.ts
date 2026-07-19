import type { BodyWeightRecord, Exercise } from '@/domain/entities';

/** Persistence boundary for context-aware warmup generation. */
export interface WarmupContextPort {
  getExercisesInSession(sessionId: string): Promise<Exercise[] | null>;
  getLatestBodyWeight(): Promise<BodyWeightRecord | undefined>;
}
