// src/hooks/mutations/oneRepMaxMutations.ts
import { useMutation } from '@tanstack/react-query';

import type { OneRepMaxRecord } from '@/domain/entities';
import { useInvalidation } from '@/hooks/queries/useInvalidation';
import { upsertRecord, deleteRecord } from '@/services/oneRepMaxService';

export function useOneRepMaxMutations() {
  const { invalidateOneRepMaxContext } = useInvalidation();

  const saveRecordMutation = useMutation({
    mutationFn: (record: OneRepMaxRecord) => upsertRecord(record),
    onSuccess: invalidateOneRepMaxContext,
  });

  const deleteRecordMutation = useMutation({
    mutationFn: (id: string) => deleteRecord(id),
    onSuccess: invalidateOneRepMaxContext,
  });

  return {
    saveRecord: saveRecordMutation.mutateAsync,
    deleteRecord: deleteRecordMutation.mutateAsync,
    isSaving: saveRecordMutation.isPending,
  };
}
