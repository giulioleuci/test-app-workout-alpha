// ===== Domain Enumerations =====

export enum Muscle {
  Chest = 'chest',
  UpperBack = 'upperBack',
  LowerBack = 'lowerBack',
  Shoulders = 'shoulders',
  Quadriceps = 'quadriceps',
  Hamstrings = 'hamstrings',
  Calves = 'calves',
  Biceps = 'biceps',
  Triceps = 'triceps',
  Abs = 'abs',
  Glutes = 'glutes',
  Forearms = 'forearms',
  Traps = 'traps',
  Lats = 'lats',
  Deltoids = 'deltoids',
}

export enum MuscleGroup {
  Chest = 'chest',
  Back = 'back',
  Shoulders = 'shoulders',
  Arms = 'arms',
  Legs = 'legs',
  Core = 'core',
}

export const MuscleGroupMuscles: Record<MuscleGroup, Muscle[]> = {
  [MuscleGroup.Chest]: [Muscle.Chest],
  [MuscleGroup.Back]: [Muscle.Lats, Muscle.UpperBack, Muscle.Traps],
  [MuscleGroup.Shoulders]: [Muscle.Deltoids, Muscle.Shoulders],
  [MuscleGroup.Arms]: [Muscle.Biceps, Muscle.Triceps, Muscle.Forearms],
  [MuscleGroup.Legs]: [Muscle.Quadriceps, Muscle.Hamstrings, Muscle.Glutes, Muscle.Calves],
  [MuscleGroup.Core]: [Muscle.Abs, Muscle.LowerBack],
};

export enum MovementPattern {
  HorizontalPush = 'horizontalPush',
  HorizontalPull = 'horizontalPull',
  VerticalPush = 'verticalPush',
  VerticalPull = 'verticalPull',
  Squat = 'squat',
  Hinge = 'hinge',
  Rotation = 'rotation',
  Isometric = 'isometric',
  Other = 'other',
}

export enum CounterType {
  Reps = 'reps',
  Seconds = 'seconds',
  Minutes = 'minutes',
  DistanceMeter = 'distanceMeter',
  DistanceKMeter = 'distanceKMeter',
}

export interface CounterTypeInfo {
  supportsOneRepMax: boolean;
  step: number;
  supportsToFailure: boolean;
}

export const CounterTypeConfig: Record<CounterType, CounterTypeInfo> = {
  [CounterType.Reps]: { supportsOneRepMax: true, step: 1, supportsToFailure: true },
  [CounterType.Seconds]: { supportsOneRepMax: false, step: 1, supportsToFailure: true },
  [CounterType.Minutes]: { supportsOneRepMax: false, step: 1, supportsToFailure: false },
  [CounterType.DistanceMeter]: { supportsOneRepMax: false, step: 1, supportsToFailure: false },
  [CounterType.DistanceKMeter]: { supportsOneRepMax: false, step: 1, supportsToFailure: false },
};

export const INPUT_STEPS = {
  bodyWeight: 0.1,
  rpe: 0.5,
  load: 0.5,
  count: 1,
} as const;

export enum Equipment {
  Barbell = 'barbell',
  Dumbbell = 'dumbbell',
  Machine = 'machine',
  Cable = 'cable',
  Bodyweight = 'bodyweight',
  Kettlebell = 'kettlebell',
  SmithMachine = 'smithMachine',
  Band = 'band',
  CardioMachine = 'cardioMachine',
  Bench = 'bench',
  PullUpBar = 'pullUpBar',
  ParallelBars = 'parallelBars',
  Other = 'other',
}

export enum ExerciseGroupType {
  Standard = 'standard',
  Warmup = 'warmup',
  Superset = 'superset',
  Circuit = 'circuit',
  Amrap = 'amrap',
  Emom = 'emom',
  Cluster = 'cluster',
}

export enum ExerciseType {
  Compound = 'compound',
  Isolation = 'isolation',
}

export enum SetType {
  Warmup = 'warmup',
  Working = 'working',
  Backoff = 'backoff',
  ClusterMiniSet = 'clusterMiniSet',
}

export enum WorkType {
  Accumulation = 'accumulation',
  Intensification = 'intensification',
  Peak = 'peak',
  Deload = 'deload',
  Test = 'test',
  Other = 'other',
}

export enum ObjectiveType {
  AnatomicalAdaptation = 'anatomicalAdaptation',
  Hypertrophy = 'hypertrophy',
  GeneralStrength = 'generalStrength',
  MaxStrength = 'maxStrength',
  Power = 'power',
  MuscularEndurance = 'muscularEndurance',
  WorkCapacity = 'workCapacity',
  RehabPrehab = 'rehabPrehab',
  Other = 'other',
}

export enum ComplianceStatus {
  FullyCompliant = 'fullyCompliant',
  WithinRange = 'withinRange',
  BelowMinimum = 'belowMinimum',
  AboveMaximum = 'aboveMaximum',
  Incomplete = 'incomplete',
}

export enum FatigueProgressionStatus {
  Optimal = 'optimal',
  TooFast = 'tooFast',
  TooSlow = 'tooSlow',
  NotApplicable = 'notApplicable',
}

export enum ToFailureIndicator {
  None = 'none',
  TechnicalFailure = 'technicalFailure',
  AbsoluteFailure = 'absoluteFailure',
  BarSpeedFailure = 'barSpeedFailure',
}

export enum PlannedWorkoutStatus {
  Active = 'active',
  Inactive = 'inactive',
  Archived = 'archived',
}

export enum PlannedSessionStatus {
  Pending = 'pending',
  Active = 'active',
  Completed = 'completed',
  Skipped = 'skipped',
}
