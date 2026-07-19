import type { LoadedGroup, LoadedItem } from '@/domain/activeSessionTypes';
import type { PlannedSession, PlannedSet, PlannedWorkout, WorkoutSession } from '@/domain/entities';

import type { ActiveSessionLoadingPort } from './ports';
export interface ActiveSessionData { workoutSession: WorkoutSession; plannedSession: PlannedSession | null; plannedWorkout: PlannedWorkout | null; loadedGroups: LoadedGroup[]; simpleMode: boolean; }
export class ActiveSessionLoadingUseCases {
  constructor(private readonly sessions: ActiveSessionLoadingPort) {}
  async loadActiveSessionData(id: string | null): Promise<ActiveSessionData | null> {
    if (!id) return null; const [hydrated, regulation] = await Promise.all([this.sessions.getHydratedSession(id), this.sessions.getRegulationProfile()]); if (!hydrated) return null;
    const workoutSession = hydrated.session; let plannedSession: PlannedSession | null = null; let plannedWorkout: PlannedWorkout | null = null;
    if (workoutSession.plannedSessionId) { plannedSession = await this.sessions.getPlannedSession(workoutSession.plannedSessionId) ?? null; if (plannedSession?.plannedWorkoutId) plannedWorkout = await this.sessions.getPlannedWorkout(plannedSession.plannedWorkoutId) ?? null; } else if (workoutSession.plannedWorkoutId) plannedWorkout = await this.sessions.getPlannedWorkout(workoutSession.plannedWorkoutId) ?? null;
    const groupIds = new Set<string>(); const itemIds = new Set<string>(); const setIds = new Set<string>();
    hydrated.groups.forEach(group => { if (group.group.plannedExerciseGroupId) groupIds.add(group.group.plannedExerciseGroupId); group.items.forEach(item => { if (item.item.plannedExerciseItemId) itemIds.add(item.item.plannedExerciseItemId); item.sets.forEach(set => { if (set.plannedSetId) setIds.add(set.plannedSetId); }); }); });
    const [groups, items, sets] = await Promise.all([this.sessions.getPlannedGroups([...groupIds]), this.sessions.getPlannedItems([...itemIds]), this.sessions.getPlannedSets([...setIds])]); const groupMap = new Map(groups.filter((group): group is NonNullable<typeof group> => !!group).map(group => [group.id, group])); const itemMap = new Map(items.filter((item): item is NonNullable<typeof item> => !!item).map(item => [item.id, item])); const setMap = new Map(sets.map(set => [set.id, set])); const occurrences = new Map<string, number>();
    const loadedGroups: LoadedGroup[] = hydrated.groups.map(group => ({ group: group.group, plannedGroup: group.group.plannedExerciseGroupId ? groupMap.get(group.group.plannedExerciseGroupId) : undefined, items: group.items.map(item => { const plannedSets: Record<string, PlannedSet> = {}; item.sets.forEach(set => { if (set.plannedSetId) { const planned = setMap.get(set.plannedSetId); if (planned) plannedSets[set.plannedSetId] = planned; } }); const occurrenceIndex = occurrences.get(item.item.exerciseId) ?? 0; occurrences.set(item.item.exerciseId, occurrenceIndex + 1); const loaded: LoadedItem = { item: item.item, exercise: item.exercise, plannedItem: item.item.plannedExerciseItemId ? itemMap.get(item.item.plannedExerciseItemId) : undefined, sets: item.sets, plannedSets, occurrenceIndex }; return loaded; }) }));
    return { workoutSession, plannedSession, plannedWorkout, loadedGroups, simpleMode: regulation?.simpleMode ?? false };
  }
}
