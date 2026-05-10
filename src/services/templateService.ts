import { nanoid } from 'nanoid';

import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import { TemplateRepository } from '@/db/repositories/TemplateRepository';
import { UserProfileRepository } from '@/db/repositories/UserProfileRepository';
import type { SessionTemplate, Exercise, SessionTemplateContent } from '@/domain/entities';

export interface TemplateDetailData {
  template: SessionTemplate;
  exercises: Exercise[];
  simpleMode: boolean;
}

export async function getAllTemplates(): Promise<SessionTemplate[]> {
  return TemplateRepository.getAll();
}

export async function getTemplateDetail(templateId: string): Promise<TemplateDetailData | null> {
  const tpl = await TemplateRepository.getById(templateId);
  if (!tpl) return null;

  const exs = await ExerciseRepository.getAll();
  const profile = await UserProfileRepository.getRegulationProfile();

  return {
    template: tpl,
    exercises: exs,
    simpleMode: profile?.simpleMode ?? false,
  };
}

export async function createTemplate(name: string, description: string | undefined, content: SessionTemplateContent): Promise<string> {
  const id = nanoid();
  const now = new Date();
  await TemplateRepository.add({
    id,
    name,
    description,
    content,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function updateTemplate(id: string, updates: Partial<SessionTemplate>): Promise<number> {
  const now = new Date();
  return TemplateRepository.update(id, {
    ...updates,
    updatedAt: now,
  });
}

export async function deleteTemplate(id: string): Promise<void> {
  return TemplateRepository.delete(id);
}
