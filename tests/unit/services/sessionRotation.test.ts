import { LexoRank } from 'lexorank';

function generateTestRank(index: number) {
  let rank = LexoRank.min().between(LexoRank.middle());
  for(let i=0; i<index; i++) rank = rank.genNext();
  return rank.toString();
}




 
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import { SessionRepository } from '@/db/repositories/SessionRepository';
import { WorkoutPlanRepository } from '@/db/repositories/WorkoutPlanRepository';
import { estimateSessionDuration } from '@/services/durationEstimator';
import { getNextSessionSuggestionDetail } from '@/services/sessionRotation';
import { analyzeSessionVolume } from '@/services/volumeAnalyzer';

vi.mock('@/db/repositories/WorkoutPlanRepository');
vi.mock('@/db/repositories/SessionRepository');
vi.mock('@/db/repositories/ExerciseRepository');
vi.mock('@/services/volumeAnalyzer');
vi.mock('@/services/durationEstimator');
vi.mock('@/i18n/t', () => ({
  t: (key: string) => key,
}));

describe('sessionRotation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getNextSessionSuggestionDetail', () => {
    it('returns null if no suggestion', async () => {
      vi.mocked(WorkoutPlanRepository.getActiveWorkouts).mockResolvedValue([]);
      const result = await getNextSessionSuggestionDetail();
      expect(result).toBeNull();
    });

    it('returns detailed suggestion', async () => {
      vi.mocked(WorkoutPlanRepository.getActiveWorkouts).mockResolvedValue([{ id: 'w1' }] as any);
      vi.mocked(WorkoutPlanRepository.getSessionsByWorkout).mockResolvedValue([{ id: 's1', orderIndex: generateTestRank(0) }] as any);
      vi.mocked(SessionRepository.getLatestCompletedSessionByWorkout).mockResolvedValue(undefined);
      vi.mocked(SessionRepository.getSessionCountByWorkout).mockResolvedValue(0);

      vi.mocked(WorkoutPlanRepository.getGroupsBySession).mockResolvedValue([{ id: 'g1' }] as any);
      vi.mocked(WorkoutPlanRepository.getItemsByGroups).mockResolvedValue([{ id: 'i1', exerciseId: 'e1' }] as any);
      vi.mocked(ExerciseRepository.getByIds).mockResolvedValue([{ id: 'e1', equipment: ['dumbbell'] }] as any);
      vi.mocked(WorkoutPlanRepository.getSetsByItems).mockResolvedValue([{ setCountRange: { min: 1, max: 1 } }] as any);

      vi.mocked(analyzeSessionVolume).mockResolvedValue({} as any);
      vi.mocked(estimateSessionDuration).mockResolvedValue({ maxSeconds: 60, minSeconds: 60 } as any);

      const result = await getNextSessionSuggestionDetail();
      expect(result).not.toBeNull();
      expect(result?.equipment).toContain('enums.equipment.dumbbell');
    });
  });
});
