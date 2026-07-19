import {
  analyzeItemsFromData,
  analyzeItemsRaw,
  type ItemWithContext,
  type SessionVolumeAnalysis,
  type WorkoutVolumeAnalysis,
} from '@/services/volumeAnalyzer';

import type { EstimateSessionDuration, VolumePlanningPort } from './ports';

type Labeler = (key: string) => string;

export class VolumeUseCases {
  constructor(private readonly planning: VolumePlanningPort, private readonly estimateSessionDuration: EstimateSessionDuration) {}

  async analyzeSessionVolume(sessionId: string, sessionName: string, muscle: Labeler, group: Labeler, pattern: Labeler, objective?: Labeler, excludeSecondary = false): Promise<SessionVolumeAnalysis> {
    const items = await this.planning.getSessionItems(sessionId);
    if (!items) return { sessionId, sessionName, byMuscle: [], byMuscleGroup: [], byMovementPattern: [], byObjective: [] };
    return { sessionId, sessionName, ...analyzeItemsFromData(items, muscle, group, pattern, objective, excludeSecondary) };
  }

  async analyzeWorkoutVolume(workoutId: string, muscle: Labeler, group: Labeler, pattern: Labeler, objective?: Labeler): Promise<WorkoutVolumeAnalysis> {
    const data = await this.planning.getWorkoutData(workoutId);
    const sessionNames: string[] = [];
    const sessionMuscles: Map<string, number>[] = [];
    const sessions: SessionVolumeAnalysis[] = [];
    const allItems: ItemWithContext[] = [];
    for (const session of data?.sessions ?? []) {
      const muscleCount = new Map<string, number>();
      for (const context of session.items) for (const muscleName of context.exercise.primaryMuscles) muscleCount.set(muscleName, (muscleCount.get(muscleName) ?? 0) + 1);
      sessionNames.push(session.sessionName);
      sessionMuscles.push(muscleCount);
      allItems.push(...session.items);
      sessions.push({ sessionId: session.sessionId, sessionName: session.sessionName, ...analyzeItemsFromData(session.items, muscle, group, pattern, objective) });
    }
    const musclePresence = new Map<string, number[]>();
    for (const muscleName of new Set(sessionMuscles.flatMap(counts => [...counts.keys()]))) musclePresence.set(muscleName, sessionMuscles.map(counts => counts.get(muscleName) ?? 0));
    return {
      workoutId,
      workoutName: data?.workoutName ?? 'Sconosciuto',
      total: analyzeItemsFromData(allItems, muscle, group, pattern, objective),
      sessions,
      muscleOverlap: { sessionNames, musclePresence },
    };
  }

  async getSessionVolumeAndDuration(sessionId: string) {
    const [items, duration] = await Promise.all([this.planning.getSessionItems(sessionId), this.estimateSessionDuration(sessionId)]);
    return items && { analysis: analyzeItemsRaw(items), duration };
  }
}
