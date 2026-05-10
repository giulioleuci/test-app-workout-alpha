
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import { SessionRepository } from '@/db/repositories/SessionRepository';
import { UserProfileRepository } from '@/db/repositories/UserProfileRepository';
import { WorkoutPlanRepository } from '@/db/repositories/WorkoutPlanRepository';
import { getHistoryPage, getHistoryDetail, getFilteredHistory } from '@/services/historyService';

vi.mock('@/db/repositories/SessionRepository');
vi.mock('@/db/repositories/WorkoutPlanRepository');
vi.mock('@/db/repositories/UserProfileRepository');
vi.mock('@/db/repositories/ExerciseRepository');

describe('historyService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getHistoryPage', () => {
    it('returns empty list if no sessions', async () => {
      vi.mocked(SessionRepository.count).mockResolvedValue(0);
      vi.mocked(SessionRepository.getPagedSessions).mockResolvedValue([]);

      const result = await getHistoryPage(1, 10);
      expect(result.sessions).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    it('returns enriched sessions', async () => {
      vi.mocked(SessionRepository.count).mockResolvedValue(1);
      const session = { id: 's1', plannedWorkoutId: 'pw1', plannedSessionId: 'ps1' };
      vi.mocked(SessionRepository.getPagedSessions).mockResolvedValue([session as any]);

      vi.mocked(WorkoutPlanRepository.getWorkout).mockResolvedValue({ id: 'pw1', name: 'Workout 1' } as any);
      vi.mocked(WorkoutPlanRepository.getSession).mockResolvedValue({ id: 'ps1', name: 'Session 1' } as any);

      vi.mocked(SessionRepository.getGroupsBySessionIds).mockResolvedValue([{ id: 'g1', workoutSessionId: 's1' }] as any);
      vi.mocked(SessionRepository.getItemsByGroups).mockResolvedValue([{ id: 'i1', sessionExerciseGroupId: 'g1' }] as any);
      vi.mocked(SessionRepository.getSetsByItems).mockResolvedValue([{ sessionExerciseItemId: 'i1', isCompleted: true }, { sessionExerciseItemId: 'i1', isCompleted: false }] as any);

      const result = await getHistoryPage(1, 10);

      expect(result.sessions).toHaveLength(1);
      const s = result.sessions[0];
      expect(s.workoutName).toBe('Workout 1');
      expect(s.sessionName).toBe('Session 1');
      expect(s.setCount).toBe(2);
      expect(s.completedSets).toBe(1);
    });
  });

  describe('getHistoryDetail', () => {
    it('returns null if session not found (not hydrated)', async () => {
      vi.mocked(SessionRepository.getHydratedSession).mockResolvedValue(null);
      const result = await getHistoryDetail('missing');
      expect(result).toBeNull();
    });

    it('returns full history detail', async () => {
      const mockSession = { id: 's1', plannedWorkoutId: 'pw1', plannedSessionId: 'ps1' };
      const mockGroups = [
        {
          group: { id: 'g1' },
          items: [
            { item: { id: 'i1', originalExerciseId: 'oe1' }, sets: [] }
          ]
        }
      ];

      vi.mocked(SessionRepository.getHydratedSession).mockResolvedValue({ session: mockSession, groups: mockGroups } as any);
      vi.mocked(UserProfileRepository.getRegulationProfile).mockResolvedValue({ simpleMode: true } as any);
      vi.mocked(WorkoutPlanRepository.getWorkout).mockResolvedValue({ name: 'Workout 1' } as any);
      vi.mocked(WorkoutPlanRepository.getSession).mockResolvedValue({ name: 'Session 1' } as any);
      vi.mocked(ExerciseRepository.getByIds).mockResolvedValue([{ id: 'oe1', name: 'Original Exercise' }] as any);

      const result = await getHistoryDetail('s1');

      expect(result).not.toBeNull();
      expect(result!.session.id).toBe('s1');
      expect(result!.simpleMode).toBe(true);
      expect(result!.workoutName).toBe('Workout 1');
      expect(result!.sessionName).toBe('Session 1');
      expect(result!.originalExerciseNames.get('oe1')).toBe('Original Exercise');
    });
  });

  describe('getFilteredHistory', () => {
    it('filters by exerciseId', async () => {
      vi.mocked(SessionRepository.getItemsByExercise).mockResolvedValue([
        { sessionExerciseGroupId: 'g1' } as any
      ]);
      vi.mocked(SessionRepository.getGroupsByIds).mockResolvedValue([
        { workoutSessionId: 's1' } as any
      ]);
      vi.mocked(SessionRepository.getSessionsByIds).mockResolvedValue([
        { id: 's1', startedAt: new Date(), plannedWorkoutId: 'w1', plannedSessionId: 'ps1' } as any
      ]);
      vi.mocked(WorkoutPlanRepository.getWorkout).mockResolvedValue({ id: 'w1', name: 'Workout 1' } as any);
      vi.mocked(WorkoutPlanRepository.getSession).mockResolvedValue({ id: 'ps1', name: 'Session 1' } as any);

      const result = await getFilteredHistory({ page: 1, pageSize: 10, exerciseId: 'e1' });

      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0].session.id).toBe('s1');
      expect(SessionRepository.getItemsByExercise).toHaveBeenCalledWith('e1');
    });

    it('filters by workoutId', async () => {
      vi.mocked(SessionRepository.getSessionsByWorkout).mockResolvedValue([
        { id: 's1', startedAt: new Date(), plannedWorkoutId: 'w1' } as any
      ]);

      const result = await getFilteredHistory({ page: 1, pageSize: 10, workoutId: 'w1' });

      expect(result.sessions).toHaveLength(1);
      expect(SessionRepository.getSessionsByWorkout).toHaveBeenCalledWith('w1');
    });

    it('filters by date range', async () => {
        const from = new Date('2023-01-01');
        const to = new Date('2023-01-31');
        vi.mocked(SessionRepository.getSessionsInDateRange).mockResolvedValue([
            { id: 's1', startedAt: new Date('2023-01-15') } as any
        ]);

        const result = await getFilteredHistory({ page: 1, pageSize: 10, dateFrom: from, dateTo: to });

        expect(result.sessions).toHaveLength(1);
        expect(SessionRepository.getSessionsInDateRange).toHaveBeenCalledWith(from, to);
    });

    it('applies secondary filters (workoutId)', async () => {
        // Mock getItemsByExercise to return items related to s1 and s2
        vi.mocked(SessionRepository.getItemsByExercise).mockResolvedValue([
            { sessionExerciseGroupId: 'g1' } as any,
            { sessionExerciseGroupId: 'g2' } as any
        ]);
        // Mock getGroupsByIds to return groups linking to sessions
        vi.mocked(SessionRepository.getGroupsByIds).mockResolvedValue([
            { id: 'g1', workoutSessionId: 's1' } as any,
            { id: 'g2', workoutSessionId: 's2' } as any
        ]);
        // Mock getSessionsByIds returning mixed results
        // Note: The service implementation re-fetches sessions after getting them via groups.
        // It should filter s2 out because w2 != w1.
        vi.mocked(SessionRepository.getSessionsByIds).mockResolvedValue([
            { id: 's1', startedAt: new Date(), plannedWorkoutId: 'w1', completedAt: new Date(), totalSets: 1 } as any,
            { id: 's2', startedAt: new Date(), plannedWorkoutId: 'w2', completedAt: new Date(), totalSets: 1 } as any
        ]);

        // Need to ensure the other mocks return data for these sessions so they aren't filtered out by the "incomplete" logic
        // or fail during enrichment.
        vi.mocked(WorkoutPlanRepository.getWorkout).mockResolvedValue({ id: 'w1', name: 'Workout 1' } as any);
        vi.mocked(WorkoutPlanRepository.getSession).mockResolvedValue({ id: 'ps1', name: 'Session 1' } as any);
        vi.mocked(SessionRepository.getGroupsBySessionIds).mockResolvedValue([] as any);

        // We use exerciseId as the primary filter to ensure workoutId is treated as a secondary filter
        const result = await getFilteredHistory({
            page: 1, pageSize: 10,
            exerciseId: 'ex1',
            workoutId: 'w1'
        });

        // Should filter out s2 in memory because its workoutId is w2
        expect(result.sessions).toHaveLength(1);
        expect(result.sessions[0].session.id).toBe('s1');
    });
  });
});
