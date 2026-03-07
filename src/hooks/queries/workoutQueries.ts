import { useQuery } from '@tanstack/react-query';

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
  return useQuery({
    queryKey: workoutKeys.list(),
    queryFn: getWorkoutListData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useWorkoutDetail(id?: string) {
  return useQuery({
    queryKey: workoutKeys.detail(id!),
    queryFn: () => id ? getWorkoutDetail(id) : null,
    enabled: !!id,
  });
}

export function useSessionDetail(sessionId?: string) {
  return useQuery({
    queryKey: sessionKeys.detail(sessionId!),
    queryFn: () => sessionId ? getPlannedSessionDetail(sessionId) : null,
    enabled: !!sessionId,
  });
}

export function useSessionTemplates() {
  return useQuery({
    queryKey: templateKeys.list(),
    queryFn: async () => {
      const templates = await getAllTemplates();
      return templates.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    },
  });
}

export function useTemplateDetail(templateId?: string) {
  return useQuery({
    queryKey: templateKeys.detail(templateId!),
    queryFn: () => templateId ? getTemplateDetail(templateId) : null,
    enabled: !!templateId,
  });
}

export function useExerciseList() {
  return useQuery({
    queryKey: exerciseKeys.all,
    queryFn: () => getAllExercises(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useOneRepMaxData() {
  return useQuery({
    queryKey: oneRepMaxKeys.all,
    queryFn: getGroupedData,
  });
}

export function useSessionVolume(sessionId: string | null | undefined) {
  return useQuery({
    queryKey: sessionVolumeKeys.detail(sessionId!),
    queryFn: () => sessionId ? getSessionVolumeAndDuration(sessionId) : null,
    enabled: !!sessionId,
  });
}

export function useEnhancedExerciseCatalog(options?: ExerciseCatalogOptions) {
  return useQuery({
    queryKey: exerciseKeys.catalog(options),
    queryFn: () => getEnhancedExerciseCatalog(options),
    staleTime: 10 * 60 * 1000,
  });
}

export function useRoutineInsights(workoutId?: string) {
  return useQuery({
    queryKey: workoutKeys.insights(workoutId!),
    queryFn: () => getRoutineInsights(workoutId!),
    enabled: !!workoutId,
  });
}
