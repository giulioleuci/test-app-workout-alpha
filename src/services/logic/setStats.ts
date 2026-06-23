/**
 * Shared, pure set-statistics helpers.
 * No db access, no formatting, no i18n.
 */
import { calculateWeighted1RM } from '@/services/rpePercentageTable';

interface CompletionState {
  isCompleted: boolean;
  isSkipped?: boolean;
}

export const isCompletedSet = <T extends CompletionState>(s: T) => s.isCompleted;
export const isEffectiveSet = <T extends CompletionState>(s: T) => s.isCompleted && !s.isSkipped;
export const isPendingSet = <T extends CompletionState>(s: T) => !s.isCompleted && !s.isSkipped;

export const filterCompleted = <T extends CompletionState>(sets: T[]) => sets.filter(isCompletedSet);
export const filterEffective = <T extends CompletionState>(sets: T[]) => sets.filter(isEffectiveSet);
export const filterPending = <T extends CompletionState>(sets: T[]) => sets.filter(isPendingSet);

/** Minimal shape required to compute volume — works for SessionSet and flattened set rows. */
interface VolumeContribution {
  actualLoad: number | null;
  actualCount: number | null;
}

export const setVolume = (s: VolumeContribution) => (s.actualLoad ?? 0) * (s.actualCount ?? 0);
export const totalVolume = (sets: VolumeContribution[]) => sets.reduce((sum, s) => sum + setVolume(s), 0);

/** 1RM estimate + body-weight-relative intensity for a single completed set. */
export function computeSetEstimates(
  load: number | null | undefined,
  reps: number | null | undefined,
  rpe: number | null | undefined,
  bodyWeight?: number | null,
): { e1rm?: number; relativeIntensity?: number } {
  if (!(load != null && load > 0 && reps != null && reps > 0 && rpe != null && rpe > 0)) {
    return {};
  }
  const est = calculateWeighted1RM(load, reps, rpe).media;
  if (!est || est <= 0) return {};
  const out: { e1rm?: number; relativeIntensity?: number } = { e1rm: est };
  if (bodyWeight && bodyWeight > 0) {
    out.relativeIntensity = Math.round((est / bodyWeight) * 100) / 100;
  }
  return out;
}
