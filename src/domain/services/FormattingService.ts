import type { PlannedSet } from '@/domain/entities';
import { ToFailureIndicator } from '@/domain/enums';

export class FormattingService {
  /**
   * Generates a formatted load string (e.g., "100kg" or "100–110kg").
   * Returns null if no load range is set.
   */
  static formatLoadSummary(ps: PlannedSet): string | null {
    if (!ps.loadRange) return null;
    const min = ps.loadRange.min;
    const max = ps.loadRange.max;
    return max && max !== min ? `${min}–${max}kg` : `${min}kg`;
  }

  /**
   * Generates a formatted RPE string (e.g., "RPE 8" or "RPE 7–8").
   * Returns null if no RPE range is set.
   */
  static formatRpeSummary(ps: PlannedSet): string | null {
    if (!ps.rpeRange) return null;
    return ps.rpeRange.max !== ps.rpeRange.min ? `RPE ${ps.rpeRange.min}–${ps.rpeRange.max}` : `RPE ${ps.rpeRange.min}`;
  }

  /**
   * Generates a formatted rest time string (e.g., "60s" or "60–90s").
   * Returns null if no rest range is set.
   */
  static formatRestSummary(ps: PlannedSet): string | null {
    if (!ps.restSecondsRange) return null;
    const min = ps.restSecondsRange.min;
    const max = ps.restSecondsRange.max;
    return max && max !== min ? `${min}–${max}s` : `${min}s`;
  }

  /**
   * Generates a formatted %1RM string (e.g., "80%1RM" or "75–80%1RM").
   * Returns null if no %1RM range is set.
   */
  static formatPct1RMSummary(ps: PlannedSet): string | null {
    if (!ps.percentage1RMRange) return null;
    const min = Math.round(ps.percentage1RMRange.min * 100);
    const max = Math.round(ps.percentage1RMRange.max * 100);
    return max !== min ? `${min}–${max}%1RM` : `${min}%1RM`;
  }

  /**
   * Generates a compact summary string (e.g., "3x10" or "3-4x8-12+").
   */
  static formatCompactSummary(ps: PlannedSet, simpleMode?: boolean): string {
    const setsStr = ps.setCountRange.max && ps.setCountRange.max !== ps.setCountRange.min
      ? `${ps.setCountRange.min}-${ps.setCountRange.max}`
      : `${ps.setCountRange.min}`;
    const isToFailure = !simpleMode && ps.countRange.toFailure !== ToFailureIndicator.None;
    const suffix = isToFailure ? '+' : '';
    const countStr = ps.countRange.max != null && ps.countRange.max !== ps.countRange.min
      ? `${ps.countRange.min}-${ps.countRange.max}${suffix}`
      : `${ps.countRange.min}${suffix}`;
    return `${setsStr}x${countStr}`;
  }

  /**
   * Generates a full summary string including load/intensity (e.g., "3x10 @ 50kg").
   */
  static formatSetSummary(ps: PlannedSet, simpleMode?: boolean): string {
    const compact = this.formatCompactSummary(ps, simpleMode);
    const load = this.formatLoadSummary(ps);
    const pct = !simpleMode ? this.formatPct1RMSummary(ps) : null;
    const rpe = !simpleMode ? this.formatRpeSummary(ps) : null;

    if (load) return `${compact} @ ${load}`;
    if (pct) return `${compact} @ ${pct}`;
    if (rpe) return `${compact} @ ${rpe}`;
    return compact;
  }
}
