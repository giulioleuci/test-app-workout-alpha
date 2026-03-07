/**
 * CSV Import/Export for Planned Workouts.
 *
 * Flat format — one row per PlannedSet (multiple rows per exercise when it has
 * working + backoff sets etc.). Metadata repeated on every row.
 * Blank rows separate sessions for human readability.
 *
 * Columns:
 *   plan, objective, work_type, session, exercise,
 *   group_type, set_type,
 *   sets_min, sets_max,
 *   count_min, count_max,
 *   to_failure,
 *   load_min, load_max,
 *   pct1rm_min, pct1rm_max,
 *   rpe_min, rpe_max,
 *   rest_min, rest_max,
   *   xrm, tempo, notes, exercise_notes,
 
 *   miniset_count, miniset_reps, miniset_rest, miniset_load_pct
 *
 * Notes:
 *   - Multiple consecutive rows with the same exercise name (within the same
 *     session/group_type block) are merged into a single PlannedExerciseItem
 *     with multiple PlannedSets.
 *   - For Cluster groups, the Working set row carries miniset_* columns:
 *       miniset_count  → ClusterSetParams.miniSetCount
 *       miniset_reps   → ClusterSetParams.miniSetReps
 *       miniset_rest   → ClusterSetParams.interMiniSetRestSeconds
 *       miniset_load_pct → ClusterSetParams.loadReductionPercent
 *     totalRepsTarget is derived as miniset_count × miniset_reps.
 */

import { nanoid } from 'nanoid';
import Papa from 'papaparse';

import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import { WorkoutPlanRepository } from '@/db/repositories/WorkoutPlanRepository';
import type {
  PlannedWorkout, PlannedSession, PlannedExerciseGroup,
  PlannedExerciseItem, PlannedSet,
} from '@/domain/entities';
import {
  ObjectiveType, WorkType, PlannedWorkoutStatus, PlannedSessionStatus,
  ExerciseGroupType, CounterType, SetType, ToFailureIndicator,
} from '@/domain/enums';
import dayjs from '@/lib/dayjs';

import { generateCsvBlob, type CsvConflictStrategy } from './csvExerciseService';
import { getClusterConfig } from '@/domain/value-objects';

// ── Column names ─────────────────────────────────────────────────────────────

export const WORKOUT_CSV_HEADERS = [
  'plan',
  'objective',
  'work_type',
  'session',
  'exercise',
  'group_type',
  'set_type',
  'sets_min',
  'sets_max',
  'count_min',
  'count_max',
  'to_failure',
  'load_min',
  'load_max',
  'pct1rm_min',
  'pct1rm_max',
  'rpe_min',
  'rpe_max',
  'rest_min',
  'rest_max',
  'xrm',
  'tempo',
  'notes',
  'exercise_notes',
  'miniset_count',
  'miniset_reps',
  'miniset_rest',
  'miniset_load_pct',
] as const;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FlatWorkoutRow {
  plan: string;
  objective: string;
  work_type: string;
  session: string;
  exercise: string;
  group_type: string;      // '' = standard
  set_type: string;        // '' = working
  sets_min: string;
  sets_max: string;
  count_min: string;
  count_max: string;
  to_failure: string;      // '' | 'technical' | 'absolute' | 'barSpeed'
  load_min: string;
  load_max: string;
  pct1rm_min: string;
  pct1rm_max: string;
  rpe_min: string;
  rpe_max: string;
  rest_min: string;
  rest_max: string;
  xrm: string;
  tempo: string;
  notes: string;
  exercise_notes: string;
  miniset_count: string;
  miniset_reps: string;
  miniset_rest: string;
  miniset_load_pct: string;
}

export interface CsvWorkoutConflict {
  existingId: string;
  existingName: string;
  incomingName: string;
}

export interface CsvWorkoutImportResult {
  workoutsInserted: number;
  workoutsOverwritten: number;
  workoutsCopied: number;
  workoutsSkipped: number;
  failed: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function num(v: string | undefined): number | undefined {
  if (!v || v.trim() === '') return undefined;
  const cleaned = v.replace('%', '').replace('s', '').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? undefined : n;
}

/** Returns the max string: empty if max equals min (avoids redundancy in CSV). */
function rangeMax(minVal: number | undefined, maxVal: number | undefined): string {
  if (minVal === undefined && maxVal === undefined) return '';
  if (maxVal === undefined) return '';
  if (minVal !== undefined && maxVal === minVal) return '';
  return String(maxVal);
}

function coalesce(a: number | undefined, b: number | undefined): number | undefined {
  return a !== undefined ? a : b;
}

/** Serialize ToFailureIndicator to CSV-friendly short string. */
function serializeToFailure(tf: ToFailureIndicator | undefined): string {
  switch (tf) {
    case ToFailureIndicator.TechnicalFailure: return 'technical';
    case ToFailureIndicator.AbsoluteFailure: return 'absolute';
    case ToFailureIndicator.BarSpeedFailure: return 'barSpeed';
    default: return '';
  }
}

/** Parse CSV to_failure string back to enum. */
function parseToFailure(v: string): ToFailureIndicator {
  switch (v.trim().toLowerCase()) {
    case 'technical': return ToFailureIndicator.TechnicalFailure;
    case 'absolute': return ToFailureIndicator.AbsoluteFailure;
    case 'barspeed': return ToFailureIndicator.BarSpeedFailure;
    default: return ToFailureIndicator.None;
  }
}

// ── Export ────────────────────────────────────────────────────────────────────

export interface CsvWorkoutExport {
  workout: PlannedWorkout;
  sessions: PlannedSession[];
  groups: PlannedExerciseGroup[];
  items: PlannedExerciseItem[];
  sets: PlannedSet[];
  exerciseNames: Record<string, string>;
}

export async function buildWorkoutExportData(workoutId: string): Promise<CsvWorkoutExport> {
  const workout = await WorkoutPlanRepository.getWorkout(workoutId);
  if (!workout) throw new Error('Workout non trovato');

  // Fetch full hierarchy
  const sessions = await WorkoutPlanRepository.getSessionsByWorkout(workoutId);
  const groups: PlannedExerciseGroup[] = [];
  const items: PlannedExerciseItem[] = [];
  const sets: PlannedSet[] = [];

  for (const s of sessions) {
    const sGroups = await WorkoutPlanRepository.getGroupsBySession(s.id);
    groups.push(...sGroups);
    for (const g of sGroups) {
      const gItems = await WorkoutPlanRepository.getItemsByGroup(g.id);
      items.push(...gItems);
      for (const i of gItems) {
        const iSets = await WorkoutPlanRepository.getSetsByItem(i.id);
        sets.push(...iSets);
      }
    }
  }

  const exerciseIds = [...new Set(items.map(i => i.exerciseId))].filter(Boolean) as string[];
  const exercises = await ExerciseRepository.getByIds(exerciseIds);
  const exerciseNames: Record<string, string> = {};
  exercises.forEach(e => { exerciseNames[e.id] = e.name; });

  return { workout, sessions, groups, items, sets, exerciseNames };
}

/** Converts workout data to rows for CSV (array of arrays). */
export function workoutToRows(data: CsvWorkoutExport): (string | number | undefined)[][] {
  const { workout, sessions, groups, items, sets, exerciseNames } = data;
  const rows: (string | number | undefined)[][] = [];

  const setsByItemId = new Map<string, PlannedSet[]>();
  for (const s of sets) {
    if (!setsByItemId.has(s.plannedExerciseItemId)) setsByItemId.set(s.plannedExerciseItemId, []);
    setsByItemId.get(s.plannedExerciseItemId)!.push(s);
  }

  const sortedSessions = [...sessions].sort((a, b) => a.orderIndex - b.orderIndex);

  let firstSession = true;
  for (const session of sortedSessions) {
    if (!firstSession) rows.push([]); // blank row for readability
    firstSession = false;

    const sessionGroups = groups
      .filter(g => g.plannedSessionId === session.id)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    for (const group of sessionGroups) {
      const groupItems = items
        .filter(i => i.plannedExerciseGroupId === group.id)
        .sort((a, b) => a.orderIndex - b.orderIndex);

      const groupType = group.groupType === ExerciseGroupType.Standard ? '' : group.groupType;
      const isCluster = group.groupType === ExerciseGroupType.Cluster;

      for (const item of groupItems) {
        const exerciseName = exerciseNames[item.exerciseId] ?? '';
        const itemSets = (setsByItemId.get(item.id) ?? [])
          .sort((a, b) => a.orderIndex - b.orderIndex);

        const clusterParams = isCluster ? getClusterConfig(item.modifiers) ?? null : null;

        for (const ps of itemSets) {
          const setType = ps.setType === SetType.Working ? '' : ps.setType;

          const setsMin = ps.setCountRange?.min;
          const setsMax = ps.setCountRange?.max;
          const countMin = ps.countRange?.min;
          const countMax = ps.countRange?.max ?? undefined;
          const loadMin = ps.loadRange?.min;
          const loadMax = ps.loadRange?.max ?? undefined;
          const pct1rmMin = ps.percentage1RMRange?.min;
          const pct1rmMax = ps.percentage1RMRange?.max;
          const rpeMin = ps.rpeRange?.min;
          const rpeMax = ps.rpeRange?.max;
          const restMin = ps.restSecondsRange?.min;
          const restMax = ps.restSecondsRange?.max ?? undefined;

          const showMiniset = isCluster && clusterParams && ps.setType === SetType.Working;
          const minisetCount = showMiniset ? String(clusterParams.miniSetCount) : '';
          const minisetReps = showMiniset ? String(clusterParams.miniSetReps) : '';
          const minisetRest = showMiniset ? String(clusterParams.interMiniSetRestSeconds) : '';
          const minisetLoadPct = showMiniset && clusterParams.loadReductionPercent != null
            ? String(clusterParams.loadReductionPercent)
            : '';

          rows.push([
            workout.name,
            workout.objectiveType,
            workout.workType,
            session.name,
            exerciseName,
            groupType,
            setType,
            setsMin !== undefined ? String(setsMin) : '',
            rangeMax(setsMin, setsMax),
            countMin !== undefined ? String(countMin) : '',
            countMax !== undefined ? rangeMax(countMin, countMax) : '',
            serializeToFailure(ps.countRange?.toFailure),
            loadMin !== undefined ? String(loadMin) : '',
            loadMax !== undefined ? rangeMax(loadMin, loadMax) : '',
            pct1rmMin !== undefined ? String(pct1rmMin) : '',
            pct1rmMax !== undefined ? rangeMax(pct1rmMin, pct1rmMax) : '',
            rpeMin !== undefined ? String(rpeMin) : '',
            rpeMax !== undefined ? rangeMax(rpeMin, rpeMax) : '',
            restMin !== undefined ? String(restMin) : '',
            restMax !== undefined ? rangeMax(restMin, restMax) : '',
            item.targetXRM !== undefined ? String(item.targetXRM) : '',
            ps.tempo ?? '',
            ps.notes ?? '',
            item.notes ?? '',
            minisetCount,
            minisetReps,
            minisetRest,
            minisetLoadPct,
          ]);
        }
      }
    }
  }
  return rows;
}

export function workoutExportToCsv(data: CsvWorkoutExport): string {
  return Papa.unparse({
    fields: [...WORKOUT_CSV_HEADERS],
    data: workoutToRows(data)
  }, { newline: '\n' });
}

export async function exportWorkoutCsv(workoutId: string): Promise<{ blob: Blob, filename: string }> {
  const data = await buildWorkoutExportData(workoutId);
  const csv = workoutExportToCsv(data);
  const filename = `workout-${data.workout.name.replace(/\s+/g, '-').toLowerCase()}-${dayjs().format('YYYY-MM-DD')}.csv`;
  return { blob: generateCsvBlob(csv), filename };
}

export async function exportAllWorkoutsCsv(): Promise<{ blob: Blob, filename: string }> {
  const workouts = await WorkoutPlanRepository.getAllWorkouts();
  const allRows: (string | number | undefined)[][] = [];

  let firstWorkout = true;
  for (const w of workouts) {
    if (!firstWorkout) allRows.push([]);
    firstWorkout = false;
    const data = await buildWorkoutExportData(w.id);
    allRows.push(...workoutToRows(data));
  }

  const csv = Papa.unparse({
    fields: [...WORKOUT_CSV_HEADERS],
    data: allRows
  }, { newline: '\n' });

  const filename = `all-workouts-${dayjs().format('YYYY-MM-DD')}.csv`;
  return { blob: generateCsvBlob(csv), filename };
}

// ── Parse uploaded CSV ────────────────────────────────────────────────────────

export function parseWorkoutCsv(text: string): FlatWorkoutRow[] {
  const result = Papa.parse<string[]>(text, {
    skipEmptyLines: 'greedy',
  });

  const rows = result.data;
  if (rows.length < 2) return [];

  const headerRow = rows[0].map(h => h.trim().toLowerCase());
  const idx = (key: string) => headerRow.indexOf(key);

  const planIdx = idx('plan');
  if (planIdx === -1) throw new Error('CSV mancante della colonna "plan"');

  const getCol = (newName: string, ...legacyNames: string[]) => {
    const i = idx(newName);
    if (i !== -1) return i;
    for (const leg of legacyNames) {
      const li = idx(leg);
      if (li !== -1) return li;
    }
    return -1;
  };

  const restMinIdx = getCol('rest_min');
  const restMaxIdx = getCol('rest_max');

  return rows.slice(1)
    .filter(r => r[planIdx]?.trim())
    .map(r => {
      return {
        plan: r[planIdx]?.trim() ?? '',
        objective: r[getCol('objective', 'objectivetype')]?.trim() ?? '',
        work_type: r[getCol('work_type', 'worktype')]?.trim() ?? '',
        session: r[getCol('session', 'sessionname')]?.trim() ?? '',
        exercise: r[getCol('exercise', 'exercisename')]?.trim() ?? '',
        group_type: r[getCol('group_type', 'grouptype')]?.trim() ?? '',
        set_type: r[getCol('set_type', 'settype')]?.trim() ?? '',
        sets_min: r[getCol('sets_min', 'setcountmin')]?.trim() ?? '',
        sets_max: r[getCol('sets_max', 'setcountmax')]?.trim() ?? '',
        count_min: r[getCol('count_min', 'countmin')]?.trim() ?? '',
        count_max: r[getCol('count_max', 'countmax')]?.trim() ?? '',
        to_failure: r[getCol('to_failure')]?.trim() ?? '',
        load_min: r[getCol('load_min')]?.trim() ?? '',
        load_max: r[getCol('load_max')]?.trim() ?? '',
        pct1rm_min: r[getCol('pct1rm_min', 'percentage1rmmin')]?.trim() ?? '',
        pct1rm_max: r[getCol('pct1rm_max', 'percentage1rmmax')]?.trim() ?? '',
        rpe_min: r[getCol('rpe_min')]?.trim() ?? '',
        rpe_max: r[getCol('rpe_max')]?.trim() ?? '',
        rest_min: restMinIdx !== -1 ? (r[restMinIdx]?.trim() ?? '') : '',
        rest_max: restMaxIdx !== -1 ? (r[restMaxIdx]?.trim() ?? '') : '',
        xrm: r[getCol('xrm')]?.trim() ?? '',
        tempo: r[getCol('tempo')]?.trim() ?? '',
        notes: r[getCol('notes')]?.trim() ?? '',
        exercise_notes: r[getCol('exercise_notes')]?.trim() ?? '',
        miniset_count: r[getCol('miniset_count')]?.trim() ?? '',
        miniset_reps: r[getCol('miniset_reps')]?.trim() ?? '',
        miniset_rest: r[getCol('miniset_rest')]?.trim() ?? '',
        miniset_load_pct: r[getCol('miniset_load_pct')]?.trim() ?? '',
      };
    });
}

// ── Conflict detection ────────────────────────────────────────────────────────

export async function detectWorkoutCsvConflicts(
  rows: FlatWorkoutRow[],
): Promise<CsvWorkoutConflict[]> {
  const existing = await WorkoutPlanRepository.getAllWorkouts();
  const nameMap = new Map(existing.map(w => [w.name.toLowerCase(), w]));
  const conflicts: CsvWorkoutConflict[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const key = row.plan.toLowerCase();
    if (!row.plan || seen.has(key)) continue;
    seen.add(key);
    const found = nameMap.get(key);
    if (found) conflicts.push({ existingId: found.id, existingName: found.name, incomingName: row.plan });
  }
  return conflicts;
}

// ── Import ────────────────────────────────────────────────────────────────────

export async function importWorkoutsCsv(
  rows: FlatWorkoutRow[],
  strategy: CsvConflictStrategy,
  conflicts: CsvWorkoutConflict[],
): Promise<CsvWorkoutImportResult> {
  const result: CsvWorkoutImportResult = {
    workoutsInserted: 0, workoutsOverwritten: 0, workoutsCopied: 0, workoutsSkipped: 0, failed: 0,
  };

  const conflictByName = new Map(conflicts.map(c => [c.incomingName.toLowerCase(), c]));
  const existingWorkouts = await WorkoutPlanRepository.getAllWorkouts();
  const usedWorkoutNames = new Set(existingWorkouts.map(w => w.name.toLowerCase()));

  const allExercises = await ExerciseRepository.getAll();
  const exerciseByName = new Map(allExercises.map(e => [e.name.toLowerCase(), e.id]));

  const now = new Date();

  // Group rows by plan name (preserving order)
  const planNames: string[] = [];
  const rowsByPlan = new Map<string, FlatWorkoutRow[]>();
  for (const row of rows) {
    if (!row.plan) continue;
    const key = row.plan.toLowerCase();
    if (!rowsByPlan.has(key)) {
      rowsByPlan.set(key, []);
      planNames.push(row.plan);
    }
    rowsByPlan.get(key)!.push(row);
  }

  for (const planName of planNames) {
    const planRows = rowsByPlan.get(planName.toLowerCase())!;
    const firstRow = planRows[0];
    const conflict = conflictByName.get(planName.toLowerCase());
    let workoutId: string;
    let shouldSkip = false;
    let finalName = planName;

    if (!conflict) {
      workoutId = nanoid();
      result.workoutsInserted++;
    } else {
      switch (strategy) {
        case 'ignore':
          result.workoutsSkipped++;
          shouldSkip = true;
          workoutId = conflict.existingId;
          break;
        case 'overwrite':
          workoutId = conflict.existingId;
          // Delete old data
          await WorkoutPlanRepository.deleteWorkoutData(workoutId);
          result.workoutsOverwritten++;
          break;
        case 'copy': {
          let copyName = `${planName} (2)`;
          let suffix = 2;
          while (usedWorkoutNames.has(copyName.toLowerCase())) {
            suffix++;
            copyName = `${planName} (${suffix})`;
          }
          finalName = copyName;
          workoutId = nanoid();
          usedWorkoutNames.add(copyName.toLowerCase());
          result.workoutsCopied++;
          break;
        }
        default:
          workoutId = nanoid();
      }
    }

    if (shouldSkip) continue;

    const workout: PlannedWorkout = {
      id: workoutId,
      name: finalName,
      objectiveType: (Object.values(ObjectiveType).includes(firstRow.objective as ObjectiveType)
        ? firstRow.objective : ObjectiveType.Hypertrophy) as ObjectiveType,
      workType: (Object.values(WorkType).includes(firstRow.work_type as WorkType)
        ? firstRow.work_type : WorkType.Accumulation) as WorkType,
      status: PlannedWorkoutStatus.Inactive,
      createdAt: now,
      updatedAt: now,
    };

    const newSessions: PlannedSession[] = [];
    const newGroups: PlannedExerciseGroup[] = [];
    const newItems: PlannedExerciseItem[] = [];
    const newSets: PlannedSet[] = [];

    const sessionNames: string[] = [];
    const rowsBySession = new Map<string, FlatWorkoutRow[]>();
    for (const row of planRows) {
      const key = row.session.toLowerCase();
      if (!rowsBySession.has(key)) {
        rowsBySession.set(key, []);
        sessionNames.push(row.session);
      }
      rowsBySession.get(key)!.push(row);
    }

    let sessionOrderIndex = 0;
    for (const sessionName of sessionNames) {
      const sRows = rowsBySession.get(sessionName.toLowerCase())!;
      const sessionId = nanoid();
      sessionOrderIndex++;

      newSessions.push({
        id: sessionId,
        plannedWorkoutId: workoutId,
        name: sessionName,
        dayNumber: sessionOrderIndex,
        orderIndex: sessionOrderIndex,
        focusMuscleGroups: [],
        status: PlannedSessionStatus.Pending,
        createdAt: now,
        updatedAt: now,
      });

      let groupOrderIndex = 0;
      let currentGroupType: string | null = null;
      let currentGroupId: string | null = null;
      let itemOrderInGroup = 0;

      let currentItemId: string | null = null;
      let currentItemExercise: string | null = null;
      let currentItemSetOrder = 0;
      let pendingClusterParams: {
        miniSetCount: number;
        miniSetReps: number;
        interMiniSetRestSeconds: number;
        loadReductionPercent?: number;
      } | null = null;

      for (const row of sRows) {
        const rowGroupType = row.group_type || 'standard';

        const needsNewGroup =
          currentGroupId === null ||
          (rowGroupType === 'standard' && currentGroupType !== null) ||
          (rowGroupType !== 'standard' && rowGroupType !== currentGroupType);

        if (needsNewGroup) {
          groupOrderIndex++;
          currentGroupId = nanoid();
          currentGroupType = rowGroupType;
          itemOrderInGroup = 0;
          currentItemId = null;
          currentItemExercise = null;
          currentItemSetOrder = 0;
          pendingClusterParams = null;

          const gt = Object.values(ExerciseGroupType).includes(rowGroupType as ExerciseGroupType)
            ? rowGroupType as ExerciseGroupType
            : ExerciseGroupType.Standard;

          newGroups.push({
            id: currentGroupId,
            plannedSessionId: sessionId,
            groupType: gt,
            orderIndex: groupOrderIndex,
          });
        }

        const exerciseId = exerciseByName.get(row.exercise.toLowerCase());
        if (!exerciseId) continue;

        const isSameItem = currentItemId !== null
          && currentItemExercise === row.exercise.toLowerCase();

        if (!isSameItem) {
          if (currentItemId && pendingClusterParams) {
            pendingClusterParams = null;
          }

          itemOrderInGroup++;
          currentItemId = nanoid();
          currentItemExercise = row.exercise.toLowerCase();
          currentItemSetOrder = 0;
          pendingClusterParams = null;

          const xrmVal = num(row.xrm);
          const isCluster = rowGroupType === (ExerciseGroupType.Cluster as string);

          const msCount = num(row.miniset_count);
          const msReps = num(row.miniset_reps);
          const msRest = num(row.miniset_rest);
          const msLoadPct = num(row.miniset_load_pct);

          const clusterSpecialParams = isCluster && msCount !== undefined && msReps !== undefined && msRest !== undefined
            ? {
              miniSetCount: Math.round(msCount),
              miniSetReps: Math.round(msReps),
              interMiniSetRestSeconds: msRest,
              loadReductionPercent: msLoadPct,
            }
            : null;

          if (clusterSpecialParams) {
            pendingClusterParams = clusterSpecialParams;
          }

          newItems.push({
            id: currentItemId,
            plannedExerciseGroupId: currentGroupId!,
            exerciseId,
            counterType: CounterType.Reps,
            orderIndex: itemOrderInGroup,
            ...(row.exercise_notes && { notes: row.exercise_notes }),
            ...(xrmVal !== undefined && { targetXRM: Math.round(xrmVal) }),
            ...(clusterSpecialParams && {
              modifiers: [{
                type: 'cluster' as const,
                config: {
                  totalRepsTarget: clusterSpecialParams.miniSetCount * clusterSpecialParams.miniSetReps,
                  miniSetReps: clusterSpecialParams.miniSetReps,
                  miniSetCount: clusterSpecialParams.miniSetCount,
                  interMiniSetRestSeconds: clusterSpecialParams.interMiniSetRestSeconds,
                  loadReductionPercent: clusterSpecialParams.loadReductionPercent,
                  miniSetToFailure: false,
                },
              }],
            }),
          });
        }

        const setsMinVal = num(row.sets_min);
        const setsMaxVal = num(row.sets_max);
        const countMinVal = num(row.count_min);
        const countMaxVal = num(row.count_max);
        const loadMinVal = num(row.load_min);
        const loadMaxVal = num(row.load_max);
        const pct1rmMinVal = num(row.pct1rm_min);
        const pct1rmMaxVal = num(row.pct1rm_max);
        const rpeMinVal = num(row.rpe_min);
        const rpeMaxVal = num(row.rpe_max);
        const restMinVal = num(row.rest_min);
        const restMaxVal = num(row.rest_max);

        if (countMinVal === undefined && countMaxVal === undefined) continue;

        currentItemSetOrder++;

        const st = Object.values(SetType).includes(row.set_type as SetType)
          ? row.set_type as SetType
          : SetType.Working;

        newSets.push({
          id: nanoid(),
          plannedExerciseItemId: currentItemId!,
          setType: st,
          orderIndex: currentItemSetOrder,
          setCountRange: {
            min: setsMinVal ?? 1,
            max: setsMaxVal ?? setsMinVal ?? 1,
          },
          countRange: {
            min: countMinVal ?? 1,
            max: coalesce(countMaxVal, countMinVal) ?? null,
            toFailure: parseToFailure(row.to_failure),
          },
          ...(loadMinVal !== undefined && {
            loadRange: {
              min: loadMinVal,
              max: coalesce(loadMaxVal, loadMinVal) ?? null,
              unit: 'kg' as const,
            }
          }),
          ...(pct1rmMinVal !== undefined && {
            percentage1RMRange: {
              min: pct1rmMinVal,
              max: coalesce(pct1rmMaxVal, pct1rmMinVal)!,
              basedOnEstimated1RM: false,
            }
          }),
          ...(rpeMinVal !== undefined && {
            rpeRange: {
              min: rpeMinVal,
              max: coalesce(rpeMaxVal, rpeMinVal)!,
            }
          }),
          ...(restMinVal !== undefined && {
            restSecondsRange: {
              min: restMinVal,
              max: coalesce(restMaxVal, restMinVal) ?? restMinVal,
              isFixed: restMaxVal === undefined || restMaxVal === restMinVal,
            }
          }),
          ...(row.tempo && { tempo: row.tempo }),
          ...(row.notes && { notes: row.notes }),
        });
      }
    }

    await WorkoutPlanRepository.saveFullWorkout(workout, newSessions, newGroups, newItems, newSets);
  }

  return result;
}
