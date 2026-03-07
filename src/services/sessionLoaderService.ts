import { SessionRepository } from '@/db/repositories/SessionRepository';
import { UserProfileRepository } from '@/db/repositories/UserProfileRepository';
import { WorkoutPlanRepository } from '@/db/repositories/WorkoutPlanRepository';
import type { LoadedGroup, LoadedItem } from '@/domain/activeSessionTypes';
import type { WorkoutSession, PlannedSession, PlannedWorkout, PlannedSet } from '@/domain/entities';

export interface ActiveSessionData {
  workoutSession: WorkoutSession;
  plannedSession: PlannedSession | null;
  plannedWorkout: PlannedWorkout | null;
  loadedGroups: LoadedGroup[];
  simpleMode: boolean;
}

export async function loadActiveSessionData(activeSessionId: string | null): Promise<ActiveSessionData | null> {
  if (!activeSessionId) return null;

  const [hydratedSession, userRegulation] = await Promise.all([
    SessionRepository.getHydratedSession(activeSessionId),
    UserProfileRepository.getRegulationProfile(),
  ]);

  console.log('loadActiveSessionData hydratedSession', !!hydratedSession, 'userRegulation', !!userRegulation);

  if (!hydratedSession) return null;

  const ws = hydratedSession.session;
  let plannedSession = null;
  let plannedWorkout = null;

  if (ws.plannedSessionId) {
    plannedSession = await WorkoutPlanRepository.getSession(ws.plannedSessionId) ?? null;
    if (plannedSession?.plannedWorkoutId) {
      plannedWorkout = await WorkoutPlanRepository.getWorkout(plannedSession.plannedWorkoutId) ?? null;
    }
  } else if (ws.plannedWorkoutId) {
    plannedWorkout = await WorkoutPlanRepository.getWorkout(ws.plannedWorkoutId) ?? null;
  }

  const plannedGroupIds = new Set<string>();
  const plannedItemIds = new Set<string>();
  const plannedSetIds = new Set<string>();

  hydratedSession.groups.forEach(g => {
    if (g.group.plannedExerciseGroupId) plannedGroupIds.add(g.group.plannedExerciseGroupId);
    g.items.forEach(i => {
      if (i.item.plannedExerciseItemId) plannedItemIds.add(i.item.plannedExerciseItemId);
      i.sets.forEach(s => {
        if (s.plannedSetId) plannedSetIds.add(s.plannedSetId);
      });
    });
  });

  const plannedGroups = await WorkoutPlanRepository.bulkGetGroups(Array.from(plannedGroupIds));
  const plannedItems = await WorkoutPlanRepository.bulkGetItems(Array.from(plannedItemIds));
  const plannedSets = await WorkoutPlanRepository.getSetsByIds(Array.from(plannedSetIds));

  const plannedGroupMap = new Map(plannedGroups.filter(Boolean).map(g => [g.id, g]));
  const plannedItemMap = new Map(plannedItems.filter(Boolean).map(i => [i.id, i]));
  const plannedSetMap = new Map(plannedSets.filter(Boolean).map(s => [s.id, s]));

  const exerciseOccurrenceMap = new Map<string, number>();

  const loadedGroups: LoadedGroup[] = hydratedSession.groups.map(g => {
    const plannedGroup = g.group.plannedExerciseGroupId ? plannedGroupMap.get(g.group.plannedExerciseGroupId) : undefined;

    const loadedItems: LoadedItem[] = g.items.map(i => {
      const plannedItem = i.item.plannedExerciseItemId ? plannedItemMap.get(i.item.plannedExerciseItemId) : undefined;

      const itemPlannedSets: Record<string, PlannedSet> = {};
      i.sets.forEach(s => {
        if (s.plannedSetId) {
          const ps = plannedSetMap.get(s.plannedSetId);
          if (ps) itemPlannedSets[s.plannedSetId] = ps;
        }
      });

      const occurrenceIndex = exerciseOccurrenceMap.get(i.item.exerciseId) ?? 0;
      exerciseOccurrenceMap.set(i.item.exerciseId, occurrenceIndex + 1);

      return {
        item: i.item,
        exercise: i.exercise,
        plannedItem,
        sets: i.sets,
        plannedSets: itemPlannedSets,
        occurrenceIndex,
      };
    });

    return { group: g.group, plannedGroup, items: loadedItems };
  });

  return {
    workoutSession: ws,
    plannedSession,
    plannedWorkout,
    loadedGroups,
    simpleMode: userRegulation?.simpleMode ?? false,
  };
}
