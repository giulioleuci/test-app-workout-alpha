

 
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import { SessionRepository } from '@/db/repositories/SessionRepository';
import { WorkoutPlanRepository } from '@/db/repositories/WorkoutPlanRepository';
import { getLastWorkoutSummary, buildTrainingCalendar } from '@/services/dashboardService';

vi.mock('@/db/repositories/SessionRepository');
vi.mock('@/db/repositories/WorkoutPlanRepository');
vi.mock('@/db/repositories/ExerciseRepository');
vi.mock('@/i18n/t', () => ({
  t: (key: string) => key,
}));

describe('dashboardService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getLastWorkoutSummary', () => {
    it('returns null if no completed session', async () => {
      vi.mocked(SessionRepository.getLatestCompletedSession).mockResolvedValue(undefined);
      const result = await getLastWorkoutSummary();
      expect(result).toBeNull();
    });

    it('returns summary with session details', async () => {
      const session = { id: 's1', startedAt: new Date(), completedAt: new Date(), plannedSessionId: 'ps1', plannedWorkoutId: 'pw1' };
      vi.mocked(SessionRepository.getLatestCompletedSession).mockResolvedValue(session as any);
      vi.mocked(WorkoutPlanRepository.getSession).mockResolvedValue({ name: 'Plan Session' } as any);
      vi.mocked(WorkoutPlanRepository.getWorkout).mockResolvedValue({ name: 'Plan Workout' } as any);
      vi.mocked(SessionRepository.getGroupsBySession).mockResolvedValue([{ id: 'g1' }] as any);
      vi.mocked(SessionRepository.getItemsByGroups).mockResolvedValue([{ id: 'i1', exerciseId: 'e1' }] as any);
      vi.mocked(SessionRepository.getSetsByItems).mockResolvedValue([{ sessionExerciseItemId: 'i1', isCompleted: true, actualLoad: 100, actualCount: 5 }] as any);
      vi.mocked(ExerciseRepository.getByIds).mockResolvedValue([{ id: 'e1', name: 'Exercise 1' }] as any);

      const result = await getLastWorkoutSummary();
      expect(result).not.toBeNull();
      expect(result?.sessionName).toBe('Plan Session');
      expect(result?.workoutName).toBe('Plan Workout');
      expect(result?.totalVolume).toBe(500);
      expect(result?.exercises[0].name).toBe('Exercise 1');
    });
  });

  describe('buildTrainingCalendar', () => {
    it('builds calendar entries', async () => {
      const date = new Date('2023-01-01');
      const sessions = [{ id: 's1', startedAt: date, completedAt: date, plannedSessionId: 'ps1' }];
      vi.mocked(SessionRepository.getSessionsInDateRange).mockResolvedValue(sessions as any);
      vi.mocked(WorkoutPlanRepository.getSession).mockResolvedValue({ name: 'Plan Session' } as any);

      const result = await buildTrainingCalendar(date);
      expect(result.size).toBe(1);
      const key = '2023-01-01';
      expect(result.get(key)).toHaveLength(1);
      expect(result.get(key)![0].sessionName).toBe('Plan Session');
    });
  });
});
