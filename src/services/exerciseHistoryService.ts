import { SessionRepository } from '@/db/repositories/SessionRepository';
import { WorkoutPlanRepository } from '@/db/repositories/WorkoutPlanRepository';
import type { SessionExerciseItem, SessionSet, WorkoutSession } from '@/domain/entities';
import dayjs from '@/lib/dayjs';
import type { PerformanceTrendStatus } from '@/services/ExercisePerformanceService';

export interface HistoryEntry {
  session: WorkoutSession;
  sessionName?: string;
  sets: SessionSet[];
  performanceStatus?: 'improving' | 'stable' | 'stagnant' | 'deteriorating' | 'insufficient_data';
}

export async function getGroupedHistory(
  exerciseId: string,
  currentSessionId: string,
  plannedExerciseItemId?: string,
  occurrenceIndex?: number,
  filterSameWorkout?: boolean
): Promise<HistoryEntry[]> {
  let items: SessionExerciseItem[] = [];

  if (plannedExerciseItemId) {
    items = await SessionRepository.getItemsByPlannedItem(plannedExerciseItemId);
  } else if (occurrenceIndex !== undefined) {
    const allItemsWithExercise = await SessionRepository.getItemsByExercise(exerciseId);

    const itemsBySession = new Map<string, (SessionExerciseItem & { groupOrder: string })[]>();
    const groupIds = [...new Set(allItemsWithExercise.map(item => item.sessionExerciseGroupId))];
    const groups = await SessionRepository.getGroupsByIds(groupIds);
    const groupMap = new Map(groups.filter(g => !!g).map(g => [g.id, g]));

    for (const item of allItemsWithExercise) {
      const group = groupMap.get(item.sessionExerciseGroupId);
      if (!group) continue;
      const list = itemsBySession.get(group.workoutSessionId) ?? [];
      list.push({ ...item, groupOrder: group.orderIndex });
      itemsBySession.set(group.workoutSessionId, list);
    }

    for (const [_sessId, sessItems] of itemsBySession) {
      const sorted = sessItems.sort((a, b) => {
        const aGo = a.groupOrder || '';
        const bGo = b.groupOrder || '';
        if (aGo !== bGo) return aGo.localeCompare(bGo);
        const aIo = a.orderIndex || '';
        const bIo = b.orderIndex || '';
        return aIo.localeCompare(bIo);
      });
      if (sorted[occurrenceIndex]) {
        items.push(sorted[occurrenceIndex]);
      }
    }
  } else {
    items = await SessionRepository.getItemsByExercise(exerciseId);
  }

  if (items.length === 0) return [];

  const groupIds = [...new Set(items.map(i => i.sessionExerciseGroupId))];
  const groups = await SessionRepository.getGroupsByIds(groupIds);
  const groupMap = new Map(groups.filter(g => !!g).map(g => [g.id, g]));

  const sessionIds = [...new Set(groups.map(g => g?.workoutSessionId).filter((id): id is string => !!id))];

  const sessions = await Promise.all(sessionIds.map(id => SessionRepository.getSession(id)));
  const sessionMap = new Map(sessions.filter(s => !!s).map(s => [s.id, s]));

  const plannedSessionIds = sessions.map(s => s?.plannedSessionId).filter((id): id is string => !!id);
  const plannedSessions = await Promise.all(plannedSessionIds.map(id => WorkoutPlanRepository.getSession(id)));
  const plannedSessionMap = new Map(plannedSessions.filter(ps => !!ps).map(ps => [ps.id, ps]));

  const currentSession = sessionMap.get(currentSessionId);
  const currentWorkoutId = currentSession?.plannedWorkoutId;

  let validSessionIds = sessionIds.filter(id => id !== currentSessionId);
  if (filterSameWorkout && currentWorkoutId) {
    validSessionIds = validSessionIds.filter(id => sessionMap.get(id)?.plannedWorkoutId === currentWorkoutId);
  }

  const itemIds = items.map(i => i.id);
  const allSets = await SessionRepository.getSetsByItems(itemIds);
  const completedSets = allSets.filter(s => s.isCompleted);

  const setsBySession = new Map<string, SessionSet[]>();
  for (const s of completedSets) {
    const item = items.find(i => i.id === s.sessionExerciseItemId);
    const gId = item?.sessionExerciseGroupId;
    if (!gId) continue;
    const sessId = groupMap.get(gId)?.workoutSessionId;
    if (!sessId || !validSessionIds.includes(sessId)) continue;
    const list = setsBySession.get(sessId) ?? [];
    list.push(s);
    setsBySession.set(sessId, list);
  }

  const result: HistoryEntry[] = [];
  for (const [sessId, sets] of setsBySession) {
    const session = sessionMap.get(sessId);
    if (!session || sets.length === 0) continue;
    const ps = session.plannedSessionId ? plannedSessionMap.get(session.plannedSessionId) : null;
    sets.sort((a, b) => {
      const ao = a.orderIndex || '';
      const bo = b.orderIndex || '';
      return ao.localeCompare(bo);
    });
    const firstSet = sets[0];
    const sessionItem = items.find(i => i.id === firstSet?.sessionExerciseItemId);

    result.push({
      session,
      sessionName: ps?.name,
      sets,
      performanceStatus: (sessionItem?.performanceStatus!) || 'insufficient_data',
    });
  }
  result.sort((a, b) => dayjs(b.session.startedAt).diff(dayjs(a.session.startedAt)));
  return result.slice(0, 9);
}
