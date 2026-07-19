import type { Exercise } from '@/domain/entities';

import type { ExerciseCatalogFilters, ExerciseCatalogPort } from './ports';

export interface EnhancedExercise extends Exercise {
  usageCount: number;
  lastUsedAt: Date | null;
}

export interface ExerciseCatalogOptions {
  filters?: ExerciseCatalogFilters;
  enrichWithUsage?: boolean;
  usageSinceDays?: number;
}

/** Orchestrates exercise catalog operations independently of storage technology. */
export class ExerciseUseCases {
  constructor(
    private readonly exercises: ExerciseCatalogPort,
    private readonly now: () => Date = () => new Date(),
  ) {}

  getAllExercises(): Promise<Exercise[]> { return this.exercises.getAll(); }
  getExerciseById(id: string): Promise<Exercise | undefined> { return this.exercises.getById(id); }
  getExercisesByIds(ids: string[]): Promise<Exercise[]> { return this.exercises.getByIds(ids); }
  createExercise(exercise: Exercise): Promise<string> { return this.exercises.add(exercise); }

  upsertExercise(exercise: Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<string> {
    return this.exercises.put(exercise);
  }

  updateExercise(id: string, changes: Partial<Exercise>): Promise<number> {
    return this.exercises.update(id, changes);
  }

  deleteExercise(id: string): Promise<void> { return this.exercises.smartDelete(id); }
  searchExercises(query: string): Promise<Exercise[]> { return this.exercises.search(query); }

  async getEnhancedExerciseCatalog(options?: ExerciseCatalogOptions): Promise<EnhancedExercise[]> {
    const { filters, enrichWithUsage = false, usageSinceDays = 90 } = options ?? {};
    const exercises = filters
      ? await this.exercises.getByCriteria(filters)
      : await this.exercises.getAll();

    if (!enrichWithUsage) {
      return exercises.map(exercise => ({ ...exercise, usageCount: 0, lastUsedAt: null }));
    }

    const since = this.now();
    since.setDate(since.getDate() - usageSinceDays);
    const items = await this.exercises.getCompletedItemsSince(since);
    const usageByExerciseId = new Map<string, { count: number; lastUsedAt: Date | null }>();

    for (const item of items) {
      const usage = usageByExerciseId.get(item.exerciseId) ?? { count: 0, lastUsedAt: null };
      usage.count++;
      if (item.completedAt && (!usage.lastUsedAt || item.completedAt > usage.lastUsedAt)) {
        usage.lastUsedAt = item.completedAt;
      }
      usageByExerciseId.set(item.exerciseId, usage);
    }

    return exercises.map(exercise => {
      const usage = usageByExerciseId.get(exercise.id);
      return {
        ...exercise,
        usageCount: usage?.count ?? 0,
        lastUsedAt: usage?.lastUsedAt ?? null,
      };
    });
  }
}
