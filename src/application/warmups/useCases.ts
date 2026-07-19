import type { Exercise, WarmupSetConfiguration } from '@/domain/entities';
import { ExerciseType, MuscleGroup, MuscleGroupMuscles } from '@/domain/enums';
import { roundToHalf } from '@/lib/math';
import { buildWarmupScheme } from '@/services/logic/warmupLogic';

import type { WarmupContextPort } from './ports';

export type WarmupExerciseType = 'compound_upper' | 'compound_lower' | 'isolation';

export interface WarmupSet {
  weight: number;
  reps: number;
  percent: number;
}

export function calculateUserWarmup(workingWeight: number, config: WarmupSetConfiguration[]): WarmupSet[] {
  return config.map(item => ({
    weight: roundToHalf(workingWeight * item.percentOfWorkSet / 100),
    reps: item.counter ?? 0,
    percent: Math.round(item.percentOfWorkSet),
  }));
}

export function getWarmupExerciseType(exercise: Exercise): WarmupExerciseType {
  if (exercise.type === ExerciseType.Isolation) return 'isolation';
  return exercise.primaryMuscles.some(muscle => MuscleGroupMuscles[MuscleGroup.Legs].includes(muscle))
    ? 'compound_lower'
    : 'compound_upper';
}

export class WarmupUseCases {
  constructor(private readonly context: WarmupContextPort) {}

  async isFirstForMuscle(workoutSessionId: string, exercise: Exercise): Promise<boolean> {
    const exercises = await this.context.getExercisesInSession(workoutSessionId);
    if (!exercises) return true;
    const index = exercises.findIndex(candidate => candidate.id === exercise.id);
    if (index <= 0) return true;
    return !exercises.slice(0, index).some(candidate =>
      candidate.primaryMuscles.some(muscle => exercise.primaryMuscles.includes(muscle)),
    );
  }

  async generateWarmup(
    workingWeight: number,
    exercise: Exercise,
    workoutSessionId?: string,
    bodyWeight?: number | null,
  ): Promise<WarmupSet[]> {
    const isFirst = workoutSessionId ? await this.isFirstForMuscle(workoutSessionId, exercise) : true;
    const resolvedBodyWeight = bodyWeight ?? (await this.context.getLatestBodyWeight())?.weight ?? null;
    const ratio = resolvedBodyWeight && resolvedBodyWeight > 0 ? workingWeight / resolvedBodyWeight : null;
    return buildWarmupScheme({
      exerciseType: getWarmupExerciseType(exercise),
      isFirst,
      bodyWeightRatio: ratio,
    }).map(spec => ({
      weight: roundToHalf(workingWeight * spec.percent / 100),
      reps: spec.reps,
      percent: spec.percent,
    }));
  }
}
