import { LexoRank } from 'lexorank';

function generateTestRank(index: number) {
  let rank = LexoRank.min().between(LexoRank.middle());
  for(let i=0; i<index; i++) rank = rank.genNext();
  return rank.toString();
}



import { describe, it, expect } from 'vitest';
import { expandPlannedSets } from '@/services/setExpander';
import { ExerciseGroupType, SetType, ToFailureIndicator } from '@/domain/enums';
import { PlannedSet, SessionSet } from '@/domain/entities';

describe('setExpander', () => {
  it('should not return empty array for Cluster group with only ClusterMiniSet', () => {
    const plannedSets: PlannedSet[] = [
      {
        id: 'ps1',
        plannedExerciseItemId: 'pei1',
        setCountRange: { min: 3, max: 3 },
        countRange: { min: 2, max: 2, toFailure: ToFailureIndicator.None },
        setType: SetType.ClusterMiniSet,
        orderIndex: generateTestRank(0),
        restSecondsRange: { min: 20, max: 20, isFixed: true },
      } as PlannedSet
    ];

    const historyByType = new Map<SetType, SessionSet[]>();

    const expanded = expandPlannedSets(ExerciseGroupType.Cluster, plannedSets, historyByType);

    // Should fallback to sequential expansion if no Working sets found
    expect(expanded.length).toBe(3);
    expect(expanded[0].setType).toBe(SetType.ClusterMiniSet);
  });

  it('should expand cluster normally with Working and MiniSet', () => {
    const plannedSets: PlannedSet[] = [
      {
        id: 'ps_w',
        plannedExerciseItemId: 'pei1',
        setCountRange: { min: 2, max: 2 },
        countRange: { min: 5, max: 5 },
        setType: SetType.Working,
        orderIndex: generateTestRank(0),
      } as PlannedSet,
      {
        id: 'ps_m',
        plannedExerciseItemId: 'pei1',
        setCountRange: { min: 3, max: 3 },
        countRange: { min: 1, max: 1 },
        setType: SetType.ClusterMiniSet,
        orderIndex: generateTestRank(1),
      } as PlannedSet
    ];

    const historyByType = new Map<SetType, SessionSet[]>();

    const expanded = expandPlannedSets(ExerciseGroupType.Cluster, plannedSets, historyByType);

    // 2 Working sets, each followed by 3 mini-sets = 2 * (1 + 3) = 8 sets
    expect(expanded.length).toBe(8);
    expect(expanded[0].setType).toBe(SetType.Working);
    expect(expanded[1].setType).toBe(SetType.ClusterMiniSet);
    expect(expanded[2].setType).toBe(SetType.ClusterMiniSet);
    expect(expanded[3].setType).toBe(SetType.ClusterMiniSet);
    expect(expanded[4].setType).toBe(SetType.Working);
  });

  it('should expand sequential normally', () => {
    const plannedSets: PlannedSet[] = [
      {
        id: 'ps1',
        plannedExerciseItemId: 'pei1',
        setCountRange: { min: 3, max: 3 },
        countRange: { min: 8, max: 12 },
        setType: SetType.Working,
        orderIndex: generateTestRank(0),
      } as PlannedSet
    ];

    const expanded = expandPlannedSets(ExerciseGroupType.Standard, plannedSets, new Map());
    expect(expanded.length).toBe(3);
    expect(expanded[0].setType).toBe(SetType.Working);
  });
});
