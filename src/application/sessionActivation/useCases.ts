import type { PlannedSet, SessionExerciseItem, SessionSet, WorkoutSession, SessionExerciseGroup } from '@/domain/entities';
import { SetType } from '@/domain/enums';
import { generateSequentialRanks } from '@/lib/lexorank';
import { expandPlannedSets } from '@/services/setExpander';

import type { PendingSessionInfo, SessionActivationPort, SessionFinisher } from './ports';

export interface SubstitutionPrompt {
  plannedItemId: string;
  originalExerciseId: string;
  originalExerciseName: string;
  suggestedExerciseId: string;
  suggestedExerciseName: string;
  lastUsedDate: Date;
}

export class SessionActivationUseCases {
  constructor(
    private readonly sessions: SessionActivationPort,
    private readonly finisher: SessionFinisher,
    private readonly createId: () => string,
    private readonly now: () => Date,
  ) {}

  private async getSetsForItem(itemId: string): Promise<SessionSet[]> { return this.sessions.getSets(itemId); }

  private async getLastSessionSets(exerciseId: string, plannedExerciseItemId: string, plannedSets: PlannedSet[], usedHistoryItemIds: Set<string>): Promise<SessionSet[]> {
    if (plannedExerciseItemId) {
      const specificItems = await this.sessions.getItemsByPlannedItem(plannedExerciseItemId);
      if (specificItems.length > 0) {
        const groups = await this.sessions.getGroupsByIds(specificItems.map(item => item.sessionExerciseGroupId));
        const lastSession = await this.sessions.findLatestCompletedSessionFromIds([...new Set(groups.map(group => group.workoutSessionId))]);
        if (lastSession) {
          const sessionGroupIds = new Set(groups.filter(group => group.workoutSessionId === lastSession.id).map(group => group.id));
          const matchedItem = specificItems.find(item => sessionGroupIds.has(item.sessionExerciseGroupId));
          if (matchedItem && !usedHistoryItemIds.has(matchedItem.id)) { usedHistoryItemIds.add(matchedItem.id); return this.getSetsForItem(matchedItem.id); }
        }
      }
    }
    const itemsWithExercise = await this.sessions.getItemsByExercise(exerciseId);
    if (!itemsWithExercise.length) return [];
    const groups = await this.sessions.getGroupsByIds(itemsWithExercise.map(item => item.sessionExerciseGroupId));
    const lastSession = await this.sessions.findLatestCompletedSessionFromIds([...new Set(groups.map(group => group.workoutSessionId))]);
    if (!lastSession) return [];
    const sessionGroups = await this.sessions.getGroups(lastSession.id);
    const orderByGroup = new Map(sessionGroups.map(group => [group.id, group.orderIndex]));
    const candidates = (await this.sessions.getItemsByGroups(sessionGroups.map(group => group.id))).filter(item => item.exerciseId === exerciseId && !usedHistoryItemIds.has(item.id));
    if (!candidates.length) return [];
    const candidatesWithSets = await Promise.all(candidates.map(async item => ({ item, sets: await this.getSetsForItem(item.id) })));
    const plannedSetCount = plannedSets.reduce((sum, set) => sum + set.setCountRange.min, 0);
    const plannedWorking = plannedSets.reduce((sum, set) => sum + (set.setType === SetType.Working ? set.setCountRange.min : 0), 0);
    const plannedAverage = this.getAverageReps(plannedSets);
    const score = (sets: SessionSet[]) => Math.abs(sets.length - plannedSetCount) * 10 + Math.abs(sets.filter(set => set.setType === SetType.Working).length - plannedWorking) * 5 + (plannedAverage > 0 && this.getAverageActualReps(sets) > 0 ? Math.abs(plannedAverage - this.getAverageActualReps(sets)) : 0);
    candidatesWithSets.sort((a, b) => score(a.sets) - score(b.sets) || (orderByGroup.get(a.item.sessionExerciseGroupId) ?? '').localeCompare(orderByGroup.get(b.item.sessionExerciseGroupId) ?? '') || (a.item.orderIndex || '').localeCompare(b.item.orderIndex || ''));
    const bestMatch = candidatesWithSets[0];
    if (!bestMatch) return [];
    usedHistoryItemIds.add(bestMatch.item.id);
    return bestMatch.sets;
  }

  private getAverageReps(sets: PlannedSet[]) { const working = sets.filter(set => set.setType === SetType.Working && set.countRange.min > 0); return working.length ? working.reduce((sum, set) => sum + set.countRange.min, 0) / working.length : 0; }
  private getAverageActualReps(sets: SessionSet[]) { const working = sets.filter(set => set.setType === SetType.Working && !!set.actualCount && set.actualCount > 0); return working.length ? working.reduce((sum, set) => sum + (set.actualCount ?? 0), 0) / working.length : 0; }

  async prepareSessionActivation(plannedSessionId: string): Promise<{ substitutionPrompts: SubstitutionPrompt[] }> {
    const substitutionPrompts: SubstitutionPrompt[] = [];
    for (const group of await this.sessions.getPlannedGroups(plannedSessionId)) for (const item of await this.sessions.getPlannedItems(group.id)) {
      const substitutions = await this.sessions.getSubstitutions(item.id); if (!substitutions.length) continue;
      const mostRecent = [...substitutions].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      const [original, suggested] = await Promise.all([this.sessions.getExercise(mostRecent.originalExerciseId), this.sessions.getExercise(mostRecent.substitutedExerciseId)]);
      substitutionPrompts.push({ plannedItemId: item.id, originalExerciseId: mostRecent.originalExerciseId, originalExerciseName: original?.name ?? 'Unknown', suggestedExerciseId: mostRecent.substitutedExerciseId, suggestedExerciseName: suggested?.name ?? 'Unknown', lastUsedDate: mostRecent.createdAt });
    }
    return { substitutionPrompts };
  }

  async activateSession(plannedSessionId: string, substitutionChoices?: Map<string, string>): Promise<string> {
    const workoutSessionId = this.createId(); const now = this.now(); const active = await this.sessions.findActiveSession();
    if (active) await this.finisher.finishSession(active.id, now);
    const plannedSession = await this.sessions.getPlannedSession(plannedSessionId); if (!plannedSession) throw new Error(`Planned session ${plannedSessionId} not found`);
    const workoutSession: WorkoutSession = { id: workoutSessionId, plannedSessionId, plannedWorkoutId: plannedSession.plannedWorkoutId, startedAt: now };
    const newGroups: SessionExerciseGroup[] = []; const newItems: SessionExerciseItem[] = []; const newSets: SessionSet[] = []; const usedHistoryItemIds = new Set<string>();
    for (const group of await this.sessions.getPlannedGroups(plannedSessionId)) {
      const groupId = this.createId(); newGroups.push({ id: groupId, workoutSessionId, plannedExerciseGroupId: group.id, groupType: group.groupType, orderIndex: group.orderIndex, isCompleted: false });
      for (const item of await this.sessions.getPlannedItems(group.id)) {
        const exerciseId = substitutionChoices?.get(item.id) ?? item.exerciseId; const itemId = this.createId(); newItems.push({ id: itemId, sessionExerciseGroupId: groupId, plannedExerciseItemId: item.id, exerciseId, orderIndex: item.orderIndex, isCompleted: false, ...(exerciseId !== item.exerciseId ? { originalExerciseId: item.exerciseId } : {}) });
        const plannedSets = await this.sessions.getPlannedSets(item.id); const historyByType = new Map<SetType, SessionSet[]>();
        for (const set of await this.getLastSessionSets(exerciseId, item.id, plannedSets, usedHistoryItemIds)) historyByType.set(set.setType, [...(historyByType.get(set.setType) ?? []), set]);
        const expanded = expandPlannedSets(group.groupType, plannedSets, historyByType); const ranks = generateSequentialRanks(expanded.length);
        for (let index = 0; index < expanded.length; index++) { const set = expanded[index]; newSets.push({ id: this.createId(), sessionExerciseItemId: itemId, plannedSetId: set.plannedSetId, setType: set.setType, orderIndex: ranks[index], actualLoad: set.actualLoad, actualCount: set.actualCount, actualRPE: null, actualToFailure: set.actualToFailure, expectedRPE: set.expectedRPE, isCompleted: false, isSkipped: false, partials: false, forcedReps: 0 }); }
      }
    }
    await this.sessions.saveFullSession(workoutSession, newGroups, newItems, newSets);
    return workoutSessionId;
  }

  findPendingSessionInfo(): Promise<PendingSessionInfo | null> { return this.sessions.findPendingSessionInfo(); }
}
