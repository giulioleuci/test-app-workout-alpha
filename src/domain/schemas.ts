import { z } from 'zod';
import {
  ExerciseType, Muscle, Equipment, MovementPattern, CounterType, MuscleGroup,
  ObjectiveType, WorkType, PlannedWorkoutStatus, PlannedSessionStatus,
  ExerciseGroupType, SetType, ToFailureIndicator, ComplianceStatus,
  FatigueProgressionStatus,
} from './enums';

// ===== Shared Value Object Schemas =====

const NumericRangeSchema = z.object({
  min: z.number(),
  max: z.number().nullable(),
  isFixed: z.boolean(),
});

const RPERangeSchema = z.object({
  min: z.number().min(6).max(10),
  max: z.number().min(6).max(10),
});

const LoadRangeSchema = z.object({
  min: z.number().nonnegative(),
  max: z.number().nonnegative().nullable(),
  unit: z.enum(['kg', 'lbs']),
});

const CountRangeSchema = z.object({
  min: z.number().int().nonnegative(),
  max: z.number().int().nonnegative().nullable(),
  toFailure: z.nativeEnum(ToFailureIndicator),
});

const SetCountRangeSchema = z.object({
  min: z.number().int().positive(),
  max: z.number().int().positive().optional(),
  stopCriteria: z.enum(['maxSets', 'rpeCeiling', 'velocityLoss', 'technicalBreakdown']).optional(),
});

const Percentage1RMRangeSchema = z.object({
  min: z.number().min(0).max(1),
  max: z.number().min(0).max(1),
  basedOnEstimated1RM: z.boolean(),
});

const FatigueProgressionProfileSchema = z.object({
  expectedRPEIncrementPerSet: z.number().positive(),
  tolerance: z.number().nonnegative(),
});

const SetModifierSchema = z.object({
  type: z.enum(['cluster', 'dropSet', 'myoRep', 'topSet', 'backOff']),
  config: z.record(z.unknown()),
});

const WarmupSetConfigurationSchema = z.object({
  id: z.string().optional(),
  counter: z.number().int().nonnegative().optional(),
  percentOfWorkSet: z.number().min(0).max(100),
  restSeconds: z.number().nonnegative(),
});

// ===== Exercise Domain =====

export const ExerciseVersionSchema = z.object({
  id: z.string().min(1),
  exerciseId: z.string().min(1),
  name: z.string().min(1),
  type: z.nativeEnum(ExerciseType),
  primaryMuscles: z.array(z.nativeEnum(Muscle)),
  secondaryMuscles: z.array(z.nativeEnum(Muscle)),
  equipment: z.array(z.nativeEnum(Equipment)),
  movementPattern: z.nativeEnum(MovementPattern),
  counterType: z.nativeEnum(CounterType),
  versionTimestamp: z.date(),
});

export const ExerciseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  type: z.nativeEnum(ExerciseType),
  primaryMuscles: z.array(z.nativeEnum(Muscle)).default([]),
  secondaryMuscles: z.array(z.nativeEnum(Muscle)).default([]),
  equipment: z.array(z.nativeEnum(Equipment)).default([]),
  movementPattern: z.nativeEnum(MovementPattern),
  counterType: z.nativeEnum(CounterType),
  defaultLoadUnit: z.enum(['kg', 'lbs']),
  notes: z.string().optional(),
  description: z.string().optional(),
  keyPoints: z.string().optional(),
  variantIds: z.array(z.string()).default([]),
  isArchived: z.boolean().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ===== Planning Domain =====

export const PlannedWorkoutSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  objectiveType: z.nativeEnum(ObjectiveType),
  workType: z.nativeEnum(WorkType),
  status: z.nativeEnum(PlannedWorkoutStatus),
  isArchived: z.boolean().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const PlannedSessionSchema = z.object({
  id: z.string().min(1),
  plannedWorkoutId: z.string().min(1),
  name: z.string().min(1),
  dayNumber: z.number().int().nonnegative(),
  focusMuscleGroups: z.array(z.nativeEnum(MuscleGroup)),
  status: z.nativeEnum(PlannedSessionStatus),
  notes: z.string().optional(),
  orderIndex: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const PlannedExerciseGroupSchema = z.object({
  id: z.string().min(1),
  plannedSessionId: z.string().min(1),
  groupType: z.nativeEnum(ExerciseGroupType),
  restBetweenRoundsSeconds: z.number().nonnegative().optional(),
  orderIndex: z.string().min(1),
  notes: z.string().optional(),
});

export const PlannedExerciseItemSchema = z.object({
  id: z.string().min(1),
  plannedExerciseGroupId: z.string().min(1),
  exerciseId: z.string().min(1),
  counterType: z.nativeEnum(CounterType),
  modifiers: z.array(SetModifierSchema).optional(),
  orderIndex: z.string().min(1),
  notes: z.string().optional(),
  warmupSets: z.array(WarmupSetConfigurationSchema).optional(),
  targetXRM: z.number().int().positive().optional(),
});

export const PlannedSetSchema = z.object({
  id: z.string().min(1),
  plannedExerciseItemId: z.string().min(1),
  setCountRange: SetCountRangeSchema,
  countRange: CountRangeSchema,
  loadRange: LoadRangeSchema.optional(),
  percentage1RMRange: Percentage1RMRangeSchema.optional(),
  rpeRange: RPERangeSchema.optional(),
  restSecondsRange: NumericRangeSchema.optional(),
  fatigueProgressionProfile: FatigueProgressionProfileSchema.optional(),
  setType: z.nativeEnum(SetType),
  tempo: z.string().optional(),
  notes: z.string().optional(),
  orderIndex: z.string().min(1),
});

// ===== Execution Domain =====

export const WorkoutSessionSchema = z.object({
  id: z.string().min(1),
  plannedSessionId: z.string().optional(),
  plannedWorkoutId: z.string().optional(),
  startedAt: z.date(),
  completedAt: z.date().optional(),
  notes: z.string().optional(),
  overallRPE: z.number().min(0).max(10).optional(),
  totalSets: z.number().int().nonnegative().optional(),
  totalLoad: z.number().nonnegative().optional(),
  totalReps: z.number().int().nonnegative().optional(),
  totalDuration: z.number().nonnegative().optional(),
  primaryMusclesSnapshot: z.array(z.nativeEnum(Muscle)).optional(),
  secondaryMusclesSnapshot: z.array(z.nativeEnum(Muscle)).optional(),
});

export const SessionExerciseGroupSchema = z.object({
  id: z.string().min(1),
  workoutSessionId: z.string().min(1),
  plannedExerciseGroupId: z.string().optional(),
  groupType: z.nativeEnum(ExerciseGroupType),
  orderIndex: z.string().min(1),
  isCompleted: z.boolean(),
  completedAt: z.date().optional(),
});

export const SessionExerciseItemSchema = z.object({
  id: z.string().min(1),
  sessionExerciseGroupId: z.string().min(1),
  plannedExerciseItemId: z.string().optional(),
  exerciseId: z.string().min(1),
  exerciseVersionId: z.string().optional(),
  orderIndex: z.string().min(1),
  isCompleted: z.boolean(),
  notes: z.string().optional(),
  originalExerciseId: z.string().optional(),
  completedAt: z.date().optional(),
  performanceStatus: z.enum(['improving', 'stable', 'stagnant', 'deteriorating', 'insufficient_data']).optional(),
  hasRangeConstraint: z.boolean().optional(),
});

export const SessionSetSchema = z.object({
  id: z.string().min(1),
  sessionExerciseItemId: z.string().min(1),
  plannedSetId: z.string().optional(),
  setType: z.nativeEnum(SetType),
  orderIndex: z.string().min(1),
  actualLoad: z.number().nullable(),
  actualCount: z.number().int().nullable(),
  actualRPE: z.number().min(0).max(10).nullable(),
  actualToFailure: z.nativeEnum(ToFailureIndicator),
  expectedRPE: z.number().min(0).max(10).nullable(),
  completedAt: z.date().optional(),
  isCompleted: z.boolean(),
  isSkipped: z.boolean(),
  complianceStatus: z.nativeEnum(ComplianceStatus).optional(),
  fatigueProgressionStatus: z.nativeEnum(FatigueProgressionStatus).optional(),
  plannedVsActual: z.object({
    countDeviation: z.number().optional(),
    loadDeviation: z.number().optional(),
    rpeDeviation: z.number().optional(),
  }).optional(),
  tempo: z.string().optional(),
  partials: z.boolean(),
  forcedReps: z.number().int().nonnegative(),
  restSecondsBefore: z.number().nonnegative().optional(),
  notes: z.string().optional(),
  e1rm: z.number().nonnegative().optional(),
  relativeIntensity: z.number().optional(),
});

// ===== OneRepMax Domain =====

export const OneRepMaxRecordSchema = z.object({
  id: z.string().min(1),
  exerciseId: z.string().min(1),
  exerciseVersionId: z.string().optional(),
  value: z.number().positive(),
  valueMin: z.number().positive().optional(),
  valueMax: z.number().positive().optional(),
  errorPercentage: z.number().nonnegative().optional(),
  unit: z.enum(['kg', 'lbs']),
  method: z.enum(['direct', 'indirect']),
  testedLoad: z.number().positive().optional(),
  testedReps: z.number().int().positive().optional(),
  estimateBrzycki: z.number().positive().optional(),
  estimateEpley: z.number().positive().optional(),
  estimateLander: z.number().positive().optional(),
  estimateOConner: z.number().positive().optional(),
  estimateLombardi: z.number().positive().optional(),
  recordedAt: z.date(),
  notes: z.string().optional(),
});

// ===== Template Domain =====

const TemplateSetSchema = z.object({
  setCountRange: SetCountRangeSchema,
  countRange: CountRangeSchema,
  loadRange: LoadRangeSchema.optional(),
  percentage1RMRange: Percentage1RMRangeSchema.optional(),
  rpeRange: RPERangeSchema.optional(),
  restSecondsRange: NumericRangeSchema.optional(),
  fatigueProgressionProfile: FatigueProgressionProfileSchema.optional(),
  setType: z.nativeEnum(SetType),
  tempo: z.string().optional(),
  notes: z.string().optional(),
  orderIndex: z.string().min(1),
});

const TemplateItemSchema = z.object({
  exerciseId: z.string().min(1),
  counterType: z.nativeEnum(CounterType),
  modifiers: z.array(SetModifierSchema).optional(),
  orderIndex: z.string().min(1),
  notes: z.string().optional(),
  sets: z.array(TemplateSetSchema),
});

const TemplateGroupSchema = z.object({
  groupType: z.nativeEnum(ExerciseGroupType),
  restBetweenRoundsSeconds: z.number().nonnegative().optional(),
  orderIndex: z.string().min(1),
  notes: z.string().optional(),
  items: z.array(TemplateItemSchema),
});

const SessionTemplateContentSchema = z.object({
  focusMuscleGroups: z.array(z.nativeEnum(MuscleGroup)),
  notes: z.string().optional(),
  groups: z.array(TemplateGroupSchema),
});

export const SessionTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  content: SessionTemplateContentSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});
