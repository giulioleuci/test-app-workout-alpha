import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import { WorkoutPlanRepository } from '@/db/repositories/WorkoutPlanRepository';
import type { Exercise } from '@/domain/entities';
import { Muscle, MuscleGroup, MuscleGroupMuscles } from '@/domain/enums';

export interface DeducedMuscles {
  primaryMuscles: Muscle[];
  secondaryMuscles: Muscle[];
  muscleGroups: MuscleGroup[];
}

/** Deduce all muscles involved in a session from its exercise items */
export async function deduceSessionMuscles(sessionId: string): Promise<DeducedMuscles> {
  const groups = await WorkoutPlanRepository.getGroupsBySession(sessionId);
  const groupIds = groups.map(g => g.id);

  if (groupIds.length === 0) return { primaryMuscles: [], secondaryMuscles: [], muscleGroups: [] };

  // This might be slow if we loop.
  // I can use Promise.all.
  const itemsArray = await Promise.all(groups.map(g => WorkoutPlanRepository.getItemsByGroup(g.id)));
  const items = itemsArray.flat();

  const exerciseIds = [...new Set(items.map(i => i.exerciseId))];

  if (exerciseIds.length === 0) return { primaryMuscles: [], secondaryMuscles: [], muscleGroups: [] };

  const exercises = await ExerciseRepository.getByIds(exerciseIds);

  return deduceMusclesFromExercises(exercises);
}

/** Deduce muscles from a list of exercises */
export function deduceMusclesFromExercises(exercises: Exercise[]): DeducedMuscles {
  const primarySet = new Set<Muscle>();
  const secondarySet = new Set<Muscle>();

  for (const ex of exercises) {
    if (!ex) continue;
    (ex.primaryMuscles ?? []).forEach(m => primarySet.add(m));
    (ex.secondaryMuscles ?? []).forEach(m => secondarySet.add(m));
  }

  // Remove from secondary any that are already primary
  primarySet.forEach(m => secondarySet.delete(m));

  const allMuscles = new Set([...primarySet, ...secondarySet]);
  const muscleGroups: MuscleGroup[] = [];

  for (const [group, muscles] of Object.entries(MuscleGroupMuscles)) {
    if (muscles.some(m => allMuscles.has(m))) {
      muscleGroups.push(group as MuscleGroup);
    }
  }

  return {
    primaryMuscles: [...primarySet],
    secondaryMuscles: [...secondarySet],
    muscleGroups,
  };
}
