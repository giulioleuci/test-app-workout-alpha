import type { PlannedSet } from '@/domain/entities';
import { FormattingService } from '@/domain/services/FormattingService';
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
