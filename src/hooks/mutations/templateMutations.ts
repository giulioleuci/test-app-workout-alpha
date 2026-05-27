// src/hooks/mutations/templateMutations.ts
import { useMutation } from '@tanstack/react-query';

import { useInvalidation } from '@/hooks/queries/useInvalidation';
import { deleteTemplate, updateTemplate } from '@/services/templateService';

export function useTemplateMutations() {
  const { invalidateTemplateContext } = useInvalidation();

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: invalidateTemplateContext,
  });

  const updateTemplateMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: ({ id, name, description, content }: { id: string; name: string; description?: string; content: any }) =>
      updateTemplate(id, { name, description, content }),
    onSuccess: invalidateTemplateContext,
  });

  return {
    deleteTemplate: deleteTemplateMutation.mutateAsync,
    updateTemplate: updateTemplateMutation.mutateAsync,
    isDeleting: deleteTemplateMutation.isPending,
    isUpdating: updateTemplateMutation.isPending,
  };
}
