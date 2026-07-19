import type { Exercise, SessionExerciseItem } from '@/domain/entities';
import type { Equipment, MovementPattern, Muscle } from '@/domain/enums';

/** Application-facing filters for the exercise catalog. */
export interface ExerciseCatalogFilters {
  muscleGroups?: Muscle[];
  equipment?: Equipment[];
  movementPattern?: MovementPattern[];
  isArchived?: boolean;
  search?: string;
}

/** Persistence boundary for the exercise catalog and its session usage. */
export interface ExerciseCatalogPort {
  getAll(): Promise<Exercise[]>;
  getById(id: string): Promise<Exercise | undefined>;
  getByIds(ids: string[]): Promise<Exercise[]>;
  add(exercise: Exercise): Promise<string>;
  put(exercise: Omit<Exercise, 'createdAt' | 'updatedAt'> & { id?: string }): Promise<string>;
  update(id: string, changes: Partial<Exercise>): Promise<number>;
  smartDelete(id: string): Promise<void>;
  search(query: string): Promise<Exercise[]>;
  getByCriteria(filters: ExerciseCatalogFilters): Promise<Exercise[]>;
  getCompletedItemsSince(since: Date): Promise<SessionExerciseItem[]>;
}
