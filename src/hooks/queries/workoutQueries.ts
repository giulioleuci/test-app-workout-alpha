import { useQuery } from '@tanstack/react-query';

import type { ExerciseCatalogOptions } from '@/services/exerciseService';
import { getAllTemplates, getTemplateDetail } from '@/services/templateService';
import { getSessionVolumeAndDuration } from '@/services/volumeAnalyzer';
import { getWorkoutListData, getPlannedSessionDetail, getWorkoutDetail, getRoutineInsights } from '@/services/workoutService';

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
  return useQuery({
    queryKey: workoutKeys.list(),
    queryFn: getWorkoutListData,
    staleTime: Infinity,
  });
}

export function useWorkoutDetail(id?: string) {
  return useQuery({
    queryKey: workoutKeys.detail(id ?? ''),
    queryFn: () => getWorkoutDetail(id!),
    enabled: !!id,
    staleTime: Infinity,
  });
}

export function usePlannedSessionDetail(sessionId?: string) {
  return useQuery({
    queryKey: workoutKeys.session(sessionId ?? ''),
    queryFn: () => getPlannedSessionDetail(sessionId!),
    enabled: !!sessionId,
    staleTime: Infinity,
  });
}

export function useSessionTemplates() {
  return useQuery({
    queryKey: templateKeys.list(),
    queryFn: async () => {
      const templates = await getAllTemplates();
      return templates.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    },
    staleTime: Infinity,
  });
}

export function useTemplateDetail(templateId?: string) {
  return useQuery({
    queryKey: templateKeys.detail(templateId ?? ''),
    queryFn: () => getTemplateDetail(templateId!),
    enabled: !!templateId,
    staleTime: Infinity,
  });
}

export function useSessionVolume(sessionId: string | null | undefined) {
  return useQuery({
    queryKey: sessionVolumeKeys.detail(sessionId ?? ''),
    queryFn: () => getSessionVolumeAndDuration(sessionId!),
    enabled: !!sessionId,
    staleTime: Infinity,
  });
}

export function useRoutineInsights(workoutId?: string) {
  return useQuery({
    queryKey: workoutKeys.insights(workoutId ?? ''),
    queryFn: () => getRoutineInsights(workoutId!),
    enabled: !!workoutId,
    staleTime: Infinity,
  });
}
