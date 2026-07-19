import type { SetComplianceResult, FatigueAnalysisResult } from '@/domain/analytics-types';
import type {
  SessionExerciseGroup, SessionExerciseItem, SessionSet, PlannedSet,
  PlannedExerciseGroup, PlannedExerciseItem, Exercise
} from '@/domain/entities';
import { ToFailureIndicator } from '@/domain/enums';

export interface LoadedGroup {
  group: SessionExerciseGroup;
  plannedGroup?: PlannedExerciseGroup;
  items: LoadedItem[];
}

export interface LoadedItem {
  item: SessionExerciseItem;
  exercise: Exercise | null;
  plannedItem?: PlannedExerciseItem;
  sets: SessionSet[];
  plannedSets: Record<string, PlannedSet>;
  occurrenceIndex: number;
}

export type DisplayUnit =
  | { type: 'group'; group: LoadedGroup; originalGroupIndex: number }
  | { type: 'item'; group: LoadedGroup; items: LoadedItem[]; originalGroupIndex: number; originalItemIndices: number[] };

export interface CurrentTarget {
  gi: number;
  ii: number;
  si: number;
  set: SessionSet;
  item: LoadedItem;
  group: LoadedGroup;
  /** For interleaved groups, the current round (0-based) */
  round?: number;
}

export interface SessionFeedback {
  compliance: SetComplianceResult | null;
  fatigue: FatigueAnalysisResult | null;
  forItemId: string;
}

export interface SetInputValue {
  actualLoad: number | null;
  actualCount: number | null;
  actualRPE: number | null;
  actualToFailure: ToFailureIndicator;
  partials: boolean;
  forcedReps: number;
  notes?: string;
}
