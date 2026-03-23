// src/services/setExpander.ts

import type { PlannedSet, SessionSet } from '@/domain/entities';
import { SetType, ToFailureIndicator, ExerciseGroupType } from '@/domain/enums';
import { getGroupBehavior } from '@/domain/groupBehavior';

export interface ExpandedSet {
  plannedSetId: string;
  setType: SetType;
  expectedRPE: number | null;
  toFailure: ToFailureIndicator;
  // Pre-populated from history
  actualLoad: number | null;
  actualCount: number | null;
  actualToFailure: ToFailureIndicator;
}

/**
 * Expands PlannedSets into a sequence of SessionSets
 * based on the group's behavior.
 */
export function expandPlannedSets(
  groupType: ExerciseGroupType,
  plannedSets: PlannedSet[],
  historyByType: Map<SetType, SessionSet[]>,
): ExpandedSet[] {
  const behavior = getGroupBehavior(groupType);

  if (behavior.setBlockTraversal === 'cluster') {
    return expandCluster(plannedSets, historyByType);
  }

  return expandSequential(plannedSets, historyByType);
}

function expandSequential(
  plannedSets: PlannedSet[],
  historyByType: Map<SetType, SessionSet[]>,
): ExpandedSet[] {
  const expanded: ExpandedSet[] = [];

  // Identify how many PlannedSets of each type exist
  const psCountByType = new Map<SetType, number>();
  plannedSets.forEach(ps => {
    psCountByType.set(ps.setType, (psCountByType.get(ps.setType) ?? 0) + 1);
  });
  const psProcessedByType = new Map<SetType, number>();

  // Clone history map to avoid mutating input
  const historyQueue = new Map<SetType, SessionSet[]>();
  historyByType.forEach((sets, type) => historyQueue.set(type, [...sets]));

  for (const ps of plannedSets) {
    const type = ps.setType;
    const processed = psProcessedByType.get(type) ?? 0;
    psProcessedByType.set(type, processed + 1);

    const totalForType = psCountByType.get(type) ?? 0;
    const isLastOfType = processed + 1 === totalForType;

    const queue = historyQueue.get(type) ?? [];
    const min = ps.setCountRange.min;

    // Determine target count:
    // If last of type: max(min, remaining history)
    // If not last: min (consuming history as we go)
    let targetCount = min;
    if (isLastOfType) {
      targetCount = Math.max(min, queue.length);
    }

    for (let i = 0; i < targetCount; i++) {
      const historySet = queue.shift();

      expanded.push({
        plannedSetId: ps.id,
        setType: ps.setType,
        expectedRPE: ps.rpeRange?.min ?? null,
        toFailure: ps.countRange.toFailure ?? ToFailureIndicator.None,
        actualLoad: historySet?.actualLoad ?? null,
        actualCount: historySet?.actualCount ?? null,
        actualToFailure: historySet?.actualToFailure ?? ps.countRange.toFailure ?? ToFailureIndicator.None,
      });
    }
  }

  return expanded;
}

function expandCluster(
  plannedSets: PlannedSet[],
  historyByType: Map<SetType, SessionSet[]>,
): ExpandedSet[] {
  const expanded: ExpandedSet[] = [];

  // For cluster groups, find the mini-set planned set (used as reference, not as block generator)
  const miniSetPS = plannedSets.find(ps => ps.setType === SetType.ClusterMiniSet) ?? null;
  const workingSets = plannedSets.filter(ps => ps.setType === SetType.Working);

  // If no mini-set defined, OR no working sets defined, fallback to sequential
  if (!miniSetPS || workingSets.length === 0) {
    return expandSequential(plannedSets, historyByType);
  }

  for (const ps of plannedSets) {
    // Skip ClusterMiniSet — consumed as reference only
    if (ps.setType === SetType.ClusterMiniSet) continue;

    // Each Working planned set generates N blocks of (1 Working + M MiniSets)
    const blocks = ps.setCountRange.min;
    const miniSetCount = miniSetPS.setCountRange.min;

    for (let b = 0; b < blocks; b++) {
      // Working set
      expanded.push({
        plannedSetId: ps.id,
        setType: SetType.Working,
        expectedRPE: ps.rpeRange?.min ?? null,
        toFailure: ps.countRange.toFailure ?? ToFailureIndicator.None,
        actualLoad: null,
        actualCount: null,
        actualToFailure: ps.countRange.toFailure ?? ToFailureIndicator.None,
      });

      // Mini-sets
      for (let m = 0; m < miniSetCount; m++) {
        expanded.push({
          plannedSetId: miniSetPS.id,
          setType: SetType.ClusterMiniSet,
          expectedRPE: miniSetPS.rpeRange?.min ?? null,
          toFailure: miniSetPS.countRange.toFailure ?? ToFailureIndicator.None,
          actualLoad: null,
          actualCount: null,
          actualToFailure: miniSetPS.countRange.toFailure ?? ToFailureIndicator.None,
        });
      }
    }
  }

  return expanded;
}
