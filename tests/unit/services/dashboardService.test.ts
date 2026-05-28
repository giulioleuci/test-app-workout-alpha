

 
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

    it('returns empty map when no sessions in range', async () => {
      vi.mocked(SessionRepository.getSessionsInDateRange).mockResolvedValue([]);

      const result = await buildTrainingCalendar(new Date());
      expect(result.size).toBe(0);
    });

    it('groups multiple sessions on the same date under the same key', async () => {
      const date = new Date('2023-06-15');
      const sessions = [
        { id: 's1', startedAt: date, completedAt: date, plannedSessionId: 'ps1' },
        { id: 's2', startedAt: date, completedAt: date, plannedSessionId: 'ps2' },
      ];
      vi.mocked(SessionRepository.getSessionsInDateRange).mockResolvedValue(sessions as any);
      vi.mocked(WorkoutPlanRepository.getSession).mockResolvedValue({ name: 'Any Session' } as any);

      const result = await buildTrainingCalendar(date);
      expect(result.size).toBe(1);
      const key = '2023-06-15';
      expect(result.get(key)).toHaveLength(2);
    });

    it('handles session without plannedSessionId gracefully', async () => {
      const date = new Date('2023-03-10');
      const sessions = [{ id: 's1', startedAt: date, completedAt: date, plannedSessionId: undefined }];
      vi.mocked(SessionRepository.getSessionsInDateRange).mockResolvedValue(sessions as any);

      const result = await buildTrainingCalendar(date);
      expect(result.size).toBe(1);
    });
  });

  describe('getLastWorkoutSummary — edge cases', () => {
    it('handles session without plannedSessionId (shows free session fallback name)', async () => {
      const session = { id: 's1', startedAt: new Date(), completedAt: new Date() };
      vi.mocked(SessionRepository.getLatestCompletedSession).mockResolvedValue(session as any);
      vi.mocked(SessionRepository.getGroupsBySession).mockResolvedValue([]);
      vi.mocked(SessionRepository.getItemsByGroups).mockResolvedValue([]);
      vi.mocked(SessionRepository.getSetsByItems).mockResolvedValue([]);
      vi.mocked(ExerciseRepository.getByIds).mockResolvedValue([]);

      const result = await getLastWorkoutSummary();
      expect(result).not.toBeNull();
      // Service uses i18n fallback name for sessions without a plannedSessionId
      expect(typeof result?.sessionName).toBe('string');
    });

    it('correctly sums volume from multiple items', async () => {
      const session = { id: 's1', startedAt: new Date(), completedAt: new Date() };
      vi.mocked(SessionRepository.getLatestCompletedSession).mockResolvedValue(session as any);
      vi.mocked(WorkoutPlanRepository.getSession).mockResolvedValue(undefined);
      vi.mocked(WorkoutPlanRepository.getWorkout).mockResolvedValue(undefined);
      vi.mocked(SessionRepository.getGroupsBySession).mockResolvedValue([{ id: 'g1' }] as any);
      vi.mocked(SessionRepository.getItemsByGroups).mockResolvedValue([
        { id: 'i1', exerciseId: 'e1' },
        { id: 'i2', exerciseId: 'e2' },
      ] as any);
      vi.mocked(SessionRepository.getSetsByItems).mockResolvedValue([
        { sessionExerciseItemId: 'i1', isCompleted: true, actualLoad: 100, actualCount: 5 },
        { sessionExerciseItemId: 'i2', isCompleted: true, actualLoad: 50, actualCount: 10 },
        { sessionExerciseItemId: 'i2', isCompleted: false, actualLoad: 50, actualCount: 10 },
      ] as any);
      vi.mocked(ExerciseRepository.getByIds).mockResolvedValue([
        { id: 'e1', name: 'Squat' },
        { id: 'e2', name: 'Bench' },
      ] as any);

      const result = await getLastWorkoutSummary();
      // Volume: i1 = 500, i2 (completed only) = 500 → total 1000
      expect(result?.totalVolume).toBe(1000);
      expect(result?.exercises).toHaveLength(2);
    });
  });
});
