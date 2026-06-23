
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import { SessionRepository } from '@/db/repositories/SessionRepository';
import { UserProfileRepository } from '@/db/repositories/UserProfileRepository';
import { WorkoutPlanRepository } from '@/db/repositories/WorkoutPlanRepository';
import {
  getHistoryPage,
  getHistoryDetail,
  getFilteredHistory,
  deleteHistorySession,
  updateHistorySessionMeta,
} from '@/services/historyService';

vi.mock('@/db/repositories/SessionRepository');
vi.mock('@/db/repositories/WorkoutPlanRepository');
vi.mock('@/db/repositories/UserProfileRepository');
vi.mock('@/db/repositories/ExerciseRepository');

describe('historyService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(SessionRepository.getSessionEntities).mockResolvedValue({ groups: [], items: [], sets: [] });
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

      vi.mocked(SessionRepository.getSessionEntities).mockResolvedValue({
        groups: [{ id: 'g1', workoutSessionId: 's1' }],
        items: [{ id: 'i1', sessionExerciseGroupId: 'g1' }],
        sets: [{ sessionExerciseItemId: 'i1', isCompleted: true }, { sessionExerciseItemId: 'i1', isCompleted: false }],
      } as any);

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
        vi.mocked(SessionRepository.getSessionEntities).mockResolvedValue({ groups: [], items: [], sets: [] } as any);

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

    it('returns empty when exerciseId produces no matching groups', async () => {
      vi.mocked(SessionRepository.getItemsByExercise).mockResolvedValue([]);

      const result = await getFilteredHistory({ page: 1, pageSize: 10, exerciseId: 'missing-ex' });

      expect(result.sessions).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    it('falls back to getHistoryPage when no filters provided', async () => {
      vi.mocked(SessionRepository.count).mockResolvedValue(0);
      vi.mocked(SessionRepository.getPagedSessions).mockResolvedValue([]);

      const result = await getFilteredHistory({ page: 1, pageSize: 10 });

      expect(SessionRepository.getPagedSessions).toHaveBeenCalled();
      expect(result.sessions).toEqual([]);
    });

    it('handles pagination correctly within filtered results', async () => {
      const sessions = Array.from({ length: 5 }, (_, i) => ({
        id: `s${i}`,
        startedAt: new Date(2024, 0, i + 1),
        completedAt: new Date(2024, 0, i + 1),
        totalSets: 3,
        plannedWorkoutId: 'w1',
      }));
      vi.mocked(SessionRepository.getSessionsByWorkout).mockResolvedValue(sessions as any);

      const page1 = await getFilteredHistory({ page: 1, pageSize: 2, workoutId: 'w1' });
      const page2 = await getFilteredHistory({ page: 2, pageSize: 2, workoutId: 'w1' });
      const page3 = await getFilteredHistory({ page: 3, pageSize: 2, workoutId: 'w1' });

      expect(page1.totalCount).toBe(5);
      expect(page1.sessions).toHaveLength(2);
      expect(page2.sessions).toHaveLength(2);
      expect(page3.sessions).toHaveLength(1);
    });

    it('applies dateFrom filter on top of other results', async () => {
      const sessions = [
        { id: 's1', startedAt: new Date('2024-01-10') },
        { id: 's2', startedAt: new Date('2024-01-20') },
      ];
      vi.mocked(SessionRepository.getSessionsByWorkout).mockResolvedValue(sessions as any);

      const result = await getFilteredHistory({
        page: 1,
        pageSize: 10,
        workoutId: 'w1',
        dateFrom: new Date('2024-01-15'),
      });

      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0].session.id).toBe('s2');
    });
  });

  describe('getHistoryPage — completed session with totalSets', () => {
    it('uses precomputed totalSets for completed sessions', async () => {
      vi.mocked(SessionRepository.count).mockResolvedValue(1);
      const session = {
        id: 's1',
        plannedWorkoutId: 'pw1',
        plannedSessionId: 'ps1',
        completedAt: new Date(),
        totalSets: 5,
      };
      vi.mocked(SessionRepository.getPagedSessions).mockResolvedValue([session as any]);
      vi.mocked(WorkoutPlanRepository.getWorkout).mockResolvedValue({ id: 'pw1', name: 'W' } as any);
      vi.mocked(WorkoutPlanRepository.getSession).mockResolvedValue({ id: 'ps1', name: 'S' } as any);
      // Groups should NOT be fetched for completed sessions
      vi.mocked(SessionRepository.getGroupsBySessionIds).mockResolvedValue([]);

      const result = await getHistoryPage(1, 10);

      expect(result.sessions[0].setCount).toBe(5);
      expect(result.sessions[0].completedSets).toBe(5);
      // Verify we didn't fetch groups for completed sessions
      expect(SessionRepository.getGroupsBySessionIds).not.toHaveBeenCalledWith(['s1']);
    });
  });

  describe('getHistoryDetail — edge cases', () => {
    it('handles session with no planned workout or session IDs', async () => {
      const mockSession = { id: 's1', plannedWorkoutId: undefined, plannedSessionId: undefined };
      vi.mocked(SessionRepository.getHydratedSession).mockResolvedValue({
        session: mockSession,
        groups: [],
      } as any);
      vi.mocked(UserProfileRepository.getRegulationProfile).mockResolvedValue(null);

      const result = await getHistoryDetail('s1');

      expect(result).not.toBeNull();
      expect(result!.workoutName).toBe('');
      expect(result!.sessionName).toBe('');
      expect(result!.simpleMode).toBe(false);
    });

    it('builds empty originalExerciseNames when no items have originalExerciseId', async () => {
      const mockSession = { id: 's1', plannedWorkoutId: 'pw1', plannedSessionId: 'ps1' };
      const mockGroups = [{ group: { id: 'g1' }, items: [{ item: { id: 'i1' }, sets: [] }] }];
      vi.mocked(SessionRepository.getHydratedSession).mockResolvedValue({
        session: mockSession,
        groups: mockGroups,
      } as any);
      vi.mocked(UserProfileRepository.getRegulationProfile).mockResolvedValue(null);
      vi.mocked(WorkoutPlanRepository.getWorkout).mockResolvedValue({ name: 'W' } as any);
      vi.mocked(WorkoutPlanRepository.getSession).mockResolvedValue({ name: 'S' } as any);

      const result = await getHistoryDetail('s1');

      expect(ExerciseRepository.getByIds).not.toHaveBeenCalled();
      expect(result!.originalExerciseNames.size).toBe(0);
    });
  });

  describe('deleteHistorySession', () => {
    it('delegates to SessionRepository.deleteSessionCascade', async () => {
      vi.mocked(SessionRepository.deleteSessionCascade).mockResolvedValue(undefined);

      await deleteHistorySession('s1');

      expect(SessionRepository.deleteSessionCascade).toHaveBeenCalledWith('s1');
    });
  });

  describe('updateHistorySessionMeta', () => {
    it('delegates to SessionRepository.updateSession', async () => {
      vi.mocked(SessionRepository.updateSession).mockResolvedValue(1);

      const result = await updateHistorySessionMeta('s1', { notes: 'great session' });

      expect(SessionRepository.updateSession).toHaveBeenCalledWith('s1', { notes: 'great session' });
      expect(result).toBe(1);
    });
  });
});
