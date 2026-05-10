import { nanoid } from 'nanoid';

import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import { SessionRepository } from '@/db/repositories/SessionRepository';
import type {
  SessionExerciseGroup, SessionExerciseItem, SessionSet, ExerciseSubstitution,
} from '@/domain/entities';
import { ExerciseGroupType, SetType, ToFailureIndicator } from '@/domain/enums';

/** Number of fallback working sets created when adding/swapping exercises. */
const DEFAULT_WORKING_SETS = 3;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import { getRankBetween, getInitialRank, generateSequentialRanks } from '@/lib/lexorank';

function createFallbackSet(sessionExerciseItemId: string, orderIndex: string): SessionSet {
  return {
    id: nanoid(),
    sessionExerciseItemId,
    setType: SetType.Working,
    orderIndex,
    actualLoad: null,
    actualCount: null,
    actualRPE: null,
    actualToFailure: ToFailureIndicator.None,
    expectedRPE: null,
    isCompleted: false,
    isSkipped: false,
    partials: false,
    forcedReps: 0,
  };
}

// ---------------------------------------------------------------------------
// swapExercise
// ---------------------------------------------------------------------------

/**
 * Swaps the exercise on an existing SessionExerciseItem.
 *
 * - Preserves the *first* original exercise id (idempotent across multiple swaps).
 * - Deletes all incomplete (not completed AND not skipped) sets and creates fresh
 *   fallback working sets in their place.
 * - Optionally records an ExerciseSubstitution if the item came from a plan.
 */
export async function swapExercise(
  sessionExerciseItemId: string,
  newExerciseId: string,
  plannedWorkoutId?: string,
): Promise<void> {
  const item = await SessionRepository.getItem(sessionExerciseItemId);
  if (!item) throw new Error(`SessionExerciseItem ${sessionExerciseItemId} not found`);

  const originalExerciseId = item.originalExerciseId ?? item.exerciseId;
  const allSets = await SessionRepository.getSetsByItem(sessionExerciseItemId);

  // Partition into kept (completed or skipped) and incomplete
  const keptSets = allSets.filter(s => s.isCompleted || s.isSkipped);
  const incompleteSets = allSets.filter(s => !s.isCompleted && !s.isSkipped);
  const deleteSetIds = incompleteSets.map(s => s.id);

  // Determine how many new sets to create
  const newSetCount = Math.max(DEFAULT_WORKING_SETS, incompleteSets.length);

  // Starting orderIndex after the last kept set
  let prevRank = keptSets.length > 0 ? keptSets[keptSets.length - 1].orderIndex : undefined;

  // Create fallback working sets
  const newSets: SessionSet[] = [];
  for (let i = 0; i < newSetCount; i++) {
    const nextRank = getRankBetween(prevRank, null);
    newSets.push(createFallbackSet(sessionExerciseItemId, nextRank));
    prevRank = nextRank;
  }

  // Record substitution if the item originated from a plan
  let substitution: ExerciseSubstitution | undefined;
  if (plannedWorkoutId && item.plannedExerciseItemId) {
    substitution = {
      id: nanoid(),
      plannedExerciseItemId: item.plannedExerciseItemId,
      plannedWorkoutId,
      originalExerciseId,
      substitutedExerciseId: newExerciseId,
      sessionId: '', // Derive sessionId from group
      createdAt: new Date(),
    };

    const group = await SessionRepository.getGroup(item.sessionExerciseGroupId);
    if (group) {
      substitution.sessionId = group.workoutSessionId;
    }
  }

  await SessionRepository.swapExercise(sessionExerciseItemId, newExerciseId, deleteSetIds, newSets, substitution);
}

// ---------------------------------------------------------------------------
// addExercise
// ---------------------------------------------------------------------------

/**
 * Adds a brand-new exercise to an active session at a given position.
 *
 * Creates a new SessionExerciseGroup, a single SessionExerciseItem, and
 * DEFAULT_WORKING_SETS fallback working sets. Existing groups at or after
 * `insertBeforeGroupIndex` have their orderIndex shifted up by 1.
 */
export async function addExercise(
  sessionId: string,
  exerciseId: string,
  insertBeforeGroupIndex: number,
  groupType: ExerciseGroupType = ExerciseGroupType.Standard,
): Promise<{ groupId: string; itemId: string }> {
  const groupId = nanoid();
  const itemId = nanoid();

  const currentGroups = await SessionRepository.getGroupsBySession(sessionId);
  const prevGroup = currentGroups[insertBeforeGroupIndex - 1];
  const nextGroup = currentGroups[insertBeforeGroupIndex];
  const groupOrderIndex = getRankBetween(prevGroup?.orderIndex, nextGroup?.orderIndex);

  // Create group
  const group: SessionExerciseGroup = {
    id: groupId,
    workoutSessionId: sessionId,
    groupType,
    orderIndex: groupOrderIndex,
    isCompleted: false,
  };

  // Create item
  const item: SessionExerciseItem = {
    id: itemId,
    sessionExerciseGroupId: groupId,
    exerciseId,
    orderIndex: getInitialRank(),
    isCompleted: false,
  };

  // Create fallback sets
  const sets: SessionSet[] = [];
  let currentSetRank: string | undefined = undefined;
  for (let i = 0; i < DEFAULT_WORKING_SETS; i++) {
    const rank = getRankBetween(currentSetRank, null);
    sets.push(createFallbackSet(itemId, rank));
    currentSetRank = rank;
  }

  await SessionRepository.addExercise(sessionId, group, item, sets);

  return { groupId, itemId };
}

// ---------------------------------------------------------------------------
// addSuperset
// ---------------------------------------------------------------------------

/**
 * Adds a superset (or circuit, etc.) with multiple exercises to an active
 * session at a given position.
 *
 * Creates one SessionExerciseGroup, one SessionExerciseItem per exercise,
 * and DEFAULT_WORKING_SETS fallback working sets for each item.
 */
export async function addSuperset(
  sessionId: string,
  exerciseIds: string[],
  insertBeforeGroupIndex: number,
  groupType: ExerciseGroupType = ExerciseGroupType.Superset,
): Promise<{ groupId: string; itemIds: string[] }> {
  const groupId = nanoid();
  const itemIds = exerciseIds.map(() => nanoid());

  const currentGroups = await SessionRepository.getGroupsBySession(sessionId);
  const prevGroup = currentGroups[insertBeforeGroupIndex - 1];
  const nextGroup = currentGroups[insertBeforeGroupIndex];
  const groupOrderIndex = getRankBetween(prevGroup?.orderIndex, nextGroup?.orderIndex);

  const group: SessionExerciseGroup = {
    id: groupId,
    workoutSessionId: sessionId,
    groupType,
    orderIndex: groupOrderIndex,
    isCompleted: false,
  };

  const items: SessionExerciseItem[] = [];
  const sets: SessionSet[] = [];

  const itemRanks = generateSequentialRanks(exerciseIds.length);

  for (let idx = 0; idx < exerciseIds.length; idx++) {
    items.push({
      id: itemIds[idx],
      sessionExerciseGroupId: groupId,
      exerciseId: exerciseIds[idx],
      orderIndex: itemRanks[idx],
      isCompleted: false,
    });

    let currentSetRank: string | undefined = undefined;
    for (let i = 0; i < DEFAULT_WORKING_SETS; i++) {
      const rank = getRankBetween(currentSetRank, null);
      sets.push(createFallbackSet(itemIds[idx], rank));
      currentSetRank = rank;
    }
  }

  await SessionRepository.addSuperset(sessionId, group, items, sets);

  return { groupId, itemIds };
}

// ---------------------------------------------------------------------------
// removeExercise
// ---------------------------------------------------------------------------

/**
 * Removes a SessionExerciseItem and all its sets.
 *
 * If the parent group becomes empty after removal, the group is also deleted
 * and remaining groups in the same session have their orderIndex re-compacted
 * (no gaps).
 */
export async function removeExercise(sessionExerciseItemId: string): Promise<void> {
  await SessionRepository.removeExercise(sessionExerciseItemId);
}

// ---------------------------------------------------------------------------
// validateSessionCompletion
// ---------------------------------------------------------------------------

export interface UnresolvedSet {
  set: SessionSet;
  exerciseName: string;
  groupIndex: string;
  itemIndex: string;
  setIndex: string;
}

export interface ValidationResult {
  isValid: boolean;
  unresolvedSets: UnresolvedSet[];
}

/**
 * Validates whether all sets in a session have been resolved (completed or
 * skipped). Returns a list of unresolved sets with contextual info for the UI.
 */
export async function validateSessionCompletion(sessionId: string): Promise<ValidationResult> {
  const groups = await SessionRepository.getGroupsBySession(sessionId);

  const unresolvedSets: UnresolvedSet[] = [];

  for (const group of groups) {
    const items = await SessionRepository.getItemsByGroup(group.id);

    for (const item of items) {
      const sets = await SessionRepository.getSetsByItem(item.id);

      // Look up the exercise name
      const exercise = await ExerciseRepository.getById(item.exerciseId);
      const exerciseName = exercise?.name ?? 'Unknown';

      for (const set of sets) {
        if (!set.isCompleted && !set.isSkipped && set.actualCount == null && set.actualLoad == null) {
          unresolvedSets.push({
            set,
            exerciseName,
            groupIndex: group.orderIndex,
            itemIndex: item.orderIndex,
            setIndex: set.orderIndex,
          });
        }
      }
    }
  }

  return {
    isValid: unresolvedSets.length === 0,
    unresolvedSets,
  };
}
