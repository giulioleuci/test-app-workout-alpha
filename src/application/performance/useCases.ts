import type { SessionSet } from '@/domain/entities';
import { filterEffective, totalVolume } from '@/services/logic/setStats';
import { calculateXRM } from '@/services/oneRepMaxEstimator';

import { classifyPerformance, type PerformanceChange, type PerformanceTrendStatus } from './trendPolicy';

import type { PerformanceEstimatePort, PerformancePort } from './ports';

export type { PerformanceChange, PerformanceTrendStatus } from './trendPolicy';

export interface PerformanceAnalysis {
  status: PerformanceTrendStatus;
  history: SessionStats[];
  change?: PerformanceChange;
  estimatedRecords?: {
    rm5: number;
    rm10: number;
    rm12: number;
  };
}

export interface SessionStats {
  sessionId: string;
  completedAt: Date;
  totalSets: number;
  totalReps: number;
  totalLoad: number;
}

export class PerformanceUseCases {
  constructor(
    private readonly performance: PerformancePort,
    private readonly estimates: PerformanceEstimatePort,
  ) {}

  async analyzeExercisePerformance(
    exerciseId: string,
    currentSessionId: string,
  ): Promise<PerformanceAnalysis | null> {
    const currentSession = await this.performance.getSession(currentSessionId);
    if (!currentSession) return null;

    const currentStats = await this.getSessionExerciseStats(
      currentSessionId,
      exerciseId,
      currentSession.completedAt ?? new Date(),
    );

    const historyItems = await this.performance.getItemsByExercise(exerciseId, {
      toDate: currentSession.startedAt,
      desc: true,
      limit: 50,
    });
    const groupIds = Array.from(new Set(historyItems.map(item => item.sessionExerciseGroupId)));
    const groups = await this.performance.getGroupsByIds(groupIds);
    const groupsMap = new Map(groups.map(group => [group.id, group]));
    const sessionIds = Array.from(new Set(groups.map(group => group.workoutSessionId)));
    const sessions = await this.performance.getSessionsByIds(sessionIds);
    const sessionsMap = new Map(sessions.map(session => [session.id, session]));

    const targetSessionIds: string[] = [];
    const processedSessions = new Set<string>();
    const itemsBySession = new Map<string, typeof historyItems>();
    for (const item of historyItems) {
      const group = groupsMap.get(item.sessionExerciseGroupId);
      if (!group) continue;
      const sessionId = group.workoutSessionId;
      const items = itemsBySession.get(sessionId) ?? [];
      items.push(item);
      itemsBySession.set(sessionId, items);
    }

    for (const item of historyItems) {
      if (targetSessionIds.length >= 3) break;
      const group = groupsMap.get(item.sessionExerciseGroupId);
      if (!group) continue;
      const sessionId = group.workoutSessionId;
      if (sessionId === currentSessionId || processedSessions.has(sessionId)) continue;
      const session = sessionsMap.get(sessionId);
      if (!session?.completedAt) continue;
      if (currentSession.plannedSessionId && session.plannedSessionId !== currentSession.plannedSessionId) continue;
      processedSessions.add(sessionId);
      targetSessionIds.push(sessionId);
    }

    const targetItems = targetSessionIds.flatMap(sessionId => itemsBySession.get(sessionId) ?? []);
    const targetSets = await this.performance.getSetsByItems(targetItems.map(item => item.id));
    const setsByItem = new Map<string, typeof targetSets>();
    for (const set of targetSets) {
      const sets = setsByItem.get(set.sessionExerciseItemId) ?? [];
      sets.push(set);
      setsByItem.set(set.sessionExerciseItemId, sets);
    }

    const history: SessionStats[] = [];
    for (const sessionId of targetSessionIds) {
      const session = sessionsMap.get(sessionId)!;
      const stats = this.calculateStats(
        sessionId,
        session.completedAt!,
        (itemsBySession.get(sessionId) ?? []).flatMap(item => setsByItem.get(item.id) ?? []),
      );
      if (stats.totalSets > 0) history.push(stats);
    }

    const estimatedRecords = await this.calculateEstimatedRecords(exerciseId);
    const trend = classifyPerformance(currentStats, history);
    return {
      status: trend.status,
      history: [currentStats, ...history],
      ...(trend.change ? { change: trend.change } : {}),
      ...(estimatedRecords ? { estimatedRecords } : {}),
    };
  }

  private async getSessionExerciseStats(
    sessionId: string,
    exerciseId: string,
    completedAt: Date,
  ): Promise<SessionStats> {
    const { items, sets } = await this.performance.getSessionEntities([sessionId]);
    const exerciseItemIds = new Set(items.filter(item => item.exerciseId === exerciseId).map(item => item.id));
    return this.calculateStats(sessionId, completedAt, sets.filter(set => exerciseItemIds.has(set.sessionExerciseItemId)));
  }

  private calculateStats(sessionId: string, completedAt: Date, sets: SessionSet[]): SessionStats {
    const completedSets = filterEffective(sets);
    return {
      sessionId,
      completedAt,
      totalSets: completedSets.length,
      totalReps: completedSets.reduce((total, set) => total + (set.actualCount ?? 0), 0),
      totalLoad: totalVolume(completedSets),
    };
  }

  private async calculateEstimatedRecords(exerciseId: string): Promise<PerformanceAnalysis['estimatedRecords']> {
    const e1RM = await this.estimates.estimateFromHistoryForExercise(exerciseId);
    if (!e1RM) return undefined;
    const rm5 = calculateXRM(e1RM, 5);
    const rm10 = calculateXRM(e1RM, 10);
    const rm12 = calculateXRM(e1RM, 12);
    return rm5 && rm10 && rm12 ? { rm5, rm10, rm12 } : undefined;
  }
}
