import { describe, it, expect } from 'vitest';

import dayjs from '@/lib/dayjs';
import type { TableName } from '@/services/backupService';
import { validateRecord } from '@/services/backupValidation';

describe('backupValidation', () => {
  it('validates a correct record', () => {
    const record = {
      id: 'ex-1',
      name: 'Bench Press',
      primaryMuscles: ['chest'],
      secondaryMuscles: ['triceps'],
      equipment: ['barbell'],
      movementPattern: 'horizontalPush',
      counterType: 'reps',
      defaultLoadUnit: 'kg',
      createdAt: dayjs().toDate(),
      updatedAt: dayjs().toDate(),
    };
    const validated = validateRecord('exercises', record);
    expect(validated).not.toBeNull();
    expect(validated?.id).toBe('ex-1');
  });

  it('returns null for an invalid record', () => {
    const record = {
      id: 'ex-1',
      name: 'Bench Press',
      primaryMuscles: 'chest', // Invalid: should be an array
    };
    const validated = validateRecord('exercises', record);
    expect(validated).toBeNull();
  });

  it('fails closed when schema is missing', () => {
    // We cast to TableName to simulate a scenario where a new table is added
    // to TableName type but forgotten in SCHEMAS.
    const tableName = 'nonExistentTable' as TableName;
    const record = { some: 'untrusted data' };

    const validated = validateRecord(tableName, record);

    // Verifying fail-closed behavior: returns null when no schema is found
    expect(validated).toBeNull();
  });
});
