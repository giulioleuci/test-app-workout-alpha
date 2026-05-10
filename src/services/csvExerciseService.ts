/**
 * CSV Import/Export for the Exercise library.
 *
 * Flat format (one row per exercise):
 *   exercise, equipment, type, pattern, counter, load_unit,
 *   primary_muscles, secondary_muscles, description, key_points, variants
 *
 * Arrays (muscles, equipment) are semicolon-separated.
 */

import { nanoid } from 'nanoid';
import Papa from 'papaparse';

import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import type { Exercise } from '@/domain/entities';
import { ExerciseType, MovementPattern, CounterType, Equipment, Muscle } from '@/domain/enums';

// ── CSV columns ─────────────────────────────────────────────────────────────

export const EXERCISE_CSV_HEADERS = [
  'exercise',
  'equipment',
  'type',
  'pattern',
  'counter',
  'load_unit',
  'primary_muscles',
  'secondary_muscles',
  'description',
  'key_points',
  'variants',
] as const;

// ── Types ────────────────────────────────────────────────────────────────────

export type CsvConflictStrategy = 'ignore' | 'overwrite' | 'copy';

export interface CsvExerciseRow {
  exercise: string;
  equipment: string;
  type: string;
  pattern: string;
  counter: string;
  load_unit: string;
  primary_muscles: string;
  secondary_muscles: string;
  description: string;
  key_points: string;
  variants: string;
}

export interface CsvExerciseConflict {
  existingId: string;
  existingName: string;
  incomingRow: CsvExerciseRow;
}

export interface CsvExerciseImportResult {
  inserted: number;
  overwritten: number;
  copied: number;
  skipped: number;
  failed: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function generateCsvBlob(content: string): Blob {
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  return new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
}

// ── Export ───────────────────────────────────────────────────────────────────

export function exercisesToCsv(exercises: Exercise[]): string {
  const idToName = new Map(exercises.map(e => [e.id, e.name]));
  const data = exercises.map(ex => [
    ex.name,
    (Array.isArray(ex.equipment) ? ex.equipment : [ex.equipment]).join(';'),
    ex.type,
    ex.movementPattern,
    ex.counterType,
    ex.defaultLoadUnit,
    ex.primaryMuscles.join(';'),
    ex.secondaryMuscles.join(';'),
    ex.description ?? '',
    ex.keyPoints ?? '',
    (ex.variantIds ?? []).map(id => idToName.get(id) ?? '').filter(Boolean).join(';'),
  ]);

  return Papa.unparse({
    fields: [...EXERCISE_CSV_HEADERS],
    data
  }, {
    newline: '\n'
  });
}

export async function exportExercisesCsv(exerciseIds?: string[]): Promise<string> {
  const all = exerciseIds
    ? await ExerciseRepository.getByIds(exerciseIds)
    : await ExerciseRepository.getAll();

  // Exporting uses the hydrated container, which already has the latest version's properties 
  // overlaid by the repository or kept in sync by our `update` logic.
  return exercisesToCsv(all);
}

// ── Parse uploaded CSV ────────────────────────────────────────────────────────

export function parseExerciseCsv(text: string): CsvExerciseRow[] {
  const result = Papa.parse<string[]>(text, {
    skipEmptyLines: 'greedy',
  });

  const rows = result.data;
  if (rows.length < 2) return [];

  const headerRow = rows[0].map(h => h.trim().toLowerCase());
  const idx = (key: string) => headerRow.indexOf(key);

  // Support both new column names and legacy names for backwards compatibility
  const exerciseIdx = idx('exercise') !== -1 ? idx('exercise') : idx('name');
  if (exerciseIdx === -1) throw new Error('CSV mancante della colonna "exercise"');

  const getCol = (newName: string, ...legacyNames: string[]) => {
    const i = idx(newName);
    if (i !== -1) return i;
    for (const leg of legacyNames) {
      const li = idx(leg);
      if (li !== -1) return li;
    }
    return -1;
  };

  return rows.slice(1)
    .filter(r => r[exerciseIdx]?.trim())
    .map(r => ({
      exercise: r[exerciseIdx]?.trim() ?? '',
      equipment: r[getCol('equipment')]?.trim() ?? '',
      type: r[getCol('type')]?.trim() ?? '',
      pattern: r[getCol('pattern', 'movementpattern')]?.trim() ?? '',
      counter: r[getCol('counter', 'countertype')]?.trim() ?? '',
      load_unit: r[getCol('load_unit', 'defaultloadunit')]?.trim() ?? '',
      primary_muscles: r[getCol('primary_muscles', 'primarymuscles')]?.trim() ?? '',
      secondary_muscles: r[getCol('secondary_muscles', 'secondarymuscles')]?.trim() ?? '',
      description: r[getCol('description')]?.trim() ?? '',
      key_points: r[getCol('key_points', 'keypoints')]?.trim() ?? '',
      variants: r[getCol('variants')]?.trim() ?? '',
    }));
}

// ── Conflict detection ────────────────────────────────────────────────────────

export async function detectExerciseCsvConflicts(
  rows: CsvExerciseRow[],
): Promise<CsvExerciseConflict[]> {
  const existing = await ExerciseRepository.getAll();
  const nameMap = new Map(existing.map(e => [e.name.toLowerCase(), e]));
  const conflicts: CsvExerciseConflict[] = [];

  for (const row of rows) {
    const found = nameMap.get(row.exercise.toLowerCase());
    if (found) {
      conflicts.push({ existingId: found.id, existingName: found.name, incomingRow: row });
    }
  }
  return conflicts;
}

// ── Row → Exercise ────────────────────────────────────────────────────────────

function splitArr(val: string): string[] {
  return val ? val.split(';').map(s => s.trim()).filter(Boolean) : [];
}

function toExercise(row: CsvExerciseRow, id: string, now: Date): Exercise {
  return {
    id,
    name: row.exercise,
    type: (Object.values(ExerciseType).includes(row.type as ExerciseType)
      ? row.type : ExerciseType.Compound) as ExerciseType,
    primaryMuscles: splitArr(row.primary_muscles).filter(m =>
      Object.values(Muscle).includes(m as Muscle)) as Muscle[],
    secondaryMuscles: splitArr(row.secondary_muscles).filter(m =>
      Object.values(Muscle).includes(m as Muscle)) as Muscle[],
    equipment: splitArr(row.equipment).filter(e =>
      Object.values(Equipment).includes(e as Equipment)) as Equipment[],
    movementPattern: (Object.values(MovementPattern).includes(row.pattern as MovementPattern)
      ? row.pattern : MovementPattern.Other) as MovementPattern,
    counterType: (Object.values(CounterType).includes(row.counter as CounterType)
      ? row.counter : CounterType.Reps) as CounterType,
    defaultLoadUnit: (row.load_unit === 'lbs' ? 'lbs' : 'kg'),
    description: row.description || undefined,
    keyPoints: row.key_points || undefined,
    variantIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

// ── Import ────────────────────────────────────────────────────────────────────

export async function importExercisesCsv(
  rows: CsvExerciseRow[],
  strategy: CsvConflictStrategy,
  conflicts: CsvExerciseConflict[],
): Promise<CsvExerciseImportResult> {
  const result: CsvExerciseImportResult = { inserted: 0, overwritten: 0, copied: 0, skipped: 0, failed: 0 };
  const conflictByName = new Map(conflicts.map(c => [c.incomingRow.exercise.toLowerCase(), c]));
  const now = new Date();

  const allExercises = await ExerciseRepository.getAll();
  const usedNames = new Set(allExercises.map(e => e.name.toLowerCase()));

  // Process rows - ideally this should be transactional, but ExerciseRepository splits calls.
  // Given pragmatic constraints, we'll process sequentially or batch if we added bulk methods.
  // We added bulkGet, but not bulkAdd/Put in ExerciseRepository yet?
  // Let's check ExerciseRepository.ts. It has add/put/update/delete. No bulkAdd.
  // We will loop.

  for (const row of rows) {
    if (!row.exercise) { result.failed++; continue; }
    const conflict = conflictByName.get(row.exercise.toLowerCase());

    if (!conflict) {
      const ex = toExercise(row, nanoid(), now);
      await ExerciseRepository.add(ex);
      usedNames.add(row.exercise.toLowerCase());
      result.inserted++;
    } else {
      switch (strategy) {
        case 'ignore':
          result.skipped++;
          break;
        case 'overwrite': {
          const ex = toExercise(row, conflict.existingId, now);
          // put() in our repository now triggers a new version if structural data changed
          const existing = await ExerciseRepository.getById(conflict.existingId);
          await ExerciseRepository.put({
            ...(existing || {}), // preserve container data not in CSV
            ...ex,
            isArchived: false,
            updatedAt: now
          });
          result.overwritten++;
          break;
        }
        case 'copy': {
          let copyName = `${row.exercise} (2)`;
          let suffix = 2;
          while (usedNames.has(copyName.toLowerCase())) {
            suffix++;
            copyName = `${row.exercise} (${suffix})`;
          }
          const ex = toExercise({ ...row, exercise: copyName }, nanoid(), now);
          await ExerciseRepository.add(ex);
          usedNames.add(copyName.toLowerCase());
          result.copied++;
          break;
        }
      }
    }
  }

  // Resolve variant links by name - Refresh list to get new IDs
  const updatedExercises = await ExerciseRepository.getAll();
  const nameToId = new Map(updatedExercises.map(e => [e.name.toLowerCase(), e.id]));

  for (const row of rows) {
    if (!row.variants) continue;
    const exerciseId = nameToId.get(row.exercise.toLowerCase());
    if (!exerciseId) continue;

    const variantNames = row.variants.split(';').map(s => s.trim()).filter(Boolean);
    for (const vName of variantNames) {
      const variantId = nameToId.get(vName.toLowerCase());
      if (variantId && variantId !== exerciseId) {
        const ex = await ExerciseRepository.getById(exerciseId);
        const vex = await ExerciseRepository.getById(variantId);

        if (ex && vex) {
          if (!ex.variantIds.includes(variantId)) {
            await ExerciseRepository.update(exerciseId, { variantIds: [...ex.variantIds, variantId] });
          }
          // Note: Bidirectional update might be redundant if the other row also specifies it,
          // but safe to ensure consistency.
          if (!vex.variantIds.includes(exerciseId)) {
            await ExerciseRepository.update(variantId, { variantIds: [...vex.variantIds, exerciseId] });
          }
        }
      }
    }
  }

  return result;
}
