import { describe, expect, it, vi } from 'vitest';

import { VolumeUseCases } from '@/application/volumes';
import type { VolumePlanningPort } from '@/application/volumes';

function createPort(overrides: Partial<VolumePlanningPort> = {}): VolumePlanningPort {
  return {
    getSessionItems: vi.fn().mockResolvedValue(null),
    getWorkoutData: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

describe('VolumeUseCases', () => {
  it('returns the requested empty session analysis when planning data is absent', async () => {
    const useCases = new VolumeUseCases(createPort(), vi.fn());

    await expect(useCases.analyzeSessionVolume('session-1', 'Upper', key => key, key => key, key => key)).resolves.toEqual({
      sessionId: 'session-1',
      sessionName: 'Upper',
      byMuscle: [],
      byMuscleGroup: [],
      byMovementPattern: [],
      byObjective: [],
    });
  });

  it('starts duration lookup even when the planned session is absent', async () => {
    const getSessionItems = vi.fn().mockResolvedValue(null);
    const estimateSessionDuration = vi.fn().mockResolvedValue({ minSeconds: 0, maxSeconds: 0 });
    const useCases = new VolumeUseCases(createPort({ getSessionItems }), estimateSessionDuration);

    await expect(useCases.getSessionVolumeAndDuration('session-1')).resolves.toBeNull();
    expect(getSessionItems).toHaveBeenCalledWith('session-1');
    expect(estimateSessionDuration).toHaveBeenCalledWith('session-1');
  });
});
