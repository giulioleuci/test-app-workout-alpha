import type { PlannedSet, PlannedExerciseGroup } from '@/domain/entities';
import { CounterType, ExerciseGroupType } from '@/domain/enums';
import type { ClusterSetParams } from '@/domain/value-objects';

import { estimateSetBlockSeconds, estimateSetExecutionSeconds, type DurationRange } from './durationCalculators';
import { computeTraversalOrder, type TraversalStep } from './traversal';

export type { DurationRange };

export function estimateItemDurationFromData(
  sets: PlannedSet[],
  counterType: CounterType,
  clusterParams?: ClusterSetParams,
): DurationRange {
  let min = 0;
  let max = 0;
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
  let min = 0;
  let max = 0;
  for (const group of groups) {
    const groupItems = itemsByGroup[group.id] || [];

    // Use the unified estimation logic
    const groupDuration = estimateGroupDurationFromData(group.groupType, groupItems);

    min += groupDuration.minSeconds;
    max += groupDuration.maxSeconds;
  }
  return { minSeconds: min, maxSeconds: max };
}
