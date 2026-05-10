import { describe, it, expect } from 'vitest';

import dayjs from '@/lib/dayjs';
import { validateRecord, MAX_NAME_LENGTH, MAX_NOTE_LENGTH, MAX_DESCRIPTION_LENGTH, MAX_ID_LENGTH } from '@/services/backupValidation';

describe('Security String Limits', () => {
  it('rejects names exceeding MAX_NAME_LENGTH', () => {
    const longName = 'a'.repeat(MAX_NAME_LENGTH + 1);
    const record = {
      id: 'ex-1',
      name: longName,
      primaryMuscles: ['chest'],
      secondaryMuscles: [],
      equipment: ['barbell'],
      movementPattern: 'horizontalPush',
      counterType: 'reps',
      defaultLoadUnit: 'kg',
      createdAt: dayjs().toDate(),
      updatedAt: dayjs().toDate(),
    };
    const validated = validateRecord('exercises', record);
    expect(validated).toBeNull();
  });

  it('rejects notes exceeding MAX_NOTE_LENGTH', () => {
    const longNote = 'a'.repeat(MAX_NOTE_LENGTH + 1);
    const record = {
      id: 'ex-1',
      name: 'Bench Press',
      primaryMuscles: ['chest'],
      secondaryMuscles: [],
      equipment: ['barbell'],
      movementPattern: 'horizontalPush',
      counterType: 'reps',
      defaultLoadUnit: 'kg',
      notes: longNote,
      createdAt: dayjs().toDate(),
      updatedAt: dayjs().toDate(),
    };
    const validated = validateRecord('exercises', record);
    expect(validated).toBeNull();
  });

  it('rejects descriptions exceeding MAX_DESCRIPTION_LENGTH', () => {
    const longDescription = 'a'.repeat(MAX_DESCRIPTION_LENGTH + 1);
    const record = {
      id: 'p-1',
      name: 'Powerlifting Program',
      description: longDescription,
      objectiveType: 'strength',
      workType: 'hypertrophy',
      status: 'active',
      createdAt: dayjs().toDate(),
      updatedAt: dayjs().toDate(),
    };
    const validated = validateRecord('plannedWorkouts', record);
    expect(validated).toBeNull();
  });

  it('rejects IDs exceeding MAX_ID_LENGTH', () => {
    const longId = 'a'.repeat(MAX_ID_LENGTH + 1);
    const record = {
      id: longId,
      name: 'Bench Press',
      primaryMuscles: ['chest'],
      secondaryMuscles: [],
      equipment: ['barbell'],
      movementPattern: 'horizontalPush',
      counterType: 'reps',
      defaultLoadUnit: 'kg',
      createdAt: dayjs().toDate(),
      updatedAt: dayjs().toDate(),
    };
    const validated = validateRecord('exercises', record);
    expect(validated).toBeNull();
  });

  it('accepts strings at maximum length', () => {
    const maxName = 'a'.repeat(MAX_NAME_LENGTH);
    const record = {
      id: 'ex-1',
      name: maxName,
      primaryMuscles: ['chest'],
      secondaryMuscles: [],
      equipment: ['barbell'],
      movementPattern: 'horizontalPush',
      counterType: 'reps',
      defaultLoadUnit: 'kg',
      createdAt: dayjs().toDate(),
      updatedAt: dayjs().toDate(),
    };
    const validated = validateRecord('exercises', record);
    expect(validated).not.toBeNull();
    expect(validated?.name).toBe(maxName);
  });
});
