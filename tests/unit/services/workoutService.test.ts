

 
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import { UserProfileRepository } from '@/db/repositories/UserProfileRepository';
import { WorkoutPlanRepository } from '@/db/repositories/WorkoutPlanRepository';
import { bulkEstimateWorkoutDurations, estimateSessionDuration, estimateWorkoutDuration } from '@/services/durationEstimator';
import { deduceSessionMuscles } from '@/services/muscleDeducer';
import { getWorkoutListData, getPlannedSessionDetail, getWorkoutDetail } from '@/services/workoutService';

vi.mock('@/db/repositories/WorkoutPlanRepository');
vi.mock('@/db/repositories/ExerciseRepository');
vi.mock('@/db/repositories/UserProfileRepository');
vi.mock('@/services/durationEstimator');
vi.mock('@/services/muscleDeducer');

describe('workoutService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getWorkoutListData', () => {
    it('returns workout list data', async () => {
      const workouts = [{ id: 'w1', updatedAt: new Date() }, { id: 'w2', updatedAt: new Date() }];
      vi.mocked(WorkoutPlanRepository.getAllWorkouts).mockResolvedValue(workouts as any);
      vi.mocked(WorkoutPlanRepository.getSessionsByWorkout).mockResolvedValueOnce([{ id: 's1' }] as any).mockResolvedValueOnce([] as any);
      vi.mocked(bulkEstimateWorkoutDurations).mockResolvedValue({ w1: { minSeconds: 60, maxSeconds: 120 } } as any);

      const result = await getWorkoutListData();
      expect(result.workouts).toHaveLength(2);
      expect(result.sessionCounts.w1).toBe(1);
      expect(result.durations.w1).toBeDefined();
    });
  });

  describe('getPlannedSessionDetail', () => {
    it('returns null if session not found', async () => {
      vi.mocked(WorkoutPlanRepository.getHydratedPlannedSession).mockResolvedValue(null);
      const result = await getPlannedSessionDetail('s1');
      expect(result).toBeNull();
    });

    it('returns planned session detail', async () => {
      const hydratedSession = {
        session: { id: 's1' },
        groups: [
          {
            group: { id: 'g1' },
            items: [
              {
                item: { id: 'i1' },
                sets: [{ id: 'set1' }]
              }
            ]
          }
        ]
      } as any;

      vi.mocked(WorkoutPlanRepository.getHydratedPlannedSession).mockResolvedValue(hydratedSession);
      vi.mocked(ExerciseRepository.getAll).mockResolvedValue([{ id: 'e1' }] as any);
      vi.mocked(UserProfileRepository.getRegulationProfile).mockResolvedValue({ simpleMode: true } as any);

      const result = await getPlannedSessionDetail('s1');

      expect(result).not.toBeNull();
      expect(result?.groups).toHaveLength(1);
      expect(result?.items.g1).toHaveLength(1);
      expect(result?.sets.i1).toHaveLength(1);
    });
  });

  describe('getWorkoutDetail', () => {
    it('returns null if workout not found', async () => {
      vi.mocked(WorkoutPlanRepository.getWorkout).mockResolvedValue(null);
      const result = await getWorkoutDetail('w1');
      expect(result).toBeNull();
    });

    it('returns full workout detail', async () => {
      vi.mocked(WorkoutPlanRepository.getWorkout).mockResolvedValue({ id: 'w1', name: 'W1' } as any);
      vi.mocked(WorkoutPlanRepository.getSessionsByWorkout).mockResolvedValue([{ id: 's1', name: 'S1' }] as any);
      vi.mocked(deduceSessionMuscles).mockResolvedValue(['Chest']);
      vi.mocked(estimateSessionDuration).mockResolvedValue({ minSeconds: 60, maxSeconds: 120 });
      vi.mocked(estimateWorkoutDuration).mockResolvedValue({ minSeconds: 60, maxSeconds: 120 });

      const result = await getWorkoutDetail('w1');

      expect(result).not.toBeNull();
      expect(result?.workout.name).toBe('W1');
      expect(result?.sessions).toHaveLength(1);
      expect(result?.muscles.s1).toEqual(['Chest']);
      expect(result?.durations.s1).toEqual({ minSeconds: 60, maxSeconds: 120 });
      expect(result?.workoutDuration).toEqual({ minSeconds: 60, maxSeconds: 120 });
    });
  });
});
