import { z } from 'zod';

import {
  Muscle, MuscleGroup, MovementPattern, CounterType, Equipment,
  ExerciseGroupType, SetType, WorkType, ObjectiveType,
  ComplianceStatus, ToFailureIndicator,
  PlannedWorkoutStatus, PlannedSessionStatus, ExerciseType,
} from '@/domain/enums';

import type { TableName } from './backupService';

// ===== Constants =====

export const MAX_ID_LENGTH = 100;
export const MAX_NAME_LENGTH = 255;
export const MAX_DESCRIPTION_LENGTH = 5000;
export const MAX_NOTE_LENGTH = 10000;
export const MAX_TEMPO_LENGTH = 50;

// ===== Value Objects Schemas =====

const NumericRangeSchema = z.object({
  min: z.number(),
  max: z.number().nullable(),
  isFixed: z.boolean(),
});

const RPERangeSchema = z.object({
  min: z.number(),
  max: z.number(),
});

const Percentage1RMRangeSchema = z.object({
  min: z.number(),
  max: z.number(),
  basedOnEstimated1RM: z.boolean(),
});

const LoadRangeSchema = z.object({
  min: z.number(),
  max: z.number().nullable(),
  unit: z.enum(['kg', 'lbs']),
});

const CountRangeSchema = z.object({
  min: z.number(),
  max: z.number().nullable(),
  toFailure: z.nativeEnum(ToFailureIndicator),
});

const SetCountRangeSchema = z.object({
  min: z.number(),
  max: z.number().optional(),
  stopCriteria: z.enum(['maxSets', 'rpeCeiling', 'velocityLoss', 'technicalBreakdown']).optional(),
});

const FatigueProgressionProfileSchema = z.object({
  expectedRPEIncrementPerSet: z.number(),
  tolerance: z.number(),
});

const ClusterSetParamsSchema = z.object({
  totalRepsTarget: z.number(),
  miniSetReps: z.number(),
  miniSetCount: z.number(),
  interMiniSetRestSeconds: z.number(),
  loadReductionPercent: z.number().optional(),
  miniSetToFailure: z.boolean(),
  rpeRange: RPERangeSchema.optional(),
});

const SetModifierSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('cluster'), config: ClusterSetParamsSchema }),
  z.object({ type: z.literal('dropSet'), config: z.object({ loadReductionPercent: z.number(), sets: z.number() }) }),
  z.object({ type: z.literal('myoRep'), config: z.object({ activationReps: z.number(), miniSetReps: z.number(), restSeconds: z.number() }) }),
  z.object({ type: z.literal('topSet'), config: z.object({}) }),
  z.object({ type: z.literal('backOff'), config: z.object({ loadReductionPercent: z.number(), rpeTarget: z.number().optional() }) }),
]);

const WarmupSetConfigurationSchema = z.object({
  counter: z.number().optional(),
  percentOfWorkSet: z.number(),
  restSeconds: z.number(),
});

// ===== Entity Schemas =====

const ExerciseSchema = z.object({
  id: z.string().max(MAX_ID_LENGTH),
  name: z.string().max(MAX_NAME_LENGTH),
  primaryMuscles: z.array(z.nativeEnum(Muscle)),
  secondaryMuscles: z.array(z.nativeEnum(Muscle)),
  equipment: z.array(z.nativeEnum(Equipment)),
  movementPattern: z.nativeEnum(MovementPattern),
  counterType: z.nativeEnum(CounterType),
  defaultLoadUnit: z.enum(['kg', 'lbs']),
  notes: z.string().max(MAX_NOTE_LENGTH).optional(),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
  keyPoints: z.string().max(MAX_NOTE_LENGTH).optional(),
  variantIds: z.array(z.string().max(MAX_ID_LENGTH)).optional(),
  isArchived: z.boolean().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const ExerciseVersionSchema = z.object({
  id: z.string().max(MAX_ID_LENGTH),
  exerciseId: z.string().max(MAX_ID_LENGTH),
  name: z.string().max(MAX_NAME_LENGTH),
  type: z.nativeEnum(ExerciseType),
  primaryMuscles: z.array(z.nativeEnum(Muscle)),
  secondaryMuscles: z.array(z.nativeEnum(Muscle)),
  equipment: z.array(z.nativeEnum(Equipment)),
  movementPattern: z.nativeEnum(MovementPattern),
  counterType: z.nativeEnum(CounterType),
  versionTimestamp: z.date(),
});

const PlannedWorkoutSchema = z.object({
  id: z.string().max(MAX_ID_LENGTH),
  name: z.string().max(MAX_NAME_LENGTH),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
  objectiveType: z.nativeEnum(ObjectiveType),
  workType: z.nativeEnum(WorkType),
  status: z.nativeEnum(PlannedWorkoutStatus),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const PlannedSessionSchema = z.object({
  id: z.string().max(MAX_ID_LENGTH),
  plannedWorkoutId: z.string().max(MAX_ID_LENGTH),
  name: z.string().max(MAX_NAME_LENGTH),
  dayNumber: z.number(),
  focusMuscleGroups: z.array(z.nativeEnum(MuscleGroup)),
  status: z.nativeEnum(PlannedSessionStatus),
  notes: z.string().max(MAX_NOTE_LENGTH).optional(),
  orderIndex: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const PlannedExerciseGroupSchema = z.object({
  id: z.string().max(MAX_ID_LENGTH),
  plannedSessionId: z.string().max(MAX_ID_LENGTH),
  groupType: z.nativeEnum(ExerciseGroupType),
  restBetweenRoundsSeconds: z.number().optional(),
  orderIndex: z.string(),
  notes: z.string().max(MAX_NOTE_LENGTH).optional(),
});

const PlannedExerciseItemSchema = z.object({
  id: z.string().max(MAX_ID_LENGTH),
  plannedExerciseGroupId: z.string().max(MAX_ID_LENGTH),
  exerciseId: z.string().max(MAX_ID_LENGTH),
  counterType: z.nativeEnum(CounterType),
  modifiers: z.array(SetModifierSchema).optional(),
  orderIndex: z.string(),
  notes: z.string().max(MAX_NOTE_LENGTH).optional(),
  warmupSets: z.array(WarmupSetConfigurationSchema).optional(),
  targetXRM: z.number().optional(),
});

const PlannedSetSchema = z.object({
  id: z.string().max(MAX_ID_LENGTH),
  plannedExerciseItemId: z.string().max(MAX_ID_LENGTH),
  setCountRange: SetCountRangeSchema,
  countRange: CountRangeSchema,
  loadRange: LoadRangeSchema.optional(),
  percentage1RMRange: Percentage1RMRangeSchema.optional(),
  rpeRange: RPERangeSchema.optional(),
  restSecondsRange: NumericRangeSchema.optional(),
  fatigueProgressionProfile: FatigueProgressionProfileSchema.optional(),
  setType: z.nativeEnum(SetType),
  tempo: z.string().max(MAX_TEMPO_LENGTH).optional(),
  notes: z.string().max(MAX_NOTE_LENGTH).optional(),
  orderIndex: z.string(),
});

const WorkoutSessionSchema = z.object({
  id: z.string().max(MAX_ID_LENGTH),
  plannedSessionId: z.string().max(MAX_ID_LENGTH).optional(),
  plannedWorkoutId: z.string().max(MAX_ID_LENGTH).optional(),
  startedAt: z.date(),
  completedAt: z.date().optional(),
  notes: z.string().max(MAX_NOTE_LENGTH).optional(),
  overallRPE: z.number().optional(),
});

const SessionExerciseGroupSchema = z.object({
  id: z.string().max(MAX_ID_LENGTH),
  workoutSessionId: z.string().max(MAX_ID_LENGTH),
  plannedExerciseGroupId: z.string().max(MAX_ID_LENGTH).optional(),
  groupType: z.nativeEnum(ExerciseGroupType),
  orderIndex: z.string(),
  isCompleted: z.boolean(),
});

const SessionExerciseItemSchema = z.object({
  id: z.string().max(MAX_ID_LENGTH),
  sessionExerciseGroupId: z.string().max(MAX_ID_LENGTH),
  plannedExerciseItemId: z.string().max(MAX_ID_LENGTH).optional(),
  exerciseId: z.string().max(MAX_ID_LENGTH),
  exerciseVersionId: z.string().max(MAX_ID_LENGTH).optional(),
  orderIndex: z.string(),
  isCompleted: z.boolean(),
  notes: z.string().max(MAX_NOTE_LENGTH).optional(),
});

const SessionSetSchema = z.object({
  id: z.string().max(MAX_ID_LENGTH),
  sessionExerciseItemId: z.string().max(MAX_ID_LENGTH),
  plannedSetId: z.string().max(MAX_ID_LENGTH).optional(),
  setType: z.nativeEnum(SetType),
  orderIndex: z.string(),
  actualLoad: z.number().nullable(),
  actualCount: z.number().nullable(),
  actualRPE: z.number().nullable(),
  actualToFailure: z.nativeEnum(ToFailureIndicator),
  expectedRPE: z.number().nullable(),
  completedAt: z.date().optional(),
  isCompleted: z.boolean(),
  isSkipped: z.boolean(),
  complianceStatus: z.nativeEnum(ComplianceStatus).optional(),
  fatigueProgressionStatus: z.enum(['optimal', 'tooFast', 'tooSlow', 'notApplicable']).optional(),
  plannedVsActual: z.object({
    countDeviation: z.number().optional(),
    loadDeviation: z.number().optional(),
    rpeDeviation: z.number().optional(),
  }).optional(),
  tempo: z.string().max(MAX_TEMPO_LENGTH).optional(),
  partials: z.boolean(),
  forcedReps: z.number(),
  restSecondsBefore: z.number().optional(),
  notes: z.string().max(MAX_NOTE_LENGTH).optional(),
});

const OneRepMaxRecordSchema = z.object({
  id: z.string().max(MAX_ID_LENGTH),
  exerciseId: z.string().max(MAX_ID_LENGTH),
  exerciseVersionId: z.string().max(MAX_ID_LENGTH).optional(),
  value: z.number(),
  valueMin: z.number().optional(),
  valueMax: z.number().optional(),
  errorPercentage: z.number().optional(),
  unit: z.enum(['kg', 'lbs']),
  method: z.enum(['direct', 'indirect']),
  testedLoad: z.number().optional(),
  testedReps: z.number().optional(),
  estimateBrzycki: z.number().optional(),
  estimateEpley: z.number().optional(),
  estimateLander: z.number().optional(),
  estimateOConner: z.number().optional(),
  estimateLombardi: z.number().optional(),
  recordedAt: z.date(),
  notes: z.string().max(MAX_NOTE_LENGTH).optional(),
});

const UserRegulationProfileSchema = z.object({
  id: z.string().max(MAX_ID_LENGTH),
  preferredSuggestionMethod: z.enum(['percentage1RM', 'lastSession', 'plannedRPE']),
  fatigueSensitivity: z.enum(['low', 'medium', 'high']),
  autoStartRestTimer: z.boolean(),
  updatedAt: z.date(),
});

const SessionTemplateContentSchema = z.object({
  focusMuscleGroups: z.array(z.nativeEnum(MuscleGroup)),
  notes: z.string().max(MAX_NOTE_LENGTH).optional(),
  groups: z.array(z.object({
    groupType: z.nativeEnum(ExerciseGroupType),
    restBetweenRoundsSeconds: z.number().optional(),
    orderIndex: z.string(),
    notes: z.string().max(MAX_NOTE_LENGTH).optional(),
    items: z.array(z.object({
      exerciseId: z.string().max(MAX_ID_LENGTH),
      counterType: z.nativeEnum(CounterType),
      modifiers: z.array(SetModifierSchema).optional(),
      orderIndex: z.string(),
      notes: z.string().max(MAX_NOTE_LENGTH).optional(),
      sets: z.array(PlannedSetSchema.omit({ id: true, plannedExerciseItemId: true })),
    })),
  })),
});

const SessionTemplateSchema = z.object({
  id: z.string().max(MAX_ID_LENGTH),
  name: z.string().max(MAX_NAME_LENGTH),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
  content: SessionTemplateContentSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

const UserProfileSchema = z.object({
  id: z.string().max(MAX_ID_LENGTH),
  name: z.string().max(MAX_NAME_LENGTH),
  gender: z.enum(['male', 'female', 'undisclosed']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const BodyWeightRecordSchema = z.object({
  id: z.string().max(MAX_ID_LENGTH),
  weight: z.number(),
  recordedAt: z.date(),
  notes: z.string().max(MAX_NOTE_LENGTH).optional(),
});

// ===== Validation Map =====

const SCHEMAS: Record<TableName, z.ZodSchema> = {
  exercises: ExerciseSchema,
  exerciseVersions: ExerciseVersionSchema,
  plannedWorkouts: PlannedWorkoutSchema,
  plannedSessions: PlannedSessionSchema,
  plannedExerciseGroups: PlannedExerciseGroupSchema,
  plannedExerciseItems: PlannedExerciseItemSchema,
  plannedSets: PlannedSetSchema,
  workoutSessions: WorkoutSessionSchema,
  sessionExerciseGroups: SessionExerciseGroupSchema,
  sessionExerciseItems: SessionExerciseItemSchema,
  sessionSets: SessionSetSchema,
  oneRepMaxRecords: OneRepMaxRecordSchema,
  userRegulationProfile: UserRegulationProfileSchema,
  sessionTemplates: SessionTemplateSchema,
  userProfile: UserProfileSchema,
  bodyWeightRecords: BodyWeightRecordSchema,
};

// ===== Validation Function =====

export function validateRecord(tableName: TableName, record: unknown): Record<string, unknown> | null {
  const schema = SCHEMAS[tableName];
  if (!schema) {
    console.warn(`No schema found for table: ${tableName}`);
    return null; // Fallback: fail-closed if no schema defined
  }
  const result = schema.safeParse(record);
  if (!result.success) {
    console.warn(`Validation failed for table ${tableName}:`, result.error);
    return null;
  }
  return result.data as Record<string, unknown>;
}
