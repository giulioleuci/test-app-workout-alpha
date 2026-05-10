import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import { OneRepMaxRepository } from '@/db/repositories/OneRepMaxRepository';
import { UserProfileRepository } from '@/db/repositories/UserProfileRepository';
import { getGroupedData } from '@/services/oneRepMaxService';

vi.mock('@/db/repositories/ExerciseRepository');
vi.mock('@/db/repositories/OneRepMaxRepository');
vi.mock('@/db/repositories/UserProfileRepository');

describe('oneRepMaxService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getGroupedData', () => {
    it('returns grouped data', async () => {
      vi.mocked(ExerciseRepository.getAll).mockResolvedValue([{ id: 'e1', name: 'Exercise 1' }] as any);
      const record = { exerciseId: 'e1', recordedAt: new Date(), weight: 100 };
      vi.mocked(OneRepMaxRepository.getRecordsInDateRange).mockResolvedValue([record as any]);
      vi.mocked(UserProfileRepository.getBodyWeightRecords).mockResolvedValue([]);

      const result = await getGroupedData();

      expect(result.allGrouped).toHaveLength(1);
      expect(result.allGrouped[0].exercise.name).toBe('Exercise 1');
      expect(result.allGrouped[0].latest).toBeDefined();
      expect(result.allGrouped[0].records).toHaveLength(1);
    });
  });
});
