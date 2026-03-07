import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { PlannedWorkout, Exercise, OneRepMaxRecord } from '@/domain/entities';
import { ObjectiveType, WorkType, PlannedWorkoutStatus } from '@/domain/enums';
import dayjs from '@/lib/dayjs';
import { upsertExercise, updateExercise, deleteExercise } from '@/services/exerciseService';
import { upsertRecord, deleteRecord } from '@/services/oneRepMaxService';
import { deleteTemplate, updateTemplate } from '@/services/templateService';
import {
  activateWorkout, deactivateWorkout, archiveWorkout, restoreWorkout,
  removeWorkout, updateWorkout, createWorkout, saveWorkoutSessions
} from '@/services/workoutService';

import { dashboardKeys } from '../queries/dashboardQueries';
import { workoutKeys, templateKeys, oneRepMaxKeys, exerciseKeys } from '../queries/workoutQueries';

export function useWorkoutMutations() {
  const queryClient = useQueryClient();

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      await activateWorkout(id);
    },
    onSuccess: async (_, id) => {
      await queryClient.invalidateQueries({ queryKey: workoutKeys.list() });
      await queryClient.invalidateQueries({ queryKey: workoutKeys.detail(id) });
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      await deactivateWorkout(id);
    },
    onSuccess: async (_, id) => {
      await queryClient.invalidateQueries({ queryKey: workoutKeys.list() });
      await queryClient.invalidateQueries({ queryKey: workoutKeys.detail(id) });
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      await archiveWorkout(id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workoutKeys.list() });
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      await restoreWorkout(id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workoutKeys.all });
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      await removeWorkout(id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workoutKeys.all });
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteTemplate(id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: templateKeys.list() });
    },
  });

  const updateWorkoutMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<PlannedWorkout> }) => {
      await updateWorkout(id, updates);
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: workoutKeys.detail(variables.id) });
      await queryClient.invalidateQueries({ queryKey: workoutKeys.list() });
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });

  const saveWorkoutSessionsMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: async ({ workoutId, sessions, originalSessions }: { workoutId: string, sessions: any[], originalSessions: any[] }) => {
      await saveWorkoutSessions(workoutId, sessions, originalSessions);
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: workoutKeys.detail(variables.workoutId) });
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });

  const saveOneRepMaxRecordMutation = useMutation({
    mutationFn: async (record: OneRepMaxRecord) => {
      await upsertRecord(record);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: oneRepMaxKeys.all });
    },
  });

  const deleteOneRepMaxRecordMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteRecord(id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: oneRepMaxKeys.all });
    },
  });

  const saveExerciseMutation = useMutation({
    mutationFn: async (exercise: Exercise) => {
      await upsertExercise(exercise);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: exerciseKeys.all });
    },
  });

  const deleteExerciseMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteExercise(id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: exerciseKeys.all });
    },
  });

  const createWorkoutMutation = useMutation({
    mutationFn: async (params: {
      name: string;
      description?: string;
      objectiveType: ObjectiveType;
      workType: WorkType;
      status: PlannedWorkoutStatus;
    }) => {
      return await createWorkout(params);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workoutKeys.list() });
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });

  const updateTemplateMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: async ({ id, name, description, content }: { id: string, name: string, description?: string, content: any }) => {
      await updateTemplate(id, {
        name,
        description,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        content,
      });
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: templateKeys.detail(variables.id) });
      await queryClient.invalidateQueries({ queryKey: templateKeys.list() });
    },
  });

  return {
    activate: activateMutation.mutateAsync,
    deactivate: deactivateMutation.mutateAsync,
    archive: archiveMutation.mutateAsync,
    restore: restoreMutation.mutateAsync,
    remove: removeMutation.mutateAsync,
    deleteTemplate: deleteTemplateMutation.mutateAsync,
    updateWorkout: updateWorkoutMutation.mutateAsync,
    saveWorkoutSessions: saveWorkoutSessionsMutation.mutateAsync,
    saveOneRepMaxRecord: saveOneRepMaxRecordMutation.mutateAsync,
    deleteOneRepMaxRecord: deleteOneRepMaxRecordMutation.mutateAsync,
    saveExercise: saveExerciseMutation.mutateAsync,
    deleteExercise: deleteExerciseMutation.mutateAsync,
    createWorkout: createWorkoutMutation.mutateAsync,
    updateTemplate: updateTemplateMutation.mutateAsync,
  };
}
