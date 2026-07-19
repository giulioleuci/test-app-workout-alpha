import type {
  PlannedExerciseGroup,
  PlannedExerciseItem,
  PlannedSession,
  PlannedSet,
} from '@/domain/entities';

export interface PlannedSessionTemplateSource {
  session: PlannedSession;
  groups: {
    group: PlannedExerciseGroup;
    items: {
      item: PlannedExerciseItem;
      sets: PlannedSet[];
    }[];
  }[];
}

export interface PlannedSessionAggregate {
  session: PlannedSession;
  groups: PlannedExerciseGroup[];
  items: PlannedExerciseItem[];
  sets: PlannedSet[];
}

/** Persistence boundary for planned-session cloning and template conversion. */
export interface SessionTemplatePort {
  getTemplateSource(sessionId: string): Promise<PlannedSessionTemplateSource | null>;
  getSessionCountByWorkout(workoutId: string): Promise<number>;
  saveSession(aggregate: PlannedSessionAggregate): Promise<string>;
}
