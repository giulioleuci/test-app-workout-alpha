import { nanoid } from 'nanoid';

import { SessionRepository } from '@/db/repositories/SessionRepository';
import { UserProfileRepository } from '@/db/repositories/UserProfileRepository';
import type { CurrentTarget, LoadedGroup, SessionFeedback } from '@/domain/activeSessionTypes';
import type { SetComplianceResult, FatigueAnalysisResult } from '@/domain/analytics-types';
import type { SessionSet } from '@/domain/entities';
import { ToFailureIndicator, SetType, ExerciseGroupType } from '@/domain/enums';
import { getClusterConfig } from '@/domain/value-objects';
import dayjs from '@/lib/dayjs';
import { getRankBetween, getInitialRank } from '@/lib/lexorank';
import { analyzeSetCompliance } from '@/services/complianceAnalyzer';
import { analyzeFatigueProgression } from '@/services/fatigueAnalyzer';
import { profileService } from '@/services/profileService';
import { resolveRestTimer } from '@/services/restTimerResolver';
import { calculateWeighted1RM } from '@/services/rpePercentageTable';
import { finishSession, discardSession } from '@/services/sessionFinisher';
import { swapExercise, addExercise, addSuperset, removeExercise, validateSessionCompletion, type UnresolvedSet } from '@/services/sessionMutator';

export class SessionExecutionService {

  static async completeSet(
    setId: string,
    updates: Partial<SessionSet>,
    current: CurrentTarget | null
  ): Promise<{ feedback: SessionFeedback | null; restDuration?: number }> {
    const latestWeightRecord = await profileService.getLatestBodyWeight();
    const bodyWeight = latestWeightRecord?.weight;

    const computeExtras = (s: Partial<SessionSet>) => {
      const extras: Partial<SessionSet> = {};
      if (s.actualLoad != null && s.actualLoad > 0 &&
        s.actualCount != null && s.actualCount > 0 &&
        s.actualRPE != null && s.actualRPE > 0) {
        const estResult = calculateWeighted1RM(s.actualLoad, s.actualCount, s.actualRPE);
        const estimated = estResult.media;
        if (estimated && estimated > 0) {
          extras.e1rm = estimated;
          if (bodyWeight && bodyWeight > 0) {
            extras.relativeIntensity = Math.round((estimated / bodyWeight) * 100) / 100;
          }
        }
      }
      return extras;
    };

    if (!current) {
      const extras = computeExtras(updates);
      // Just update if we don't have full context (e.g. from a list view)
      await SessionRepository.updateSet(setId, {
        ...updates, ...extras, isCompleted: true, completedAt: dayjs().toDate(),
      });
      return { feedback: null };
    }

    if (current.set.id !== setId) {
      const extras = computeExtras(updates);
      // Completing a set that is not the current target
      await SessionRepository.updateSet(setId, {
        ...updates, ...extras, isCompleted: true, completedAt: dayjs().toDate(),
      });
      return { feedback: null };
    }

    const extras = computeExtras(updates);
    // Completing current target
    await SessionRepository.updateSet(setId, {
      ...updates, ...extras, isCompleted: true, completedAt: dayjs().toDate(),
    });

    const plannedSet = current.set.plannedSetId ? current.item.plannedSets[current.set.plannedSetId] : undefined;
    const completedSet = { ...current.set, ...updates, isCompleted: true } as SessionSet;

    let compliance: SetComplianceResult | null = null;
    let fatigue: FatigueAnalysisResult | null = null;

    if (plannedSet) {
      compliance = analyzeSetCompliance(completedSet, plannedSet);
      await SessionRepository.updateSet(setId, {
        complianceStatus: compliance.overall,
        plannedVsActual: {
          countDeviation: compliance.count?.deviation ?? undefined,
          loadDeviation: compliance.load?.deviation ?? undefined,
          rpeDeviation: compliance.rpe?.deviation ?? undefined,
        },
      });

      const allSetsForItem = current.item.sets.map((s, i) =>
        i === current.si ? completedSet : s
      );
      const completedForItem = allSetsForItem.filter(s => s.isCompleted);
      const completedIndex = completedForItem.length - 1;

      const baselineRPE = plannedSet.rpeRange?.min;
      fatigue = analyzeFatigueProgression(
        completedForItem, completedIndex,
        plannedSet.fatigueProgressionProfile, baselineRPE,
      );
      await SessionRepository.updateSet(setId, { fatigueProgressionStatus: fatigue.status });
    }

    const feedback: SessionFeedback | null = (compliance || fatigue) ? {
      compliance, fatigue, forItemId: current.item.item.id
    } : null;

    // Timer Logic
    const profile = await UserProfileRepository.getRegulationProfile();
    const autoStart = profile?.autoStartRestTimer ?? true;

    const clusterParams = getClusterConfig(current.item.plannedItem?.modifiers);

    const nextSetIdx = current.si + 1;
    const nextSet = current.item.sets[nextSetIdx];

    const restResult = resolveRestTimer(
      current.group.group.groupType,
      completedSet.setType,
      nextSet?.setType ?? null,
      plannedSet?.restSecondsRange,
      clusterParams,
      autoStart,
    );

    return {
      feedback,
      restDuration: restResult.shouldStart ? restResult.durationSeconds : undefined,
    };
  }

  static async skipSet(setId: string): Promise<void> {
    await SessionRepository.updateSet(setId, { isSkipped: true });
  }

  static async skipRemainingSets(current: CurrentTarget): Promise<void> {
    const { item, si } = current;
    const setsToSkip = item.sets.slice(si);
    const updates = setsToSkip
      .filter(s => !s.isCompleted && !s.isSkipped)
      .map(s => ({ key: s.id, changes: { isSkipped: true } }));

    if (updates.length === 0) return;

    await SessionRepository.bulkUpdateSets(updates);
  }

  static async addSet(itemId: string): Promise<void> {
    const existingSets = await SessionRepository.getSetsByItem(itemId);
    const lastSet = existingSets[existingSets.length - 1];

    const ss: SessionSet = {
      id: nanoid(),
      sessionExerciseItemId: itemId,
      plannedSetId: lastSet?.plannedSetId,
      setType: lastSet?.setType ?? SetType.Working,
      orderIndex: lastSet ? getRankBetween(lastSet.orderIndex, null) : getInitialRank(),
      actualLoad: null, actualCount: null, actualRPE: null,
      actualToFailure: ToFailureIndicator.None,
      expectedRPE: lastSet?.expectedRPE ?? null,
      isCompleted: false, isSkipped: false,
      partials: false, forcedReps: 0,
    };
    await SessionRepository.addSets([ss]);
  }

  static async uncompleteSet(setId: string): Promise<void> {
    await SessionRepository.updateSet(setId, {
      isCompleted: false,
      isSkipped: false,
      completedAt: undefined,
      complianceStatus: undefined,
      fatigueProgressionStatus: undefined,
      plannedVsActual: undefined,
    });
  }

  static async uncompleteLastSet(itemId: string): Promise<void> {
    const sets = await SessionRepository.getSetsByItem(itemId);
    const lastCompleted = [...sets].reverse().find(s => s.isCompleted);
    if (!lastCompleted) return;
    await this.uncompleteSet(lastCompleted.id);
  }

  static async uncompleteLastRound(lg: LoadedGroup): Promise<void> {
    const setsToUndo: string[] = [];
    for (const li of lg.items) {
      const lastCompleted = [...li.sets].reverse().find(s => s.isCompleted);
      if (lastCompleted) setsToUndo.push(lastCompleted.id);
    }
    if (setsToUndo.length === 0) return;

    const updates = setsToUndo.map(id => ({
      key: id,
      changes: {
        isCompleted: false,
        isSkipped: false,
        completedAt: undefined,
        complianceStatus: undefined,
        fatigueProgressionStatus: undefined,
        plannedVsActual: undefined,
      }
    }));

    await SessionRepository.bulkUpdateSets(updates);
  }

  static async completeRound(
    group: LoadedGroup,
    roundIndex: number,
    setsData: Record<string, Partial<SessionSet>>
  ): Promise<{ feedback: SessionFeedback | null; restDuration?: number }> {
    const profile = await UserProfileRepository.getRegulationProfile();
    const autoStart = profile?.autoStartRestTimer ?? true;
    const latestWeightRecord = await profileService.getLatestBodyWeight();
    const bodyWeight = latestWeightRecord?.weight;

    let lastFeedback: SessionFeedback | null = null;
    let restDuration: number | undefined;

    await SessionRepository.transaction(async () => {
      const itemsInRound = group.items.filter(item => item.sets[roundIndex]);

      for (let i = 0; i < itemsInRound.length; i++) {
        const item = itemsInRound[i];
        const set = item.sets[roundIndex];
        const updates = setsData[set.id];

        if (!updates) continue;

        const extras: Partial<SessionSet> = {};
        if (updates.actualLoad != null && updates.actualLoad > 0 &&
          updates.actualCount != null && updates.actualCount > 0 &&
          updates.actualRPE != null && updates.actualRPE > 0) {
          const estResult = calculateWeighted1RM(updates.actualLoad, updates.actualCount, updates.actualRPE);
          const estimated = estResult.media;
          if (estimated && estimated > 0) {
            extras.e1rm = estimated;
            if (bodyWeight && bodyWeight > 0) {
              extras.relativeIntensity = Math.round((estimated / bodyWeight) * 100) / 100;
            }
          }
        }

        const completedSet = { ...set, ...updates, ...extras, isCompleted: true, completedAt: dayjs().toDate() } as SessionSet;

        await SessionRepository.updateSet(set.id, completedSet);

        const plannedSet = set.plannedSetId ? item.plannedSets[set.plannedSetId] : undefined;
        let compliance: SetComplianceResult | null = null;
        let fatigue: FatigueAnalysisResult | null = null;

        if (plannedSet) {
          compliance = analyzeSetCompliance(completedSet, plannedSet);
          await SessionRepository.updateSet(set.id, {
            complianceStatus: compliance.overall,
            plannedVsActual: {
              countDeviation: compliance.count?.deviation ?? undefined,
              loadDeviation: compliance.load?.deviation ?? undefined,
              rpeDeviation: compliance.rpe?.deviation ?? undefined,
            },
          });

          const allSetsForItem = item.sets.map((s, idx) =>
            idx === roundIndex ? completedSet : s
          );
          const completedForItem = allSetsForItem.filter(s => s.isCompleted);
          const completedIndex = completedForItem.length - 1;

          const baselineRPE = plannedSet.rpeRange?.min;
          fatigue = analyzeFatigueProgression(
            completedForItem, completedIndex,
            plannedSet.fatigueProgressionProfile, baselineRPE,
          );
          await SessionRepository.updateSet(set.id, { fatigueProgressionStatus: fatigue.status });

          if (i === itemsInRound.length - 1) {
            lastFeedback = { compliance, fatigue, forItemId: item.item.id };
          }
        } else if (i === itemsInRound.length - 1) {
          lastFeedback = null;
        }
      }
    });

    const itemsInRound = group.items.filter(item => item.sets[roundIndex]);
    if (itemsInRound.length > 0) {
      const lastItem = itemsInRound[itemsInRound.length - 1];
      const lastSet = lastItem.sets[roundIndex];
      const nextRoundIndex = roundIndex + 1;
      const firstItemOfNextRound = group.items[0];
      const nextSet = firstItemOfNextRound?.sets[nextRoundIndex];

      const plannedSet = lastSet.plannedSetId ? lastItem.plannedSets[lastSet.plannedSetId] : undefined;
      const clusterParams = getClusterConfig(lastItem.plannedItem?.modifiers);

      const restResult = resolveRestTimer(
        group.group.groupType,
        lastSet.setType,
        nextSet?.setType ?? null,
        plannedSet?.restSecondsRange,
        clusterParams,
        autoStart,
      );

      if (restResult.shouldStart) {
        restDuration = restResult.durationSeconds;
      }
    }

    return { feedback: lastFeedback, restDuration };
  }

  static async completeScreen(
    group: LoadedGroup,
    roundIndex: number,
    screenItemIndices: number[],
    setsData: Record<string, Partial<SessionSet>>,
    isLastScreenOfRound: boolean,
  ): Promise<{ feedback: SessionFeedback | null; restDuration?: number }> {
    const profile = await UserProfileRepository.getRegulationProfile();
    const autoStart = profile?.autoStartRestTimer ?? true;
    const latestWeightRecord = await profileService.getLatestBodyWeight();
    const bodyWeight = latestWeightRecord?.weight;

    let lastFeedback: SessionFeedback | null = null;
    let restDuration: number | undefined;

    await SessionRepository.transaction(async () => {
      for (let i = 0; i < screenItemIndices.length; i++) {
        const itemIdx = screenItemIndices[i];
        const item = group.items[itemIdx];
        if (!item) continue;
        const set = item.sets[roundIndex];
        if (!set) continue;
        const updates = setsData[set.id];
        if (!updates) continue;

        const extras: Partial<SessionSet> = {};
        if (updates.actualLoad != null && updates.actualLoad > 0 &&
          updates.actualCount != null && updates.actualCount > 0 &&
          updates.actualRPE != null && updates.actualRPE > 0) {
          const estResult = calculateWeighted1RM(updates.actualLoad, updates.actualCount, updates.actualRPE);
          const estimated = estResult.media;
          if (estimated && estimated > 0) {
            extras.e1rm = estimated;
            if (bodyWeight && bodyWeight > 0) {
              extras.relativeIntensity = Math.round((estimated / bodyWeight) * 100) / 100;
            }
          }
        }

        const completedSet = { ...set, ...updates, ...extras, isCompleted: true, completedAt: dayjs().toDate() } as SessionSet;
        await SessionRepository.updateSet(set.id, completedSet);

        const plannedSet = set.plannedSetId ? item.plannedSets[set.plannedSetId] : undefined;
        if (plannedSet) {
          const compliance = analyzeSetCompliance(completedSet, plannedSet);
          await SessionRepository.updateSet(set.id, {
            complianceStatus: compliance.overall,
            plannedVsActual: {
              countDeviation: compliance.count?.deviation ?? undefined,
              loadDeviation: compliance.load?.deviation ?? undefined,
              rpeDeviation: compliance.rpe?.deviation ?? undefined,
            },
          });

          const allSetsForItem = item.sets.map((s, idx) => idx === roundIndex ? completedSet : s);
          const completedForItem = allSetsForItem.filter(s => s.isCompleted);
          const completedIndex = completedForItem.length - 1;
          const baselineRPE = plannedSet.rpeRange?.min;
          const fatigue = analyzeFatigueProgression(completedForItem, completedIndex, plannedSet.fatigueProgressionProfile, baselineRPE);
          await SessionRepository.updateSet(set.id, { fatigueProgressionStatus: fatigue.status });

          if (i === screenItemIndices.length - 1) {
            lastFeedback = { compliance, fatigue, forItemId: item.item.id };
          }
        } else if (i === screenItemIndices.length - 1) {
          lastFeedback = null;
        }
      }
    });

    const lastItemIdx = screenItemIndices[screenItemIndices.length - 1];
    const lastItem = group.items[lastItemIdx];
    if (lastItem) {
      const lastSet = lastItem.sets[roundIndex];
      const plannedSet = lastSet?.plannedSetId ? lastItem.plannedSets[lastSet.plannedSetId] : undefined;
      const clusterParams = getClusterConfig(lastItem.plannedItem?.modifiers);

      if (isLastScreenOfRound) {
        const betweenRoundsSeconds = group.plannedGroup?.restBetweenRoundsSeconds;
        const hasNextRound = group.items.some(li => li.sets[roundIndex + 1]);
        if (autoStart && betweenRoundsSeconds && betweenRoundsSeconds > 0 && hasNextRound) {
          restDuration = betweenRoundsSeconds;
        }
      } else {
        const restResult = resolveRestTimer(
          group.group.groupType,
          lastSet?.setType ?? SetType.Working,
          null,
          plannedSet?.restSecondsRange,
          clusterParams,
          autoStart,
        );
        if (restResult.shouldStart) {
          restDuration = restResult.durationSeconds;
        }
      }
    }

    return { feedback: lastFeedback, restDuration };
  }

  static async skipRound(current: CurrentTarget): Promise<void> {
    const round = current.round ?? current.si;
    const group = current.group;
    if (!group) return;
    const setsToSkip = group.items.flatMap(li => li.sets[round] ? [li.sets[round]] : []);

    const updates = setsToSkip
      .filter(s => !s.isCompleted && !s.isSkipped)
      .map(s => ({ key: s.id, changes: { isSkipped: true } }));

    if (updates.length === 0) return;
    await SessionRepository.bulkUpdateSets(updates);
  }

  static async skipRemainingRounds(current: CurrentTarget): Promise<void> {
    const round = current.round ?? current.si;
    const group = current.group;
    if (!group) return;
    const setsToSkip = group.items.flatMap(li => li.sets.slice(round).filter(s => !s.isCompleted && !s.isSkipped));

    const updates = setsToSkip.map(s => ({ key: s.id, changes: { isSkipped: true } }));

    if (updates.length === 0) return;
    await SessionRepository.bulkUpdateSets(updates);
  }

  static async addRound(group: LoadedGroup): Promise<void> {
    const newSets: SessionSet[] = [];

    for (const li of group.items) {
      const lastSet = li.sets[li.sets.length - 1];
      const newSet: SessionSet = {
        id: nanoid(),
        sessionExerciseItemId: li.item.id,
        plannedSetId: lastSet?.plannedSetId,
        setType: lastSet?.setType ?? SetType.Working,
        orderIndex: lastSet ? getRankBetween(lastSet.orderIndex, null) : getInitialRank(),
        actualLoad: null, actualCount: null, actualRPE: null,
        actualToFailure: ToFailureIndicator.None,
        expectedRPE: lastSet?.expectedRPE ?? null,
        isCompleted: false, isSkipped: false,
        partials: false, forcedReps: 0,
      };
      newSets.push(newSet);
    }

    await SessionRepository.addSets(newSets);
  }

  // --- Mutations ---

  static async swapExercise(activeSessionId: string, sessionExerciseItemId: string, newExerciseId: string): Promise<void> {
    const session = await SessionRepository.getSession(activeSessionId);
    const plannedWorkoutId = session?.plannedWorkoutId;
    await swapExercise(sessionExerciseItemId, newExerciseId, plannedWorkoutId);
  }

  static async quickAddExercise(activeSessionId: string, exerciseId: string, insertIndex: number): Promise<void> {
    await addExercise(activeSessionId, exerciseId, insertIndex);
  }

  static async quickAddSuperset(activeSessionId: string, exerciseIds: string[], groupType: ExerciseGroupType, insertIndex: number): Promise<void> {
    await addSuperset(activeSessionId, exerciseIds, insertIndex, groupType);
  }

  static async removeExercise(sessionExerciseItemId: string): Promise<void> {
    await removeExercise(sessionExerciseItemId);
  }

  // --- Finish Logic ---

  static async finishSession(activeSessionId: string): Promise<void> {
    await finishSession(activeSessionId, dayjs().toDate());
  }

  static async discardSession(activeSessionId: string): Promise<void> {
    await discardSession(activeSessionId);
  }

  static async validateSessionCompletion(activeSessionId: string): Promise<{ isValid: boolean; unresolvedSets: UnresolvedSet[] }> {
    return validateSessionCompletion(activeSessionId);
  }

  static async skipUnresolvedSets(unresolvedSets: UnresolvedSet[]): Promise<void> {
    const setIds = unresolvedSets.map(us => us.set.id);
    if (setIds.length === 0) return;

    const updates = setIds.map(id => ({ key: id, changes: { isSkipped: true } }));
    await SessionRepository.bulkUpdateSets(updates);
  }

  // --- Reordering ---

  static async swapItems(itemAId: string, itemBId: string, indexA: string, indexB: string): Promise<void> {
    await SessionRepository.transaction(async () => {
      await SessionRepository.updateItem(itemAId, { orderIndex: indexB });
      await SessionRepository.updateItem(itemBId, { orderIndex: indexA });
    });
  }

  static async swapGroups(groupAId: string, groupBId: string, indexA: string, indexB: string): Promise<void> {
    await SessionRepository.transaction(async () => {
      await SessionRepository.updateGroup(groupAId, { orderIndex: indexB });
      await SessionRepository.updateGroup(groupBId, { orderIndex: indexA });
    });
  }
}
