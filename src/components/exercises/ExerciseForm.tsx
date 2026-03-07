import { useState, useMemo } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { nanoid } from 'nanoid';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import type { Exercise } from '@/domain/entities';
import { Muscle, Equipment, MovementPattern, CounterType, ExerciseType } from '@/domain/enums';
import { useWorkoutMutations } from '@/hooks/mutations/workoutMutations';
import { addVariant, removeVariant } from '@/services/exerciseVariantService';

import VariantsSection from './components/VariantsSection';
import ExerciseFormFields from './exercise-form/ExerciseFormFields';

interface Props {
  exercise?: Exercise | null;
  allExercises: Exercise[];
  onSaved: (saved: Exercise) => void;
}

const MAX_EXERCISE_NAME_LENGTH = 100;

/* eslint-disable no-control-regex */
const exerciseSchema = z.object({
  name: z.string()
    .min(1, "Il nome è obbligatorio")
    .max(MAX_EXERCISE_NAME_LENGTH, `Il nome non può superare i ${MAX_EXERCISE_NAME_LENGTH} caratteri`)
    .transform(val => val.trim().replace(/[\x00-\x1F\x7F-\x9F]/g, "")),
  type: z.nativeEnum(ExerciseType),
  primaryMuscles: z.array(z.nativeEnum(Muscle)),
  secondaryMuscles: z.array(z.nativeEnum(Muscle)),
  equipment: z.array(z.nativeEnum(Equipment)),
  movementPattern: z.nativeEnum(MovementPattern),
  counterType: z.nativeEnum(CounterType),
  defaultLoadUnit: z.literal('kg'),
  description: z.string().optional(),
  keyPoints: z.string().optional(),
});

export type ExerciseFormValues = z.infer<typeof exerciseSchema>;

export function ExerciseForm({ exercise, allExercises, onSaved }: Props) {
  const { t } = useTranslation();
  const mutations = useWorkoutMutations();
  const [variantIds, setVariantIds] = useState<string[]>(exercise?.variantIds ?? []);

  const availableForVariants = useMemo(() => {
    const excludeIds = new Set([exercise?.id, ...variantIds].filter(Boolean));
    return allExercises.filter(e => !excludeIds.has(e.id));
  }, [allExercises, exercise?.id, variantIds]);

  const selectedVariants = useMemo(() =>
    variantIds.map(id => allExercises.find(e => e.id === id)).filter(Boolean) as Exercise[],
    [variantIds, allExercises]
  );

  const form = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
      name: exercise?.name ?? '',
      type: exercise?.type ?? ExerciseType.Compound,
      primaryMuscles: exercise?.primaryMuscles ?? [],
      secondaryMuscles: exercise?.secondaryMuscles ?? [],
      equipment: exercise?.equipment
        ? (Array.isArray(exercise.equipment) ? exercise.equipment : [exercise.equipment])
        : [Equipment.Barbell],
      movementPattern: exercise?.movementPattern ?? MovementPattern.Other,
      counterType: exercise?.counterType ?? CounterType.Reps,
      defaultLoadUnit: 'kg',
      description: exercise?.description ?? '',
      keyPoints: exercise?.keyPoints ?? '',
    },
  });

  const onSubmit = async (data: ExerciseFormValues) => {
    const now = new Date();
    const descriptionVal = data.description?.trim() ?? undefined;
    const keyPointsVal = data.keyPoints?.trim() ?? undefined;

    const saved: Exercise = exercise
      ? {
        ...exercise,
        ...data,
        description: descriptionVal,
        keyPoints: keyPointsVal,
        variantIds,
        updatedAt: now
      }
      : {
        id: nanoid(),
        ...data,
        description: descriptionVal,
        keyPoints: keyPointsVal,
        variantIds,
        createdAt: now,
        updatedAt: now
      };

    await mutations.saveExercise(saved);

    // Sync variant links bidirectionally (update the *other* exercises).
    const previousVariantIds = exercise?.variantIds ?? [];
    const added = variantIds.filter(id => !previousVariantIds.includes(id));
    const removed = previousVariantIds.filter(id => !variantIds.includes(id));

    try {
      for (const id of added) {
        await addVariant(saved.id, id);
      }
      for (const id of removed) {
        await removeVariant(saved.id, id);
      }
    } catch {
      // Best-effort
    }

    onSaved({ ...saved, variantIds });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <ExerciseFormFields form={form} />
        <VariantsSection
          variantIds={variantIds}
          selectedVariants={selectedVariants}
          availableForVariants={availableForVariants}
          onAddVariant={(id) => setVariantIds(prev => prev.includes(id) ? prev : [...prev, id])}
          onRemoveVariant={(id) => setVariantIds(prev => prev.filter(vid => vid !== id))}
        />

        <div className="flex gap-2 pt-2">
          <Button type="submit" className="flex-1">
            {exercise ? t('actions.save') : t('actions.create')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
