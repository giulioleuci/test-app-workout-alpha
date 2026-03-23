import { LexoRank } from 'lexorank';

function generateTestRank(index: number) {
  let rank = LexoRank.min().between(LexoRank.middle());
  for(let i=0; i<index; i++) rank = rank.genNext();
  return rank.toString();
}


import { describe, it, expect, vi, beforeEach } from 'vitest';

import { SessionRepository } from '@/db/repositories/SessionRepository';
import { WorkoutPlanRepository } from '@/db/repositories/WorkoutPlanRepository';
import { getGroupedHistory } from '@/services/exerciseHistoryService';

vi.mock('@/db/repositories/SessionRepository');
vi.mock('@/db/repositories/WorkoutPlanRepository');

describe('exerciseHistoryService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getGroupedHistory', () => {
    it('returns empty array if no items found', async () => {
      vi.mocked(SessionRepository.getItemsByExercise).mockResolvedValue([]);
      const result = await getGroupedHistory('ex1', 'curr1');
      expect(result).toEqual([]);
    });

    it('returns grouped history', async () => {
      const exerciseId = 'ex1';
      const currentSessionId = 'curr1';

      const item = { id: 'i1', sessionExerciseGroupId: 'g1', exerciseId } as any;
      const group = { id: 'g1', workoutSessionId: 's1', orderIndex: generateTestRank(0) } as any;
      const session = { id: 's1', startedAt: new Date(), plannedSessionId: 'ps1' } as any;
      const plannedSession = { id: 'ps1', name: 'Planned Session' } as any;
      const set = { id: 'set1', sessionExerciseItemId: 'i1', isCompleted: true, orderIndex: generateTestRank(0) } as any;

      vi.mocked(SessionRepository.getItemsByExercise).mockResolvedValue([item]);
      vi.mocked(SessionRepository.getGroupsByIds).mockResolvedValue([group]);
      vi.mocked(SessionRepository.getSession).mockResolvedValue(session);
      vi.mocked(WorkoutPlanRepository.getSession).mockResolvedValue(plannedSession);
      vi.mocked(SessionRepository.getSetsByItems).mockResolvedValue([set]);

      const result = await getGroupedHistory(exerciseId, currentSessionId);

      expect(result).toHaveLength(1);
      expect(result[0].sessionName).toBe('Planned Session');
      expect(result[0].sets).toHaveLength(1);
    });
  });
});
