// src/hooks/mutations/oneRepMaxMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { OneRepMaxRecord } from '@/domain/entities';
import { exerciseKeys } from '@/hooks/queries/exerciseQueries';
import { oneRepMaxKeys } from '@/hooks/queries/oneRepMaxQueries';
import { upsertRecord, deleteRecord } from '@/services/oneRepMaxService';

export function useOneRepMaxMutations() {
  const queryClient = useQueryClient();

  const saveRecordMutation = useMutation({
    mutationFn: (record: OneRepMaxRecord) => upsertRecord(record),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: oneRepMaxKeys.all });
      queryClient.invalidateQueries({ queryKey: exerciseKeys.all });
    },
  });

  const deleteRecordMutation = useMutation({
    mutationFn: (id: string) => deleteRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: oneRepMaxKeys.all });
    },
  });

  return {
    saveRecord: saveRecordMutation.mutateAsync,
    deleteRecord: deleteRecordMutation.mutateAsync,
    isSaving: saveRecordMutation.isPending,
  };
}
