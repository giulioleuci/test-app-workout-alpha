import { describe, expect, it, vi } from 'vitest';

import { SessionActivationUseCases, type SessionActivationPort } from '@/application/sessionActivation';

describe('SessionActivationUseCases', () => {
  it('finishes the active session with the injected activation time before rejecting a missing plan', async () => {
    const completedAt = new Date('2025-01-02T03:04:05.000Z');
    const finishSession = vi.fn().mockResolvedValue(undefined);
    const port = {
      findActiveSession: vi.fn().mockResolvedValue({ id: 'active-session' }),
      getPlannedSession: vi.fn().mockResolvedValue(undefined),
    } as unknown as SessionActivationPort;
    const useCases = new SessionActivationUseCases(port, { finishSession }, () => 'new-session', () => completedAt);

    await expect(useCases.activateSession('missing-plan')).rejects.toThrow('Planned session missing-plan not found');

    expect(finishSession).toHaveBeenCalledWith('active-session', completedAt);
    expect(port.getPlannedSession).toHaveBeenCalledWith('missing-plan');
  });

  it('uses the newest substitution and keeps missing exercise names presentation-safe', async () => {
    const port = {
      getPlannedGroups: vi.fn().mockResolvedValue([{ id: 'group' }]),
      getPlannedItems: vi.fn().mockResolvedValue([{ id: 'item' }]),
      getSubstitutions: vi.fn().mockResolvedValue([
        { originalExerciseId: 'original', substitutedExerciseId: 'old', createdAt: new Date('2024-01-01') },
        { originalExerciseId: 'original', substitutedExerciseId: 'new', createdAt: new Date('2024-02-01') },
      ]),
      getExercise: vi.fn().mockImplementation((id: string) => Promise.resolve(id === 'new' ? { id, name: 'New exercise' } : undefined)),
    } as unknown as SessionActivationPort;
    const useCases = new SessionActivationUseCases(port, { finishSession: vi.fn() }, () => 'id', () => new Date());

    await expect(useCases.prepareSessionActivation('plan')).resolves.toEqual({
      substitutionPrompts: [{ plannedItemId: 'item', originalExerciseId: 'original', originalExerciseName: 'Unknown', suggestedExerciseId: 'new', suggestedExerciseName: 'New exercise', lastUsedDate: new Date('2024-02-01') }],
    });
  });
});
