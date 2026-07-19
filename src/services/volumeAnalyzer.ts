/**
 * Volume analysis for planned workouts.
 * Counts planned sets per muscle/group/pattern with primary=1, secondary=0.5 weighting.
 */
import type { Exercise, PlannedExerciseGroup, PlannedExerciseItem, PlannedSet } from '@/domain/entities';
import { MuscleGroupMuscles } from '@/domain/enums';

import { OBJECTIVE_KEYS, scoreAllObjectives } from './objectiveScoring';


export interface VolumeRange {
  min: number;
  max: number;
}

export interface VolumeEntry {
  key: string;
  label: string;
  volume: VolumeRange;
}

export interface MuscleOverlapData {
  sessionNames: string[];
  /** Map<muscleName, counts[]> — counts[i] = number of exercise items with that primary muscle in session i */
  musclePresence: Map<string, number[]>;
}

export interface SessionVolumeAnalysis {
  sessionId: string;
  sessionName: string;
  byMuscle: VolumeEntry[];
  byMuscleGroup: VolumeEntry[];
  byMovementPattern: VolumeEntry[];
  byObjective: VolumeEntry[];
}

export interface WorkoutVolumeAnalysis {
  workoutId: string;
  workoutName: string;
  /** Aggregated across all sessions */
  total: {
    byMuscle: VolumeEntry[];
    byMuscleGroup: VolumeEntry[];
    byMovementPattern: VolumeEntry[];
    byObjective: VolumeEntry[];
  };
  sessions: SessionVolumeAnalysis[];
  muscleOverlap: MuscleOverlapData;
}

interface ItemWithContext {
  item: PlannedExerciseItem;
  exercise: Exercise;
  sets: PlannedSet[];
}

function accumulateVolume(
  map: Map<string, VolumeRange>,
  key: string,
  weight: number,
  setCountRange: { min: number; max?: number },
) {
  const existing = map.get(key) ?? { min: 0, max: 0 };
  existing.min += setCountRange.min * weight;
  existing.max += (setCountRange.max ?? setCountRange.min) * weight;
  map.set(key, existing);
}

function mapToSortedEntries(
  map: Map<string, VolumeRange>,
  labelFn: (key: string) => string,
): VolumeEntry[] {
  return [...map.entries()]
    .filter(([, v]) => v.max > 0)
    .sort((a, b) => b[1].max - a[1].max)
    .map(([key, volume]) => ({ key, label: labelFn(key), volume }));
}

/** Pure analysis from in-memory data — no DB access */
/**
 * Flatten the grouped planning structure (groups + items-by-group + sets-by-item)
 * into the flat ItemWithContext list the analyzers consume. Items whose exercise
 * is missing from the map are skipped.
 */
export function flattenPlannedItems(
  groups: PlannedExerciseGroup[],
  itemsByGroup: Record<string, PlannedExerciseItem[]>,
  setsByItem: Record<string, PlannedSet[]>,
  exercises: Exercise[],
): ItemWithContext[] {
  const exerciseMap = Object.fromEntries(exercises.map(e => [e.id, e]));
  const result: ItemWithContext[] = [];
  for (const group of groups) {
    const groupItems = itemsByGroup[group.id] || [];
    for (const item of groupItems) {
      const exercise = exerciseMap[item.exerciseId];
      if (!exercise) continue;
      result.push({ item, exercise, sets: setsByItem[item.id] || [] });
    }
  }
  return result;
}

export function analyzeItemsFromData(
  items: ItemWithContext[],
  muscleLabelFn: (k: string) => string,
  groupLabelFn: (k: string) => string,
  patternLabelFn: (k: string) => string,
  objectiveLabelFn?: (k: string) => string,
  excludeSecondary = false,
) {
  return analyzeItems(items, muscleLabelFn, groupLabelFn, patternLabelFn, objectiveLabelFn, excludeSecondary);
}

export function analyzeItemsRaw(
  items: ItemWithContext[],
  excludeSecondary = false,
) {
  return analyzeItems(items, k => k, k => k, k => k, k => k, excludeSecondary);
}

export type { ItemWithContext };

function analyzeItems(
  items: ItemWithContext[],
  muscleLabelFn: (k: string) => string,
  groupLabelFn: (k: string) => string,
  patternLabelFn: (k: string) => string,
  objectiveLabelFn?: (k: string) => string,
  excludeSecondary = false,
) {
  const byMuscle = new Map<string, VolumeRange>();
  const byMuscleGroup = new Map<string, VolumeRange>();
  const byPattern = new Map<string, VolumeRange>();
  const byObjective = new Map<string, VolumeRange>();

  for (const { exercise, sets } of items) {
    for (const ps of sets) {
      const scr = ps.setCountRange;

      // Per muscle (primary=1, secondary=0.5)
      for (const m of exercise.primaryMuscles) {
        accumulateVolume(byMuscle, m, 1, scr);
      }
      if (!excludeSecondary) {
        for (const m of exercise.secondaryMuscles) {
          accumulateVolume(byMuscle, m, 0.5, scr);
        }
      }

      // Per movement pattern
      accumulateVolume(byPattern, exercise.movementPattern, 1, scr);

      // Per objective — use countRange min/max to get score range
      const cr = ps.countRange;
      const repMin = cr.min;
      const repMax = cr.max ?? cr.min;
      const scoresAtMin = scoreAllObjectives(repMin);
      const scoresAtMax = scoreAllObjectives(repMax);
      for (const objKey of OBJECTIVE_KEYS) {
        const sMin = Math.min(scoresAtMin[objKey], scoresAtMax[objKey]);
        const sMax = Math.max(scoresAtMin[objKey], scoresAtMax[objKey]);
        if (sMax <= 0) continue;
        const existing = byObjective.get(objKey) ?? { min: 0, max: 0 };
        existing.min += scr.min * sMin;
        existing.max += (scr.max ?? scr.min) * sMax;
        byObjective.set(objKey, existing);
      }
    }
  }

  // Derive muscle groups from muscle volumes
  for (const [group, muscles] of Object.entries(MuscleGroupMuscles)) {
    let min = 0, max = 0;
    for (const m of muscles) {
      const v = byMuscle.get(m);
      if (v) { min += v.min; max += v.max; }
    }
    if (max > 0) byMuscleGroup.set(group, { min, max });
  }

  const objLabelFn = objectiveLabelFn ?? ((k: string) => k);

  return {
    byMuscle: mapToSortedEntries(byMuscle, muscleLabelFn),
    byMuscleGroup: mapToSortedEntries(byMuscleGroup, groupLabelFn),
    byMovementPattern: mapToSortedEntries(byPattern, patternLabelFn),
    byObjective: mapToSortedEntries(byObjective, objLabelFn),
  };
}
