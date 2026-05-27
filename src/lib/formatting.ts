import type { PlannedSet } from '@/domain/entities';
import { FormattingService } from '@/domain/services/FormattingService';
import type { DurationRange } from '@/domain/value-objects';
import dayjs from '@/lib/dayjs';

// Re-export domain formatting logic using arrow functions to preserve 'this' and satisfy ESLint
export const formatLoadSummary = (ps: PlannedSet) => FormattingService.formatLoadSummary(ps);
export const formatRpeSummary = (ps: PlannedSet) => FormattingService.formatRpeSummary(ps);
export const formatRestSummary = (ps: PlannedSet) => FormattingService.formatRestSummary(ps);
export const formatPct1RMSummary = (ps: PlannedSet) => FormattingService.formatPct1RMSummary(ps);
export const formatCompactSummary = (ps: PlannedSet, simpleMode?: boolean) =>
  FormattingService.formatCompactSummary(ps, simpleMode);
export const formatSetSummary = (ps: PlannedSet, simpleMode?: boolean) =>
  FormattingService.formatSetSummary(ps, simpleMode);
// Note: formatSetSummary calls other static methods via 'this', so we might need bind if we assign it.
// But static methods on class are just functions. `this` in static method refers to class constructor.
// If we assign it to variable, `this` might be lost?
// Yes. `FormattingService.formatSetSummary` uses `this.formatCompactSummary`.
// So we must wrap it or bind it.

export function formatDate(d: Date, format = 'ddd D MMM YYYY') {
  return dayjs(d).format(format);
}

/** RPE display: always one decimal place (e.g. 8 → "8.0"). */
export function formatRPE(v: number): string {
  return v.toFixed(1);
}

/** Format a 0–1 fraction as a whole-number percentage string (e.g. 0.85 → "85%"). */
export function formatPercentage(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

/** Short chart-axis date (e.g. "07/03"). */
export function formatChartDate(d: Date | string): string {
  return dayjs(d).format('DD/MM');
}

/** Compact date with 2-digit year (e.g. "07/03/26"). */
export function formatShortDate(d: Date | string): string {
  return dayjs(d).format('DD/MM/YY');
}

/** Date with month name (e.g. "07 Mar 2026"). */
export function formatDayMonthYear(d: Date | string): string {
  return dayjs(d).format('DD MMM YYYY');
}

/** ISO calendar date (e.g. "2026-05-27"), used for filenames and machine-readable output. */
export function formatIsoDate(d: Date | string = new Date()): string {
  return dayjs(d).format('YYYY-MM-DD');
}

export function formatTime(d: Date, format = 'HH:mm') {
  return dayjs(d).format(format);
}

export function durationMinutes(start: Date, end?: Date) {
  if (!end) return null;
  return Math.round(dayjs(end).diff(dayjs(start), 'minute'));
}

export function formatDurationMMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Human-readable seconds (e.g. "45s", "5 min", "1h 20min"). */
export function formatSeconds(s: number): string {
  const dur = dayjs.duration(s, 'seconds');
  if (s < 60) return `${Math.round(s)}s`;
  const mins = Math.round(s / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(dur.asHours());
  const m = dur.minutes();
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

/** Human-readable duration range (e.g. "30 – 45 min"). */
export function formatDurationRange(d: DurationRange): string {
  const fmtMin = formatSeconds(d.minSeconds);
  const fmtMax = formatSeconds(d.maxSeconds);
  if (fmtMin === fmtMax) return fmtMin;
  return `${fmtMin} – ${fmtMax}`;
}

export function formatDurationHHMMSS(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  const mStr = m.toString().padStart(2, '0');
  const sStr = s.toString().padStart(2, '0');

  if (h > 0) {
    return `${h}:${mStr}:${sStr}`;
  }
  return `${mStr}:${sStr}`;
}
