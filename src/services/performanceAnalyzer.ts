import { SessionRepository } from '@/db/repositories/SessionRepository';
import { estimateFromHistoryForExercise, calculateXRM } from '@/services/oneRepMaxEstimator';

export type PerformanceTrendStatus = 'improving' | 'stable' | 'stagnant' | 'deteriorating' | 'insufficient_data';

export interface PerformanceChange {
  sets: number;      // S
  reps: number;      // R
  load: number;      // C (Tonnage)
}

export interface PerformanceAnalysis {
  status: PerformanceTrendStatus;
  history: {
    sessionId: string;
    completedAt: Date;
    totalSets: number;
    totalReps: number;
    totalLoad: number;
  }[];
  change?: PerformanceChange;
  estimatedRecords?: {
    rm5: number;
    rm10: number;
    rm12: number;
  };
}

interface SessionStats {
  sessionId: string;
  completedAt: Date;
  totalSets: number;
  totalReps: number;
  totalLoad: number;
}

export async function analyzeExercisePerformance(
  exerciseId: string,
  currentSessionId: string
): Promise<PerformanceAnalysis | null> {
  const currentSession = await SessionRepository.getSession(currentSessionId);
  if (!currentSession) return null;

  // 1. Get stats for the current session
  const currentStats = await getSessionExerciseStats(currentSessionId, exerciseId, currentSession.completedAt ?? new Date());

  // 2. Find historical sessions using the new index on items
  // We want sessions that contain this exercise, completed before currentSession.startedAt
  // Limit to reasonable amount (e.g. 50 recent items) to batch fetch, assuming density < 15 items/session
  const historyItems = await SessionRepository.getItemsByExercise(exerciseId, {
    toDate: currentSession.startedAt,
    desc: true,
    limit: 50
  });

  const groupIds = Array.from(new Set(historyItems.map(i => i.sessionExerciseGroupId)));
  const groups = await SessionRepository.getGroupsByIds(groupIds);
  const groupsMap = new Map(groups.map(g => [g.id, g]));

  const sessionIds = Array.from(new Set(groups.map(g => g.workoutSessionId)));
  const sessions = await SessionRepository.getSessionsByIds(sessionIds);
  const sessionsMap = new Map(sessions.map(s => [s.id, s]));

  const historyStats: SessionStats[] = [];
  const processedSessions = new Set<string>();
  const targetSessionIds: string[] = [];

  // Group items by session
  const itemsBySession = new Map<string, typeof historyItems>();
  for (const item of historyItems) {
    const group = groupsMap.get(item.sessionExerciseGroupId);
    if (!group) continue;

    const sid = group.workoutSessionId;
    if (!itemsBySession.has(sid)) itemsBySession.set(sid, []);
    itemsBySession.get(sid)!.push(item);
  }

  // Find target sessions (up to 3)
  for (const item of historyItems) {
    if (targetSessionIds.length >= 3) break;
    
    const group = groupsMap.get(item.sessionExerciseGroupId);
    if (!group) continue;

    const sid = group.workoutSessionId;
    if (sid === currentSessionId || processedSessions.has(sid)) continue;
    
    const session = sessionsMap.get(sid);
    if (!session?.completedAt) continue;

    // Must match plannedSessionId if required
    if (currentSession.plannedSessionId && session.plannedSessionId !== currentSession.plannedSessionId) {
      continue;
    }

    processedSessions.add(sid);
    targetSessionIds.push(sid);
  }

  // Batch fetch sets for target items
  const targetItems = targetSessionIds.flatMap(sid => itemsBySession.get(sid) ?? []);
  const targetItemIds = targetItems.map(i => i.id);
  const targetSets = await SessionRepository.getSetsByItems(targetItemIds);

  const setsByItem = new Map<string, typeof targetSets>();
  for (const s of targetSets) {
    if (!setsByItem.has(s.sessionExerciseItemId)) setsByItem.set(s.sessionExerciseItemId, []);
    setsByItem.get(s.sessionExerciseItemId)!.push(s);
  }

  // Calculate stats per session
  for (const sid of targetSessionIds) {
    const session = sessionsMap.get(sid)!;
    const items = itemsBySession.get(sid) ?? [];

    let totalSets = 0;
    let totalReps = 0;
    let totalLoad = 0;

    for (const item of items) {
      const sets = setsByItem.get(item.id) ?? [];
      const completed = sets.filter(s => s.isCompleted && !s.isSkipped);

      totalSets += completed.length;
      totalReps += completed.reduce((acc, s) => acc + (s.actualCount ?? 0), 0);
      totalLoad += completed.reduce((acc, s) => acc + ((s.actualCount ?? 0) * (s.actualLoad ?? 0)), 0);
    }

    if (totalSets > 0) {
      historyStats.push({
        sessionId: sid,
        completedAt: session.completedAt!,
        totalSets,
        totalReps,
        totalLoad,
      });
    }
  }

  if (historyStats.length === 0) {
    return {
      status: 'insufficient_data',
      history: [currentStats],
      estimatedRecords: await calculateEstimatedRecords(exerciseId),
    };
  }

  // 4. Calculate Change (Current vs Last Historical)
  const last = historyStats[0];
  const change: PerformanceChange = {
    sets: currentStats.totalSets - last.totalSets,
    reps: currentStats.totalReps - last.totalReps,
    load: currentStats.totalLoad - last.totalLoad,
  };

  // 5. Determine Status
  let status: PerformanceTrendStatus = 'insufficient_data';

  // Check Improving
  // Logic: "If S>0 or R>0 or C>0 (and others >= 0)"
  const isImproving = (
    (change.sets > 0 || change.reps > 0 || change.load > 0) &&
    (change.sets >= 0 && change.reps >= 0 && change.load >= 0)
  );

  // Check Deteriorating
  // Logic: "If S<0 or R<0 or C<0 (and others <= 0)"
  const isDeteriorating = (
    (change.sets < 0 || change.reps < 0 || change.load < 0) &&
    (change.sets <= 0 && change.reps <= 0 && change.load <= 0)
  );

  if (isImproving) {
    status = 'improving';
  } else if (isDeteriorating) {
    status = 'deteriorating';
  } else {
    // Check Stability/Stagnation (All zeros)
    const isZeroChange = change.sets === 0 && change.reps === 0 && change.load === 0;

    if (isZeroChange) {
      // Check deeper history for Stagnant (3 sessions flat) vs Stable (2 sessions flat)
      let consecutiveFlat = 2; // We have Current and Last equal

      if (historyStats.length >= 2) {
        const h0 = historyStats[0];
        const h1 = historyStats[1];
        if (h0.totalSets === h1.totalSets && h0.totalReps === h1.totalReps && h0.totalLoad === h1.totalLoad) {
          consecutiveFlat = 3;
        }
      }

      if (consecutiveFlat >= 3) {
        status = 'stagnant';
      } else {
        status = 'stable';
      }
    } else {
      // Mixed results -> default to stable
      status = 'stable';
    }
  }

  return {
    status,
    history: [currentStats, ...historyStats],
    change,
    estimatedRecords: await calculateEstimatedRecords(exerciseId),
  };
}

async function calculateEstimatedRecords(exerciseId: string) {
  const e1RM = await estimateFromHistoryForExercise(exerciseId);
  if (!e1RM) return undefined;

  const rm5 = calculateXRM(e1RM, 5);
  const rm10 = calculateXRM(e1RM, 10);
  const rm12 = calculateXRM(e1RM, 12);

  if (!rm5 || !rm10 || !rm12) return undefined;

  return { rm5, rm10, rm12 };
}

async function getSessionExerciseStats(sessionId: string, exerciseId: string, date: Date): Promise<SessionStats> {
  // Get all items for this exercise in this session
  const groups = await SessionRepository.getGroupsBySession(sessionId);
  const groupIds = groups.map(g => g.id);

  const items = await SessionRepository.getItemsByGroups(groupIds);
  const exerciseItems = items.filter(i => i.exerciseId === exerciseId);
  const itemIds = exerciseItems.map(i => i.id);

  const sets = await SessionRepository.getSetsByItems(itemIds);

  const completedSets = sets.filter(s => s.isCompleted && !s.isSkipped);

  const totalSets = completedSets.length;
  const totalReps = completedSets.reduce((acc, s) => acc + (s.actualCount ?? 0), 0);
  const totalLoad = completedSets.reduce((acc, s) => acc + ((s.actualCount ?? 0) * (s.actualLoad ?? 0)), 0);

  return {
    sessionId,
    completedAt: date,
    totalSets,
    totalReps,
    totalLoad,
  };
}
