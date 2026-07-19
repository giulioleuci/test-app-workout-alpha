// src/services/traversal.ts

import type { ExerciseGroupType } from '@/domain/enums';
import { getGroupBehavior } from '@/domain/groupBehavior';

/**
 * Given a group with its exercises and sets, produces the execution order
 * as a flat list of coordinates { itemIndex, setIndex }.
 */
export interface TraversalStep {
  itemIndex: number;
  setIndex: number;
  innerIndex: number;
  round?: number; // round for interleaved groups
}

export interface ItemTraversalConfig {
  blockCounts: number[];
}

export function computeTraversalOrder(
  groupType: ExerciseGroupType,
  itemConfigs: ItemTraversalConfig[],
): TraversalStep[] {
  const behavior = getGroupBehavior(groupType);

  const unrolledItems = itemConfigs.map(config => {
    const sets: { blockIndex: number; innerIndex: number }[] = [];
    config.blockCounts.forEach((count, bIdx) => {
      for (let i = 0; i < count; i++) {
        sets.push({ blockIndex: bIdx, innerIndex: i });
      }
    });
    return sets;
  });

  if (behavior.exerciseTraversal === 'interleaved' && unrolledItems.length > 1) {
    // Round-robin
    const maxSets = Math.max(0, ...unrolledItems.map(u => u.length));
    const steps: TraversalStep[] = [];
    for (let round = 0; round < maxSets; round++) {
      for (let ii = 0; ii < unrolledItems.length; ii++) {
        if (round < unrolledItems[ii].length) {
          const { blockIndex, innerIndex } = unrolledItems[ii][round];
          steps.push({ itemIndex: ii, setIndex: blockIndex, innerIndex, round });
        }
      }
    }
    return steps;
  }

  // Sequential
  const steps: TraversalStep[] = [];
  for (let ii = 0; ii < unrolledItems.length; ii++) {
    for (const { blockIndex, innerIndex } of unrolledItems[ii]) {
      steps.push({ itemIndex: ii, setIndex: blockIndex, innerIndex });
    }
  }
  return steps;
}
