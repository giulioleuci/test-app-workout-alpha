import { nanoid } from 'nanoid';

import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import { SessionRepository } from '@/db/repositories/SessionRepository';
import { UserProfileRepository } from '@/db/repositories/UserProfileRepository';
import { WorkoutPlanRepository } from '@/db/repositories/WorkoutPlanRepository';
import type { PlannedWorkout, PlannedSession, Exercise, PlannedExerciseGroup, PlannedExerciseItem, PlannedSet } from '@/domain/entities';
import { ObjectiveType, WorkType, PlannedWorkoutStatus } from '@/domain/enums';
import { bulkEstimateWorkoutDurations, estimateSessionDuration, estimateWorkoutDuration } from '@/services/durationEstimator';
import { deduceSessionMuscles } from '@/services/muscleDeducer';

export interface WorkoutListData {
  workouts: PlannedWorkout[];
  sessionCounts: Record<string, number>;
  plannedSessions: Record<string, PlannedSession[]>;
  durations: Record<string, { minSeconds: number; maxSeconds: number }>;
}

export async function getAllWorkouts(): Promise<PlannedWorkout[]> {
  return WorkoutPlanRepository.getAllWorkouts();
}

export async function getWorkoutListData(): Promise<WorkoutListData> {
  const workouts = await WorkoutPlanRepository.getAllWorkouts();
  workouts.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  const workoutIds = workouts.map(w => w.id);
  const sessionsByWorkout = await Promise.all(workoutIds.map(id => WorkoutPlanRepository.getSessionsByWorkout(id)));

  const sessionCounts: Record<string, number> = {};
  const plannedSessions: Record<string, PlannedSession[]> = {};

  workoutIds.forEach((id, idx) => {
    const sessions = sessionsByWorkout[idx];
    sessionCounts[id] = sessions.length;
    plannedSessions[id] = sessions;
  });

  const durations = await bulkEstimateWorkoutDurations(workouts);

  return {
    workouts,
    sessionCounts,
    plannedSessions,
    durations,
  };
}

export interface PlannedSessionDetail {
  session: PlannedSession;
  groups: PlannedExerciseGroup[];
  items: Record<string, PlannedExerciseItem[]>;
  sets: Record<string, PlannedSet[]>;
  exercises: Exercise[];
  simpleMode: boolean;
}

export async function getPlannedSessionDetail(sessionId: string): Promise<PlannedSessionDetail | null> {
  const [hydrated, exs, profile] = await Promise.all([
    WorkoutPlanRepository.getHydratedPlannedSession(sessionId),
    ExerciseRepository.getAll(),
    UserProfileRepository.getRegulationProfile(),
  ]);

  if (!hydrated) return null;

  const g: PlannedExerciseGroup[] = [];
  const allItems: Record<string, PlannedExerciseItem[]> = {};
  const allSets: Record<string, PlannedSet[]> = {};

  hydrated.groups.forEach(hg => {
    g.push(hg.group);
    const groupItems: PlannedExerciseItem[] = [];
    hg.items.forEach(hi => {
      groupItems.push(hi.item);
      allSets[hi.item.id] = hi.sets;
    });
    allItems[hg.group.id] = groupItems;
  });

  return {
    session: hydrated.session,
    groups: g,
    items: allItems,
    sets: allSets,
    exercises: exs,
    simpleMode: profile?.simpleMode ?? false,
  };
}

export interface WorkoutDetailData {
  workout: PlannedWorkout;
  sessions: PlannedSession[];
  muscles: Record<string, string[]>;
  durations: Record<string, { minSeconds: number; maxSeconds: number }>;
  workoutDuration: { minSeconds: number; maxSeconds: number };
}

export async function getWorkoutDetail(id: string): Promise<WorkoutDetailData | null> {
  const w = await WorkoutPlanRepository.getWorkout(id);
  if (!w) return null;

  const s = await WorkoutPlanRepository.getSessionsByWorkout(id);

  const [muscleResults, durationResults, wd] = await Promise.all([
    Promise.all(s.map(async sess => [sess.id, await deduceSessionMuscles(sess.id)] as const)),
    Promise.all(s.map(async sess => [sess.id, await estimateSessionDuration(sess.id)] as const)),
    estimateWorkoutDuration(id),
  ]);

  return {
    workout: w,
    sessions: s,
    muscles: Object.fromEntries(muscleResults),
    durations: Object.fromEntries(durationResults),
    workoutDuration: wd,
  };
}

export async function createWorkout(params: {
  name: string;
  description?: string;
  objectiveType: ObjectiveType;
  workType: WorkType;
  status: PlannedWorkoutStatus;
}): Promise<string> {
  const id = nanoid();
  const now = new Date();
  await WorkoutPlanRepository.addWorkout({
    id,
    name: params.name,
    description: params.description,
    objectiveType: params.objectiveType,
    workType: params.workType,
    status: params.status,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function activateWorkout(id: string): Promise<void> {
  const now = new Date();
  const actives = await WorkoutPlanRepository.getActiveWorkouts();
  // Deactivate all active workouts
  await Promise.all(actives.map(a => WorkoutPlanRepository.updateWorkout(a.id, { status: PlannedWorkoutStatus.Inactive, updatedAt: now })));
  await WorkoutPlanRepository.updateWorkout(id, { status: PlannedWorkoutStatus.Active, updatedAt: now });
}

export async function deactivateWorkout(id: string): Promise<void> {
  const now = new Date();
  await WorkoutPlanRepository.updateWorkout(id, { status: PlannedWorkoutStatus.Inactive, updatedAt: now });
}

export async function archiveWorkout(id: string): Promise<void> {
  const now = new Date();
  await WorkoutPlanRepository.updateWorkout(id, { status: PlannedWorkoutStatus.Archived, updatedAt: now });
}

export async function restoreWorkout(id: string): Promise<void> {
  const now = new Date();
  await WorkoutPlanRepository.updateWorkout(id, { status: PlannedWorkoutStatus.Inactive, updatedAt: now });
}

export async function removeWorkout(id: string): Promise<void> {
  await WorkoutPlanRepository.smartDeleteWorkout(id);
}

export async function updateWorkout(id: string, updates: Partial<PlannedWorkout>): Promise<void> {
  await WorkoutPlanRepository.updateWorkout(id, { ...updates, updatedAt: new Date() });
}

export async function getWorkoutSessions(workoutId: string): Promise<PlannedSession[]> {
  return await WorkoutPlanRepository.getSessionsByWorkout(workoutId);
}

export async function getWorkoutSessionGroups(sessionId: string): Promise<PlannedExerciseGroup[]> {
  return await WorkoutPlanRepository.getGroupsBySession(sessionId);
}

export async function getWorkoutGroupItems(groupId: string): Promise<PlannedExerciseItem[]> {
  return await WorkoutPlanRepository.getItemsByGroup(groupId);
}

export async function saveWorkoutSessions(workoutId: string, sessions: PlannedSession[], originalSessions: PlannedSession[]): Promise<void> {
  const currentIds = new Set(sessions.map(s => s.id));
  const removedIds = originalSessions.filter(s => !currentIds.has(s.id)).map(s => s.id);

  for (const id of removedIds) {
    await WorkoutPlanRepository.deleteSessionCascade(id);
  }

  await WorkoutPlanRepository.bulkUpsertSessions(sessions);
}

export async function updateSessionStructure(
  sessionId: string,
  updates: Partial<PlannedSession>,
  added: { groups: PlannedExerciseGroup[], items: PlannedExerciseItem[], sets: PlannedSet[] },
  removed: { removedGroupIds: string[], removedItemIds: string[], removedSetIds: string[] }
): Promise<void> {
  return WorkoutPlanRepository.updateSessionStructure(sessionId, updates, added, removed);
}

// ===== Routine Insights =====

export interface RoutineInsights {
  totalCompletions: number;
  lastCompletedAt: Date | null;
  averageDurationMinutes: number | null;
  consistencyScore: number | null;
  totalVolume: number;
  avgSetsPerSession: number | null;
}

export async function getRoutineInsights(workoutId: string): Promise<RoutineInsights> {
  const sessions = await SessionRepository.getSessionsByWorkout(workoutId, { completedOnly: true, desc: true });

  if (sessions.length === 0) {
    return {
      totalCompletions: 0,
      lastCompletedAt: null,
      averageDurationMinutes: null,
      consistencyScore: null,
      totalVolume: 0,
      avgSetsPerSession: null,
    };
  }

  const lastCompletedAt = sessions[0].completedAt ?? null;

  // Average duration from stored totalDuration
  const durationsSeconds = sessions.map(s => s.totalDuration).filter((d): d is number => d !== undefined && d > 0);
  const averageDurationMinutes = durationsSeconds.length > 0
    ? Math.round(durationsSeconds.reduce((sum, d) => sum + d, 0) / durationsSeconds.length / 60)
    : null;

  // Consistency: sessions in last 28 days vs expected
  const now = new Date();
  const twentyEightDaysAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
  const recentSessions = sessions.filter(s => s.startedAt >= twentyEightDaysAgo);
  const sessionsPerWeek = await WorkoutPlanRepository.getSessionCountByWorkout(workoutId);
  const expectedIn28Days = sessionsPerWeek * 4;
  const consistencyScore = expectedIn28Days > 0
    ? Math.min(100, Math.round((recentSessions.length / expectedIn28Days) * 100))
    : null;

  // Volume and sets from stored totals
  let totalVolume = 0;
  let totalSetsCount = 0;
  let sessionsWithSets = 0;

  for (const s of sessions) {
    if (s.totalLoad !== undefined) {
      totalVolume += s.totalLoad;
    }
    if (s.totalSets !== undefined) {
      totalSetsCount += s.totalSets;
      sessionsWithSets++;
    }
  }

  const avgSetsPerSession = sessionsWithSets > 0
    ? Math.round(totalSetsCount / sessionsWithSets)
    : null;

  return {
    totalCompletions: sessions.length,
    lastCompletedAt,
    averageDurationMinutes,
    consistencyScore,
    totalVolume,
    avgSetsPerSession,
  };
}

