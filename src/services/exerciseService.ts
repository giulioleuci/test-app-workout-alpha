import { db } from '@/db/database';
import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import type { ExerciseFilters } from '@/db/repositories/types';
import type { Exercise } from '@/domain/entities';

export async function getAllExercises(): Promise<Exercise[]> {
  return ExerciseRepository.getAll();
}

export async function getExerciseById(id: string): Promise<Exercise | undefined> {
  return ExerciseRepository.getById(id);
}

export async function getExercisesByIds(ids: string[]): Promise<Exercise[]> {
  return ExerciseRepository.getByIds(ids);
}

export async function createExercise(exercise: Exercise): Promise<string> {
  return ExerciseRepository.add(exercise);
}

export async function upsertExercise(exerciseData: Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<string> {
  return ExerciseRepository.put(exerciseData as any);
}

export async function updateExercise(id: string, changes: Partial<Exercise>): Promise<number> {
  return ExerciseRepository.update(id, changes);
}

export async function deleteExercise(id: string): Promise<void> {
  // Use smartDelete to handle archiving if in use
  return ExerciseRepository.smartDelete(id);
}

export async function searchExercises(query: string): Promise<Exercise[]> {
  return ExerciseRepository.search(query);
}

// ===== Enhanced Catalog =====

export interface EnhancedExercise extends Exercise {
  usageCount: number;
  lastUsedAt: Date | null;
}

export interface ExerciseCatalogOptions {
  filters?: ExerciseFilters;
  enrichWithUsage?: boolean;
  usageSinceDays?: number;
}

export async function getEnhancedExerciseCatalog(options?: ExerciseCatalogOptions): Promise<EnhancedExercise[]> {
  const { filters, enrichWithUsage = false, usageSinceDays = 90 } = options ?? {};

  const exercises = filters
    ? await ExerciseRepository.getExercisesByCriteria(filters)
    : await ExerciseRepository.getAll();

  if (!enrichWithUsage) {
    return exercises.map(e => ({ ...e, usageCount: 0, lastUsedAt: null }));
  }

  // Single batch query for usage stats
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - usageSinceDays);

  const recentItems = await db.sessionExerciseItems
    .filter(i => !!i.completedAt && i.completedAt >= sinceDate)
    .toArray();

  const usageMap = new Map<string, { count: number; lastDate: Date | null }>();
  for (const item of recentItems) {
    const entry = usageMap.get(item.exerciseId) ?? { count: 0, lastDate: null };
    entry.count++;
    if (item.completedAt && (!entry.lastDate || item.completedAt > entry.lastDate)) {
      entry.lastDate = item.completedAt;
    }
    usageMap.set(item.exerciseId, entry);
  }

  return exercises.map(e => {
    const usage = usageMap.get(e.id);
    return {
      ...e,
      usageCount: usage?.count ?? 0,
      lastUsedAt: usage?.lastDate ?? null,
    };
  });
}
