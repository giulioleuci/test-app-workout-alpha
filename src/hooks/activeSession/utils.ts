import type { SetInputValue } from '@/domain/activeSessionTypes';
import type { LoadedGroup, LoadedItem } from '@/domain/activeSessionTypes';
import type { SessionSet, PlannedSet } from '@/domain/entities';
import { ExerciseGroupType } from '@/domain/enums';
import { getGroupBehavior } from '@/domain/groupBehavior';


export interface Screen {
  /** Item indices (into lg.items) for this screen */
  itemIndices: number[];
}
export function isInterleaved(groupType: ExerciseGroupType): boolean {
  return getGroupBehavior(groupType).exerciseTraversal === 'interleaved';
}

export function isCluster(groupType: ExerciseGroupType): boolean {
  return getGroupBehavior(groupType).setBlockTraversal === 'cluster';
}

export function rendersAsGroupUnit(groupType: ExerciseGroupType, itemCount: number): boolean {
  const b = getGroupBehavior(groupType);
  const isGroupUnit = b.exerciseTraversal === 'interleaved' || b.setBlockTraversal === 'cluster';
  return isGroupUnit && (b.exerciseTraversal === 'interleaved' ? itemCount > 1 : true);
}

/** For interleaved groups, compute max rounds = max sets across items */
export function getMaxRounds(items: LoadedItem[]): number {
  return Math.max(1, ...items.map(i => i.sets.length));
}

export function isItemCompleted(item: LoadedItem): boolean {
  return item.sets.every(s => s.isCompleted || s.isSkipped);
}

export function isGroupCompleted(group: LoadedGroup): boolean {
  return group.items.every(isItemCompleted);
}

export function getInitialSetValues(set: SessionSet, item: LoadedItem, si: number): SetInputValue {
  const ps = set.plannedSetId ? item.plannedSets[set.plannedSetId] : undefined;
  const prev = si > 0 ? item.sets[si - 1] : null;
  return {
    actualLoad: set.actualLoad ?? prev?.actualLoad ?? ps?.loadRange?.min ?? 0,
    actualCount: set.actualCount ?? prev?.actualCount ?? ps?.countRange.min ?? 0,
    actualRPE: set.actualRPE,
    actualToFailure: set.actualToFailure,
    partials: set.partials,
    forcedReps: set.forcedReps,
    notes: set.notes ?? '',
  };
}

export function buildScreens(items: LoadedItem[], roundIndex: number): Screen[] {
  const screens: Screen[] = [];
  let currentScreen: number[] = [];

  for (let i = 0; i < items.length; i++) {
    currentScreen.push(i);

    const item = items[i];
    const set = item.sets[roundIndex];
    const plannedSet: PlannedSet | undefined = set?.plannedSetId ? item.plannedSets[set.plannedSetId] : undefined;
    const rest = plannedSet?.restSecondsRange;

    const isNoRest = !rest ||
      (rest.min === 0 && (rest.max === 0 || rest.max === null || rest.max === undefined));

    const isLast = i === items.length - 1;
    if (!isNoRest || isLast) {
      screens.push({ itemIndices: [...currentScreen] });
      currentScreen = [];
    }
  }

  return screens;
}

export function isSetDone(item: LoadedItem, roundIndex: number) {
  const s = item.sets[roundIndex];
  return s?.isCompleted || s?.isSkipped;
}
