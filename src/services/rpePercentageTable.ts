import { roundToHalf, roundTo01 } from '@/lib/math';

/**
 * RPE × Reps → %1RM lookup table (Tuchscherer/RTS-based).
 * Used for load suggestions and fatigue analysis.
 *
 * Row = reps (1–12), Column = RPE (6–10 in 0.5 steps)
 * Values are expressed as decimals (e.g., 0.88 = 88%).
 */

const TABLE: Record<number, Record<number, number>> = {
  1: { 10: 1.000, 9.5: 0.978, 9: 0.955, 8.5: 0.939, 8: 0.922, 7.5: 0.907, 7: 0.892, 6.5: 0.877, 6: 0.863, 5.5: 0.850, 5: 0.837, 4.5: 0.824, 4: 0.811 },
  2: { 10: 0.955, 9.5: 0.939, 9: 0.922, 8.5: 0.907, 8: 0.892, 7.5: 0.877, 7: 0.863, 6.5: 0.850, 6: 0.837, 5.5: 0.824, 5: 0.811, 4.5: 0.798, 4: 0.786 },
  3: { 10: 0.922, 9.5: 0.907, 9: 0.892, 8.5: 0.877, 8: 0.863, 7.5: 0.850, 7: 0.837, 6.5: 0.824, 6: 0.811, 5.5: 0.798, 5: 0.786, 4.5: 0.774, 4: 0.762 },
  4: { 10: 0.892, 9.5: 0.877, 9: 0.863, 8.5: 0.850, 8: 0.837, 7.5: 0.824, 7: 0.811, 6.5: 0.798, 6: 0.786, 5.5: 0.774, 5: 0.762, 4.5: 0.750, 4: 0.739 },
  5: { 10: 0.863, 9.5: 0.850, 9: 0.837, 8.5: 0.824, 8: 0.811, 7.5: 0.798, 7: 0.786, 6.5: 0.774, 6: 0.762, 5.5: 0.750, 5: 0.739, 4.5: 0.728, 4: 0.717 },
  6: { 10: 0.837, 9.5: 0.824, 9: 0.811, 8.5: 0.798, 8: 0.786, 7.5: 0.774, 7: 0.762, 6.5: 0.750, 6: 0.739, 5.5: 0.728, 5: 0.717, 4.5: 0.706, 4: 0.696 },
  7: { 10: 0.811, 9.5: 0.798, 9: 0.786, 8.5: 0.774, 8: 0.762, 7.5: 0.750, 7: 0.739, 6.5: 0.728, 6: 0.717, 5.5: 0.706, 5: 0.696, 4.5: 0.686, 4: 0.676 },
  8: { 10: 0.786, 9.5: 0.774, 9: 0.762, 8.5: 0.750, 8: 0.739, 7.5: 0.728, 7: 0.717, 6.5: 0.706, 6: 0.696, 5.5: 0.686, 5: 0.676, 4.5: 0.666, 4: 0.656 },
  9: { 10: 0.762, 9.5: 0.750, 9: 0.739, 8.5: 0.728, 8: 0.717, 7.5: 0.706, 7: 0.696, 6.5: 0.686, 6: 0.676, 5.5: 0.666, 5: 0.656, 4.5: 0.647, 4: 0.637 },
  10: { 10: 0.739, 9.5: 0.728, 9: 0.717, 8.5: 0.706, 8: 0.696, 7.5: 0.686, 7: 0.676, 6.5: 0.666, 6: 0.656, 5.5: 0.647, 5: 0.637, 4.5: 0.627, 4: 0.618 },
  11: { 10: 0.717, 9.5: 0.706, 9: 0.696, 8.5: 0.686, 8: 0.676, 7.5: 0.666, 7: 0.656, 6.5: 0.647, 6: 0.637, 5.5: 0.627, 5: 0.618, 4.5: 0.608, 4: 0.598 },
  12: { 10: 0.696, 9.5: 0.686, 9: 0.676, 8.5: 0.666, 8: 0.656, 7.5: 0.647, 7: 0.637, 6.5: 0.627, 6: 0.618, 5.5: 0.608, 5: 0.598, 4.5: 0.588, 4: 0.578 },
  13: { 10: 0.676, 9.5: 0.666, 9: 0.656, 8.5: 0.647, 8: 0.637, 7.5: 0.627, 7: 0.618, 6.5: 0.608, 6: 0.598, 5.5: 0.588, 5: 0.578, 4.5: 0.568, 4: 0.558 },
  14: { 10: 0.656, 9.5: 0.647, 9: 0.637, 8.5: 0.627, 8: 0.618, 7.5: 0.608, 7: 0.598, 6.5: 0.588, 6: 0.578, 5.5: 0.568, 5: 0.558, 4.5: 0.548, 4: 0.538 },
  15: { 10: 0.637, 9.5: 0.627, 9: 0.618, 8.5: 0.608, 8: 0.598, 7.5: 0.588, 7: 0.578, 6.5: 0.568, 6: 0.558, 5.5: 0.548, 5: 0.538, 4.5: 0.528, 4: 0.518 },
  16: { 10: 0.618, 9.5: 0.608, 9: 0.598, 8.5: 0.588, 8: 0.578, 7.5: 0.568, 7: 0.558, 6.5: 0.548, 6: 0.538, 5.5: 0.528, 5: 0.518, 4.5: 0.508, 4: 0.498 },
};

/** Get %1RM for a given reps × RPE combination. Returns null if out of table range. */
export function getPercentage1RM(reps: number, rpe: number): number | null {
  const clampedReps = Math.min(16, Math.max(1, Math.round(reps)));
  const clampedRPE = Math.min(10, Math.max(4, roundToHalf(rpe)));
  return TABLE[clampedReps]?.[clampedRPE] ?? null;
}

/** Suggest load for target reps × RPE given a known 1RM. Returns media, min, and max load. */
export function suggestLoad(
  oneRepMaxMedia: number,
  targetReps: number,
  rpe: number,
  oneRepMaxMin?: number,
  oneRepMaxMax?: number
): { media: number; min: number; max: number } | null {
  const result = calculateWeighted1RM(1, targetReps, rpe);
  const multiplier = result.media;
  if (!multiplier || multiplier === 0) return null;

  const loadMedia = Math.round((oneRepMaxMedia / multiplier) * 10) / 10;

  let loadMin, loadMax;
  if (oneRepMaxMin && oneRepMaxMax) {
    loadMin = Math.round((oneRepMaxMin / multiplier) * 10) / 10;
    loadMax = Math.round((oneRepMaxMax / multiplier) * 10) / 10;
  } else {
    const err = result.errorPercentage;
    loadMin = Math.round((loadMedia * (1 - err / 100)) * 10) / 10;
    loadMax = Math.round((loadMedia * (1 + err / 100)) * 10) / 10;
  }

  return { media: loadMedia, min: loadMin, max: loadMax };
}

// ===== New Weighted 1RM Estimation Formulas =====

export function estimateBrzycki(load: number, r_tot: number): number | null {
  if (r_tot > 10 || r_tot < 1) return null;
  return load * 36 / (37 - r_tot);
}

export function estimateEpley(load: number, r_tot: number): number {
  return load * (1 + 0.0333 * r_tot);
}

export function estimateOConner(load: number, r_tot: number): number {
  return load * (1 + 0.025 * r_tot);
}

export function estimateLombardi(load: number, r_tot: number): number | null {
  if (r_tot > 6 || r_tot < 1) return null;
  return load * Math.pow(r_tot, 0.10);
}

export function estimatePercentage(load: number, reps: number, rpe: number): number | null {
  const pct = getPercentage1RM(reps, rpe);
  if (!pct || pct === 0) return null;
  return load / pct;
}

export interface Weighted1RMResult {
  media: number;
  min: number;
  max: number;
  brzycki?: number;
  epley?: number;
  oconner?: number;
  lombardi?: number;
  percentage?: number;
  errorPercentage: number;
}

export function calculateWeighted1RM(load: number, reps: number, rpe?: number): Weighted1RMResult {
  const R_tot = (rpe !== undefined && rpe !== null) ? reps + Math.floor(10 - rpe) : reps;

  const brzycki = estimateBrzycki(load, R_tot) ?? undefined;
  const epley = estimateEpley(load, R_tot);
  const oconner = estimateOConner(load, R_tot);
  const lombardi = estimateLombardi(load, R_tot) ?? undefined;
  const percentage = (rpe !== undefined && rpe !== null) ? estimatePercentage(load, reps, rpe) ?? undefined : undefined;

  let weights = { oconner: 0, brzycki: 0, lombardi: 0, epley: 0, percentage: 0 };
  let errorPercentage = 0;

  if (R_tot <= 3) {
    weights = { oconner: 0.18, brzycki: 0.15, lombardi: 0.25, epley: 0.17, percentage: 0.25 };
    errorPercentage = 3;
  } else if (R_tot >= 4 && R_tot <= 6) {
    weights = { oconner: 0.20, brzycki: 0.18, lombardi: 0.15, epley: 0.17, percentage: 0.30 };
    errorPercentage = 4;
  } else if (R_tot >= 7 && R_tot <= 8) {
    weights = { oconner: 0.25, brzycki: 0.20, lombardi: 0, epley: 0.15, percentage: 0.40 };
    errorPercentage = 5;
  } else if (R_tot >= 9 && R_tot <= 10) {
    weights = { oconner: 0.30, brzycki: 0.20, lombardi: 0, epley: 0.15, percentage: 0.35 };
    errorPercentage = 7;
  } else if (R_tot >= 11 && R_tot <= 12) {
    weights = { oconner: 0.35, brzycki: 0.25, lombardi: 0, epley: 0.15, percentage: 0.25 };
    errorPercentage = 9;
  } else {
    // R_tot > 12 fallback
    weights = { oconner: 0.50, brzycki: 0, lombardi: 0, epley: 0.50, percentage: 0 };
    errorPercentage = 10;
  }

  // Redistribute percentage weight if percentage calculation is unavailable
  if (percentage === undefined && weights.percentage > 0) {
    const pctWeight = weights.percentage;
    weights.percentage = 0;
    const remainingWeight = 1 - pctWeight;
    if (remainingWeight > 0) {
      weights.oconner /= remainingWeight;
      weights.brzycki /= remainingWeight;
      weights.lombardi /= remainingWeight;
      weights.epley /= remainingWeight;
    }
  }

  let activeWeightsSum = 0;
  const activeEstimates: { weight: number, value: number }[] = [];

  if (oconner !== undefined && weights.oconner > 0) {
    activeWeightsSum += weights.oconner;
    activeEstimates.push({ weight: weights.oconner, value: oconner });
  }
  if (epley !== undefined && weights.epley > 0) {
    activeWeightsSum += weights.epley;
    activeEstimates.push({ weight: weights.epley, value: epley });
  }
  if (brzycki !== undefined && weights.brzycki > 0) {
    activeWeightsSum += weights.brzycki;
    activeEstimates.push({ weight: weights.brzycki, value: brzycki });
  }
  if (lombardi !== undefined && weights.lombardi > 0) {
    activeWeightsSum += weights.lombardi;
    activeEstimates.push({ weight: weights.lombardi, value: lombardi });
  }
  if (percentage !== undefined && weights.percentage > 0) {
    activeWeightsSum += weights.percentage;
    activeEstimates.push({ weight: weights.percentage, value: percentage });
  }

  let media = 0;
  if (activeWeightsSum > 0) {
    for (const est of activeEstimates) {
      media += (est.value * (est.weight / activeWeightsSum));
    }
  } else {
    media = load;
  }

  const min = media * (1 - errorPercentage / 100);
  const max = media * (1 + errorPercentage / 100);

  return {
    media: roundTo01(media),
    min: roundTo01(min),
    max: roundTo01(max),
    brzycki: brzycki !== undefined ? roundTo01(brzycki) : undefined,
    epley: epley !== undefined ? roundTo01(epley) : undefined,
    oconner: oconner !== undefined ? roundTo01(oconner) : undefined,
    lombardi: lombardi !== undefined ? roundTo01(lombardi) : undefined,
    percentage: percentage !== undefined ? roundTo01(percentage) : undefined,
    errorPercentage
  };
}

