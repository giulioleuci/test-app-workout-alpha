import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import { SessionRepository } from '@/db/repositories/SessionRepository';
import { CounterType } from '@/domain/enums';
import { profileService } from '@/services/profileService';
import { calculateWeighted1RM } from '@/services/rpePercentageTable';
import { ExercisePerformanceService } from '@/services/ExercisePerformanceService';

/**
 * Cleans up empty exercises (0 completed sets) and empty groups,
 * then marks the session as completed with the given completedAt date.
 */
export async function finishSession(sessionId: string, completedAt: Date): Promise<void> {
  const groups = await SessionRepository.getGroupsBySession(sessionId);
  const latestWeightRecord = await profileService.getLatestBodyWeight();
  const bodyWeight = latestWeightRecord?.weight;

  let totalSets = 0;
  let totalLoad = 0;
  let totalReps = 0;
  let totalDuration = 0;
  const primaryMuscles = new Set<string>();
  const secondaryMuscles = new Set<string>();

  for (const group of groups) {
    const groupItems = await SessionRepository.getItemsByGroup(group.id);

    for (const item of groupItems) {
      const sets = await SessionRepository.getSetsByItem(item.id);

      const completedSets = sets.filter(s => s.isCompleted);

      if (completedSets.length === 0) {
        // Delete item and its sets
        await SessionRepository.deleteSetsByItem(item.id);
        await SessionRepository.deleteItem(item.id);
      } else {
        // Fetch and link current exercise version
        const exerciseId = item.exerciseId;
        const currentVersion = await ExerciseRepository.getLatestVersion(exerciseId);

        let itemCounterType = CounterType.Reps;

        if (currentVersion) {
          currentVersion.primaryMuscles.forEach(m => primaryMuscles.add(m as string));
          currentVersion.secondaryMuscles.forEach(m => secondaryMuscles.add(m as string));
          itemCounterType = currentVersion.counterType as CounterType;
        }

        const counterType = itemCounterType;

        for (const set of completedSets) {
          if (set.actualLoad != null && set.actualLoad > 0 &&
            set.actualCount != null && set.actualCount > 0 &&
            set.actualRPE != null && set.actualRPE > 0) {
            const estResult = calculateWeighted1RM(set.actualLoad, set.actualCount, set.actualRPE);
            const estimated = estResult.media;
            if (estimated && estimated > 0) {
              set.e1rm = estimated;
              if (bodyWeight && bodyWeight > 0) {
                set.relativeIntensity = Math.round((estimated / bodyWeight) * 100) / 100;
              }
            }
          }
          if (set.e1rm || set.relativeIntensity) {
            await SessionRepository.updateSet(set.id, {
              e1rm: set.e1rm,
              relativeIntensity: set.relativeIntensity
            });
          }

          totalSets += 1;
          const actualCount = set.actualCount ?? 0;
          const actualLoad = set.actualLoad ?? 0;

          if (counterType === CounterType.Seconds || counterType === CounterType.Minutes) {
            totalDuration += (counterType === CounterType.Minutes) ? actualCount * 60 : actualCount;
          } else if (counterType === CounterType.Reps) {
            totalReps += actualCount;
            totalLoad += actualCount * actualLoad;
          }
        }

        // Populate completedAt and version link for the item
        await SessionRepository.updateItem(item.id, {
          completedAt,
          isCompleted: true,
          exerciseVersionId: currentVersion?.id,
        });
      }
    }

    // Check if group has remaining items
    const remainingItems = await SessionRepository.getItemsByGroup(group.id);
    if (remainingItems.length === 0) {
      await SessionRepository.deleteGroup(group.id);
    } else {
      // Populate completedAt for the group
      await SessionRepository.updateGroup(group.id, { completedAt, isCompleted: true });
    }
  }

  await SessionRepository.updateSession(sessionId, {
    totalSets,
    totalLoad: Math.round(totalLoad),
    totalReps,
    totalDuration,
    primaryMusclesSnapshot: Array.from(primaryMuscles) as any[],
    secondaryMusclesSnapshot: Array.from(secondaryMuscles) as any[],
  });

  await SessionRepository.completeSession(sessionId, completedAt);
  await ExercisePerformanceService.analyzeSession(sessionId);
}

/**
 * Completely discards a session and all its data.
 */
export async function discardSession(sessionId: string): Promise<void> {
  await SessionRepository.deleteSessionCascade(sessionId);
}
