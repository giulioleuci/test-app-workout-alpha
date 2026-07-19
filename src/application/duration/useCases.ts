import type { PlannedExerciseGroup, PlannedSet, PlannedWorkout } from '@/domain/entities';
import type { ClusterSetParams, DurationRange } from '@/domain/value-objects';
import { getClusterConfig } from '@/domain/value-objects';
import {
  estimateGroupDurationFromData,
  estimateItemDurationFromData,
  estimateSessionDurationFromData,
} from '@/services/durationEstimator';

import type { DurationSessionSource, DurationWorkoutSource, DurationPort } from './ports';

const emptyDuration = (): DurationRange => ({ minSeconds: 0, maxSeconds: 0 });

interface DurationItemData {
  counterType: import('@/domain/enums').CounterType;
  sets: PlannedSet[];
  clusterParams?: ClusterSetParams;
}

function toSessionData(source: DurationSessionSource): {
  groups: PlannedExerciseGroup[];
  itemsByGroup: Record<string, DurationItemData[]>;
} {
  const groups = source.groups.map(group => group.group);
  const itemsByGroup = Object.fromEntries(source.groups.map(group => [
    group.group.id,
    group.items.map(({ item, sets }) => ({
      counterType: item.counterType,
      sets,
      clusterParams: getClusterConfig(item.modifiers),
    })),
  ]));
  return { groups, itemsByGroup };
}

function estimateWorkoutSource(source: DurationWorkoutSource): DurationRange {
  return source.sessions.reduce<DurationRange>((total, session) => {
    const { groups, itemsByGroup } = toSessionData(session);
    const duration = estimateSessionDurationFromData(groups, itemsByGroup);
    return {
      minSeconds: total.minSeconds + duration.minSeconds,
      maxSeconds: total.maxSeconds + duration.maxSeconds,
    };
  }, emptyDuration());
}

export class DurationUseCases {
  constructor(private readonly durations: DurationPort) {}

  async estimateItemDuration(itemId: string): Promise<DurationRange> {
    const source = await this.durations.getItemWithSets(itemId);
    return source
      ? estimateItemDurationFromData(source.sets, source.item.counterType, getClusterConfig(source.item.modifiers))
      : emptyDuration();
  }

  async estimateGroupDuration(groupId: string): Promise<DurationRange> {
    const source = await this.durations.getGroupWithItems(groupId);
    if (!source) return emptyDuration();
    return estimateGroupDurationFromData(source.group.groupType, source.items.map(({ item, sets }) => ({
      counterType: item.counterType,
      sets,
      clusterParams: getClusterConfig(item.modifiers),
    })));
  }

  async estimateSessionDuration(sessionId: string): Promise<DurationRange> {
    const source = await this.durations.getSessionSource(sessionId);
    if (!source) return emptyDuration();
    const { groups, itemsByGroup } = toSessionData(source);
    return estimateSessionDurationFromData(groups, itemsByGroup);
  }

  async estimateWorkoutDuration(workoutId: string): Promise<DurationRange> {
    const source = await this.durations.getWorkoutSource(workoutId);
    return source ? estimateWorkoutSource(source) : emptyDuration();
  }

  async bulkEstimateWorkoutDurations(workouts: PlannedWorkout[]): Promise<Record<string, DurationRange>> {
    if (workouts.length === 0) return {};
    return Object.fromEntries((await this.durations.getWorkoutSources(workouts)).map(source => [
      source.workout.id,
      estimateWorkoutSource(source),
    ]));
  }
}
