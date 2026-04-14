// src/hooks/mutations/templateMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { templateKeys, workoutKeys } from '@/hooks/queries/workoutQueries';
import { deleteTemplate, updateTemplate } from '@/services/templateService';

export function useTemplateMutations() {
  const queryClient = useQueryClient();

  const invalidateTemplates = () => {
    queryClient.invalidateQueries({ queryKey: templateKeys.all });
    queryClient.invalidateQueries({ queryKey: workoutKeys.all });
  };

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: invalidateTemplates,
  });

  const updateTemplateMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: ({ id, name, description, content }: { id: string; name: string; description?: string; content: any }) =>
      updateTemplate(id, { name, description, content }),
    onSuccess: invalidateTemplates,
  });

  return {
    deleteTemplate: deleteTemplateMutation.mutateAsync,
    updateTemplate: updateTemplateMutation.mutateAsync,
    isDeleting: deleteTemplateMutation.isPending,
    isUpdating: updateTemplateMutation.isPending,
  };
}
