// src/hooks/queries/workoutPlanQueries.ts
import { useQuery } from '@tanstack/react-query';

import { getAllTemplates, getTemplateDetail } from '@/services/templateService';
import { getSessionVolumeAndDuration } from '@/services/volumeAnalyzer';
import { getWorkoutListData, getPlannedSessionDetail, getWorkoutDetail, getRoutineInsights } from '@/services/workoutService';

import { workoutKeys, templateKeys, sessionVolumeKeys } from './workoutQueries';

export { workoutKeys, templateKeys, sessionVolumeKeys } from './workoutQueries';

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
