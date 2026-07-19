import { describe, expect, it, vi } from 'vitest';

import { ActiveSessionLoadingUseCases, type ActiveSessionLoadingPort } from '@/application/activeSessionLoading';

describe('ActiveSessionLoadingUseCases', () => {
  it('uses the planned-session hierarchy before a direct workout and tracks exercise occurrences across groups', async () => {
    const port = {
      getHydratedSession: vi.fn().mockResolvedValue({ session: { id: 'session', plannedSessionId: 'plan', plannedWorkoutId: 'direct' }, groups: [
        { group: { id: 'g1' }, items: [{ item: { id: 'i1', exerciseId: 'exercise' }, exercise: { id: 'exercise' }, sets: [] }] },
        { group: { id: 'g2' }, items: [{ item: { id: 'i2', exerciseId: 'exercise' }, exercise: { id: 'exercise' }, sets: [] }] },
      ] }),
      getRegulationProfile: vi.fn().mockResolvedValue(undefined), getPlannedSession: vi.fn().mockResolvedValue({ id: 'plan', plannedWorkoutId: 'planned-workout' }), getPlannedWorkout: vi.fn().mockResolvedValue({ id: 'planned-workout' }), getPlannedGroups: vi.fn().mockResolvedValue([]), getPlannedItems: vi.fn().mockResolvedValue([]), getPlannedSets: vi.fn().mockResolvedValue([]),
    } as unknown as ActiveSessionLoadingPort;

    const result = await new ActiveSessionLoadingUseCases(port).loadActiveSessionData('session');

    expect(port.getPlannedWorkout).toHaveBeenCalledWith('planned-workout');
    expect(port.getPlannedWorkout).not.toHaveBeenCalledWith('direct');
    expect(result?.loadedGroups.map(group => group.items[0].occurrenceIndex)).toEqual([0, 1]);
  });

  it('does not call the port for an absent active-session id', async () => {
    const port = { getHydratedSession: vi.fn() } as unknown as ActiveSessionLoadingPort;
    await expect(new ActiveSessionLoadingUseCases(port).loadActiveSessionData(null)).resolves.toBeNull();
    expect(port.getHydratedSession).not.toHaveBeenCalled();
  });
});
