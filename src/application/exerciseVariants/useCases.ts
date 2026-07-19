import type { Exercise } from '@/domain/entities';

import type { ExerciseVariantPort } from './ports';

export class ExerciseVariantUseCases {
  constructor(private readonly exercises: ExerciseVariantPort) {}

  async addVariant(exerciseId: string, variantId: string): Promise<void> {
    if (exerciseId === variantId) throw new Error('An exercise cannot be its own variant');
    const [exercise, variant] = await Promise.all([
      this.exercises.getById(exerciseId), this.exercises.getById(variantId),
    ]);
    if (!exercise || !variant) throw new Error('Exercise or variant not found');
    await Promise.all([
      exercise.variantIds.includes(variantId)
        ? Promise.resolve()
        : this.exercises.update(exerciseId, { variantIds: [...exercise.variantIds, variantId] }),
      variant.variantIds.includes(exerciseId)
        ? Promise.resolve()
        : this.exercises.update(variantId, { variantIds: [...variant.variantIds, exerciseId] }),
    ]);
  }

  async removeVariant(exerciseId: string, variantId: string): Promise<void> {
    const [exercise, variant] = await Promise.all([
      this.exercises.getById(exerciseId), this.exercises.getById(variantId),
    ]);
    if (!exercise || !variant) return;
    await Promise.all([
      this.exercises.update(exerciseId, { variantIds: exercise.variantIds.filter(id => id !== variantId) }),
      this.exercises.update(variantId, { variantIds: variant.variantIds.filter(id => id !== exerciseId) }),
    ]);
  }

  async getVariants(exerciseId: string): Promise<Exercise[]> {
    const exercise = await this.exercises.getById(exerciseId);
    return exercise?.variantIds.length ? this.exercises.getByIds(exercise.variantIds) : [];
  }

  async removeExerciseFromAllVariants(exerciseId: string): Promise<void> {
    const allExercises = await this.exercises.getAll();
    await Promise.all(allExercises.filter(exercise => exercise.variantIds.includes(exerciseId))
      .map(exercise => this.exercises.update(exercise.id, {
        variantIds: exercise.variantIds.filter(id => id !== exerciseId),
      })));
  }

  async reconcileVariants(exerciseId: string, previousVariantIds: string[], variantIds: string[]): Promise<void> {
    for (const variantId of variantIds.filter(id => !previousVariantIds.includes(id))) {
      await this.addVariant(exerciseId, variantId);
    }
    for (const variantId of previousVariantIds.filter(id => !variantIds.includes(id))) {
      await this.removeVariant(exerciseId, variantId);
    }
  }
}
