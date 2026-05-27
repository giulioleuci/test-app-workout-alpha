/**
 * Shared, pure set-statistics helpers.
 * No db access, no formatting, no i18n.
 */
import type { SessionSet } from '@/domain/entities';
import { calculateWeighted1RM } from '@/services/rpePercentageTable';

export const isCompletedSet = (s: SessionSet) => s.isCompleted;
export const isEffectiveSet = (s: SessionSet) => s.isCompleted && !s.isSkipped;

export const filterCompleted = (sets: SessionSet[]) => sets.filter(isCompletedSet);
export const filterEffective = (sets: SessionSet[]) => sets.filter(isEffectiveSet);

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
