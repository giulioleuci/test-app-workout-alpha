import type { Exercise } from '@/domain/entities';
import { Muscle, MuscleGroup, MuscleGroupMuscles } from '@/domain/enums';

import type { MuscleDeductionPort } from './ports';

export interface DeducedMuscles {
  primaryMuscles: Muscle[];
  secondaryMuscles: Muscle[];
  primaryMuscleGroups: MuscleGroup[];
  secondaryMuscleGroups: MuscleGroup[];
  muscleGroups: MuscleGroup[];
}

export const emptyDeducedMuscles = (): DeducedMuscles => ({
  primaryMuscles: [],
  secondaryMuscles: [],
  primaryMuscleGroups: [],
  secondaryMuscleGroups: [],
  muscleGroups: [],
});

export function deduceMusclesFromExercises(exercises: Exercise[]): DeducedMuscles {
  const primary = new Set<Muscle>();
  const secondary = new Set<Muscle>();
  for (const exercise of exercises) {
    (exercise.primaryMuscles ?? []).forEach(muscle => primary.add(muscle));
    (exercise.secondaryMuscles ?? []).forEach(muscle => secondary.add(muscle));
  }
  primary.forEach(muscle => secondary.delete(muscle));

  const primaryMuscleGroups: MuscleGroup[] = [];
  const secondaryMuscleGroups: MuscleGroup[] = [];
  for (const [group, muscles] of Object.entries(MuscleGroupMuscles)) {
    const muscleGroup = group as MuscleGroup;
    if (muscles.some(muscle => primary.has(muscle))) primaryMuscleGroups.push(muscleGroup);
    else if (muscles.some(muscle => secondary.has(muscle))) secondaryMuscleGroups.push(muscleGroup);
  }
  return {
    primaryMuscles: [...primary],
    secondaryMuscles: [...secondary],
    primaryMuscleGroups,
    secondaryMuscleGroups,
    muscleGroups: [...primaryMuscleGroups, ...secondaryMuscleGroups],
  };
}

export class MuscleDeductionUseCases {
  constructor(private readonly muscles: MuscleDeductionPort) {}

  async deduceSessionMuscles(sessionId: string): Promise<DeducedMuscles> {
    const groupIds = (await this.muscles.getGroupsBySession(sessionId)).map(group => group.id);
    if (groupIds.length === 0) return emptyDeducedMuscles();

    const exerciseIds = [...new Set((await this.muscles.getItemsByGroups(groupIds)).map(item => item.exerciseId))];
    if (exerciseIds.length === 0) return emptyDeducedMuscles();
    return deduceMusclesFromExercises(await this.muscles.getExercisesByIds(exerciseIds));
  }
}
