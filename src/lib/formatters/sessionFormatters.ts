import type { PlannedSet, PlannedExerciseItem } from '@/domain/entities';
import { ToFailureIndicator, CounterType } from '@/domain/enums';

/**
 * Gets the individual parts of a planned set summary as an array of strings.
 *
 * @param plannedSet The planned set to format
 * @param counterType The counter type (reps, seconds, etc.)
 * @param simpleMode Whether simplified mode is active
 * @param t Translation function
 * @param plannedExerciseItem Optional parent exercise item
 * @param options Formatting options
 */
export function getPlannedSetSummaryParts(
  plannedSet: PlannedSet,
  counterType: CounterType,
  simpleMode: boolean,
  t: (key: string) => string,
  plannedExerciseItem?: PlannedExerciseItem,
  options: { includeSetCount?: boolean } = { includeSetCount: true }
): string[] {
  const parts: string[] = [];

  // Sets range (if it's a range or more than 1 set)
  if (options.includeSetCount && plannedSet.setCountRange) {
    const minS = plannedSet.setCountRange.min;
    const maxS = plannedSet.setCountRange.max;
    
    if ((maxS && maxS > 1) || minS > 1) {
      const setsStr = maxS && maxS !== minS ? `${minS}–${maxS}` : `${minS}`;
      parts.push(`${setsStr} ${t('common.sets')}`);
    }
  }

  // Count (reps/secs) - only if min > 0 or toFailure is set
  const isToFailure = !simpleMode && plannedSet.countRange.toFailure !== ToFailureIndicator.None;
  const minC = plannedSet.countRange.min;
  const maxC = plannedSet.countRange.max;
  
  if (minC > 0 || isToFailure) {
    const suffix = isToFailure ? '+' : '';
    const countStr = maxC != null ? `${minC}–${maxC}${suffix}` : `${minC}${suffix}`;
    const unit = t(`enums.counterTypeShort.${counterType}`);
    parts.push(`${countStr} ${unit}`);
  }

  // Load - only if min > 0
  if (plannedSet.loadRange && (plannedSet.loadRange.min > 0 || plannedSet.loadRange.max)) {
    parts.push(`@ ${plannedSet.loadRange.min}–${plannedSet.loadRange.max ?? '?'} kg`);
  }

  // %1RM
  if (plannedSet.percentage1RMRange && plannedSet.percentage1RMRange.min > 0) {
    const minP = Math.round(plannedSet.percentage1RMRange.min * 100);
    const maxP = Math.round(plannedSet.percentage1RMRange.max * 100);
    const pStr = maxP !== minP ? `${minP}–${maxP}%` : `${minP}%`;
    parts.push(`${pStr} 1RM`);
  }

  // XRM
  if (plannedExerciseItem?.targetXRM) {
    parts.push(`${plannedExerciseItem.targetXRM}RM`);
  }

  // RPE
  if (plannedSet.rpeRange) {
    const minR = plannedSet.rpeRange.min;
    const maxR = plannedSet.rpeRange.max;
    const rpeStr = maxR !== minR ? `${minR}–${maxR}` : `${minR}`;
    parts.push(`RPE ${rpeStr}`);
  }

  // Tempo
  if (plannedSet.tempo?.trim()) {
    parts.push(plannedSet.tempo);
  }

  return parts;
}

/**
 * Formats a summary string for a planned set (e.g., "3 sets 8–12 reps @ 40–? kg 80% 1RM RPE 8-9 3-0-1-0")
 *
 * @param plannedSet The planned set to format
 * @param counterType The counter type (reps, seconds, etc.)
 * @param simpleMode Whether simplified mode is active (hides failure indicator)
 * @param t Translation function
 * @param plannedExerciseItem Optional parent exercise item to get targetXRM
 */
export function formatPlannedSetSummary(
  plannedSet: PlannedSet,
  counterType: CounterType,
  simpleMode: boolean,
  t: (key: string) => string,
  plannedExerciseItem?: PlannedExerciseItem
): string {
  return getPlannedSetSummaryParts(plannedSet, counterType, simpleMode, t, plannedExerciseItem).join(' ');
}
