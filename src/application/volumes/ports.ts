import type { DurationRange } from '@/domain/value-objects';
import type { ItemWithContext } from '@/services/volumeAnalyzer';

export interface VolumePlanningPort {
  getSessionItems(sessionId: string): Promise<ItemWithContext[] | null>;
  getWorkoutData(workoutId: string): Promise<{
    workoutName: string;
    sessions: { sessionId: string; sessionName: string; items: ItemWithContext[] }[];
  } | null>;
}

export type EstimateSessionDuration = (sessionId: string) => Promise<DurationRange>;
