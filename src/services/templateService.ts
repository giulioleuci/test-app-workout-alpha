import { nanoid } from 'nanoid';

import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import { TemplateRepository } from '@/db/repositories/TemplateRepository';
import { UserProfileRepository } from '@/db/repositories/UserProfileRepository';
import type {
  SessionTemplate, Exercise, SessionTemplateContent,
  PlannedExerciseGroup, PlannedExerciseItem, PlannedSet,
} from '@/domain/entities';

export interface TemplateDetailData {
  template: SessionTemplate;
  exercises: Exercise[];
  simpleMode: boolean;
}

const TEMPLATE_SESSION_PLACEHOLDER = '__template__';

export interface MaterializedTemplate {
  groups: PlannedExerciseGroup[];
  items: Record<string, PlannedExerciseItem[]>;
  sets: Record<string, PlannedSet[]>;
}

/**
 * Materialize stored template content into fresh in-memory planning entities
 * (with new ids) for editing. Pure — assigns ids and the template placeholder
 * session id, no persistence.
 */
export function materializeTemplateContent(content: SessionTemplateContent): MaterializedTemplate {
  const groups: PlannedExerciseGroup[] = [];
  const items: Record<string, PlannedExerciseItem[]> = {};
  const sets: Record<string, PlannedSet[]> = {};

  for (const g of content.groups) {
    const groupId = nanoid();
    groups.push({
      id: groupId,
      plannedSessionId: TEMPLATE_SESSION_PLACEHOLDER,
      groupType: g.groupType,
      restBetweenRoundsSeconds: g.restBetweenRoundsSeconds,
      orderIndex: g.orderIndex,
      notes: g.notes,
    });
    items[groupId] = [];

    for (const item of g.items) {
      const itemId = nanoid();
      items[groupId].push({
        id: itemId,
        plannedExerciseGroupId: groupId,
        exerciseId: item.exerciseId,
        counterType: item.counterType,
        modifiers: item.modifiers,
        orderIndex: item.orderIndex,
        notes: item.notes,
      });
      sets[itemId] = item.sets.map(s => ({
        ...s,
        id: nanoid(),
        plannedExerciseItemId: itemId,
      }));
    }
  }

  return { groups, items, sets };
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
