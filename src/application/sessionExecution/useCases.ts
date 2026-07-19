import { nanoid } from 'nanoid';

import type { WarmupSet } from '@/application/warmups';
import type { CurrentTarget, LoadedGroup, SessionFeedback } from '@/domain/activeSessionTypes';
import type { FatigueAnalysisResult, SetComplianceResult } from '@/domain/analytics-types';
import type { SessionSet } from '@/domain/entities';
import { ExerciseGroupType, SetType, ToFailureIndicator } from '@/domain/enums';
import { getClusterConfig } from '@/domain/value-objects';
import { getInitialRank, getRankBetween } from '@/lib/lexorank';
import { analyzeSetCompliance } from '@/services/complianceAnalyzer';
import { analyzeFatigueProgression } from '@/services/fatigueAnalyzer';
import { computeSetEstimates, filterCompleted, filterPending } from '@/services/logic/setStats';
import { resolveRestTimer } from '@/services/restTimerResolver';

import type { SessionExecutionPersistencePort, SessionFinishingPort, SessionMutationPort, UnresolvedSet } from './ports';

export interface SessionExecutionResult { feedback: SessionFeedback | null; restDuration?: number }

export class SessionExecutionUseCases {
  constructor(
    private readonly persistence: SessionExecutionPersistencePort,
    private readonly mutations: SessionMutationPort,
    private readonly finishing: SessionFinishingPort,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private async bodyWeight() { return (await this.persistence.getLatestBodyWeight())?.weight; }
  private static resetChanges(): Partial<SessionSet> { return { isCompleted: false, isSkipped: false, completedAt: undefined, complianceStatus: undefined, fatigueProgressionStatus: undefined, plannedVsActual: undefined }; }
  private async completeLoadedSet(set: SessionSet, item: LoadedGroup['items'][number], index: number, updates: Partial<SessionSet>, bodyWeight: number | undefined): Promise<{ feedback: SessionFeedback | null }> {
    const extras = computeSetEstimates(updates.actualLoad, updates.actualCount, updates.actualRPE, bodyWeight);
    const completedSet = { ...set, ...updates, ...extras, isCompleted: true, completedAt: this.now() } as SessionSet;
    await this.persistence.updateSet(set.id, completedSet);
    const plannedSet = set.plannedSetId ? item.plannedSets[set.plannedSetId] : undefined;
    if (!plannedSet) return { feedback: null };
    const compliance = analyzeSetCompliance(completedSet, plannedSet);
    await this.persistence.updateSet(set.id, { complianceStatus: compliance.overall, plannedVsActual: { countDeviation: compliance.count?.deviation ?? undefined, loadDeviation: compliance.load?.deviation ?? undefined, rpeDeviation: compliance.rpe?.deviation ?? undefined } });
    const completedForItem = filterCompleted(item.sets.map((candidate, candidateIndex) => candidateIndex === index ? completedSet : candidate));
    const fatigue = analyzeFatigueProgression(completedForItem, completedForItem.length - 1, plannedSet.fatigueProgressionProfile, plannedSet.rpeRange?.min);
    await this.persistence.updateSet(set.id, { fatigueProgressionStatus: fatigue.status });
    return { feedback: { compliance, fatigue, forItemId: item.item.id } };
  }

  async completeSet(setId: string, updates: Partial<SessionSet>, current: CurrentTarget | null): Promise<SessionExecutionResult> {
    const bodyWeight = await this.bodyWeight();
    const extras = computeSetEstimates(updates.actualLoad, updates.actualCount, updates.actualRPE, bodyWeight);
    if (!current || current.set.id !== setId) {
      await this.persistence.updateSet(setId, { ...updates, ...extras, isCompleted: true, completedAt: this.now() });
      return { feedback: null };
    }
    const completedSet = { ...current.set, ...updates, ...extras, isCompleted: true, completedAt: this.now() } as SessionSet;
    await this.persistence.updateSet(setId, { ...updates, ...extras, isCompleted: true, completedAt: completedSet.completedAt });
    const plannedSet = current.set.plannedSetId ? current.item.plannedSets[current.set.plannedSetId] : undefined;
    let compliance: SetComplianceResult | null = null; let fatigue: FatigueAnalysisResult | null = null;
    if (plannedSet) {
      compliance = analyzeSetCompliance(completedSet, plannedSet);
      await this.persistence.updateSet(setId, { complianceStatus: compliance.overall, plannedVsActual: { countDeviation: compliance.count?.deviation ?? undefined, loadDeviation: compliance.load?.deviation ?? undefined, rpeDeviation: compliance.rpe?.deviation ?? undefined } });
      const completedForItem = filterCompleted(current.item.sets.map((candidate, index) => index === current.si ? completedSet : candidate));
      fatigue = analyzeFatigueProgression(completedForItem, completedForItem.length - 1, plannedSet.fatigueProgressionProfile, plannedSet.rpeRange?.min);
      await this.persistence.updateSet(setId, { fatigueProgressionStatus: fatigue.status });
    }
    const rest = resolveRestTimer(current.group.group.groupType, completedSet.setType, current.item.sets[current.si + 1]?.setType ?? null, plannedSet?.restSecondsRange, getClusterConfig(current.item.plannedItem?.modifiers), (await this.persistence.getAutoStartRestTimer()) ?? true);
    return { feedback: compliance || fatigue ? { compliance, fatigue, forItemId: current.item.item.id } : null, restDuration: rest.shouldStart ? rest.durationSeconds : undefined };
  }
  async skipSet(setId: string) { await this.persistence.updateSet(setId, { isSkipped: true }); }
  async skipRemainingSets(current: CurrentTarget) { await this.skipPending(current.item.sets.slice(current.si)); }
  private async skipPending(sets: SessionSet[]) { const updates = filterPending(sets).map(set => ({ key: set.id, changes: { isSkipped: true } })); if (updates.length) await this.persistence.bulkUpdateSets(updates); }
  async addSet(itemId: string) { const sets = await this.persistence.getSetsByItem(itemId); const last = sets.at(-1); await this.persistence.addSets([{ id: nanoid(), sessionExerciseItemId: itemId, plannedSetId: last?.plannedSetId, setType: last?.setType ?? SetType.Working, orderIndex: last ? getRankBetween(last.orderIndex, null) : getInitialRank(), actualLoad: null, actualCount: null, actualRPE: null, actualToFailure: ToFailureIndicator.None, expectedRPE: last?.expectedRPE ?? null, isCompleted: false, isSkipped: false, partials: false, forcedReps: 0 }]); }
  async addWarmupSets(itemId: string, warmups: WarmupSet[]) { const first = (await this.persistence.getSetsByItem(itemId))[0]; let next: string | null = first?.orderIndex ?? null; const ranks: string[] = []; warmups.forEach(() => { const rank = getRankBetween(null, next); ranks.unshift(rank); next = rank; }); await this.persistence.addSets(warmups.map((warmup, index) => ({ id: nanoid(), sessionExerciseItemId: itemId, plannedSetId: undefined, setType: SetType.Warmup, orderIndex: ranks[index], actualLoad: warmup.weight, actualCount: warmup.reps, actualRPE: null, actualToFailure: ToFailureIndicator.None, expectedRPE: null, isCompleted: false, isSkipped: false, partials: false, forcedReps: 0, notes: `Warmup ${warmup.percent}%` }))); }
  async uncompleteSet(setId: string) { await this.persistence.updateSet(setId, SessionExecutionUseCases.resetChanges()); }
  async uncompleteLastSet(itemId: string) { const last = [...await this.persistence.getSetsByItem(itemId)].reverse().find(set => set.isCompleted); if (last) await this.uncompleteSet(last.id); }
  async uncompleteLastRound(group: LoadedGroup) { const updates = group.items.flatMap(item => { const last = [...item.sets].reverse().find(set => set.isCompleted); return last ? [{ key: last.id, changes: SessionExecutionUseCases.resetChanges() }] : []; }); if (updates.length) await this.persistence.bulkUpdateSets(updates); }
  async completeRound(group: LoadedGroup, round: number, data: Record<string, Partial<SessionSet>>): Promise<SessionExecutionResult> {
    const bodyWeight = await this.bodyWeight(); const items = group.items.filter(item => item.sets[round]); let feedback: SessionFeedback | null = null;
    await this.persistence.transaction(async () => { for (let i = 0; i < items.length; i++) { const item = items[i]; const set = item.sets[round]; const updates = data[set.id]; if (!updates) continue; const result = await this.completeLoadedSet(set, item, round, updates, bodyWeight); if (i === items.length - 1) feedback = result.feedback; } });
    const last = items.at(-1); if (!last) return { feedback }; const lastSet = last.sets[round]; const planned = lastSet.plannedSetId ? last.plannedSets[lastSet.plannedSetId] : undefined; const next = group.items[0]?.sets[round + 1]; const rest = resolveRestTimer(group.group.groupType, lastSet.setType, next?.setType ?? null, planned?.restSecondsRange, getClusterConfig(last.plannedItem?.modifiers), (await this.persistence.getAutoStartRestTimer()) ?? true); return { feedback, restDuration: rest.shouldStart ? rest.durationSeconds : undefined };
  }
  async completeScreen(group: LoadedGroup, round: number, indices: number[], data: Record<string, Partial<SessionSet>>, isLastScreen: boolean): Promise<SessionExecutionResult> {
    const bodyWeight = await this.bodyWeight(); let feedback: SessionFeedback | null = null;
    await this.persistence.transaction(async () => { for (let i = 0; i < indices.length; i++) { const item = group.items[indices[i]]; const set = item?.sets[round]; const updates = set && data[set.id]; if (!item || !set || !updates) continue; const result = await this.completeLoadedSet(set, item, round, updates, bodyWeight); if (i === indices.length - 1) feedback = result.feedback; } });
    const last = group.items[indices.at(-1) ?? -1]; if (!last) return { feedback }; if (isLastScreen) { const between = group.plannedGroup?.restBetweenRoundsSeconds; return { feedback, restDuration: (await this.persistence.getAutoStartRestTimer()) !== false && between && between > 0 && group.items.some(item => item.sets[round + 1]) ? between : undefined }; } const set = last.sets[round]; const planned = set?.plannedSetId ? last.plannedSets[set.plannedSetId] : undefined; const rest = resolveRestTimer(group.group.groupType, set?.setType ?? SetType.Working, null, planned?.restSecondsRange, getClusterConfig(last.plannedItem?.modifiers), (await this.persistence.getAutoStartRestTimer()) ?? true); return { feedback, restDuration: rest.shouldStart ? rest.durationSeconds : undefined };
  }
  async skipRound(current: CurrentTarget) { const group = current.group; if (group) await this.skipPending(group.items.flatMap(item => item.sets[current.round ?? current.si] ? [item.sets[current.round ?? current.si]] : [])); }
  async skipRemainingRounds(current: CurrentTarget) { const group = current.group; if (group) await this.skipPending(group.items.flatMap(item => item.sets.slice(current.round ?? current.si))); }
  async addRound(group: LoadedGroup) { const sets = group.items.map(item => { const last = item.sets.at(-1); return { id: nanoid(), sessionExerciseItemId: item.item.id, plannedSetId: last?.plannedSetId, setType: last?.setType ?? SetType.Working, orderIndex: last ? getRankBetween(last.orderIndex, null) : getInitialRank(), actualLoad: null, actualCount: null, actualRPE: null, actualToFailure: ToFailureIndicator.None, expectedRPE: last?.expectedRPE ?? null, isCompleted: false, isSkipped: false, partials: false, forcedReps: 0 }; }); await this.persistence.addSets(sets); }
  async swapExercise(sessionId: string, itemId: string, exerciseId: string) { await this.mutations.swapExercise(itemId, exerciseId, (await this.persistence.getSession(sessionId))?.plannedWorkoutId); }
  async quickAddExercise(sessionId: string, exerciseId: string, index: number) { await this.mutations.addExercise(sessionId, exerciseId, index); }
  async quickAddSuperset(sessionId: string, exerciseIds: string[], type: ExerciseGroupType, index: number) { await this.mutations.addSuperset(sessionId, exerciseIds, index, type); }
  async removeExercise(itemId: string) { await this.mutations.removeExercise(itemId); }
  async finishSession(sessionId: string) { await this.finishing.finishSession(sessionId, this.now()); }
  async discardSession(sessionId: string) { await this.finishing.discardSession(sessionId); }
  async validateSessionCompletion(sessionId: string) { return this.mutations.validateSessionCompletion(sessionId); }
  async skipUnresolvedSets(unresolved: UnresolvedSet[]) { const updates = unresolved.map(({ set }) => ({ key: set.id, changes: { isSkipped: true } })); if (updates.length) await this.persistence.bulkUpdateSets(updates); }
  async swapItems(a: string, b: string, aIndex: string, bIndex: string) { await this.persistence.transaction(async () => { await this.persistence.updateItem(a, { orderIndex: bIndex }); await this.persistence.updateItem(b, { orderIndex: aIndex }); }); }
  async swapGroups(a: string, b: string, aIndex: string, bIndex: string) { await this.persistence.transaction(async () => { await this.persistence.updateGroup(a, { orderIndex: bIndex }); await this.persistence.updateGroup(b, { orderIndex: aIndex }); }); }
  async activateGroup(current: string, target: string, currentIndex: string, firstUpcoming: string | null) { const displaced = getRankBetween(currentIndex, firstUpcoming); await this.persistence.transaction(async () => { await this.persistence.updateGroup(target, { orderIndex: currentIndex }); await this.persistence.updateGroup(current, { orderIndex: displaced }); }); }
}
