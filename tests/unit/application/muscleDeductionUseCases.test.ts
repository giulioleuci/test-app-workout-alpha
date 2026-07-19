import { describe, expect, it, vi } from 'vitest';

import { MuscleDeductionUseCases, type MuscleDeductionPort } from '@/application/muscles';
import { Muscle, MuscleGroup } from '@/domain/enums';

describe('MuscleDeductionUseCases', () => {
  it('returns empty deductions without groups or exercise items', async () => {
    const port: MuscleDeductionPort = {
      getGroupsBySession: vi.fn(() => Promise.resolve([])),
      getItemsByGroups: vi.fn(() => Promise.resolve([])),
      getExercisesByIds: vi.fn(() => Promise.resolve([])),
    };

    await expect(new MuscleDeductionUseCases(port).deduceSessionMuscles('session-1')).resolves.toEqual({
      primaryMuscles: [], secondaryMuscles: [], primaryMuscleGroups: [], secondaryMuscleGroups: [], muscleGroups: [],
    });
    expect(port.getItemsByGroups).not.toHaveBeenCalled();
  });

  it('uses batched unique IDs and keeps a shared muscle primary', async () => {
    const port: MuscleDeductionPort = {
      getGroupsBySession: vi.fn(() => Promise.resolve([{ id: 'group-1' }, { id: 'group-2' }] as never)),
      getItemsByGroups: vi.fn(() => Promise.resolve([
        { exerciseId: 'exercise-1' }, { exerciseId: 'exercise-1' }, { exerciseId: 'exercise-2' },
      ] as never)),
      getExercisesByIds: vi.fn(() => Promise.resolve([
        { primaryMuscles: [Muscle.Chest], secondaryMuscles: [Muscle.UpperBack] },
        { primaryMuscles: [Muscle.UpperBack], secondaryMuscles: [Muscle.Chest] },
      ] as never)),
    };

    await expect(new MuscleDeductionUseCases(port).deduceSessionMuscles('session-1')).resolves.toEqual(expect.objectContaining({
      primaryMuscles: expect.arrayContaining([Muscle.Chest, Muscle.UpperBack]),
      secondaryMuscles: [],
      primaryMuscleGroups: expect.arrayContaining([MuscleGroup.Chest, MuscleGroup.Back]),
    }));
    expect(port.getItemsByGroups).toHaveBeenCalledWith(['group-1', 'group-2']);
    expect(port.getExercisesByIds).toHaveBeenCalledWith(['exercise-1', 'exercise-2']);
  });
});
