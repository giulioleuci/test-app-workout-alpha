/**
 * CSV Import/Export for History Sessions.
 */

import { nanoid } from 'nanoid';
import Papa from 'papaparse';

import { db } from '@/db/database';
import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import { SessionRepository } from '@/db/repositories/SessionRepository';
import { WorkoutPlanRepository } from '@/db/repositories/WorkoutPlanRepository';
import type {
  WorkoutSession, SessionExerciseGroup, SessionExerciseItem, SessionSet,
} from '@/domain/entities';
import {
  ExerciseGroupType, SetType, ToFailureIndicator,
} from '@/domain/enums';
import dayjs from '@/lib/dayjs';

import { generateCsvBlob, type CsvConflictStrategy } from './csvExerciseService';

// ── Column names ─────────────────────────────────────────────────────────────

export const HISTORY_CSV_HEADERS = [
  'started_at',
  'completed_at',
  'workout_name',
  'session_name',
  'session_notes',
  'overall_rpe',
  'exercise',
  'group_type',
  'item_notes',
  'set_type',
  'load',
  'reps',
  'rpe',
  'to_failure',
  'expected_rpe',
  'set_completed',
  'set_skipped',
] as const;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FlatHistoryRow {
  started_at: string;
  completed_at: string;
  workout_name: string;
  session_name: string;
  session_notes: string;
  overall_rpe: string;
  exercise: string;
  group_type: string;
  item_notes: string;
  set_type: string;
  load: string;
  reps: string;
  rpe: string;
  to_failure: string;
  expected_rpe: string;
  set_completed: string;
  set_skipped: string;
}

export interface CsvHistoryConflict {
  existingId: string;
  existingDate: string;
  incomingDate: string;
}

export interface CsvHistoryImportResult {
  sessionsInserted: number;
  sessionsOverwritten: number;
  sessionsCopied: number;
  sessionsSkipped: number;
  failed: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function num(v: string | undefined): number | undefined {
  if (!v || v.trim() === '') return undefined;
  const cleaned = v.replace(',', '.').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? undefined : n;
}

function parseBool(v: string | undefined): boolean {
  if (!v) return false;
  const s = v.trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'sì' || s === 'y' || s === 'x';
}

function serializeToFailure(tf: ToFailureIndicator | undefined): string {
  switch (tf) {
    case ToFailureIndicator.TechnicalFailure: return 'technical';
    case ToFailureIndicator.AbsoluteFailure: return 'absolute';
    case ToFailureIndicator.BarSpeedFailure: return 'barSpeed';
    default: return '';
  }
}

function parseToFailure(v: string): ToFailureIndicator {
  switch (v.trim().toLowerCase()) {
    case 'technical': return ToFailureIndicator.TechnicalFailure;
    case 'absolute': return ToFailureIndicator.AbsoluteFailure;
    case 'barspeed': return ToFailureIndicator.BarSpeedFailure;
    default: return ToFailureIndicator.None;
  }
}

// ── Export ────────────────────────────────────────────────────────────────────

export async function exportAllHistoryCsv(): Promise<{ blob: Blob, filename: string }> {
  const allSessions = await SessionRepository.getAllHydratedSessions();
  const sortedSessions = allSessions.sort((a, b) => a.session.startedAt.getTime() - b.session.startedAt.getTime());

  // Try to find workout and session names
  const allWorkouts = await WorkoutPlanRepository.getAllWorkouts();
  const workoutMap = new Map(allWorkouts.map(w => [w.id, w.name]));
  const allPlannedSessions = await db.plannedSessions.toArray();
  const plannedSessionMap = new Map(allPlannedSessions.map(s => [s.id, s.name]));

  const rows: (string | number | undefined)[][] = [];

  let firstSession = true;
  for (const hs of sortedSessions) {
    if (!firstSession) rows.push([]); // blank row for readability
    firstSession = false;

    const { session, groups } = hs;
    const workoutName = session.plannedWorkoutId ? (workoutMap.get(session.plannedWorkoutId) ?? '') : '';
    const sessionName = session.plannedSessionId ? (plannedSessionMap.get(session.plannedSessionId) ?? '') : '';

    const startedAtStr = session.startedAt.toISOString();
    const completedAtStr = session.completedAt ? session.completedAt.toISOString() : '';

    for (const g of groups) {
      const groupType = g.group.groupType === ExerciseGroupType.Standard ? '' : g.group.groupType;

      for (const i of g.items) {
        const exerciseName = i.exercise?.name ?? 'Unknown Exercise';

        if (i.sets.length === 0) {
          rows.push([
            startedAtStr,
            completedAtStr,
            workoutName,
            sessionName,
            session.notes ?? '',
            session.overallRPE !== undefined ? String(session.overallRPE) : '',
            exerciseName,
            groupType,
            i.item.notes ?? '',
            '', '', '', '', '', '', '', ''
          ]);
          continue;
        }

        for (const s of i.sets) {
          const setType = s.setType === SetType.Working ? '' : s.setType;

          rows.push([
            startedAtStr,
            completedAtStr,
            workoutName,
            sessionName,
            session.notes ?? '',
            session.overallRPE !== undefined ? String(session.overallRPE) : '',
            exerciseName,
            groupType,
            i.item.notes ?? '',
            setType,
            s.actualLoad !== null && s.actualLoad !== undefined ? String(s.actualLoad) : '',
            s.actualCount !== null && s.actualCount !== undefined ? String(s.actualCount) : '',
            s.actualRPE !== null && s.actualRPE !== undefined ? String(s.actualRPE) : '',
            serializeToFailure(s.actualToFailure),
            s.expectedRPE !== null && s.expectedRPE !== undefined ? String(s.expectedRPE) : '',
            s.isCompleted ? '1' : '0',
            s.isSkipped ? '1' : '0',
          ]);
        }
      }
    }

    // If empty session
    if (groups.length === 0) {
        rows.push([
            startedAtStr,
            completedAtStr,
            workoutName,
            sessionName,
            session.notes ?? '',
            session.overallRPE !== undefined ? String(session.overallRPE) : '',
            '', '', '', '', '', '', '', '', '', '', ''
        ]);
    }
  }

  const csv = Papa.unparse({
    fields: [...HISTORY_CSV_HEADERS],
    data: rows
  }, { newline: '\n' });

  const filename = `history-${dayjs().format('YYYY-MM-DD')}.csv`;
  return { blob: generateCsvBlob(csv), filename };
}

// ── Parse uploaded CSV ────────────────────────────────────────────────────────

export function parseHistoryCsv(text: string): FlatHistoryRow[] {
  const result = Papa.parse<string[]>(text, {
    skipEmptyLines: 'greedy',
  });

  const rows = result.data;
  if (rows.length < 2) return [];

  const headerRow = rows[0].map(h => h.trim().toLowerCase());
  const idx = (key: string) => headerRow.indexOf(key);

  const startedAtIdx = idx('started_at');
  if (startedAtIdx === -1) throw new Error('CSV mancante della colonna "started_at"');

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
    .filter(r => r[startedAtIdx]?.trim())
    .map(r => {
      return {
        started_at: r[startedAtIdx]?.trim() ?? '',
        completed_at: r[getCol('completed_at')]?.trim() ?? '',
        workout_name: r[getCol('workout_name')]?.trim() ?? '',
        session_name: r[getCol('session_name')]?.trim() ?? '',
        session_notes: r[getCol('session_notes')]?.trim() ?? '',
        overall_rpe: r[getCol('overall_rpe')]?.trim() ?? '',
        exercise: r[getCol('exercise')]?.trim() ?? '',
        group_type: r[getCol('group_type')]?.trim() ?? '',
        item_notes: r[getCol('item_notes')]?.trim() ?? '',
        set_type: r[getCol('set_type')]?.trim() ?? '',
        load: r[getCol('load')]?.trim() ?? '',
        reps: r[getCol('reps')]?.trim() ?? '',
        rpe: r[getCol('rpe')]?.trim() ?? '',
        to_failure: r[getCol('to_failure')]?.trim() ?? '',
        expected_rpe: r[getCol('expected_rpe')]?.trim() ?? '',
        set_completed: r[getCol('set_completed')]?.trim() ?? '',
        set_skipped: r[getCol('set_skipped')]?.trim() ?? '',
      };
    });
}

// ── Conflict detection ────────────────────────────────────────────────────────

export async function detectHistoryCsvConflicts(
  rows: FlatHistoryRow[],
): Promise<CsvHistoryConflict[]> {
  const existing = await SessionRepository.getAllSessions();
  const datesMap = new Map(existing.map(s => [s.startedAt.toISOString(), s]));
  const conflicts: CsvHistoryConflict[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    let dtStr = row.started_at;
    try {
        const dt = new Date(row.started_at);
        if (!isNaN(dt.getTime())) dtStr = dt.toISOString();
    } catch {}

    const key = dtStr;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const found = datesMap.get(key);
    if (found) conflicts.push({ existingId: found.id, existingDate: found.startedAt.toISOString(), incomingDate: key });
  }
  return conflicts;
}

// ── Import ────────────────────────────────────────────────────────────────────

export async function importHistoryCsv(
  rows: FlatHistoryRow[],
  strategy: CsvConflictStrategy,
  conflicts: CsvHistoryConflict[],
): Promise<CsvHistoryImportResult> {
  const result: CsvHistoryImportResult = {
    sessionsInserted: 0, sessionsOverwritten: 0, sessionsCopied: 0, sessionsSkipped: 0, failed: 0,
  };

  const conflictByDate = new Map(conflicts.map(c => [c.incomingDate, c]));

  const allWorkouts = await WorkoutPlanRepository.getAllWorkouts();
  const workoutMap = new Map(allWorkouts.map(w => [w.name.toLowerCase(), w.id]));
  const allPlannedSessions = await db.plannedSessions.toArray();
  const plannedSessionMap = new Map(allPlannedSessions.map(s => [`${s.plannedWorkoutId}_${s.name.toLowerCase()}`, s.id]));

  const allExercises = await ExerciseRepository.getAll();
  const exerciseByName = new Map(allExercises.map(e => [e.name.toLowerCase(), e.id]));

  // Group rows by started_at
  const startDates: string[] = [];
  const rowsBySession = new Map<string, FlatHistoryRow[]>();
  for (const row of rows) {
    let dtStr = row.started_at;
    try {
        const dt = new Date(row.started_at);
        if (!isNaN(dt.getTime())) dtStr = dt.toISOString();
    } catch {}

    const key = dtStr;
    if (!key) continue;
    if (!rowsBySession.has(key)) {
      rowsBySession.set(key, []);
      startDates.push(key);
    }
    rowsBySession.get(key)!.push(row);
  }

  for (const startDate of startDates) {
    const sessionRows = rowsBySession.get(startDate)!;
    const firstRow = sessionRows[0];
    const conflict = conflictByDate.get(startDate);
    let sessionId: string;
    let shouldSkip = false;
    let finalStartedAt = new Date(startDate);

    if (!conflict) {
      sessionId = nanoid();
      result.sessionsInserted++;
    } else {
      switch (strategy) {
        case 'ignore':
          result.sessionsSkipped++;
          shouldSkip = true;
          sessionId = conflict.existingId;
          break;
        case 'overwrite':
          sessionId = conflict.existingId;
          await SessionRepository.deleteSessionCascade(sessionId);
          result.sessionsOverwritten++;
          break;
        case 'copy': {
          finalStartedAt = new Date(finalStartedAt.getTime() + 1000); // add 1 second to avoid direct conflict
          sessionId = nanoid();
          result.sessionsCopied++;
          break;
        }
        default:
          sessionId = nanoid();
      }
    }

    if (shouldSkip) continue;

    const plannedWorkoutId = workoutMap.get(firstRow.workout_name.toLowerCase());
    const plannedSessionId = plannedWorkoutId && firstRow.session_name
        ? plannedSessionMap.get(`${plannedWorkoutId}_${firstRow.session_name.toLowerCase()}`)
        : undefined;

    let completedAt: Date | undefined;
    if (firstRow.completed_at) {
        const dt = new Date(firstRow.completed_at);
        if (!isNaN(dt.getTime())) completedAt = dt;
    }

    const session: WorkoutSession = {
      id: sessionId,
      plannedWorkoutId,
      plannedSessionId,
      startedAt: finalStartedAt,
      completedAt,
      notes: firstRow.session_notes || undefined,
      overallRPE: num(firstRow.overall_rpe),
    };

    const newGroups: SessionExerciseGroup[] = [];
    const newItems: SessionExerciseItem[] = [];
    const newSets: SessionSet[] = [];

    let groupOrderIndex = 0;
    let currentGroupType: string | null = null;
    let currentGroupId: string | null = null;
    let itemOrderInGroup = 0;

    let currentItemId: string | null = null;
    let currentItemExercise: string | null = null;
    let currentItemSetOrder = 0;

    for (const row of sessionRows) {
        if (!row.exercise) continue;

        const rowGroupType = row.group_type || 'standard';

        const isSameExerciseAsPrevious = currentItemExercise === row.exercise.toLowerCase();

        const needsNewGroup =
            currentGroupId === null ||
            (rowGroupType === 'standard' && currentGroupType !== null && !isSameExerciseAsPrevious) ||
            (rowGroupType !== 'standard' && rowGroupType !== currentGroupType);

        if (needsNewGroup) {
            groupOrderIndex++;
            currentGroupId = nanoid();
            currentGroupType = rowGroupType;
            itemOrderInGroup = 0;
            currentItemId = null;
            currentItemExercise = null;
            currentItemSetOrder = 0;

            const gt = Object.values(ExerciseGroupType).includes(rowGroupType as ExerciseGroupType)
            ? rowGroupType as ExerciseGroupType
            : ExerciseGroupType.Standard;

            newGroups.push({
            id: currentGroupId,
            workoutSessionId: sessionId,
            groupType: gt,
            orderIndex: String(groupOrderIndex),
            });
        }

        const exerciseId = exerciseByName.get(row.exercise.toLowerCase());
        if (!exerciseId) continue;

        const isSameItem = currentItemId !== null
            && currentItemExercise === row.exercise.toLowerCase();

        if (!isSameItem) {
            itemOrderInGroup++;
            currentItemId = nanoid();
            currentItemExercise = row.exercise.toLowerCase();
            currentItemSetOrder = 0;

            newItems.push({
            id: currentItemId,
            sessionExerciseGroupId: currentGroupId!,
            exerciseId,
            orderIndex: String(itemOrderInGroup),
            isCompleted: true,
            notes: row.item_notes || undefined,
            });
        }

        const st = Object.values(SetType).includes(row.set_type as SetType)
            ? row.set_type as SetType
            : SetType.Working;

        const loadVal = num(row.load);
        const repsVal = num(row.reps);
        const rpeVal = num(row.rpe);
        const expectedRpeVal = num(row.expected_rpe);

        const isCompleted = row.set_completed ? parseBool(row.set_completed) : (loadVal !== undefined || repsVal !== undefined);
        const isSkipped = parseBool(row.set_skipped);

        // Even if all are empty, if it's in the CSV as a row, it's a set
        currentItemSetOrder++;

        newSets.push({
            id: nanoid(),
            sessionExerciseItemId: currentItemId!,
            setType: st,
            orderIndex: String(currentItemSetOrder),
            actualLoad: loadVal ?? null,
            actualCount: repsVal ?? null,
            actualRPE: rpeVal ?? null,
            actualToFailure: parseToFailure(row.to_failure),
            expectedRPE: expectedRpeVal ?? null,
            isCompleted,
            isSkipped,
        });
    }

    session.totalSets = newSets.length;
    await SessionRepository.saveFullSession(session, newGroups, newItems, newSets);
  }

  return result;
}
