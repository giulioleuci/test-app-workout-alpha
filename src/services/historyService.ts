import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import { SessionRepository } from '@/db/repositories/SessionRepository';
import type { HydratedSessionGroup } from '@/db/repositories/types';
import { UserProfileRepository } from '@/db/repositories/UserProfileRepository';
import { WorkoutPlanRepository } from '@/db/repositories/WorkoutPlanRepository';
import type { WorkoutSession, PlannedWorkout, PlannedSession, SessionExerciseGroup, SessionExerciseItem, SessionSet } from '@/domain/entities';
import { ExercisePerformanceService } from '@/services/ExercisePerformanceService';

export interface EnrichedHistorySession {
  session: WorkoutSession;
  workoutName?: string;
  sessionName?: string;
  setCount: number;
  completedSets: number;
}

export interface HistoryPage {
  sessions: EnrichedHistorySession[];
  totalCount: number;
}

export interface HistoryDetail {
  session: WorkoutSession;
  groups: HydratedSessionGroup[];
  simpleMode: boolean;
  workoutName: string;
  sessionName: string;
  originalExerciseNames: Map<string, string>;
}

export async function getHistoryPage(page: number, pageSize: number): Promise<HistoryPage> {
  const count = await SessionRepository.count();

  const pagedSessions = await SessionRepository.getPagedSessions((page - 1) * pageSize, pageSize);

  if (pagedSessions.length === 0) {
    return { sessions: [], totalCount: count };
  }

  const workoutIds = [...new Set(pagedSessions.map(ws => ws.plannedWorkoutId).filter((id): id is string => !!id))];
  const sessionIds = [...new Set(pagedSessions.map(ws => ws.plannedSessionId).filter((id): id is string => !!id))];

  const incompleteSessions = pagedSessions.filter(ws => !ws.completedAt || ws.totalSets === undefined);
  const incompleteWorkoutSessionIds = incompleteSessions.map(ws => ws.id);

  const [workouts, plannedSessions, allGroups] = await Promise.all([
    Promise.all(workoutIds.map(id => WorkoutPlanRepository.getWorkout(id))),
    Promise.all(sessionIds.map(id => WorkoutPlanRepository.getSession(id))),
    incompleteWorkoutSessionIds.length > 0 ? SessionRepository.getGroupsBySessionIds(incompleteWorkoutSessionIds) : Promise.resolve([])
  ]);

  const groupIds = allGroups.map(g => g.id);
  const allItems = groupIds.length > 0
    ? await SessionRepository.getItemsByGroups(groupIds)
    : [];

  const itemIds = allItems.map(i => i.id);
  const allSets = itemIds.length > 0
    ? await SessionRepository.getSetsByItems(itemIds)
    : [];

  const validWorkouts = workouts.filter((w): w is PlannedWorkout => !!w);
  const workoutMap = new Map(validWorkouts.map(w => [w.id, w] as const));
  const validPlannedSessions = plannedSessions.filter((s): s is PlannedSession => !!s);
  const plannedSessionMap = new Map(validPlannedSessions.map(s => [s.id, s] as const));

  const groupsBySession = new Map<string, SessionExerciseGroup[]>();
  for (const g of (allGroups || [])) {
    const list = groupsBySession.get(g.workoutSessionId) ?? [];
    list.push(g);
    groupsBySession.set(g.workoutSessionId, list);
  }

  const itemsByGroup = new Map<string, SessionExerciseItem[]>();
  for (const i of allItems) {
    const list = itemsByGroup.get(i.sessionExerciseGroupId) ?? [];
    list.push(i);
    itemsByGroup.set(i.sessionExerciseGroupId, list);
  }

  const setsByItem = new Map<string, SessionSet[]>();
  for (const s of allSets) {
    const list = setsByItem.get(s.sessionExerciseItemId) ?? [];
    list.push(s);
    setsByItem.set(s.sessionExerciseItemId, list);
  }

  const enriched = pagedSessions.map(ws => {
    const workoutName = ws.plannedWorkoutId ? workoutMap.get(ws.plannedWorkoutId)?.name : undefined;
    const sessionName = ws.plannedSessionId ? plannedSessionMap.get(ws.plannedSessionId)?.name : undefined;

    let setCount = 0;
    let completedSets = 0;

    if (ws.completedAt && ws.totalSets !== undefined) {
      setCount = ws.totalSets;
      completedSets = ws.totalSets;
    } else {
      const groups = groupsBySession.get(ws.id) ?? [];
      for (const g of groups) {
        const items = itemsByGroup.get(g.id) ?? [];
        for (const item of items) {
          const sets = setsByItem.get(item.id) ?? [];
          setCount += sets.length;
          completedSets += sets.filter(s => s.isCompleted).length;
        }
      }
    }

    return { session: ws, workoutName, sessionName, setCount, completedSets };
  });

  return {
    sessions: enriched,
    totalCount: count,
  };
}

export async function getHistoryDetail(sessionId: string): Promise<HistoryDetail | null> {
  const [hydrated, profile] = await Promise.all([
    SessionRepository.getHydratedSession(sessionId),
    UserProfileRepository.getRegulationProfile(),
  ]);
  if (!hydrated) return null;

  let workoutName = '';
  let sessionName = '';

  if (hydrated.session.plannedWorkoutId) {
    const pw = await WorkoutPlanRepository.getWorkout(hydrated.session.plannedWorkoutId);
    workoutName = pw?.name ?? '';
  }
  if (hydrated.session.plannedSessionId) {
    const ps = await WorkoutPlanRepository.getSession(hydrated.session.plannedSessionId);
    sessionName = ps?.name ?? '';
  }

  const originalIds = hydrated.groups.flatMap(g =>
    g.items.filter(i => i.item.originalExerciseId).map(i => i.item.originalExerciseId!)
  );
  let originalExerciseNamesMap = new Map<string, string>();
  if (originalIds.length > 0) {
    const origExercises = await ExerciseRepository.getByIds(originalIds);
    originalExerciseNamesMap = new Map(origExercises.map(e => [e.id, e.name]));
  }

  return {
    session: hydrated.session,
    groups: hydrated.groups,
    simpleMode: profile?.simpleMode ?? false,
    workoutName,
    sessionName,
    originalExerciseNames: originalExerciseNamesMap,
  };
}

export async function deleteHistorySession(id: string): Promise<void> {
  return SessionRepository.deleteSessionCascade(id);
}

export async function updateHistorySessionMeta(id: string, updates: Partial<WorkoutSession>): Promise<number> {
  return SessionRepository.updateSession(id, updates);
}

export async function updateSessionSet(id: string, updates: Partial<SessionSet>): Promise<void> {
  await SessionRepository.updateSet(id, updates);
  const set = await SessionRepository.getSet(id);
  if (set) {
    await ExercisePerformanceService.analyzeItemOnChange(set.sessionExerciseItemId);
  }
}

export async function deleteSessionSet(id: string): Promise<void> {
  const set = await SessionRepository.getSet(id);
  await SessionRepository.deleteSet(id);
  if (set) {
    await ExercisePerformanceService.analyzeItemOnChange(set.sessionExerciseItemId);
  }
}

export async function addSessionSet(set: SessionSet): Promise<void> {
  await SessionRepository.addSets([set]);
  await ExercisePerformanceService.analyzeItemOnChange(set.sessionExerciseItemId);
}

// ===== Filtered History =====

export interface HistoryFilters {
  page: number;
  pageSize: number;
  workoutId?: string;
  exerciseId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export async function getFilteredHistory(filters: HistoryFilters): Promise<HistoryPage> {
  const { page, pageSize, workoutId, exerciseId, dateFrom, dateTo } = filters;

  let sessions: WorkoutSession[];

  // Pick the most selective query path
  if (exerciseId) {
    // Find sessions containing this exercise
    const items = await SessionRepository.getItemsByExercise(exerciseId);
    const uniqueSessionGroupIds = [...new Set(items.map(i => i.sessionExerciseGroupId))];
    if (uniqueSessionGroupIds.length === 0) {
      return { sessions: [], totalCount: 0 };
    }
    const groups = await SessionRepository.getGroupsByIds(uniqueSessionGroupIds);
    const uniqueSessionIds = [...new Set(groups.map(g => g.workoutSessionId))];
    sessions = await SessionRepository.getSessionsByIds(uniqueSessionIds);
  } else if (workoutId) {
    sessions = await SessionRepository.getSessionsByWorkout(workoutId);
  } else if (dateFrom || dateTo) {
    const from = dateFrom ?? new Date(0);
    const to = dateTo ?? new Date();
    sessions = await SessionRepository.getSessionsInDateRange(from, to);
  } else {
    // No filters — use the optimized paged path
    return getHistoryPage(page, pageSize);
  }

  // Apply remaining cross-filters
  if (sessions) {
    if (workoutId && !exerciseId) {
      // workoutId was the primary filter, no need to re-filter
    } else if (workoutId) {
      sessions = sessions.filter(s => s.plannedWorkoutId === workoutId);
    }
    if (dateFrom) {
      sessions = sessions.filter(s => s.startedAt >= dateFrom);
    }
    if (dateTo) {
      sessions = sessions.filter(s => s.startedAt <= dateTo);
    }
  } else {
    sessions = [];
  }

  // Sort by startedAt descending
  sessions.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

  const totalCount = sessions.length;

  // Paginate in memory
  const startIdx = (page - 1) * pageSize;
  const pagedSessions = sessions.slice(startIdx, startIdx + pageSize);

  if (pagedSessions.length === 0) {
    return { sessions: [], totalCount };
  }

  // Enrich paged sessions (same enrichment as getHistoryPage)
  const pwIds = [...new Set(pagedSessions.map(ws => ws.plannedWorkoutId).filter((id): id is string => !!id))];
  const psIds = [...new Set(pagedSessions.map(ws => ws.plannedSessionId).filter((id): id is string => !!id))];

  const incompleteSessions = pagedSessions.filter(ws => !ws.completedAt || ws.totalSets === undefined);
  const incompleteIds = incompleteSessions.map(ws => ws.id);

  const [workouts, plannedSessions, allGroups] = await Promise.all([
    Promise.all(pwIds.map(id => WorkoutPlanRepository.getWorkout(id))),
    Promise.all(psIds.map(id => WorkoutPlanRepository.getSession(id))),
    incompleteIds.length > 0 ? SessionRepository.getGroupsBySessionIds(incompleteIds) : Promise.resolve([]),
  ]);

  const groupIds = (allGroups || []).map(g => g.id);
  const allItems = groupIds.length > 0 ? await SessionRepository.getItemsByGroups(groupIds) : [];
  const itemIds = allItems.map(i => i.id);
  const allSets = itemIds.length > 0 ? await SessionRepository.getSetsByItems(itemIds) : [];

  const validWorkouts = workouts.filter((w): w is PlannedWorkout => !!w);
  const workoutMap = new Map(validWorkouts.map(w => [w.id, w] as const));
  const validPlannedSessions = plannedSessions.filter((s): s is PlannedSession => !!s);
  const plannedSessionMap = new Map(validPlannedSessions.map(s => [s.id, s] as const));

  const groupsBySession = new Map<string, SessionExerciseGroup[]>();
  for (const g of (allGroups || [])) {
    const list = groupsBySession.get(g.workoutSessionId) ?? [];
    list.push(g);
    groupsBySession.set(g.workoutSessionId, list);
  }

  const itemsByGroup = new Map<string, SessionExerciseItem[]>();
  for (const i of allItems) {
    const list = itemsByGroup.get(i.sessionExerciseGroupId) ?? [];
    list.push(i);
    itemsByGroup.set(i.sessionExerciseGroupId, list);
  }

  const setsByItem = new Map<string, SessionSet[]>();
  for (const s of allSets) {
    const list = setsByItem.get(s.sessionExerciseItemId) ?? [];
    list.push(s);
    setsByItem.set(s.sessionExerciseItemId, list);
  }

  const enriched = pagedSessions.map(ws => {
    const workoutName = ws.plannedWorkoutId ? workoutMap.get(ws.plannedWorkoutId)?.name : undefined;
    const sessionName = ws.plannedSessionId ? plannedSessionMap.get(ws.plannedSessionId)?.name : undefined;

    let setCount = 0;
    let completedSets = 0;

    if (ws.completedAt && ws.totalSets !== undefined) {
      setCount = ws.totalSets;
      completedSets = ws.totalSets;
    } else {
      const groups = groupsBySession.get(ws.id) ?? [];
      for (const g of groups) {
        const items = itemsByGroup.get(g.id) ?? [];
        for (const item of items) {
          const sets = setsByItem.get(item.id) ?? [];
          setCount += sets.length;
          completedSets += sets.filter(s => s.isCompleted).length;
        }
      }
    }

    return { session: ws, workoutName, sessionName, setCount, completedSets };
  });

  return { sessions: enriched, totalCount };
}
