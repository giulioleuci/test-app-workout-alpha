import type {
    WorkoutSession, SessionExerciseGroup, SessionExerciseItem, SessionSet,
    PlannedWorkout, PlannedSession, PlannedExerciseGroup, PlannedExerciseItem, PlannedSet,
    Exercise
} from '@/domain/entities';
import type { Equipment, MovementPattern, Muscle } from '@/domain/enums';

export interface HydratedSessionItem {
    item: SessionExerciseItem;
    exercise: Exercise | null;
    sets: SessionSet[];
}

export interface HydratedSessionGroup {
    group: SessionExerciseGroup;
    items: HydratedSessionItem[];
}

export interface HydratedSession {
    session: WorkoutSession;
    groups: HydratedSessionGroup[];
}

export interface HydratedPlannedItem {
    item: PlannedExerciseItem;
    exercise: Exercise | null;
    sets: PlannedSet[];
}

export interface HydratedPlannedGroup {
    group: PlannedExerciseGroup;
    items: HydratedPlannedItem[];
}

export interface HydratedPlannedSession {
    session: PlannedSession;
    groups: HydratedPlannedGroup[];
}

export interface HydratedPlannedWorkout {
    workout: PlannedWorkout;
    sessions: HydratedPlannedSession[];
}

export interface ExerciseFilters {
    muscleGroups?: Muscle[];
    equipment?: Equipment[];
    movementPattern?: MovementPattern[];
    isArchived?: boolean;
    search?: string;
}
