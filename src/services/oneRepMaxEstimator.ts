import { suggestLoad } from '@/services/rpePercentageTable';

/** Calculate XRM (load for X reps at RPE 10). */
export function calculateXRM(oneRepMax: number, reps: number): number | null {
  return suggestLoad(oneRepMax, reps, 10)?.media ?? null;
}
