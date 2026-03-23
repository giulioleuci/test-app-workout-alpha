import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import { SessionRepository } from '@/db/repositories/SessionRepository';
import { WorkoutPlanRepository } from '@/db/repositories/WorkoutPlanRepository';
import type { PlannedSession, PlannedWorkout } from '@/domain/entities';
import { t } from '@/i18n/t';
import { estimateSessionDuration, formatDurationRange } from '@/services/durationEstimator';
import { analyzeSessionVolume, type SessionVolumeAnalysis } from '@/services/volumeAnalyzer';

export interface NextSessionSuggestion {
  workout: PlannedWorkout;
  session: PlannedSession;
  sessionIndex: number;      // 0-based index in the ordered list
  totalSessions: number;
  lastCompletedDate?: Date;
}

export interface NextSessionSuggestionDetail extends NextSessionSuggestion {
  volume: SessionVolumeAnalysis;
  equipment: string[];
  exerciseCount: number;
  totalSetsMin: number;
  totalSetsMax: number;
  durationLabel: string | null;
}

/**
 * Finds the single active workout and determines the next session
 * in the A→B→C→A rotation based on completed WorkoutSessions.
 */
export async function getNextSessionSuggestion(): Promise<NextSessionSuggestion | null> {
  // 1. Find the unique active planned workout
  const activeWorkouts = await WorkoutPlanRepository.getActiveWorkouts();

  if (activeWorkouts.length === 0) return null;
  const workout = activeWorkouts[0];

  // 2. Get sessions ordered by orderIndex
  const sessions = await WorkoutPlanRepository.getSessionsByWorkout(workout.id);
  sessions.sort((a, b) => a.orderIndex - b.orderIndex);

  if (sessions.length === 0) return null;

  // 3. Find the most recently completed WorkoutSession for this workout
  const lastCompleted = await SessionRepository.getLatestCompletedSessionByWorkout(workout.id);

  if (!lastCompleted) {
    // Never trained → suggest first session
    return {
      workout,
      session: sessions[0],
      sessionIndex: 0,
      totalSessions: sessions.length,
    };
  }

  const lastPlannedSessionId = lastCompleted.plannedSessionId;

  // 4. Find which session was last completed and rotate to next
  const lastIndex = sessions.findIndex(s => s.id === lastPlannedSessionId);
  const nextIndex = lastIndex === -1 ? 0 : (lastIndex + 1) % sessions.length;

  return {
    workout,
    session: sessions[nextIndex],
    sessionIndex: nextIndex,
    totalSessions: sessions.length,
    lastCompletedDate: lastCompleted.completedAt,
  };
}

export async function getNextSessionSuggestionDetail(): Promise<NextSessionSuggestionDetail | null> {
  const sug = await getNextSessionSuggestion();
  if (!sug) return null;

  const vol = await analyzeSessionVolume(
    sug.session.id,
    sug.session.name,
    k => t(`enums.muscle.${k}`),
    k => t(`enums.muscleGroup.${k}`),
    k => t(`enums.movementPattern.${k}`),
    undefined,
    true
  );

  const groups = await WorkoutPlanRepository.getGroupsBySession(sug.session.id);
  // Items by groups (N+1 fixed)
  const groupIds = groups.map(g => g.id);
  const items = await WorkoutPlanRepository.getItemsByGroups(groupIds);

  const exerciseIds = [...new Set(items.map(i => i.exerciseId))];
  const exercises = await ExerciseRepository.getByIds(exerciseIds);

  const equipmentSet = new Set(exercises.flatMap(e => Array.isArray(e.equipment) ? e.equipment : [e.equipment]));
  const equipmentLabels = [...equipmentSet].map(e => t(`enums.equipment.${e}`));

  // Sets by items (N+1 fixed)
  const itemIds = items.map(i => i.id);
  const flatSets = await WorkoutPlanRepository.getSetsByItems(itemIds);

  const totalSetsMin = flatSets.map(s => s.setCountRange.min).reduce((a, b) => a + b, 0);
  const totalSetsMax = flatSets.map(s => s.setCountRange.max ?? s.setCountRange.min).reduce((a, b) => a + b, 0);

  const dur = await estimateSessionDuration(sug.session.id);
  const durationLabel = dur.maxSeconds > 0 ? formatDurationRange(dur) : null;

  return {
    ...sug,
    volume: vol,
    equipment: equipmentLabels,
    exerciseCount: exerciseIds.length,
    totalSetsMin,
    totalSetsMax,
    durationLabel,
  };
}
