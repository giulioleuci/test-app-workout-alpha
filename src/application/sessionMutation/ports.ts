import type {
  ExerciseSubstitution,
  SessionExerciseGroup,
  SessionExerciseItem,
  SessionSet,
} from '@/domain/entities';
import type { ExerciseGroupType } from '@/domain/enums';

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

/** Persistence operations required to change a session's exercise structure. */
export interface SessionMutationPersistencePort {
  getItem(id: string): Promise<SessionExerciseItem | undefined>;
  getSetsByItem(itemId: string): Promise<SessionSet[]>;
  getGroup(id: string): Promise<SessionExerciseGroup | undefined>;
  swapExercise(
    itemId: string,
    exerciseId: string,
    deleteSetIds: string[],
    newSets: SessionSet[],
    substitution?: ExerciseSubstitution,
  ): Promise<void>;
  getGroupsBySession(sessionId: string): Promise<SessionExerciseGroup[]>;
  addGroupWithItemsAndSets(
    group: SessionExerciseGroup,
    items: SessionExerciseItem[],
    sets: SessionSet[],
  ): Promise<void>;
  removeExercise(itemId: string): Promise<void>;
  getItemsByGroup(groupId: string): Promise<SessionExerciseItem[]>;
}

/** Read model needed only to present unresolved sets to the user. */
export interface SessionMutationExercisePort {
  getExerciseName(id: string): Promise<string | undefined>;
}

export interface SessionMutationCommands {
  swapExercise(itemId: string, exerciseId: string, plannedWorkoutId?: string): Promise<void>;
  addExercise(
    sessionId: string,
    exerciseId: string,
    insertBeforeGroupIndex: number,
    groupType?: ExerciseGroupType,
  ): Promise<{ groupId: string; itemId: string }>;
  addSuperset(
    sessionId: string,
    exerciseIds: string[],
    insertBeforeGroupIndex: number,
    groupType?: ExerciseGroupType,
  ): Promise<{ groupId: string; itemIds: string[] }>;
  removeExercise(itemId: string): Promise<void>;
  validateSessionCompletion(sessionId: string): Promise<ValidationResult>;
}
