import { useLiveQuery } from 'dexie-react-hooks';

import { getAllExercises, getEnhancedExerciseCatalog, type ExerciseCatalogOptions } from '@/services/exerciseService';
import { getGroupedData } from '@/services/oneRepMaxService';
import { getAllTemplates, getTemplateDetail } from '@/services/templateService';
import { getSessionVolumeAndDuration } from '@/services/volumeAnalyzer';
import { getWorkoutListData, getPlannedSessionDetail, getWorkoutDetail, getRoutineInsights } from '@/services/workoutService';

import { sessionKeys } from './sessionQueries';

export const workoutKeys = {
  all: ['workouts'] as const,
  list: () => [...workoutKeys.all, 'list'] as const,
  detail: (id: string) => [...workoutKeys.all, 'detail', id] as const,
  session: (id: string) => [...workoutKeys.all, 'session', id] as const,
  insights: (id: string) => [...workoutKeys.all, 'insights', id] as const,
};

export const exerciseKeys = {
  all: ['exercises'] as const,
  list: () => [...exerciseKeys.all, 'list'] as const,
  history: (exerciseId: string, context: Record<string, unknown>) => [...exerciseKeys.all, 'history', exerciseId, context] as const,
  catalog: (options?: ExerciseCatalogOptions) => [...exerciseKeys.all, 'catalog', options] as const,
};

export const oneRepMaxKeys = {
  all: ['oneRepMax'] as const,
  list: () => [...oneRepMaxKeys.all, 'list'] as const,
};

export const templateKeys = {
  all: ['templates'] as const,
  list: () => [...templateKeys.all, 'list'] as const,
  detail: (id: string) => [...templateKeys.all, 'detail', id] as const,
};

export const weightRecordKeys = {
  all: ['weightRecords'] as const,
  list: () => [...weightRecordKeys.all, 'list'] as const,
};

export const sessionVolumeKeys = {
  all: ['sessionVolume'] as const,
  detail: (sessionId: string) => [...sessionVolumeKeys.all, sessionId] as const,
};

export function useWorkoutList() {
  const data = useLiveQuery(getWorkoutListData);
  return { data, isLoading: data === undefined };
}

export function useWorkoutDetail(id?: string) {
  const data = useLiveQuery(() => id ? getWorkoutDetail(id) : Promise.resolve(null), [id]);
  return { data, isLoading: data === undefined && !!id };
}

export function useSessionDetail(sessionId?: string) {
  const data = useLiveQuery(() => sessionId ? getPlannedSessionDetail(sessionId) : Promise.resolve(null), [sessionId]);
  return { data, isLoading: data === undefined && !!sessionId };
}

export function useSessionTemplates() {
  const data = useLiveQuery(async () => {
    const templates = await getAllTemplates();
    return templates.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  });
  return { data, isLoading: data === undefined };
}

export function useTemplateDetail(templateId?: string) {
  const data = useLiveQuery(() => templateId ? getTemplateDetail(templateId) : Promise.resolve(null), [templateId]);
  return { data, isLoading: data === undefined && !!templateId };
}

export function useExerciseList() {
  const data = useLiveQuery(getAllExercises);
  return { data, isLoading: data === undefined };
}

export function useOneRepMaxData() {
  const data = useLiveQuery(getGroupedData);
  return { data, isLoading: data === undefined };
}

export function useSessionVolume(sessionId: string | null | undefined) {
  const data = useLiveQuery(() => sessionId ? getSessionVolumeAndDuration(sessionId) : Promise.resolve(null), [sessionId]);
  return { data, isLoading: data === undefined && !!sessionId };
}

export function useEnhancedExerciseCatalog(options?: ExerciseCatalogOptions) {
  const data = useLiveQuery(() => getEnhancedExerciseCatalog(options), [JSON.stringify(options)]);
  return { data, isLoading: data === undefined };
}

export function useRoutineInsights(workoutId?: string) {
  const data = useLiveQuery(() => workoutId ? getRoutineInsights(workoutId) : Promise.resolve(null), [workoutId]);
  return { data, isLoading: data === undefined && !!workoutId };
}
