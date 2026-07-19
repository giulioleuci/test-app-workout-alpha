import type { SessionExerciseItem, SessionSet, WorkoutSession } from '@/domain/entities';
import { filterCompleted } from '@/services/logic/setStats';

import type { ExerciseHistoryPort } from './ports';

export interface HistoryEntry { session: WorkoutSession; sessionName?: string; sets: SessionSet[]; performanceStatus?: 'improving' | 'stable' | 'stagnant' | 'deteriorating' | 'insufficient_data'; }

export class ExerciseHistoryUseCases {
  constructor(private readonly history: ExerciseHistoryPort) {}

  async getGroupedHistory(exerciseId: string, currentSessionId: string, plannedExerciseItemId?: string, occurrenceIndex?: number, filterSameWorkout?: boolean): Promise<HistoryEntry[]> {
    let items: SessionExerciseItem[];
    if (plannedExerciseItemId) items = await this.history.getItemsByPlannedItem(plannedExerciseItemId);
    else if (occurrenceIndex !== undefined) {
      const all = await this.history.getItemsByExercise(exerciseId); const groups = await this.history.getGroupsByIds([...new Set(all.map(item => item.sessionExerciseGroupId))]); const groupMap = new Map(groups.map(group => [group.id, group])); const bySession = new Map<string, (SessionExerciseItem & { groupOrder: string })[]>();
      for (const item of all) { const group = groupMap.get(item.sessionExerciseGroupId); if (!group) continue; bySession.set(group.workoutSessionId, [...(bySession.get(group.workoutSessionId) ?? []), { ...item, groupOrder: group.orderIndex }]); }
      items = [...bySession.values()].map(sessionItems => sessionItems.sort((a, b) => a.groupOrder.localeCompare(b.groupOrder) || (a.orderIndex || '').localeCompare(b.orderIndex || ''))[occurrenceIndex]).filter((item): item is SessionExerciseItem => !!item);
    } else items = await this.history.getItemsByExercise(exerciseId);
    if (!items.length) return [];
    const groups = await this.history.getGroupsByIds([...new Set(items.map(item => item.sessionExerciseGroupId))]); const groupMap = new Map(groups.map(group => [group.id, group])); const sessionIds = [...new Set(groups.map(group => group.workoutSessionId))];
    const sessions = await Promise.all(sessionIds.map(id => this.history.getSession(id))); const sessionMap = new Map(sessions.filter((session): session is WorkoutSession => !!session).map(session => [session.id, session])); const planned = await Promise.all(sessions.flatMap(session => session?.plannedSessionId ? [this.history.getPlannedSession(session.plannedSessionId)] : [])); const plannedNames = new Map(planned.filter((session): session is NonNullable<typeof session> => !!session).map(session => [session.id, session.name]));
    const currentWorkoutId = sessionMap.get(currentSessionId)?.plannedWorkoutId; const valid = new Set(sessionIds.filter(id => id !== currentSessionId && (!filterSameWorkout || !currentWorkoutId || sessionMap.get(id)?.plannedWorkoutId === currentWorkoutId)));
    const setsBySession = new Map<string, SessionSet[]>();
    for (const set of filterCompleted(await this.history.getSetsByItems(items.map(item => item.id)))) { const item = items.find(candidate => candidate.id === set.sessionExerciseItemId); const sessionId = item ? groupMap.get(item.sessionExerciseGroupId)?.workoutSessionId : undefined; if (sessionId && valid.has(sessionId)) setsBySession.set(sessionId, [...(setsBySession.get(sessionId) ?? []), set]); }
    return [...setsBySession].flatMap(([id, sets]) => { const session = sessionMap.get(id); if (!session || !sets.length) return []; sets.sort((a, b) => (a.orderIndex || '').localeCompare(b.orderIndex || '')); const item = items.find(candidate => candidate.id === sets[0]?.sessionExerciseItemId); return [{ session, sessionName: session.plannedSessionId ? plannedNames.get(session.plannedSessionId) : undefined, sets, performanceStatus: item?.performanceStatus || 'insufficient_data' }]; }).sort((a, b) => b.session.startedAt.getTime() - a.session.startedAt.getTime()).slice(0, 9);
  }
}
