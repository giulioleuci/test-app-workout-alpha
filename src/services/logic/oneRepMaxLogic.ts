// src/services/logic/oneRepMaxLogic.ts
/**
 * Pure 1RM estimation formulas.
 * No side effects — safe to call in Vitest without mocks.
 */

// Formula coefficients (kept next to the formulas — domain math).
const BRZYCKI_NUMERATOR = 36;
const BRZYCKI_DENOMINATOR_BASE = 37;
const BRZYCKI_MAX_REPS = 10;
const EPLEY_COEFFICIENT = 0.0333;
const OCONNER_COEFFICIENT = 0.025;
const LOMBARDI_EXPONENT = 0.10;
const LOMBARDI_MAX_REPS = 6;

export function estimateBrzycki(load: number, reps: number): number | null {
  if (reps > BRZYCKI_MAX_REPS || reps < 1) return null;
  return load * BRZYCKI_NUMERATOR / (BRZYCKI_DENOMINATOR_BASE - reps);
}

export function estimateEpley(load: number, reps: number): number {
  return load * (1 + EPLEY_COEFFICIENT * reps);
}

export function estimateOConner(load: number, reps: number): number {
  return load * (1 + OCONNER_COEFFICIENT * reps);
}

export function estimateLombardi(load: number, reps: number): number | null {
  if (reps > LOMBARDI_MAX_REPS || reps < 1) return null;
  return load * Math.pow(reps, LOMBARDI_EXPONENT);
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
