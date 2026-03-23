import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import { SessionRepository } from '@/db/repositories/SessionRepository';
import { UserProfileRepository } from '@/db/repositories/UserProfileRepository';
import type { Exercise, WarmupSetConfiguration } from '@/domain/entities';
import { ExerciseType, MuscleGroup, MuscleGroupMuscles } from '@/domain/enums';
import { roundToHalf } from '@/lib/math';

export type WarmupExerciseType = "compound_upper" | "compound_lower" | "isolation";

export interface WarmupSet {
  weight: number;
  reps: number;
  percent: number;
}

/**
 * Rounds weight to the nearest 0.5kg
 */


/**
 * Calculates user-defined warmup sets based on configuration
 */
export function calculateUserWarmup(
  workingWeight: number,
  config: WarmupSetConfiguration[]
): WarmupSet[] {
  return config.map(item => {
    const percentage = item.percentOfWorkSet / 100;
    return {
      weight: roundToHalf(workingWeight * percentage),
      reps: item.counter ?? 0,
      percent: Math.round(item.percentOfWorkSet)
    };
  });
}

/**
 * Determines the warm-up exercise type based on the exercise domain model
 */
export function getWarmupExerciseType(exercise: Exercise): WarmupExerciseType {
  if (exercise.type === ExerciseType.Isolation) return "isolation";

  const isLower = exercise.primaryMuscles.some(m =>
    MuscleGroupMuscles[MuscleGroup.Legs].includes(m)
  );

  return isLower ? "compound_lower" : "compound_upper";
}

/**
 * Checks if the given exercise is the first one in the session to target any of its primary muscles
 */
export async function isFirstForMuscle(workoutSessionId: string, exerciseId: string): Promise<boolean> {
  // Get the current session
  const session = await SessionRepository.getSession(workoutSessionId);
  if (!session) return true;

  // Get the current exercise
  const exercise = await ExerciseRepository.getById(exerciseId);
  if (!exercise) return true;

  const primaryMuscles = exercise.primaryMuscles;

  // Get all items in this session
  const groups = await SessionRepository.getGroupsBySession(workoutSessionId);
  const groupIds = groups.map(g => g.id);

  // Note: getItemsByGroups already sorts by orderIndex
  const allItems = await SessionRepository.getItemsByGroups(groupIds);

  // Find the current item's index
  const currentItemIndex = allItems.findIndex(item => item.exerciseId === exerciseId);
  if (currentItemIndex <= 0) return true;

  // Items before the current one
  const previousItems = allItems.slice(0, currentItemIndex);
  const previousExerciseIds = [...new Set(previousItems.map(i => i.exerciseId))];

  if (previousExerciseIds.length === 0) return true;

  // Get all exercises performed before
  const previousExercises = await ExerciseRepository.getByIds(previousExerciseIds);

  // Check if any previous exercise shares a primary muscle
  for (const prevEx of previousExercises) {
    if (prevEx.primaryMuscles.some(m => primaryMuscles.includes(m))) {
      return false;
    }
  }

  return true;
}

/**
 * Implements the requested warm-up generation algorithm
 */
export async function generateWarmup(
  workingWeight: number,
  exercise: Exercise,
  workoutSessionId?: string,
  bodyWeight?: number | null
): Promise<WarmupSet[]> {
  const exerciseType = getWarmupExerciseType(exercise);
  
  // Determine if it's the first exercise for the muscle
  let isFirst = true;
  if (workoutSessionId) {
    isFirst = await isFirstForMuscle(workoutSessionId, exercise.id);
  }

  // Fetch body weight if not provided
  let bw = bodyWeight;
  if (bw === undefined || bw === null) {
    const latestBW = await UserProfileRepository.getLatestBodyWeight();
    bw = latestBW ? latestBW.weight : null;
  }

  let highStress = false;
  let mediumStress = false;

  // STRESS CLASSIFICATION
  if (exerciseType !== "isolation") {
    if (bw !== null && bw > 0) {
      const ratio = workingWeight / bw;

      if (exerciseType === "compound_upper") {
        if (ratio >= 1.0) {
          highStress = true;
        } else if (ratio >= 0.5) {
          mediumStress = true;
        }
      } else if (exerciseType === "compound_lower") {
        if (ratio >= 1.25) {
          highStress = true;
        } else if (ratio >= 0.75) {
          mediumStress = true;
        }
      }
    } else {
      // Conservative fallback if BW is missing
      highStress = true;
    }
  }

  // BUILD WARM-UP SCHEME
  let warmupScheme: [number, number][] = [];

  if (exerciseType === "isolation") {
    if (isFirst) {
      warmupScheme = [
        [0.60, 8],
        [0.80, 3]
      ];
    } else {
      warmupScheme = [
        [0.60, 8]
      ];
    }
  } else { // compound movements
    if (highStress) {
      warmupScheme = [
        [0.50, 6],
        [0.70, 4],
        [0.85, 2]
      ];
    } else if (mediumStress) {
      warmupScheme = [
        [0.60, 5],
        [0.80, 3]
      ];
    } else {
      warmupScheme = [
        [0.65, 5]
      ];
    }

    // Reduce warm-up volume if not first exercise for that muscle
    if (!isFirst && warmupScheme.length > 1) {
      warmupScheme.shift(); // Remove first element
    }
  }

  // CONVERT PERCENTAGES TO REAL WEIGHTS
  return warmupScheme.map(([percentage, reps]) => ({
    weight: roundToHalf(workingWeight * percentage),
    reps,
    percent: Math.round(percentage * 100)
  }));
}
