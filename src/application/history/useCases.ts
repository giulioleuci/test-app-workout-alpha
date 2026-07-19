import type { SessionExerciseGroup, SessionExerciseItem, SessionSet, WorkoutSession } from '@/domain/entities';
import { filterCompleted } from '@/services/logic/setStats';

import type { HistoryPort, HydratedHistoryGroup } from './ports';

export interface EnrichedHistorySession { session: WorkoutSession; workoutName?: string; sessionName?: string; setCount: number; completedSets: number; }
export interface HistoryPage { sessions: EnrichedHistorySession[]; totalCount: number; }
export interface HistoryDetail { session: WorkoutSession; groups: HydratedHistoryGroup[]; simpleMode: boolean; workoutName: string; sessionName: string; originalExerciseNames: Map<string, string>; }
export interface HistoryFilters { page: number; pageSize: number; workoutId?: string; exerciseId?: string; dateFrom?: Date; dateTo?: Date; }

export class HistoryUseCases {
  constructor(private readonly history: HistoryPort) {}

  private async enrich(sessions: WorkoutSession[], totalCount: number): Promise<HistoryPage> {
    if (!sessions.length) return { sessions: [], totalCount };
    const workoutIds = [...new Set(sessions.map(s => s.plannedWorkoutId).filter((id): id is string => !!id))];
    const plannedIds = [...new Set(sessions.map(s => s.plannedSessionId).filter((id): id is string => !!id))];
    const incomplete = sessions.filter(s => !s.completedAt || s.totalSets === undefined).map(s => s.id);
    const [workouts, plans, entities] = await Promise.all([
      Promise.all(workoutIds.map(id => this.history.getWorkout(id))),
      Promise.all(plannedIds.map(id => this.history.getPlannedSession(id))),
      this.history.getSessionEntities(incomplete),
    ]);
    const workoutNames = new Map(workouts.filter((w): w is NonNullable<typeof w> => !!w).map(w => [w.id, w.name]));
    const planNames = new Map(plans.filter((p): p is NonNullable<typeof p> => !!p).map(p => [p.id, p.name]));
    const groups = new Map<string, SessionExerciseGroup[]>(); const items = new Map<string, SessionExerciseItem[]>(); const sets = new Map<string, SessionSet[]>();
    for (const group of entities.groups ?? []) groups.set(group.workoutSessionId, [...(groups.get(group.workoutSessionId) ?? []), group]);
    for (const item of entities.items) items.set(item.sessionExerciseGroupId, [...(items.get(item.sessionExerciseGroupId) ?? []), item]);
    for (const set of entities.sets) sets.set(set.sessionExerciseItemId, [...(sets.get(set.sessionExerciseItemId) ?? []), set]);
    return { totalCount, sessions: sessions.map(session => {
      if (session.completedAt && session.totalSets !== undefined) return { session, workoutName: session.plannedWorkoutId ? workoutNames.get(session.plannedWorkoutId) : undefined, sessionName: session.plannedSessionId ? planNames.get(session.plannedSessionId) : undefined, setCount: session.totalSets, completedSets: session.totalSets };
      let setCount = 0; let completedSets = 0;
      for (const group of groups.get(session.id) ?? []) for (const item of items.get(group.id) ?? []) { const itemSets = sets.get(item.id) ?? []; setCount += itemSets.length; completedSets += filterCompleted(itemSets).length; }
      return { session, workoutName: session.plannedWorkoutId ? workoutNames.get(session.plannedWorkoutId) : undefined, sessionName: session.plannedSessionId ? planNames.get(session.plannedSessionId) : undefined, setCount, completedSets };
    }) };
  }

  async getHistoryPage(page: number, pageSize: number): Promise<HistoryPage> { const total = await this.history.countSessions(); return this.enrich(await this.history.getPagedSessions((page - 1) * pageSize, pageSize), total); }
  async getHistoryDetail(id: string): Promise<HistoryDetail | null> {
    const [hydrated, profile] = await Promise.all([this.history.getHydratedSession(id), this.history.getRegulationProfile()]); if (!hydrated) return null;
    const [workout, planned] = await Promise.all([hydrated.session.plannedWorkoutId ? this.history.getWorkout(hydrated.session.plannedWorkoutId) : undefined, hydrated.session.plannedSessionId ? this.history.getPlannedSession(hydrated.session.plannedSessionId) : undefined]);
    const originalIds = hydrated.groups.flatMap(group => group.items.flatMap(item => item.item.originalExerciseId ? [item.item.originalExerciseId] : []));
    const originals = originalIds.length ? await this.history.getExercisesByIds(originalIds) : [];
    return { session: hydrated.session, groups: hydrated.groups, simpleMode: profile?.simpleMode ?? false, workoutName: workout?.name ?? '', sessionName: planned?.name ?? '', originalExerciseNames: new Map(originals.map(exercise => [exercise.id, exercise.name])) };
  }
  deleteHistorySession(id: string) { return this.history.deleteSessionCascade(id); }
  updateHistorySessionMeta(id: string, updates: Partial<WorkoutSession>) { return this.history.updateSession(id, updates); }
  async updateSessionSet(id: string, updates: Partial<SessionSet>) { await this.history.updateSet(id, updates); const set = await this.history.getSet(id); if (set) await this.history.analyzeItemOnChange(set.sessionExerciseItemId); }
  async deleteSessionSet(id: string) { const set = await this.history.getSet(id); await this.history.deleteSet(id); if (set) await this.history.analyzeItemOnChange(set.sessionExerciseItemId); }
  async addSessionSet(set: SessionSet) { await this.history.addSets([set]); await this.history.analyzeItemOnChange(set.sessionExerciseItemId); }
  addSessionExerciseGroup(group: SessionExerciseGroup, items: SessionExerciseItem[], sets: SessionSet[]) { return this.history.addGroupWithItemsAndSets(group, items, sets); }
  deleteSessionExerciseItemCascade(itemId: string, groupId: string) { return this.history.deleteItemCascade(itemId, groupId); }
  updateSessionExerciseItem(itemId: string, updates: Partial<SessionExerciseItem>) { return this.history.updateItem(itemId, updates); }
  async getFilteredHistory(filters: HistoryFilters): Promise<HistoryPage> {
    const { page, pageSize, workoutId, exerciseId, dateFrom, dateTo } = filters; let sessions: WorkoutSession[];
    if (exerciseId) { const items = await this.history.getItemsByExercise(exerciseId); const groupIds = [...new Set(items.map(item => item.sessionExerciseGroupId))]; if (!groupIds.length) return { sessions: [], totalCount: 0 }; sessions = await this.history.getSessionsByIds([...new Set((await this.history.getGroupsByIds(groupIds)).map(group => group.workoutSessionId))]); }
    else if (workoutId) sessions = await this.history.getSessionsByWorkout(workoutId);
    else if (dateFrom || dateTo) sessions = await this.history.getSessionsInDateRange(dateFrom ?? new Date(0), dateTo ?? new Date());
    else return this.getHistoryPage(page, pageSize);
    if (workoutId && exerciseId) sessions = sessions.filter(session => session.plannedWorkoutId === workoutId); if (dateFrom) sessions = sessions.filter(session => session.startedAt >= dateFrom); if (dateTo) sessions = sessions.filter(session => session.startedAt <= dateTo);
    sessions.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime()); const total = sessions.length; return this.enrich(sessions.slice((page - 1) * pageSize, page * pageSize), total);
  }
}
