import { useMutation } from '@tanstack/react-query';

import type { PlannedWorkout, Exercise, OneRepMaxRecord } from '@/domain/entities';
import { ObjectiveType, WorkType, PlannedWorkoutStatus } from '@/domain/enums';
import { upsertExercise, deleteExercise } from '@/services/exerciseService';
import { upsertRecord, deleteRecord } from '@/services/oneRepMaxService';
import { deleteTemplate, updateTemplate } from '@/services/templateService';
import {
  activateWorkout, deactivateWorkout, archiveWorkout, restoreWorkout,
  removeWorkout, updateWorkout, createWorkout, saveWorkoutSessions
} from '@/services/workoutService';

export function useWorkoutMutations() {
  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      await activateWorkout(id);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      await deactivateWorkout(id);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      await archiveWorkout(id);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      await restoreWorkout(id);
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      await removeWorkout(id);
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteTemplate(id);
    },
  });

  const updateWorkoutMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<PlannedWorkout> }) => {
      await updateWorkout(id, updates);
    },
  });

  const saveWorkoutSessionsMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: async ({ workoutId, sessions, originalSessions }: { workoutId: string, sessions: any[], originalSessions: any[] }) => {
      await saveWorkoutSessions(workoutId, sessions, originalSessions);
    },
  });

  const saveOneRepMaxRecordMutation = useMutation({
    mutationFn: async (record: OneRepMaxRecord) => {
      await upsertRecord(record);
    },
  });

  const deleteOneRepMaxRecordMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteRecord(id);
    },
  });

  const saveExerciseMutation = useMutation({
    mutationFn: async (exercise: Exercise) => {
      await upsertExercise(exercise);
    },
  });

  const deleteExerciseMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteExercise(id);
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
