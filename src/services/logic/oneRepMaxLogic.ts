// src/services/logic/oneRepMaxLogic.ts
/**
 * Pure 1RM estimation formulas.
 * No side effects — safe to call in Vitest without mocks.
 */

export function estimateBrzycki(load: number, reps: number): number | null {
  if (reps > 10 || reps < 1) return null;
  return load * 36 / (37 - reps);
}

export function estimateEpley(load: number, reps: number): number {
  return load * (1 + 0.0333 * reps);
}

export function estimateOConner(load: number, reps: number): number {
  return load * (1 + 0.025 * reps);
}

export function estimateLombardi(load: number, reps: number): number | null {
  if (reps > 6 || reps < 1) return null;
  return load * Math.pow(reps, 0.10);
}

export interface WeightedEstimate {
  media: number;
  errorPercentage: number;
}

/**
 * Weighted average of available 1RM estimates.
 * Brzycki gets double weight (≤10 reps); Lombardi included only for ≤6 reps.
 */
export function computeWeighted1RM(load: number, reps: number): WeightedEstimate {
  const estimates: number[] = [];

  const brzycki = estimateBrzycki(load, reps);
  if (brzycki !== null) estimates.push(brzycki, brzycki); // double weight

  const lombardi = estimateLombardi(load, reps);
  if (lombardi !== null) estimates.push(lombardi);

  estimates.push(estimateEpley(load, reps));
  estimates.push(estimateOConner(load, reps));

  const media = estimates.reduce((sum, v) => sum + v, 0) / estimates.length;
  const min = Math.min(...estimates);
  const max = Math.max(...estimates);
  const errorPercentage = media > 0 ? ((max - min) / media) * 100 / 2 : 0;

  return {
    media: Math.round(media * 10) / 10,
    errorPercentage: Math.round(errorPercentage * 10) / 10,
  };
}
