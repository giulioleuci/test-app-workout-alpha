import { ToFailureIndicator } from './enums';

// ===== Range-Based Value Objects =====

export interface NumericRange {
  min: number;
  max: number | null; // null = infinity (e.g., "to failure")
  isFixed: boolean;   // true if min === max
}

export interface RPERange {
  min: number;  // 6.0 - 10.0, typically in 0.5 increments
  max: number;
}

export interface Percentage1RMRange {
  min: number;  // 0.40 - 1.00
  max: number;
  basedOnEstimated1RM: boolean;
}

export interface LoadRange {
  min: number;
  max: number | null;
  unit: 'kg' | 'lbs';
}

export interface CountRange {
  min: number;
  max: number | null; // null = to failure
  toFailure: ToFailureIndicator;
}

export interface SetCountRange {
  min: number;
  max?: number;       // undefined = uguale a min (nessun range)
  stopCriteria?: 'maxSets' | 'rpeCeiling' | 'velocityLoss' | 'technicalBreakdown';
}

export interface FatigueProgressionProfile {
  expectedRPEIncrementPerSet: number; // Typically 0.5 or 1.0
  tolerance: number;                  // Acceptable deviation
}

// ===== Cluster Set Parameters =====

export interface ClusterSetParams {
  totalRepsTarget: number;           // Rep totali obiettivo (es. 10)
  miniSetReps: number;               // Rep per mini-set (es. 2-3)
  miniSetCount: number;              // Numero mini-set attesi (calcolato o manuale)
  interMiniSetRestSeconds: number;   // Riposo tra mini-set (es. 15-30s)
  loadReductionPercent?: number;     // Riduzione carico % per mini-set (0 = stesso carico, 25 = -25%)
  miniSetToFailure: boolean;         // Se i mini-set vanno a cedimento
  rpeRange?: RPERange;               // RPE target per i mini-set
}

// ===== Set Modifier Configs =====

export interface DropSetConfig {
  loadReductionPercent: number;
  sets: number;
}

export interface MyoRepConfig {
  activationReps: number;
  miniSetReps: number;
  restSeconds: number;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TopSetConfig { /* future */ }

export interface BackOffConfig {
  loadReductionPercent: number;
  rpeTarget?: number;
}

// ===== Composable Set Modifiers =====

export type SetModifier =
  | { type: 'cluster'; config: ClusterSetParams }
  | { type: 'dropSet'; config: DropSetConfig }
  | { type: 'myoRep'; config: MyoRepConfig }
  | { type: 'topSet'; config: TopSetConfig }
  | { type: 'backOff'; config: BackOffConfig };

export type SetModifierType = SetModifier['type'];

// ===== Modifier Helpers =====

/** Extract a specific modifier from the array by type. */
export function getModifier<T extends SetModifierType>(
  modifiers: SetModifier[] | undefined,
  type: T,
): Extract<SetModifier, { type: T }> | undefined {
  return modifiers?.find((m): m is Extract<SetModifier, { type: T }> => m.type === type);
}

/** Shorthand: extract ClusterSetParams config from modifiers. */
export function getClusterConfig(modifiers: SetModifier[] | undefined): ClusterSetParams | undefined {
  return getModifier(modifiers, 'cluster')?.config;
}

/** Check if a modifier of the given type exists. */
export function hasModifier(modifiers: SetModifier[] | undefined, type: SetModifierType): boolean {
  return modifiers?.some(m => m.type === type) ?? false;
}
