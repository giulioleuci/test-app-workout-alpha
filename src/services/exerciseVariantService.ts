import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import type { Exercise } from '@/domain/entities';

export async function addVariant(exerciseId: string, variantId: string): Promise<void> {
  if (exerciseId === variantId) {
    throw new Error('Cannot add exercise as its own variant');
  }

  // Non-transactional update (acceptable for now)
  const [exercise, variant] = await Promise.all([
    ExerciseRepository.getById(exerciseId),
    ExerciseRepository.getById(variantId),
  ]);

  if (!exercise) throw new Error(`Exercise ${exerciseId} not found`);
  if (!variant) throw new Error(`Exercise ${variantId} not found`);

  const exerciseVariants = exercise.variantIds ?? [];
  const variantVariants = variant.variantIds ?? [];
  const updates: Promise<number>[] = [];

  if (!exerciseVariants.includes(variantId)) {
    updates.push(
      ExerciseRepository.update(exerciseId, {
        variantIds: [...exerciseVariants, variantId],
      })
    );
  }

  if (!variantVariants.includes(exerciseId)) {
    updates.push(
      ExerciseRepository.update(variantId, {
        variantIds: [...variantVariants, exerciseId],
      })
    );
  }

  await Promise.all(updates);
}

export async function removeVariant(exerciseId: string, variantId: string): Promise<void> {
  const [exercise, variant] = await Promise.all([
    ExerciseRepository.getById(exerciseId),
    ExerciseRepository.getById(variantId),
  ]);

  const updates: Promise<number>[] = [];

  const exerciseVariants = exercise?.variantIds ?? [];
  const variantVariants = variant?.variantIds ?? [];

  if (exercise && exerciseVariants.includes(variantId)) {
    updates.push(
      ExerciseRepository.update(exerciseId, {
        variantIds: exerciseVariants.filter(id => id !== variantId),
      })
    );
  }

  if (variant && variantVariants.includes(exerciseId)) {
    updates.push(
      ExerciseRepository.update(variantId, {
        variantIds: variantVariants.filter(id => id !== exerciseId),
      })
    );
  }

  await Promise.all(updates);
}

export async function getVariants(exerciseId: string): Promise<Exercise[]> {
  const exercise = await ExerciseRepository.getById(exerciseId);
  if (!exercise?.variantIds?.length) return [];

  const variants = await ExerciseRepository.getByIds(exercise.variantIds);
  return variants;
}

export async function removeExerciseFromAllVariants(exerciseId: string): Promise<void> {
  // Can't query by variantIds in repo?
  // ExerciseRepository doesn't expose `where('variantIds').equals(...)`.
  // I need to scan or add method.
  // I'll add `findWithVariant(id)` to ExerciseRepository?
  // Or fetch all.
  // I'll assume iterating all is too slow.
  // I'll add `findReferencingVariants` to `ExerciseRepository`.
  // But I can't edit it here.
  // I'll assume I can add it. Or I'll use `getAll` if list is small (~30).
  // Real usage ~2000 exercises? getAll is heavy.
  // I'll update ExerciseRepository to add `findWithVariant` in next step.
  // I'll leave this unimplemented or throw error?
  // I'll use `getAll` filtering for now, assuming small DB in test/dev.
  // Optimization: This runs on delete, which is rare.
  const allExercises = await ExerciseRepository.getAll();
  const referencing = allExercises.filter(ex => ex.variantIds?.includes(exerciseId));

  await Promise.all(
    referencing.map(ex =>
      ExerciseRepository.update(ex.id, {
        variantIds: (ex.variantIds ?? []).filter(id => id !== exerciseId),
      })
    )
  );
}
