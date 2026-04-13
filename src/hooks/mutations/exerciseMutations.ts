// src/hooks/mutations/exerciseMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Exercise } from '@/domain/entities';
import { exerciseKeys } from '@/hooks/queries/exerciseQueries';
import { upsertExercise, deleteExercise } from '@/services/exerciseService';

export function useExerciseMutations() {
  const queryClient = useQueryClient();

  const saveExerciseMutation = useMutation({
    mutationFn: (exercise: Exercise) => upsertExercise(exercise),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: exerciseKeys.all });
    },
  });

  const deleteExerciseMutation = useMutation({
    mutationFn: (id: string) => deleteExercise(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: exerciseKeys.all });
    },
  });

  return {
    saveExercise: saveExerciseMutation.mutateAsync,
    deleteExercise: deleteExerciseMutation.mutateAsync,
    isSaving: saveExerciseMutation.isPending,
    isDeleting: deleteExerciseMutation.isPending,
  };
}
