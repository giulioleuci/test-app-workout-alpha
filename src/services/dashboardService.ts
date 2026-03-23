import { max } from 'lodash-es';

import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import { SessionRepository } from '@/db/repositories/SessionRepository';
import { WorkoutPlanRepository } from '@/db/repositories/WorkoutPlanRepository';
import type { WorkoutSession, PlannedSession } from '@/domain/entities';
import { Muscle } from '@/domain/enums';
import { t } from '@/i18n/t';
import dayjs from '@/lib/dayjs';

import { deduceMusclesFromExercises } from './muscleDeducer';


export interface DashboardStats {
  exerciseCount: number;
  planCount: number;
}

export interface LastWorkoutSummary {
  session: WorkoutSession;
  sessionName: string;
  workoutName: string;
  exerciseCount: number;
  setCount: number;
  completedSets: number;
  totalVolume: number;
  avgRPE: number | null;
  duration: number;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  exercises: {
    name: string;
    sets: number;
    bestLoad: number | null;
  }[];
}

export interface CalendarEntry {
  id: string;
  startedAt: Date;
  completedAt: Date;
  sessionName: string;
}

export interface ConsistencyDay {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface MuscleFreshness {
  muscle: string;
  lastTrainedAt: Date | null;
  hoursSinceLastTrained: number | null;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [exerciseCount, planCount] = await Promise.all([
    ExerciseRepository.count(),
    WorkoutPlanRepository.getAllWorkoutsCount(),
  ]);
  return { exerciseCount, planCount };
}

export async function getConsistencyHeatmap(days = 365): Promise<ConsistencyDay[]> {
  const startOfRange = dayjs().subtract(days, 'day').startOf('day').toDate();
  const sessions = await SessionRepository.getSessionsInDateRange(startOfRange, new Date());

  const completedSessions = sessions.filter(s => s.completedAt != null);
  const map = new Map<string, number>();

  for (const s of completedSessions) {
    const key = dayjs(s.completedAt).format('YYYY-MM-DD');
    map.set(key, (map.get(key) || 0) + 1);
  }

  return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
}

export async function getMuscleFreshness(): Promise<MuscleFreshness[]> {
  const sessions = await SessionRepository.getAllSessions();
  // Sort by completedAt descending
  const completedSessions = sessions
    .filter(s => s.completedAt != null)
    .sort((a, b) => dayjs(b.completedAt).diff(dayjs(a.completedAt)));

  const lastTrainedMap = new Map<string, Date>();

  for (const s of completedSessions) {
    let muscles: string[] = s.primaryMusclesSnapshot || [];

    // Fallback: if snapshot is missing, try to derive it from session items
    if (muscles.length === 0) {
      const groups = await SessionRepository.getGroupsBySession(s.id);
      const items = await SessionRepository.getItemsByGroups(groups.map(g => g.id));
      const musclesSet = new Set<string>();

      const exerciseIds = items.map(i => i.exerciseId);
      const versionIds = items.map(i => i.exerciseVersionId).filter((id): id is string => !!id);

      const [exercises, { db }] = await Promise.all([
        ExerciseRepository.getByIds(exerciseIds),
        import('@/db/database')
      ]);
      const versions = await db.exerciseVersions.bulkGet(versionIds);

      const versionMap = new Map(versions.filter(v => !!v).map(v => [v!.id, v!]));
      const exerciseMap = new Map(exercises.map(e => [e.id, e]));

      for (const item of items) {
        if (item.exerciseVersionId && versionMap.has(item.exerciseVersionId)) {
          versionMap.get(item.exerciseVersionId)!.primaryMuscles.forEach(m => musclesSet.add(m));
        } else {
          const ex = exerciseMap.get(item.exerciseId);
          if (ex) {
            ex.primaryMuscles.forEach(m => musclesSet.add(m));
          }
        }
      }
      muscles = Array.from(musclesSet);
    }

    for (const muscle of muscles) {
      if (!lastTrainedMap.has(muscle)) {
        lastTrainedMap.set(muscle, new Date(s.completedAt!));
      }
    }
  }

  const allMuscles = Object.values(Muscle);
  const now = dayjs();

  return allMuscles.map(muscle => {
    const lastTrainedAt = lastTrainedMap.get(muscle) || null;
    const hoursSinceLastTrained = lastTrainedAt
      ? Math.round(now.diff(dayjs(lastTrainedAt), 'hour'))
      : null;

    return {
      muscle,
      lastTrainedAt,
      hoursSinceLastTrained,
    };
  }).sort((a, b) => {
    // Sort by freshness (most recently trained first)
    if (a.hoursSinceLastTrained === null) return 1;
    if (b.hoursSinceLastTrained === null) return -1;
    return a.hoursSinceLastTrained - b.hoursSinceLastTrained;
  });
}

export async function getLastWorkoutSummary(): Promise<LastWorkoutSummary | null> {
  const last = await SessionRepository.getLatestCompletedSession();

  if (!last) return null;

  const plannedSession = last.plannedSessionId ? await WorkoutPlanRepository.getSession(last.plannedSessionId) : null;
  const plannedWorkout = last.plannedWorkoutId ? await WorkoutPlanRepository.getWorkout(last.plannedWorkoutId) : null;

  const sessionGroups = await SessionRepository.getGroupsBySession(last.id);
  const sessionGroupIds = sessionGroups.map(g => g.id);
  const sessionItems = await SessionRepository.getItemsByGroups(sessionGroupIds);
  const sessionItemIds = sessionItems.map(i => i.id);
  const allSets = await SessionRepository.getSetsByItems(sessionItemIds);

  const exerciseIds = Array.from(new Set(sessionItems.map(i => i.exerciseId)));
  const allExercises = await ExerciseRepository.getByIds(exerciseIds);
  const exMap = Object.fromEntries(allExercises.map(e => [e.id, e]));

  const completedSets = allSets.filter(s => s.isCompleted);
  const rpeValues = completedSets.filter(s => s.actualRPE != null).map(s => s.actualRPE!);
  const avgRPE = rpeValues.length > 0 ? rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length : null;
  const totalVolume = completedSets.map(s => (s.actualLoad ?? 0) * (s.actualCount ?? 0)).reduce((a, b) => a + b, 0);

  const duration = last.completedAt && last.startedAt
    ? Math.round(dayjs(last.completedAt).diff(dayjs(last.startedAt), 'minute'))
    : 0;

  const exerciseDetails = sessionItems.map(item => {
    const ex = exMap[item.exerciseId];
    const itemSets = allSets.filter(s => s.sessionExerciseItemId === item.id && s.isCompleted);
    const maxVal = max(itemSets.map(s => s.actualLoad ?? 0));
    const bestLoad = maxVal != null && maxVal > 0 ? maxVal : null;
    return {
      name: ex?.name ?? t('common.unknown'),
      sets: itemSets.length,
      bestLoad: bestLoad,
    };
  }).filter(e => e.sets > 0);

  const deduced = deduceMusclesFromExercises(allExercises);

  return {
    session: last,
    sessionName: plannedSession?.name ?? t('common.freeSession'),
    workoutName: plannedWorkout?.name ?? '',
    exerciseCount: exerciseDetails.length,
    setCount: allSets.length,
    completedSets: completedSets.length,
    totalVolume,
    avgRPE,
    duration,
    primaryMuscles: deduced.primaryMuscles,
    secondaryMuscles: deduced.secondaryMuscles,
    exercises: exerciseDetails,
  };
}

export async function buildTrainingCalendar(month: Date): Promise<Map<string, CalendarEntry[]>> {
  const startOfRange = dayjs(month).startOf('month').subtract(1, 'month').toDate();
  const endOfRange = dayjs(month).endOf('month').add(1, 'month').toDate();

  const sessions = (await SessionRepository.getSessionsInDateRange(startOfRange, endOfRange))
    .filter(ws => ws.completedAt != null);

  const map = new Map<string, CalendarEntry[]>();

  const plannedSessionIds = [...new Set(sessions.map(s => s.plannedSessionId).filter(Boolean))] as string[];
  const plannedSessionsMap = new Map<string, PlannedSession>();
  await Promise.all(plannedSessionIds.map(async id => {
    const ps = await WorkoutPlanRepository.getSession(id);
    if (ps) plannedSessionsMap.set(id, ps);
  }));

  for (const s of sessions) {
    const d = dayjs(s.completedAt);
    const key = d.format('YYYY-MM-DD');

    let sessionName = '';
    if (s.plannedSessionId) {
      const planned = plannedSessionsMap.get(s.plannedSessionId);
      sessionName = planned?.name ?? '';
    }
    if (!sessionName) {
      sessionName = dayjs(s.startedAt).format('HH:mm');
    }

    const entry: CalendarEntry = {
      id: s.id,
      startedAt: new Date(s.startedAt),
      completedAt: new Date(s.completedAt!),
      sessionName,
    };

    if (map.has(key)) {
      map.get(key)!.push(entry);
    } else {
      map.set(key, [entry]);
    }
  }
  return map;
}
