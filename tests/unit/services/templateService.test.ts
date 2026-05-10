import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import { TemplateRepository } from '@/db/repositories/TemplateRepository';
import { UserProfileRepository } from '@/db/repositories/UserProfileRepository';
import { getTemplateDetail } from '@/services/templateService';

vi.mock('@/db/repositories/TemplateRepository');
vi.mock('@/db/repositories/ExerciseRepository');
vi.mock('@/db/repositories/UserProfileRepository');

describe('templateService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getTemplateDetail', () => {
    it('returns null if template not found', async () => {
      vi.mocked(TemplateRepository.getById).mockResolvedValue(undefined);
      const result = await getTemplateDetail('t1');
      expect(result).toBeNull();
    });

    it('returns template detail', async () => {
      vi.mocked(TemplateRepository.getById).mockResolvedValue({ id: 't1', name: 'T1' } as any);
      vi.mocked(ExerciseRepository.getAll).mockResolvedValue([{ id: 'e1', name: 'E1' }] as any);
      vi.mocked(UserProfileRepository.getRegulationProfile).mockResolvedValue({ simpleMode: true } as any);

      const result = await getTemplateDetail('t1');

      expect(result).not.toBeNull();
      expect(result?.template.name).toBe('T1');
      expect(result?.exercises).toHaveLength(1);
      expect(result?.simpleMode).toBe(true);
    });
  });
});
