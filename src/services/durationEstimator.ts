import type { HydratedPlannedWorkout } from '@/db/repositories/types';
import { WorkoutPlanRepository } from '@/db/repositories/WorkoutPlanRepository';
import { DEFAULT_REST_SECONDS } from '@/domain/constants';
import type { PlannedSet, PlannedExerciseGroup, PlannedWorkout } from '@/domain/entities';
import { CounterType, ExerciseGroupType, SetType } from '@/domain/enums';
import type { ClusterSetParams } from '@/domain/value-objects';
import { getClusterConfig } from '@/domain/value-objects';

import { estimateSetBlockSeconds, estimateSetExecutionSeconds, type DurationRange } from './durationCalculators';
import { computeTraversalOrder } from './traversal';

export type { DurationRange };

/** Estimate duration for an exercise item (all its set blocks) */
export async function estimateItemDuration(itemId: string): Promise<DurationRange> {
  const item = await WorkoutPlanRepository.getItem(itemId);
  if (!item) return { minSeconds: 0, maxSeconds: 0 };
  const sets = await WorkoutPlanRepository.getSetsByItem(itemId);
  const clusterParams = getClusterConfig(item.modifiers);
  return estimateItemDurationFromData(sets, item.counterType, clusterParams);
}

export function estimateItemDurationFromData(
  sets: PlannedSet[],
  counterType: CounterType,
  clusterParams?: ClusterSetParams,
): DurationRange {
  let min = 0, max = 0;
  for (const s of sets) {
    const d = estimateSetBlockSeconds(s, counterType, clusterParams);
    min += d.minSeconds;
    max += d.maxSeconds;
  }
  return { minSeconds: min, maxSeconds: max };
}

/** Estimate duration for an exercise group from its items data */
export function estimateGroupDurationFromData(
  groupType: ExerciseGroupType,
  items: { counterType: CounterType; sets: PlannedSet[]; clusterParams?: ClusterSetParams }[],
): DurationRange {
  if (items.length === 0) return { minSeconds: 0, maxSeconds: 0 };

  const minConfigs = items.map(it => ({
    blockCounts: it.sets.map(s => s.setCountRange.min)
  }));
  const maxConfigs = items.map(it => ({
    blockCounts: it.sets.map(s => s.setCountRange.max ?? s.setCountRange.min)
  }));

  const orderMin = computeTraversalOrder(groupType, minConfigs);
  const orderMax = computeTraversalOrder(groupType, maxConfigs);

  const calculateTotal = (order: TraversalStep[], isMax: boolean) => {
    let total = 0;
    for (let i = 0; i < order.length; i++) {
      const step = order[i];
      const nextStep = order[i + 1];
      const item = items[step.itemIndex];
      const set = item.sets[step.setIndex];

      if (!set) continue;

      const isCluster = item.clusterParams !== undefined;
      if (isCluster) {
        if (step.innerIndex === 0) {
          const d = estimateSetBlockSeconds(set, item.counterType, item.clusterParams);
          total += isMax ? d.maxSeconds : d.minSeconds;

          if (nextStep && (nextStep.itemIndex !== step.itemIndex || nextStep.setIndex !== step.setIndex)) {
            const restMin = set.restSecondsRange?.min ?? 0;
            const restMax = set.restSecondsRange?.max ?? restMin;
            total += isMax ? restMax : restMin;
          }
        }
        continue;
      }

      const exec = estimateSetExecutionSeconds(set, item.counterType);
      total += isMax ? exec.maxSeconds : exec.minSeconds;

      const restMin = set.restSecondsRange?.min ?? 0;
      const restMax = set.restSecondsRange?.max ?? restMin;
      const rest = isMax ? restMax : restMin;

      if (nextStep) {
        const isSameRound = step.round !== undefined && nextStep.round !== undefined && step.round === nextStep.round;
        if (!isSameRound) {
          total += rest;
        }
      }
    }
    return total;
  };

  return {
    minSeconds: calculateTotal(orderMin, false),
    maxSeconds: calculateTotal(orderMax, true),
  };
}

/** Pure in-memory session duration estimate — no DB access */
export function estimateSessionDurationFromData(
  groups: PlannedExerciseGroup[],
  itemsByGroup: Record<string, { counterType: CounterType; sets: PlannedSet[]; clusterParams?: ClusterSetParams }[]>,
): DurationRange {
  let min = 0, max = 0;
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const groupItems = itemsByGroup[group.id] || [];

    // Use the unified estimation logic
    const groupDuration = estimateGroupDurationFromData(group.groupType, groupItems);

    min += groupDuration.minSeconds;
    max += groupDuration.maxSeconds;
  }
  return { minSeconds: min, maxSeconds: max };
}

/** Estimate duration for an exercise group */
export async function estimateGroupDuration(groupId: string): Promise<DurationRange> {
  const group = await WorkoutPlanRepository.getGroup(groupId);
  if (!group) return { minSeconds: 0, maxSeconds: 0 };
  const items = await WorkoutPlanRepository.getItemsByGroup(groupId);

  const itemIds = items.map(i => i.id);
  const allSets = await WorkoutPlanRepository.getSetsByItems(itemIds);

  const setsByItem = new Map<string, PlannedSet[]>();
  for (const s of allSets) {
    if (!setsByItem.has(s.plannedExerciseItemId)) {
      setsByItem.set(s.plannedExerciseItemId, []);
    }
    setsByItem.get(s.plannedExerciseItemId)!.push(s);
  }

  // Sort sets for each item
  for (const sets of setsByItem.values()) {
    sets.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  const itemsData: { counterType: CounterType; sets: PlannedSet[]; clusterParams?: ClusterSetParams }[] = [];
  for (const item of items) {
    const sets = setsByItem.get(item.id) || [];
    itemsData.push({
      counterType: item.counterType,
      sets,
      clusterParams: getClusterConfig(item.modifiers)
    });
  }

  return estimateGroupDurationFromData(group.groupType, itemsData);
}

/** Estimate duration for a session */
export async function estimateSessionDuration(sessionId: string): Promise<DurationRange> {
  const hp = await WorkoutPlanRepository.getHydratedPlannedSession(sessionId);
  if (!hp) return { minSeconds: 0, maxSeconds: 0 };

  const groups: PlannedExerciseGroup[] = [];
  const itemsData: Record<string, { counterType: CounterType; sets: PlannedSet[]; clusterParams?: ClusterSetParams }[]> = {};

  for (const g of hp.groups) {
    groups.push(g.group);
    itemsData[g.group.id] = g.items.map(i => ({
      counterType: i.item.counterType,
      sets: i.sets,
      clusterParams: getClusterConfig(i.item.modifiers)
    }));
  }

  return estimateSessionDurationFromData(groups, itemsData);
}

/** Pure in-memory estimation for a hydrated workout */
export function estimateHydratedWorkoutDuration(hw: HydratedPlannedWorkout): DurationRange {
  let min = 0, max = 0;

  for (const s of hw.sessions) {
    const itemsData: Record<string, { counterType: CounterType; sets: PlannedSet[]; clusterParams?: ClusterSetParams }[]> = {};
    const groups: PlannedExerciseGroup[] = [];

    for (const g of s.groups) {
      groups.push(g.group);
      itemsData[g.group.id] = g.items.map(i => ({
        counterType: i.item.counterType,
        sets: i.sets,
        clusterParams: getClusterConfig(i.item.modifiers)
      }));
    }

    const sessionDuration = estimateSessionDurationFromData(groups, itemsData);
    min += sessionDuration.minSeconds;
    max += sessionDuration.maxSeconds;
  }
  return { minSeconds: min, maxSeconds: max };
}

/** Estimate duration for an entire workout program (sum of all sessions) */
export async function estimateWorkoutDuration(workoutId: string): Promise<DurationRange> {
  const hpw = await WorkoutPlanRepository.getHydratedPlannedWorkout(workoutId);
  if (!hpw) return { minSeconds: 0, maxSeconds: 0 };
  return estimateHydratedWorkoutDuration(hpw);
}

/** Estimate duration for multiple workouts using bulk fetching */
export async function bulkEstimateWorkoutDurations(workouts: PlannedWorkout[]): Promise<Record<string, DurationRange>> {
  if (workouts.length === 0) return {};

  const hydratedWorkouts = await WorkoutPlanRepository.getHydratedPlannedWorkouts(workouts);
  const results: Record<string, DurationRange> = {};

  for (const hw of hydratedWorkouts) {
    results[hw.workout.id] = estimateHydratedWorkoutDuration(hw);
  }

  return results;
}

