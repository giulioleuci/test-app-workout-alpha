// src/hooks/mutations/exerciseMutations.ts
import { useMutation } from '@tanstack/react-query';

import type { Exercise } from '@/domain/entities';
import { useInvalidation } from '@/hooks/queries/useInvalidation';
import { upsertExercise, deleteExercise } from '@/services/exerciseService';

export function useExerciseMutations() {
  const { invalidateExerciseContext } = useInvalidation();

  const saveExerciseMutation = useMutation({
    mutationFn: (exercise: Exercise) => upsertExercise(exercise),
    onSuccess: invalidateExerciseContext,
  });

  const deleteExerciseMutation = useMutation({
    mutationFn: (id: string) => deleteExercise(id),
    onSuccess: invalidateExerciseContext,
  });

  return {
    saveExercise: saveExerciseMutation.mutateAsync,
    deleteExercise: deleteExerciseMutation.mutateAsync,
    isSaving: saveExerciseMutation.isPending,
    isDeleting: deleteExerciseMutation.isPending,
  };
}
