import { LOAD_PERCENTAGE_OPTIONS, XRM_REP_OPTIONS } from '@/domain/constants';
import { roundToHalf } from '@/lib/math';

import { suggestLoad } from './rpePercentageTable';

export interface LoadOption {
  label: string;
  load: number;
  description: string;
}

export class LoadCalculationService {
  /**
   * Generates a list of load options based on RPE (10 down to 6).
   */
  static getRPEOptions(oneRepMax: number, reps: number, t: (key: string) => string): LoadOption[] {
    const options: LoadOption[] = [];
    for (let rpe = 10; rpe >= 6; rpe -= 0.5) {
      const loadResult = suggestLoad(oneRepMax, reps, rpe);
      if (loadResult !== null) {
        options.push({
          label: `RPE ${rpe}`,
          load: roundToHalf(loadResult.media),
          description: `${reps} ${t('enums.counterType.reps')} @ RPE ${rpe} (${roundToHalf(loadResult.min)}-${roundToHalf(loadResult.max)} kg)`,
        });
      }
    }
    return options;
  }

  /**
   * Generates a list of load options based on %1RM.
   */
  static getPercentageOptions(oneRepMax: number, t: (key: string) => string): LoadOption[] {
    const options: LoadOption[] = [];
    for (const pct of LOAD_PERCENTAGE_OPTIONS) {
      options.push({
        label: `${(pct * 100).toFixed(0)}%`,
        load: roundToHalf(oneRepMax * pct),
        description: `${(pct * 100).toFixed(0)}% ${t('planning.percentage1RM')} (${oneRepMax} kg)`,
      });
    }
    return options;
  }

  /**
   * Estimated load for an X-rep-max (reps at RPE 10), rounded to the nearest 0.5kg.
   * Returns 0 when no estimate is available.
   */
  static getXRMLoad(oneRepMax: number, reps: number): number {
    const loadResult = suggestLoad(oneRepMax, reps, 10);
    return loadResult ? roundToHalf(loadResult.media) : 0;
  }

  /**
   * Builds the strength/hypertrophy XRM target matrix for a given 1RM.
   */
  static buildXRMMatrix(oneRepMax: number): {
    strength: { reps: number; load: number }[];
    hypertrophy: { reps: number; load: number }[];
  } {
    const strengthReps = [1, 3, 5];
    const hypertrophyReps = [8, 10, 12];
    return {
      strength: strengthReps.map(reps => ({ reps, load: this.getXRMLoad(oneRepMax, reps) })),
      hypertrophy: hypertrophyReps.map(reps => ({ reps, load: this.getXRMLoad(oneRepMax, reps) })),
    };
  }

  /**
   * Generates a list of load options based on XRM (1 to 12 reps at RPE 10).
   */
  static getXRMOptions(oneRepMax: number, t: (key: string) => string): LoadOption[] {
    const options: LoadOption[] = [];
    for (const r of XRM_REP_OPTIONS) {
      const loadResult = suggestLoad(oneRepMax, r, 10);
      if (loadResult !== null) {
        options.push({
          label: `${r}RM`,
          load: roundToHalf(loadResult.media),
          description: `${r} ${t('enums.counterType.reps')} max (${roundToHalf(loadResult.min)}-${roundToHalf(loadResult.max)} kg)`,
        });
      }
    }
    return options;
  }
}
