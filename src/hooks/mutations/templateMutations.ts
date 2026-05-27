// src/hooks/mutations/templateMutations.ts
import { useMutation } from '@tanstack/react-query';

import type { SessionTemplateContent } from '@/domain/entities';
import { useInvalidation } from '@/hooks/queries/useInvalidation';
import { deleteTemplate, updateTemplate } from '@/services/templateService';

export function useTemplateMutations() {
  const { invalidateTemplateContext } = useInvalidation();

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: invalidateTemplateContext,
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, name, description, content }: { id: string; name: string; description?: string; content: SessionTemplateContent }) =>
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
