// src/hooks/mutations/workoutPlanMutations.ts
import { useMutation } from '@tanstack/react-query';

import { templateCommands } from '@/composition/templates';
import { workoutCommands } from '@/composition/workouts';
import type { PlannedWorkout, PlannedSession, SessionTemplateContent } from '@/domain/entities';
import { ObjectiveType, WorkType, PlannedWorkoutStatus } from '@/domain/enums';
import { useInvalidation } from '@/hooks/queries/useInvalidation';

export function useWorkoutPlanMutations() {
  const { invalidateWorkoutContext, invalidateTemplateContext } = useInvalidation();

  const activateMutation = useMutation({
    mutationFn: (id: string) => workoutCommands.activateWorkout(id),
    onSuccess: invalidateWorkoutContext,
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => workoutCommands.deactivateWorkout(id),
    onSuccess: invalidateWorkoutContext,
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => workoutCommands.archiveWorkout(id),
    onSuccess: invalidateWorkoutContext,
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => workoutCommands.restoreWorkout(id),
    onSuccess: invalidateWorkoutContext,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => workoutCommands.removeWorkout(id),
    onSuccess: invalidateWorkoutContext,
  });

  const updateWorkoutMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<PlannedWorkout> }) =>
      workoutCommands.updateWorkout(id, updates),
    onSuccess: invalidateWorkoutContext,
  });

  const createWorkoutMutation = useMutation({
    mutationFn: (params: {
      name: string;
      description?: string;
      objectiveType: ObjectiveType;
      workType: WorkType;
      status: PlannedWorkoutStatus;
    }) => workoutCommands.createWorkout(params),
    onSuccess: invalidateWorkoutContext,
  });

  const saveWorkoutSessionsMutation = useMutation({
    mutationFn: ({ workoutId, sessions, originalSessions }: { workoutId: string; sessions: PlannedSession[]; originalSessions: PlannedSession[] }) =>
      workoutCommands.saveWorkoutSessions(workoutId, sessions, originalSessions),
    onSuccess: invalidateWorkoutContext,
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => templateCommands.deleteTemplate(id),
    onSuccess: invalidateTemplateContext,
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, name, description, content }: { id: string; name: string; description?: string; content: SessionTemplateContent }) =>
      templateCommands.updateTemplate(id, { name, description, content }),
    onSuccess: invalidateTemplateContext,
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
