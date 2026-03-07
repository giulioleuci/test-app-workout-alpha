

 
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { SessionRepository } from '@/db/repositories/SessionRepository';
import { UserProfileRepository } from '@/db/repositories/UserProfileRepository';
import { WorkoutPlanRepository } from '@/db/repositories/WorkoutPlanRepository';
import { loadActiveSessionData } from '@/services/sessionLoaderService';

vi.mock('@/db/repositories/SessionRepository');
vi.mock('@/db/repositories/WorkoutPlanRepository');
vi.mock('@/db/repositories/UserProfileRepository');

describe('sessionLoaderService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('loadActiveSessionData', () => {
    it('returns null if no active session id', async () => {
      const result = await loadActiveSessionData(null);
      expect(result).toBeNull();
    });

    it('returns null if session not found', async () => {
      vi.mocked(SessionRepository.getHydratedSession).mockResolvedValue(null);
      vi.mocked(UserProfileRepository.getRegulationProfile).mockResolvedValue(null);
      const result = await loadActiveSessionData('s1');
      expect(result).toBeNull();
    });

    it('returns active session data', async () => {
      const hydratedSession = {
        session: { id: 's1', plannedSessionId: 'ps1' },
        groups: [
          {
            group: { id: 'g1', plannedExerciseGroupId: 'pg1' },
            items: [
              {
                item: { id: 'i1', plannedExerciseItemId: 'pi1', exerciseId: 'e1' },
                exercise: { id: 'e1' },
                sets: [{ id: 'set1', plannedSetId: 'pset1' }]
              }
            ]
          }
        ]
      } as any;

      vi.mocked(SessionRepository.getHydratedSession).mockResolvedValue(hydratedSession);
      vi.mocked(UserProfileRepository.getRegulationProfile).mockResolvedValue({ simpleMode: true } as any);
      vi.mocked(WorkoutPlanRepository.getSession).mockResolvedValue({ id: 'ps1', plannedWorkoutId: 'pw1' } as any);
      vi.mocked(WorkoutPlanRepository.getWorkout).mockResolvedValue({ id: 'pw1' } as any);

      vi.mocked(WorkoutPlanRepository.getGroup).mockResolvedValue({ id: 'pg1' } as any);
      vi.mocked(WorkoutPlanRepository.getItem).mockResolvedValue({ id: 'pi1' } as any);
      vi.mocked(WorkoutPlanRepository.bulkGetGroups).mockResolvedValue([{ id: 'pg1' } as any]);
      vi.mocked(WorkoutPlanRepository.bulkGetItems).mockResolvedValue([{ id: 'pi1' } as any]);
      vi.mocked(WorkoutPlanRepository.getSetsByIds).mockResolvedValue([{ id: 'pset1' }] as any);

      const result = await loadActiveSessionData('s1');

      expect(result).not.toBeNull();
      expect(result?.simpleMode).toBe(true);
      expect(result?.loadedGroups).toHaveLength(1);
      expect(result?.loadedGroups[0].plannedGroup?.id).toBe('pg1');
      expect(result?.loadedGroups[0].items[0].plannedSets.pset1).toBeDefined();
    });
  });
});
