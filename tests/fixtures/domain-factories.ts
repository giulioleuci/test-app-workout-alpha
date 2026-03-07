import { Exercise, SessionExerciseGroup, SessionExerciseItem, SessionSet, WorkoutSession, ExerciseType } from '@/domain/entities';
import { nanoid } from 'nanoid';
import { RPE } from '@/domain/RPE';

export const createMockExercise = (overrides?: Partial<Exercise>): Exercise => ({
  id: nanoid(),
  name: 'Test Exercise',
  muscleGroups: [],
  movementPattern: 'Squat',
  equipment: 'Barbell',
  tier: 'T1',
  type: 'RPE',
  notes: '',
  ...overrides,
});

export const createMockSessionSet = (overrides?: Partial<SessionSet>): SessionSet => ({
  id: nanoid(),
  plannedSetId: nanoid(),
  completedAt: Date.now(),
  load: 100,
  reps: 5,
  rpe: 8,
  performanceStatus: 'stable',
  ...overrides,
});

export const createMockExerciseItem = (
  overrides?: Partial<SessionExerciseItem>
): SessionExerciseItem => ({
  id: nanoid(),
  plannedItemId: nanoid(),
  exerciseId: nanoid(),
  sets: [createMockSessionSet()],
  ...overrides,
});

export const createMockExerciseGroup = (
  overrides?: Partial<SessionExerciseGroup>
): SessionExerciseGroup => ({
  id: nanoid(),
  plannedGroupId: nanoid(),
  items: [createMockExerciseItem()],
  ...overrides,
});

export const createMockSession = (overrides?: Partial<WorkoutSession>): WorkoutSession => ({
  id: nanoid(),
  plannedSessionId: nanoid(),
  workoutId: nanoid(),
  completedAt: Date.now(),
  durationSeconds: 3600,
  groups: [createMockExerciseGroup()],
  ...overrides,
});
