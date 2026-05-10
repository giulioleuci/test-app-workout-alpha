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
  static getRPEOptions(oneRepMax: number, reps: number, t: any): LoadOption[] {
    const options: LoadOption[] = [];
    for (let rpe = 10; rpe >= 6; rpe -= 0.5) {
      const loadResult = suggestLoad(oneRepMax, reps, rpe);
      if (loadResult !== null) {
        options.push({
          label: `RPE ${rpe}`,
          load: Math.round(loadResult.media * 2) / 2,
          description: `${reps} ${t('enums.counterType.reps')} @ RPE ${rpe} (${Math.round(loadResult.min * 2) / 2}-${Math.round(loadResult.max * 2) / 2} kg)`,
        });
      }
    }
    return options;
  }

  /**
   * Generates a list of load options based on %1RM.
   */
  static getPercentageOptions(oneRepMax: number, t: any): LoadOption[] {
    const options: LoadOption[] = [];
    const percentages = [1.0, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5];
    for (const pct of percentages) {
      options.push({
        label: `${(pct * 100).toFixed(0)}%`,
        load: Math.round(oneRepMax * pct * 2) / 2,
        description: `${(pct * 100).toFixed(0)}% ${t('planning.percentage1RM')} (${oneRepMax} kg)`,
      });
    }
    return options;
  }

  /**
   * Generates a list of load options based on XRM (1 to 12 reps at RPE 10).
   */
  static getXRMOptions(oneRepMax: number, t: any): LoadOption[] {
    const options: LoadOption[] = [];
    const reps = [1, 2, 3, 4, 5, 6, 8, 10, 12];
    for (const r of reps) {
      const loadResult = suggestLoad(oneRepMax, r, 10);
      if (loadResult !== null) {
        options.push({
          label: `${r}RM`,
          load: Math.round(loadResult.media * 2) / 2,
          description: `${r} ${t('enums.counterType.reps')} max (${Math.round(loadResult.min * 2) / 2}-${Math.round(loadResult.max * 2) / 2} kg)`,
        });
      }
    }
    return options;
  }
}
