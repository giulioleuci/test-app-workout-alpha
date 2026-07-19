import type { Exercise } from '@/domain/entities';

/** Persistence boundary for maintaining bidirectional exercise variant links. */
export interface ExerciseVariantPort {
  getById(id: string): Promise<Exercise | undefined>;
  getByIds(ids: string[]): Promise<Exercise[]>;
  getAll(): Promise<Exercise[]>;
  update(id: string, changes: Pick<Exercise, 'variantIds'>): Promise<number>;
}
