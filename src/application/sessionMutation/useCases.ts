import { nanoid } from 'nanoid';

import type {
  ExerciseSubstitution,
  SessionExerciseGroup,
  SessionExerciseItem,
  SessionSet,
} from '@/domain/entities';
import { ExerciseGroupType, SetType, ToFailureIndicator } from '@/domain/enums';
import { generateSequentialRanks, getInitialRank, getRankBetween } from '@/lib/lexorank';

import type {
  SessionMutationCommands,
  SessionMutationExercisePort,
  SessionMutationPersistencePort,
  ValidationResult,
} from './ports';

const DEFAULT_WORKING_SETS = 3;

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

export class SessionMutationUseCases implements SessionMutationCommands {
  constructor(
    private readonly persistence: SessionMutationPersistencePort,
    private readonly exercises: SessionMutationExercisePort,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async swapExercise(itemId: string, exerciseId: string, plannedWorkoutId?: string): Promise<void> {
    const item = await this.persistence.getItem(itemId);
    if (!item) throw new Error(`SessionExerciseItem ${itemId} not found`);

    const originalExerciseId = item.originalExerciseId ?? item.exerciseId;
    const allSets = await this.persistence.getSetsByItem(itemId);
    const keptSets = allSets.filter(set => set.isCompleted || set.isSkipped);
    const incompleteSets = allSets.filter(set => !set.isCompleted && !set.isSkipped);
    const deleteSetIds = incompleteSets.map(set => set.id);

    const newSets: SessionSet[] = [];
    let previousRank = keptSets.at(-1)?.orderIndex;
    for (let index = 0; index < Math.max(DEFAULT_WORKING_SETS, incompleteSets.length); index++) {
      const orderIndex = getRankBetween(previousRank, null);
      newSets.push(createFallbackSet(itemId, orderIndex));
      previousRank = orderIndex;
    }

    let substitution: ExerciseSubstitution | undefined;
    if (plannedWorkoutId && item.plannedExerciseItemId) {
      substitution = {
        id: nanoid(),
        plannedExerciseItemId: item.plannedExerciseItemId,
        plannedWorkoutId,
        originalExerciseId,
        substitutedExerciseId: exerciseId,
        sessionId: '',
        createdAt: this.now(),
      };
      const group = await this.persistence.getGroup(item.sessionExerciseGroupId);
      if (group) {
        substitution.sessionId = group.workoutSessionId;
      }
    }

    await this.persistence.swapExercise(itemId, exerciseId, deleteSetIds, newSets, substitution);
  }

  async addExercise(
    sessionId: string,
    exerciseId: string,
    insertBeforeGroupIndex: number,
    groupType: ExerciseGroupType = ExerciseGroupType.Standard,
  ): Promise<{ groupId: string; itemId: string }> {
    const groupId = nanoid();
    const itemId = nanoid();
    const groups = await this.persistence.getGroupsBySession(sessionId);
    const previousGroup = groups[insertBeforeGroupIndex - 1];
    const nextGroup = groups[insertBeforeGroupIndex];

    const group: SessionExerciseGroup = {
      id: groupId,
      workoutSessionId: sessionId,
      groupType,
      orderIndex: getRankBetween(previousGroup?.orderIndex, nextGroup?.orderIndex),
      isCompleted: false,
    };
    const item: SessionExerciseItem = {
      id: itemId,
      sessionExerciseGroupId: groupId,
      exerciseId,
      orderIndex: getInitialRank(),
      isCompleted: false,
    };
    const sets = this.createFallbackSets(itemId);

    await this.persistence.addGroupWithItemsAndSets(group, [item], sets);
    return { groupId, itemId };
  }

  async addSuperset(
    sessionId: string,
    exerciseIds: string[],
    insertBeforeGroupIndex: number,
    groupType: ExerciseGroupType = ExerciseGroupType.Superset,
  ): Promise<{ groupId: string; itemIds: string[] }> {
    const groupId = nanoid();
    const itemIds = exerciseIds.map(() => nanoid());
    const groups = await this.persistence.getGroupsBySession(sessionId);
    const previousGroup = groups[insertBeforeGroupIndex - 1];
    const nextGroup = groups[insertBeforeGroupIndex];
    const group: SessionExerciseGroup = {
      id: groupId,
      workoutSessionId: sessionId,
      groupType,
      orderIndex: getRankBetween(previousGroup?.orderIndex, nextGroup?.orderIndex),
      isCompleted: false,
    };
    const ranks = generateSequentialRanks(exerciseIds.length);
    const items: SessionExerciseItem[] = exerciseIds.map((exerciseId, index) => ({
      id: itemIds[index],
      sessionExerciseGroupId: groupId,
      exerciseId,
      orderIndex: ranks[index],
      isCompleted: false,
    }));
    const sets = itemIds.flatMap(itemId => this.createFallbackSets(itemId));

    await this.persistence.addGroupWithItemsAndSets(group, items, sets);
    return { groupId, itemIds };
  }

  async removeExercise(itemId: string): Promise<void> {
    await this.persistence.removeExercise(itemId);
  }

  async validateSessionCompletion(sessionId: string): Promise<ValidationResult> {
    const groups = await this.persistence.getGroupsBySession(sessionId);
    const unresolvedSets = [];

    for (const group of groups) {
      const items = await this.persistence.getItemsByGroup(group.id);
      for (const item of items) {
        const [sets, exerciseName] = await Promise.all([
          this.persistence.getSetsByItem(item.id),
          this.exercises.getExerciseName(item.exerciseId),
        ]);
        for (const set of sets) {
          if (!set.isCompleted && !set.isSkipped && set.actualCount == null && set.actualLoad == null) {
            unresolvedSets.push({
              set,
              exerciseName: exerciseName ?? 'Unknown',
              groupIndex: group.orderIndex,
              itemIndex: item.orderIndex,
              setIndex: set.orderIndex,
            });
          }
        }
      }
    }

    return { isValid: unresolvedSets.length === 0, unresolvedSets };
  }

  private createFallbackSets(itemId: string): SessionSet[] {
    const sets: SessionSet[] = [];
    let previousRank: string | undefined;
    for (let index = 0; index < DEFAULT_WORKING_SETS; index++) {
      const orderIndex = getRankBetween(previousRank, null);
      sets.push(createFallbackSet(itemId, orderIndex));
      previousRank = orderIndex;
    }
    return sets;
  }
}
