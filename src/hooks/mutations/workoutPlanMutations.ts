// src/hooks/mutations/workoutPlanMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { PlannedWorkout } from '@/domain/entities';
import { ObjectiveType, WorkType, PlannedWorkoutStatus } from '@/domain/enums';
import { templateKeys } from '@/hooks/queries/workoutQueries';
import { useInvalidation } from '@/hooks/queries/useInvalidation';
import { deleteTemplate, updateTemplate } from '@/services/templateService';
import {
  activateWorkout, deactivateWorkout, archiveWorkout, restoreWorkout,
  removeWorkout, updateWorkout, createWorkout, saveWorkoutSessions,
} from '@/services/workoutService';

export function useWorkoutPlanMutations() {
  const queryClient = useQueryClient();
  const { invalidateWorkoutContext } = useInvalidation();

  const activateMutation = useMutation({
    mutationFn: (id: string) => activateWorkout(id),
    onSuccess: invalidateWorkoutContext,
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => deactivateWorkout(id),
    onSuccess: invalidateWorkoutContext,
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => archiveWorkout(id),
    onSuccess: invalidateWorkoutContext,
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => restoreWorkout(id),
    onSuccess: invalidateWorkoutContext,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeWorkout(id),
    onSuccess: invalidateWorkoutContext,
  });

  const updateWorkoutMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<PlannedWorkout> }) =>
      updateWorkout(id, updates),
    onSuccess: invalidateWorkoutContext,
  });

  const createWorkoutMutation = useMutation({
    mutationFn: (params: {
      name: string;
      description?: string;
      objectiveType: ObjectiveType;
      workType: WorkType;
      status: PlannedWorkoutStatus;
    }) => createWorkout(params),
    onSuccess: invalidateWorkoutContext,
  });

  const saveWorkoutSessionsMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: ({ workoutId, sessions, originalSessions }: { workoutId: string; sessions: any[]; originalSessions: any[] }) =>
      saveWorkoutSessions(workoutId, sessions, originalSessions),
    onSuccess: invalidateWorkoutContext,
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: templateKeys.all }),
  });

  const updateTemplateMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: ({ id, name, description, content }: { id: string; name: string; description?: string; content: any }) =>
      updateTemplate(id, { name, description, content }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: templateKeys.all }),
  });

  return {
    activate: activateMutation.mutateAsync,
    deactivate: deactivateMutation.mutateAsync,
    archive: archiveMutation.mutateAsync,
    restore: restoreMutation.mutateAsync,
    remove: removeMutation.mutateAsync,
    updateWorkout: updateWorkoutMutation.mutateAsync,
    createWorkout: createWorkoutMutation.mutateAsync,
    saveWorkoutSessions: saveWorkoutSessionsMutation.mutateAsync,
    deleteTemplate: deleteTemplateMutation.mutateAsync,
    updateTemplate: updateTemplateMutation.mutateAsync,
  };
}
