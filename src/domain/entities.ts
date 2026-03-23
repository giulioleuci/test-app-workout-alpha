import {
  Muscle, MuscleGroup, MovementPattern, CounterType, Equipment,
  ExerciseGroupType, ExerciseType, SetType, WorkType, ObjectiveType,
  ComplianceStatus, FatigueProgressionStatus, ToFailureIndicator,
  PlannedWorkoutStatus, PlannedSessionStatus,
} from './enums';
import {
  NumericRange, RPERange, Percentage1RMRange, LoadRange,
  CountRange, SetCountRange, FatigueProgressionProfile,
} from './value-objects';
import type { SetModifier } from './value-objects';

// ===== Exercise Library =====

export interface Exercise {
  id: string;
  name: string; // Keep at the root for easy UI display of current name
  type: ExerciseType; // Keep at the root for easy UI display of current type
  primaryMuscles: Muscle[]; // Keep at the root
  secondaryMuscles: Muscle[]; // Keep at the root
  equipment: Equipment[]; // Keep at the root
  movementPattern: MovementPattern; // Keep at the root
  counterType: CounterType; // Keep at the root
  defaultLoadUnit: 'kg' | 'lbs';
  notes?: string;
  description?: string;
  keyPoints?: string;
  variantIds: string[];
  isArchived?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExerciseVersion {
  id: string;
  exerciseId: string;
  name: string;
  type: ExerciseType;
  primaryMuscles: Muscle[];
  secondaryMuscles: Muscle[];
  equipment: Equipment[];
  movementPattern: MovementPattern;
  counterType: CounterType;
  versionTimestamp: Date;
}

// ===== Planning Hierarchy =====

export interface PlannedWorkout {
  id: string;
  name: string;
  description?: string;
  objectiveType: ObjectiveType;
  workType: WorkType;

  status: PlannedWorkoutStatus;
  isArchived?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlannedSession {
  id: string;
  plannedWorkoutId: string;
  name: string;
  dayNumber: number;
  focusMuscleGroups: MuscleGroup[];
  status: PlannedSessionStatus;
  notes?: string;
  orderIndex: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlannedExerciseGroup {
  id: string;
  plannedSessionId: string;
  groupType: ExerciseGroupType;
  /** Rest between completing one full round and starting the next (for interleaved groups) */
  restBetweenRoundsSeconds?: number;
  orderIndex: string;
  notes?: string;
}

export interface WarmupSetConfiguration {
  id?: string;
  counter?: number;
  percentOfWorkSet: number;
  restSeconds: number;
}

export interface PlannedExerciseItem {
  id: string;
  plannedExerciseGroupId: string;
  exerciseId: string;
  counterType: CounterType;
  modifiers?: SetModifier[];
  orderIndex: string;
  notes?: string;
  warmupSets?: WarmupSetConfiguration[];
  /** Target number of repetitions for load calculation (e.g., 5 for 5RM) */
  targetXRM?: number;
}

export interface PlannedSet {
  id: string;
  plannedExerciseItemId: string;
  setCountRange: SetCountRange;
  countRange: CountRange;
  loadRange?: LoadRange;
  percentage1RMRange?: Percentage1RMRange;
  rpeRange?: RPERange;
  restSecondsRange?: NumericRange;
  fatigueProgressionProfile?: FatigueProgressionProfile;
  setType: SetType;
  tempo?: string;
  notes?: string;
  orderIndex: string;
}

// ===== Execution Hierarchy =====

export interface WorkoutSession {
  id: string;
  plannedSessionId?: string;
  plannedWorkoutId?: string;
  startedAt: Date;
  completedAt?: Date;
  notes?: string;
  overallRPE?: number;
  totalSets?: number;
  totalLoad?: number;
  totalReps?: number;
  totalDuration?: number; // in seconds
  primaryMusclesSnapshot?: Muscle[];
  secondaryMusclesSnapshot?: Muscle[];
}

export interface SessionExerciseGroup {
  id: string;
  workoutSessionId: string;
  plannedExerciseGroupId?: string;
  groupType: ExerciseGroupType;
  orderIndex: string;
  isCompleted: boolean;
  completedAt?: Date;
}

export interface SessionExerciseItem {
  id: string;
  sessionExerciseGroupId: string;
  plannedExerciseItemId?: string;
  exerciseId: string;
  exerciseVersionId?: string;
  orderIndex: string;
  isCompleted: boolean;
  notes?: string;
  originalExerciseId?: string;
  completedAt?: Date;
  performanceStatus?: 'improving' | 'stable' | 'stagnant' | 'deteriorating' | 'insufficient_data';
  hasRangeConstraint?: boolean;
}

export interface SessionSet {
  id: string;
  sessionExerciseItemId: string;
  plannedSetId?: string;
  setType: SetType;
  orderIndex: string;
  actualLoad: number | null;
  actualCount: number | null;
  actualRPE: number | null;
  actualToFailure: ToFailureIndicator;
  expectedRPE: number | null;
  completedAt?: Date;
  isCompleted: boolean;
  isSkipped: boolean;
  complianceStatus?: ComplianceStatus;
  fatigueProgressionStatus?: FatigueProgressionStatus;
  plannedVsActual?: {
    countDeviation?: number;
    loadDeviation?: number;
    rpeDeviation?: number;
  };
  tempo?: string;
  partials: boolean;
  forcedReps: number;
  restSecondsBefore?: number;
  notes?: string;
  e1rm?: number;
  relativeIntensity?: number;
}

// ===== Shared Reference Entities =====

export interface OneRepMaxRecord {
  id: string;
  exerciseId: string;
  exerciseVersionId?: string;
  value: number;
  valueMin?: number;
  valueMax?: number;
  errorPercentage?: number;
  unit: 'kg' | 'lbs';
  method: 'direct' | 'indirect';
  testedLoad?: number;
  testedReps?: number;
  estimateBrzycki?: number;
  estimateEpley?: number;
  estimateLander?: number;
  estimateOConner?: number;
  estimateLombardi?: number;
  recordedAt: Date;
  notes?: string;
}

export interface UserRegulationProfile {
  id: string;
  preferredSuggestionMethod: 'percentage1RM' | 'lastSession' | 'plannedRPE';
  fatigueSensitivity: 'low' | 'medium' | 'high';
  autoStartRestTimer: boolean;
  simpleMode: boolean;
  updatedAt: Date;
}

export const DEFAULT_REGULATION_PROFILE: Omit<UserRegulationProfile, 'updatedAt'> = {
  id: 'default',
  preferredSuggestionMethod: 'percentage1RM',
  fatigueSensitivity: 'medium',
  autoStartRestTimer: true,
  simpleMode: false,
};

// ===== Session Templates =====

export interface SessionTemplateContent {
  focusMuscleGroups: import('./enums').MuscleGroup[];
  notes?: string;
  groups: {
    groupType: import('./enums').ExerciseGroupType;
    restBetweenRoundsSeconds?: number;
    orderIndex: string;
    notes?: string;
    items: {
      exerciseId: string;
      counterType: import('./enums').CounterType;
      modifiers?: import('./value-objects').SetModifier[];
      orderIndex: string;
      notes?: string;
      sets: Omit<PlannedSet, 'id' | 'plannedExerciseItemId'>[];
    }[];
  }[];
}

export interface SessionTemplate {
  id: string;
  name: string;
  description?: string;
  content: SessionTemplateContent;
  createdAt: Date;
  updatedAt: Date;
}

// ===== User Profile & Body Weight =====

export interface UserProfile {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'undisclosed';
  createdAt: Date;
  updatedAt: Date;
}

export interface BodyWeightRecord {
  id: string;
  weight: number; // kg
  recordedAt: Date;
  notes?: string;
}

export interface ExerciseSubstitution {
  id: string;
  plannedExerciseItemId: string;
  plannedWorkoutId: string;
  originalExerciseId: string;
  substitutedExerciseId: string;
  sessionId: string;
  createdAt: Date;
}
