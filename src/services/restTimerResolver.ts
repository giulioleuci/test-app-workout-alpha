// src/services/restTimerResolver.ts

import { SetType, ExerciseGroupType } from '@/domain/enums';
import { getGroupBehavior } from '@/domain/groupBehavior';
import type { ClusterSetParams, NumericRange } from '@/domain/value-objects';

export interface RestTimerResult {
  shouldStart: boolean;
  durationSeconds: number;
}

export function resolveRestTimer(
  groupType: ExerciseGroupType,
  completedSetType: SetType,
  nextSetType: SetType | null,
  plannedRestRange: NumericRange | undefined,
  clusterParams: ClusterSetParams | null | undefined,
  autoStartEnabled: boolean,
): RestTimerResult {
  const behavior = getGroupBehavior(groupType);
  const strategy = behavior.restTimerStrategy;

  if (!autoStartEnabled || !strategy.autoStartAfterSet) {
    return { shouldStart: false, durationSeconds: 0 };
  }

  // Check specific overrides
  if (nextSetType && strategy.restOverrides) {
    const override = strategy.restOverrides.find(
      o => o.completedSetType === completedSetType && o.nextSetType === nextSetType
    );
    if (override) {
      const duration = override.restSource === 'interMiniSetRest' && clusterParams
        ? clusterParams.interMiniSetRestSeconds
        : plannedRestRange?.min ?? 90;
      return { shouldStart: true, durationSeconds: duration };
    }
  }

  // Default: use planned rest
  if (plannedRestRange) {
    const duration = plannedRestRange.min;
    return { shouldStart: duration > 0, durationSeconds: duration };
  }

  return { shouldStart: false, durationSeconds: 0 };
}
