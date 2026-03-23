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
  round?: number; // round for interleaved groups
}

export function computeTraversalOrder(
  groupType: ExerciseGroupType,
  itemSetCounts: number[], // number of sets per item
): TraversalStep[] {
  const behavior = getGroupBehavior(groupType);

  if (behavior.exerciseTraversal === 'interleaved' && itemSetCounts.length > 1) {
    // Round-robin
    const maxSets = Math.max(0, ...itemSetCounts);
    const steps: TraversalStep[] = [];
    for (let round = 0; round < maxSets; round++) {
      for (let ii = 0; ii < itemSetCounts.length; ii++) {
        if (round < itemSetCounts[ii]) {
          steps.push({ itemIndex: ii, setIndex: round, round });
        }
      }
    }
    return steps;
  }

  // Sequential
  const steps: TraversalStep[] = [];
  for (let ii = 0; ii < itemSetCounts.length; ii++) {
    for (let si = 0; si < itemSetCounts[ii]; si++) {
      steps.push({ itemIndex: ii, setIndex: si });
    }
  }
  return steps;
}
