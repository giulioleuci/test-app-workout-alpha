import type { SessionSet } from '@/domain/entities';
import { filterEffective, setVolume } from '@/services/logic/setStats';

import type { ExercisePerformancePort } from './ports';

export type PerformanceTrendStatus = 'improving' | 'stable' | 'stagnant' | 'deteriorating' | 'insufficient_data';

export function compareExercisePerformance(currentSets: SessionSet[], previousSets: SessionSet[], previousStatus?: PerformanceTrendStatus, hasRangeConstraint = false): PerformanceTrendStatus {
  const current = filterEffective(currentSets); const previous = filterEffective(previousSets);
  if (!current.length || !previous.length) return 'insufficient_data';
  const metrics = (sets: SessionSet[]) => sets.reduce((total, set) => ({ sets: total.sets + 1, reps: total.reps + (set.actualCount ?? 0), volume: total.volume + setVolume(set), rpe: total.rpe + (set.actualRPE ?? 0) }), { sets: 0, reps: 0, volume: 0, rpe: 0 });
  const now = metrics(current); const then = metrics(previous); const ds = now.sets - then.sets; const dr = now.reps - then.reps; const dv = now.volume - then.volume; const df = now.rpe - then.rpe; const stable = ds === 0 && dr === 0 && dv === 0;
  if ((ds >= 0 && dr >= 0 && dv >= 0 && (ds > 0 || dr > 0 || dv > 0)) || (stable && df < 0)) return 'improving';
  if ((ds <= 0 && dr <= 0 && dv <= 0 && (ds < 0 || dr < 0 || dv < 0)) || (stable && df > 0)) return 'deteriorating';
  return stable && hasRangeConstraint && (previousStatus === 'stable' || previousStatus === 'stagnant') ? 'stagnant' : 'stable';
}

export class ExercisePerformanceUseCases {
  constructor(private readonly performance: ExercisePerformancePort) {}
  private updateItem(id: string, status: PerformanceTrendStatus, hasRangeConstraint: boolean) { return this.performance.updateItem(id, { performanceStatus: status, hasRangeConstraint }); }
  async analyzeSession(id: string): Promise<void> {
    const hydrated = await this.performance.getHydratedSession(id);
    if (!hydrated?.session.plannedWorkoutId || !hydrated.session.plannedSessionId || !hydrated.session.completedAt) { for (const group of hydrated?.groups ?? []) for (const item of group.items) await this.updateItem(item.item.id, 'insufficient_data', false); return; }
    const current = hydrated.session; const candidates = await this.performance.findPreviousSessions(current.plannedWorkoutId, current.plannedSessionId, current.completedAt); const previous = candidates.length ? (await this.performance.getHydratedSessions(candidates))[0] : undefined;
    for (const group of hydrated.groups) for (const hydratedItem of group.items) {
      const item = hydratedItem.item; const plannedSets = item.plannedExerciseItemId ? await this.performance.getPlannedSets(item.plannedExerciseItemId) : [];
      const constrained = plannedSets.some(set => (set.setCountRange.min !== set.setCountRange.max) || (set.countRange.min !== set.countRange.max) || (set.loadRange && set.loadRange.min !== set.loadRange.max) || (set.rpeRange && set.rpeRange.min !== set.rpeRange.max));
      const occurrence = group.items.filter(candidate => candidate.item.orderIndex < item.orderIndex).filter(candidate => candidate.item.exerciseId === item.exerciseId || candidate.item.originalExerciseId === item.exerciseId).length;
      const previousGroup = previous?.groups.find(candidate => candidate.group.orderIndex === group.group.orderIndex);
      const matches = previousGroup?.items.filter(candidate => candidate.item.exerciseId === item.exerciseId || candidate.item.originalExerciseId === item.exerciseId || (!!item.originalExerciseId && (candidate.item.exerciseId === item.originalExerciseId || candidate.item.originalExerciseId === item.originalExerciseId))) ?? [];
      const previousItem = matches[occurrence];
      await this.updateItem(item.id, compareExercisePerformance(hydratedItem.sets, previousItem?.sets ?? [], previousItem?.item.performanceStatus, constrained), constrained);
    }
  }
  async analyzeItemOnChange(itemId: string): Promise<void> { const item = await this.performance.getItem(itemId); if (!item) return; const group = await this.performance.getGroup(item.sessionExerciseGroupId); if (!group) return; const session = await this.performance.getSession(group.workoutSessionId); if (!session?.completedAt || !session.plannedWorkoutId || !session.plannedSessionId) return this.updateItem(itemId, 'insufficient_data', false); return this.analyzeSession(session.id); }
}
