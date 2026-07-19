import { describe, expect, it, vi } from 'vitest';

import { WarmupUseCases } from '@/application/warmups';
import type { WarmupContextPort } from '@/application/warmups';
import type { Exercise } from '@/domain/entities';
import { CounterType, Equipment, ExerciseType, MovementPattern, Muscle } from '@/domain/enums';
import dayjs from '@/lib/dayjs';

const createExercise = (id: string, primaryMuscles: Muscle[]): Exercise => ({
  id,
  name: id,
  type: ExerciseType.Compound,
  primaryMuscles,
  secondaryMuscles: [],
  equipment: [Equipment.Barbell],
  movementPattern: MovementPattern.HorizontalPush,
  counterType: CounterType.Reps,
  defaultLoadUnit: 'kg',
  variantIds: [],
  createdAt: dayjs().toDate(),
  updatedAt: dayjs().toDate(),
});

describe('WarmupUseCases', () => {
  it('uses preceding session exercises to determine muscle-specific warmups', async () => {
    const bench = createExercise('bench', [Muscle.Chest]);
    const fly = createExercise('fly', [Muscle.Chest]);
    const squat = createExercise('squat', [Muscle.Quadriceps]);
    const context: WarmupContextPort = {
      getExercisesInSession: vi.fn().mockResolvedValue([bench, fly]),
      getLatestBodyWeight: vi.fn(),
    };
    const useCases = new WarmupUseCases(context);

    await expect(useCases.isFirstForMuscle('session-1', fly)).resolves.toBe(false);
    context.getExercisesInSession = vi.fn().mockResolvedValue([bench, squat]);
    await expect(useCases.isFirstForMuscle('session-1', squat)).resolves.toBe(true);
  });

  it('uses an explicit body weight without consulting the persistence port', async () => {
    const getLatestBodyWeight = vi.fn();
    const useCases = new WarmupUseCases({
      getExercisesInSession: vi.fn(),
      getLatestBodyWeight,
    });

    const sets = await useCases.generateWarmup(100, createExercise('bench', [Muscle.Chest]), undefined, 80);

    expect(getLatestBodyWeight).not.toHaveBeenCalled();
    expect(sets.map(set => set.percent)).toEqual([50, 70, 85]);
  });

  it('uses the port body weight when no explicit value is supplied', async () => {
    const getLatestBodyWeight = vi.fn().mockResolvedValue({ weight: 120 });
    const useCases = new WarmupUseCases({
      getExercisesInSession: vi.fn(),
      getLatestBodyWeight,
    });

    const sets = await useCases.generateWarmup(100, createExercise('squat', [Muscle.Quadriceps]));

    expect(getLatestBodyWeight).toHaveBeenCalledOnce();
    expect(sets.map(set => set.percent)).toEqual([60, 80]);
  });
});
