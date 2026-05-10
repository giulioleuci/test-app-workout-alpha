import { nanoid } from 'nanoid';

import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import { SessionRepository } from '@/db/repositories/SessionRepository';
import { WorkoutPlanRepository } from '@/db/repositories/WorkoutPlanRepository';
import type {
  WorkoutSession, SessionExerciseGroup, SessionExerciseItem, SessionSet,
  PlannedSet,
} from '@/domain/entities';
import { SetType } from '@/domain/enums';
import dayjs from '@/lib/dayjs';
import { generateSequentialRanks } from '@/lib/lexorank';

import { finishSession } from './sessionFinisher';
import { expandPlannedSets } from './setExpander';


// ===== Two-Phase Activation Types =====

export interface SubstitutionPrompt {
  plannedItemId: string;
  originalExerciseId: string;
  originalExerciseName: string;
  suggestedExerciseId: string;
  suggestedExerciseName: string;
  lastUsedDate: Date;
}

/**
 * Helper to get sets from the last completed session for an exercise.
 * Implements a two-tier lookup strategy:
 * 1. Tier 1: Plan-based match (most precise) - tries to match by plannedExerciseItemId.
 * 2. Tier 2: Structural/Best-fit match - tries to find the best matching block from the last session
 *    based on set count and other structural properties, excluding already used history items.
 */
async function getLastSessionSets(
  exerciseId: string,
  plannedExerciseItemId: string,
  plannedSets: PlannedSet[],
  usedHistoryItemIds: Set<string>
): Promise<SessionSet[]> {
  // --- Tier 1: Plan-based match ---
  if (plannedExerciseItemId) {
    // Find all session items that originated from this specific plan item
    const specificItems = await SessionRepository.getItemsByPlannedItem(plannedExerciseItemId);

    if (specificItems.length > 0) {
      // Find the most recent completed session among these items
      const groupIds = specificItems.map(i => i.sessionExerciseGroupId);
      const groups = await SessionRepository.getGroupsByIds(groupIds);
      const sessionIds = Array.from(new Set(groups.map(g => g.workoutSessionId)));

      const lastSession = await SessionRepository.findLatestCompletedSessionFromIds(sessionIds);

      if (lastSession) {
        // Found a previous session for this exact slot!
        const sessionGroups = groups.filter(g => g.workoutSessionId === lastSession.id);
        const sessionGroupIds = new Set(sessionGroups.map(g => g.id));

        const matchedItem = specificItems.find(i => sessionGroupIds.has(i.sessionExerciseGroupId));

        if (matchedItem) {
          // Check if this item has already been used in this session activation (unlikely for Tier 1 unless duplicate IDs exist)
          // But purely for safety:
          if (!usedHistoryItemIds.has(matchedItem.id)) {
            usedHistoryItemIds.add(matchedItem.id);
            return await getSetsForItem(matchedItem.id);
          }
        }
      }
    }
  }

  // --- Tier 2: Structural Best-Fit fallback ---
  // If we reach here, either:
  // - No history found for this specific plan slot (e.g. new plan or never completed)
  // - The Tier 1 match was already used (duplicate slots?)

  // 1. Find all sessions that contain this exercise
  const itemsWithExercise = await SessionRepository.getItemsByExercise(exerciseId);

  if (itemsWithExercise.length === 0) return [];

  const groupIds = itemsWithExercise.map(i => i.sessionExerciseGroupId);
  const groups = await SessionRepository.getGroupsByIds(groupIds);
  const sessionIds = Array.from(new Set(groups.map(g => g.workoutSessionId)));

  // 2. Find the most recent completed session among them
  const lastSession = await SessionRepository.findLatestCompletedSessionFromIds(sessionIds);

  if (!lastSession) return [];

  // 3. Get all items for this exercise in that session
  const sessionGroups = await SessionRepository.getGroupsBySession(lastSession.id);

  const sessionGroupIds = sessionGroups.map(g => g.id);
  const sessionGroupOrderMap = new Map(sessionGroups.map(g => [g.id, g.orderIndex]));

  const candidatesAll = await SessionRepository.getItemsByGroups(sessionGroupIds);
  const candidates = candidatesAll.filter(i => i.exerciseId === exerciseId && !usedHistoryItemIds.has(i.id));

  if (candidates.length === 0) return [];

  // 4. Find the best match among candidates
  // Retrieve sets for all candidates to compare structure
  const candidatesWithSets = await Promise.all(candidates.map(async (item) => {
    const sets = await getSetsForItem(item.id);
    return { item, sets };
  }));

  // Scoring function: Lower score is better match
  const scoreCandidate = (candidateSets: SessionSet[]) => {
    let score = 0;

    // Primary factor: Number of sets
    // Heavy penalty for difference in number of sets
    const totalPlannedSets = plannedSets.reduce((sum, ps) => sum + ps.setCountRange.min, 0);
    const countDiff = Math.abs(candidateSets.length - totalPlannedSets);
    score += countDiff * 10;

    // Secondary factor: Set Type distribution (simplified)
    // Count warmup/working sets
    // Note: This is an approximation as PlannedSet is a block, but candidateSets are individual.
    // Ideally we should expand planned sets to compare types.
    const expandedPlannedTypes: SetType[] = [];
    plannedSets.forEach(ps => {
      for (let i = 0; i < ps.setCountRange.min; i++) expandedPlannedTypes.push(ps.setType);
    });

    const plannedWorking = expandedPlannedTypes.filter(t => t === SetType.Working).length;
    const candidateWorking = candidateSets.filter(s => s.setType === SetType.Working).length;
    score += Math.abs(plannedWorking - candidateWorking) * 5;

    // Tertiary factor: Reps target vs Actual reps (average)
    // This helps distinguish High Rep vs Low Rep blocks
    const plannedAvgReps = getAverageReps(plannedSets);
    const candidateAvgReps = getAverageActualReps(candidateSets);
    if (plannedAvgReps > 0 && candidateAvgReps > 0) {
      score += Math.abs(plannedAvgReps - candidateAvgReps); // 1 point per rep difference
    }

    return score;
  };

  // Sort candidates by score (primary) and position (secondary tie-breaker)
  candidatesWithSets.sort((a, b) => {
    const scoreA = scoreCandidate(a.sets);
    const scoreB = scoreCandidate(b.sets);

    if (scoreA !== scoreB) {
      return scoreA - scoreB;
    }

    // Tie-breaker: Position order
    const groupOrderA = sessionGroupOrderMap.get(a.item.sessionExerciseGroupId) ?? '';
    const groupOrderB = sessionGroupOrderMap.get(b.item.sessionExerciseGroupId) ?? '';

    if (groupOrderA !== groupOrderB) return groupOrderA.localeCompare(groupOrderB);
    return (a.item.orderIndex || '').localeCompare(b.item.orderIndex || '');
  });

  const bestMatch = candidatesWithSets[0];
  if (bestMatch) {
    usedHistoryItemIds.add(bestMatch.item.id);
    return bestMatch.sets;
  }
  return [];
}

function getAverageReps(sets: PlannedSet[]): number {
  let total = 0;
  let count = 0;
  for (const s of sets) {
    if (s.setType === SetType.Working && s.countRange.min > 0) {
      // Use min of range as proxy for target
      total += s.countRange.min;
      count++;
    }
  }
  return count > 0 ? total / count : 0;
}

function getAverageActualReps(sets: SessionSet[]): number {
  let total = 0;
  let count = 0;
  for (const s of sets) {
    if (s.setType === SetType.Working && s.actualCount && s.actualCount > 0) {
      total += s.actualCount;
      count++;
    }
  }
  return count > 0 ? total / count : 0;
}

async function getSetsForItem(itemId: string): Promise<SessionSet[]> {
  return await SessionRepository.getSetsByItem(itemId);
}

/**
 * Phase 1 of two-phase activation: checks for historical exercise substitutions
 * and returns prompts so the caller can ask the user which exercises to use.
 *
 * For each planned exercise item, looks up `exerciseSubstitutions` for any
 * previous substitution. If found, returns the most recent one as a prompt.
 */
export async function prepareSessionActivation(
  plannedSessionId: string,
): Promise<{ substitutionPrompts: SubstitutionPrompt[] }> {
  const substitutionPrompts: SubstitutionPrompt[] = [];

  // Load all planned groups → items for the session
  const groups = await WorkoutPlanRepository.getGroupsBySession(plannedSessionId);

  for (const group of groups) {
    const items = await WorkoutPlanRepository.getItemsByGroup(group.id);

    for (const item of items) {
      // Query substitutions for this planned item
      const substitutions = await WorkoutPlanRepository.getSubstitutionsForItem(item.id);

      if (substitutions.length === 0) continue;

      // Take the most recent substitution (sort by createdAt desc)
      substitutions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      const mostRecent = substitutions[0];

      // Look up exercise names for original and suggested
      const [originalExercise, suggestedExercise] = await Promise.all([
        ExerciseRepository.getById(mostRecent.originalExerciseId),
        ExerciseRepository.getById(mostRecent.substitutedExerciseId),
      ]);

      substitutionPrompts.push({
        plannedItemId: item.id,
        originalExerciseId: mostRecent.originalExerciseId,
        originalExerciseName: originalExercise?.name ?? 'Unknown',
        suggestedExerciseId: mostRecent.substitutedExerciseId,
        suggestedExerciseName: suggestedExercise?.name ?? 'Unknown',
        lastUsedDate: mostRecent.createdAt,
      });
    }
  }

  return { substitutionPrompts };
}

/**
 * Activates a planned session: creates WorkoutSession + all execution entities
 * with empty actual values, ready to be filled in.
 * Ensures only one active session exists by finishing any previous active session.
 *
 * When `substitutionChoices` is provided (from Phase 1), the chosen exercises
 * replace the planned ones and `originalExerciseId` is set on the session item.
 */
export async function activateSession(
  plannedSessionId: string,
  substitutionChoices?: Map<string, string>,  // plannedExerciseItemId → exerciseId
): Promise<string> {
  const workoutSessionId = nanoid();
  const now = dayjs().toDate();

  // 1. Ensure only one active session by finishing any existing active session
  const activeSession = await SessionRepository.findActiveSession();
  if (activeSession) {
    await finishSession(activeSession.id, now);
  }

  const plannedSession = await WorkoutPlanRepository.getSession(plannedSessionId);
  if (!plannedSession) throw new Error(`Planned session ${plannedSessionId} not found`);

  // Create workout session object
  const ws: WorkoutSession = {
    id: workoutSessionId,
    plannedSessionId,
    plannedWorkoutId: plannedSession.plannedWorkoutId,
    startedAt: now,
  };

  const newGroups: SessionExerciseGroup[] = [];
  const newItems: SessionExerciseItem[] = [];
  const newSets: SessionSet[] = [];

  // Load planned hierarchy
  const groups = await WorkoutPlanRepository.getGroupsBySession(plannedSessionId);

  // Track used history items to prevent duplicate matching
  const usedHistoryItemIds = new Set<string>();

  for (const group of groups) {
    const segId = nanoid();
    const seg: SessionExerciseGroup = {
      id: segId,
      workoutSessionId,
      plannedExerciseGroupId: group.id,
      groupType: group.groupType,
      orderIndex: group.orderIndex,
      isCompleted: false,
    };
    newGroups.push(seg);

    const items = await WorkoutPlanRepository.getItemsByGroup(group.id);

    for (const item of items) {
      const chosenExerciseId = substitutionChoices?.get(item.id) ?? item.exerciseId;
      const isSubstituted = chosenExerciseId !== item.exerciseId;

      const seiId = nanoid();
      const sei: SessionExerciseItem = {
        id: seiId,
        sessionExerciseGroupId: segId,
        plannedExerciseItemId: item.id,
        exerciseId: chosenExerciseId,
        orderIndex: item.orderIndex,
        isCompleted: false,
        ...(isSubstituted ? { originalExerciseId: item.exerciseId } : {}),
      };
      newItems.push(sei);

      const plannedSets = await WorkoutPlanRepository.getSetsByItem(item.id);

      // Fetch history sets for prepopulation using smart matching
      const historySets = await getLastSessionSets(chosenExerciseId, item.id, plannedSets, usedHistoryItemIds);

      const historyByType = new Map<SetType, SessionSet[]>();
      for (const s of historySets) {
        const list = historyByType.get(s.setType) || [];
        list.push(s);
        historyByType.set(s.setType, list);
      }

      const expanded = expandPlannedSets(group.groupType, plannedSets, historyByType);
      const ranks = generateSequentialRanks(expanded.length);

      for (let i = 0; i < expanded.length; i++) {
        const es = expanded[i];
        const ss: SessionSet = {
          id: nanoid(),
          sessionExerciseItemId: seiId,
          plannedSetId: es.plannedSetId,
          setType: es.setType,
          orderIndex: ranks[i],
          actualLoad: es.actualLoad,
          actualCount: es.actualCount,
          actualRPE: null,
          actualToFailure: es.actualToFailure,
          expectedRPE: es.expectedRPE,
          isCompleted: false,
          isSkipped: false,
          partials: false,
          forcedReps: 0,
        };
        newSets.push(ss);
      }
    }
  }

  // Save everything transactionally
  await SessionRepository.saveFullSession(ws, newGroups, newItems, newSets);

  return workoutSessionId;
}

export interface PendingSessionInfo {
  id: string;
  startedAt: Date;
  sessionName: string;
}

export async function findPendingSessionInfo(): Promise<PendingSessionInfo | null> {
  return await SessionRepository.findPendingSessionInfo();
}
