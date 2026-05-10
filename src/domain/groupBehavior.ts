// src/domain/groupBehavior.ts

import { ExerciseGroupType, SetType } from './enums';

/**
 * Exercise execution order within the group.
 * - 'sequential': all sets of one exercise, then all sets of the next (A1,A2,A3 → B1,B2,B3)
 * - 'interleaved': one set of each exercise in a row, rest, repeat (A1→B1→A2→B2→A3→B3)
 */
export type ExerciseTraversalOrder = 'sequential' | 'interleaved';

/**
 * Set block execution order within an exercise.
 * - 'sequential': all sets of one block, then all sets of the next
 * - 'cluster': 1 Working set + N MiniSets repeated for all sets of the main block
 */
export type SetBlockTraversalOrder = 'sequential' | 'cluster';

export interface RestTimerStrategy {
  /** If true, rest timer auto-starts after each completed set */
  autoStartAfterSet: boolean;
  /**
   * Rest overrides for specific set type transitions.
   * Example: for cluster, after mini-set → interMiniSetRestSeconds.
   */
  restOverrides?: {
    /** Type of the set just completed */
    completedSetType: SetType;
    /** Type of the next set */
    nextSetType: SetType;
    /** Where to source the rest duration ('interMiniSetRest' | 'plannedRest') */
    restSource: 'interMiniSetRest' | 'plannedRest';
  }[];
}

export interface GroupBehaviorDescriptor {
  /** Group type this descriptor applies to */
  groupType: ExerciseGroupType;

  /** How exercises are traversed within the group */
  exerciseTraversal: ExerciseTraversalOrder;

  /** How set blocks are traversed within a single exercise */
  setBlockTraversal: SetBlockTraversalOrder;

  /** If true, the group requires exactly 1 exercise (e.g. Cluster) */
  singleExerciseOnly: boolean;

  /** If true, completion is tracked per "round" rather than per individual set */
  roundBasedCompletion: boolean;

  /** Rest timer strategy */
  restTimerStrategy: RestTimerStrategy;

}

export const GROUP_BEHAVIOR_REGISTRY: Record<ExerciseGroupType, GroupBehaviorDescriptor> = {
  [ExerciseGroupType.Standard]: {
    groupType: ExerciseGroupType.Standard,
    exerciseTraversal: 'sequential',
    setBlockTraversal: 'sequential',
    singleExerciseOnly: false,
    roundBasedCompletion: false,
    restTimerStrategy: { autoStartAfterSet: true },
  },
  [ExerciseGroupType.Warmup]: {
    groupType: ExerciseGroupType.Warmup,
    exerciseTraversal: 'sequential',
    setBlockTraversal: 'sequential',
    singleExerciseOnly: false,
    roundBasedCompletion: false,
    restTimerStrategy: { autoStartAfterSet: true },
  },
  [ExerciseGroupType.Superset]: {
    groupType: ExerciseGroupType.Superset,
    exerciseTraversal: 'interleaved',
    setBlockTraversal: 'sequential',
    singleExerciseOnly: false,
    roundBasedCompletion: true,
    restTimerStrategy: { autoStartAfterSet: true },
  },
  [ExerciseGroupType.Circuit]: {
    groupType: ExerciseGroupType.Circuit,
    exerciseTraversal: 'interleaved',
    setBlockTraversal: 'sequential',
    singleExerciseOnly: false,
    roundBasedCompletion: true,
    restTimerStrategy: { autoStartAfterSet: true },
  },
  [ExerciseGroupType.Amrap]: {
    groupType: ExerciseGroupType.Amrap,
    exerciseTraversal: 'interleaved',
    setBlockTraversal: 'sequential',
    singleExerciseOnly: false,
    roundBasedCompletion: true,
    restTimerStrategy: { autoStartAfterSet: true },
  },
  [ExerciseGroupType.Emom]: {
    groupType: ExerciseGroupType.Emom,
    exerciseTraversal: 'interleaved',
    setBlockTraversal: 'sequential',
    singleExerciseOnly: false,
    roundBasedCompletion: true,
    restTimerStrategy: { autoStartAfterSet: true },
  },
  [ExerciseGroupType.Cluster]: {
    groupType: ExerciseGroupType.Cluster,
    exerciseTraversal: 'sequential',
    setBlockTraversal: 'cluster',
    singleExerciseOnly: true,
    roundBasedCompletion: false,
    restTimerStrategy: {
      autoStartAfterSet: true,
      restOverrides: [
        {
          completedSetType: SetType.ClusterMiniSet,
          nextSetType: SetType.ClusterMiniSet,
          restSource: 'interMiniSetRest',
        },
        {
          completedSetType: SetType.Working,
          nextSetType: SetType.ClusterMiniSet,
          restSource: 'interMiniSetRest',
        },
        {
          completedSetType: SetType.ClusterMiniSet,
          nextSetType: SetType.Working,
          restSource: 'plannedRest',
        },
      ],
    },
  },
};

/** Helper to get the descriptor for a given groupType */
export function getGroupBehavior(groupType: ExerciseGroupType): GroupBehaviorDescriptor {
  return GROUP_BEHAVIOR_REGISTRY[groupType];
}
