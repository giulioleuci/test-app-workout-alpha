import type { HydratedPlannedWorkout } from '@/db/repositories/types';
import { WorkoutPlanRepository } from '@/db/repositories/WorkoutPlanRepository';
import type { PlannedSet, PlannedExerciseGroup, PlannedWorkout } from '@/domain/entities';
import { CounterType, ExerciseGroupType, SetType } from '@/domain/enums';
import type { ClusterSetParams } from '@/domain/value-objects';
import { getClusterConfig } from '@/domain/value-objects';
import dayjs from '@/lib/dayjs';

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

  const itemSetCounts = items.map(it => it.sets.length);
  const order = computeTraversalOrder(groupType, itemSetCounts);

  let totalMin = 0;
  let totalMax = 0;

  for (let i = 0; i < order.length; i++) {
    const step = order[i];
    const nextStep = order[i + 1];
    const item = items[step.itemIndex];
    const set = item.sets[step.setIndex];

    if (!set) continue;

    // IF it's a cluster, we should be careful not to double count.
    const isCluster = items[0].clusterParams !== undefined;

    if (isCluster) {
      // In Cluster, we only count the Working sets as blocks. The MiniSets are internal to the block.
      if (set.setType === SetType.Working) {
        const d = estimateSetBlockSeconds(set, item.counterType, item.clusterParams);
        totalMin += d.minSeconds;
        totalMax += d.maxSeconds;
      }
      // ClusterMiniSet planned sets are ignored here because they are consumed inside Working set's estimateSetBlockSeconds
      continue;
    }

    const exec = estimateSetExecutionSeconds(set, item.counterType);
    const setsCountMin = set.setCountRange.min;
    const setsCountMax = set.setCountRange.max ?? setsCountMin;

    totalMin += setsCountMin * exec.minSeconds;
    totalMax += setsCountMax * exec.maxSeconds;

    // Add rest between sets/exercises
    const restMin = set.restSecondsRange?.min ?? 90;
    const restMax = set.restSecondsRange?.max ?? restMin;

    if (nextStep) {
      const isSameRound = step.round !== undefined && nextStep.round !== undefined && step.round === nextStep.round;
      if (isSameRound) {
        totalMin += 5; // transition
        totalMax += 5;
      } else {
        totalMin += Math.max(0, setsCountMin - 1) * restMin + restMin;
        totalMax += Math.max(0, setsCountMax - 1) * restMax + restMax;
      }
    } else {
      totalMin += Math.max(0, setsCountMin - 1) * restMin;
      totalMax += Math.max(0, setsCountMax - 1) * restMax;
    }
  }

  return { minSeconds: totalMin, maxSeconds: totalMax };
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
    if (i < groups.length - 1) {
      min += 10;
      max += 10;
    }
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

/** Format a DurationRange to a human-readable string */
export function formatDurationRange(d: DurationRange): string {
  const fmtMin = formatSeconds(d.minSeconds);
  const fmtMax = formatSeconds(d.maxSeconds);
  if (fmtMin === fmtMax) return fmtMin;
  return `${fmtMin} – ${fmtMax}`;
}

function formatSeconds(s: number): string {
  const dur = dayjs.duration(s, 'seconds');
  if (s < 60) return `${Math.round(s)}s`;
  const mins = Math.round(s / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(dur.asHours());
  const m = dur.minutes();
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}
