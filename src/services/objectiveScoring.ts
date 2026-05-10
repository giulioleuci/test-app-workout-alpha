/**
 * Objective scoring functions — classify sets into training objectives
 * based on rep count using fuzzy membership scoring.
 */

export const OBJECTIVE_KEYS = ['maxStrength', 'strength', 'hypertrophy', 'endurance'] as const;
export type ObjectiveKey = (typeof OBJECTIVE_KEYS)[number];

export function scoreMaxStrength(reps: number): number {
  if (reps <= 3) return 1;
  if (reps <= 5) return 0.5;
  return 0;
}

export function scoreStrength(reps: number): number {
  if (reps <= 2) return 0.5;
  if (reps <= 6) return 1;
  if (reps <= 8) return 0.5;
  return 0;
}

export function scoreHypertrophy(reps: number): number {
  if (reps <= 3) return 0;
  if (reps <= 5) return 0.5;
  if (reps <= 12) return 1;
  return 0.5;
}

export function scoreEndurance(reps: number): number {
  if (reps <= 8) return 0;
  if (reps <= 11) return 0.5;
  return 1;
}

const SCORE_FNS: Record<ObjectiveKey, (reps: number) => number> = {
  maxStrength: scoreMaxStrength,
  strength: scoreStrength,
  hypertrophy: scoreHypertrophy,
  endurance: scoreEndurance,
};

/** Get all objective scores for a given rep count */
export function scoreAllObjectives(reps: number): Record<ObjectiveKey, number> {
  return {
    maxStrength: scoreMaxStrength(reps),
    strength: scoreStrength(reps),
    hypertrophy: scoreHypertrophy(reps),
    endurance: scoreEndurance(reps),
  };
}

/** Get the score function for a given objective key */
export function getScoreFn(key: ObjectiveKey): (reps: number) => number {
  return SCORE_FNS[key];
}
