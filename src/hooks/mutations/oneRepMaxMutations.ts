// src/hooks/mutations/oneRepMaxMutations.ts
import { useMutation } from '@tanstack/react-query';

import { oneRepMaxRecordCommands } from '@/composition/oneRepMaxRecords';
import type { OneRepMaxRecord } from '@/domain/entities';
import { useInvalidation } from '@/hooks/queries/useInvalidation';

export function useOneRepMaxMutations() {
  const { invalidateOneRepMaxContext } = useInvalidation();

  const saveRecordMutation = useMutation({
    mutationFn: (record: OneRepMaxRecord) => oneRepMaxRecordCommands.upsertRecord(record),
    onSuccess: invalidateOneRepMaxContext,
  });

  const deleteRecordMutation = useMutation({
    mutationFn: (id: string) => oneRepMaxRecordCommands.deleteRecord(id),
    onSuccess: invalidateOneRepMaxContext,
  });

  return {
    saveRecord: saveRecordMutation.mutateAsync,
    deleteRecord: deleteRecordMutation.mutateAsync,
    isSaving: saveRecordMutation.isPending,
  };
}
