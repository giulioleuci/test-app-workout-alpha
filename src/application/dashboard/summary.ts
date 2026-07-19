import { max } from 'lodash-es';

import { deduceMusclesFromExercises } from '@/application/muscles';
import dayjs from '@/lib/dayjs';
import { filterCompleted, totalVolume } from '@/services/logic/setStats';

import type { DashboardPort } from './ports';
import type { LastWorkoutSummary } from './useCases';

export async function getLastWorkoutSummary(data: DashboardPort, translate: (key: string) => string): Promise<LastWorkoutSummary | null> {
  const session = await data.getLatestCompletedSession(); if (!session) return null;
  const [plannedSession, workout, entities] = await Promise.all([session.plannedSessionId ? data.getPlannedSession(session.plannedSessionId) : undefined, session.plannedWorkoutId ? data.getWorkout(session.plannedWorkoutId) : undefined, data.getSessionEntities([session.id])]);
  const exercises = await data.getExercisesByIds([...new Set(entities.items.map(item => item.exerciseId))]); const exerciseMap = new Map(exercises.map(exercise => [exercise.id, exercise])); const completed = filterCompleted(entities.sets); const rpes = completed.flatMap(set => set.actualRPE == null ? [] : [set.actualRPE]); const details = entities.items.map(item => { const sets = completed.filter(set => set.sessionExerciseItemId === item.id); const value = max(sets.map(set => set.actualLoad ?? 0)); return { name: exerciseMap.get(item.exerciseId)?.name ?? translate('common.unknown'), sets: sets.length, bestLoad: value && value > 0 ? value : null }; }).filter(item => item.sets > 0); const muscles = deduceMusclesFromExercises(exercises);
  return { session, sessionName: plannedSession?.name ?? translate('common.freeSession'), workoutName: workout?.name ?? '', exerciseCount: details.length, setCount: entities.sets.length, completedSets: completed.length, totalVolume: totalVolume(completed), avgRPE: rpes.length ? rpes.reduce((sum, value) => sum + value, 0) / rpes.length : null, duration: session.completedAt && session.startedAt ? Math.round(dayjs(session.completedAt).diff(dayjs(session.startedAt), 'minute')) : 0, primaryMuscles: muscles.primaryMuscles, secondaryMuscles: muscles.secondaryMuscles, primaryMuscleGroups: muscles.primaryMuscleGroups, secondaryMuscleGroups: muscles.secondaryMuscleGroups, exercises: details };
}
