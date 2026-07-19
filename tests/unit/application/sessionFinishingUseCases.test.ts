import { describe, expect, it, vi } from 'vitest';

import { SessionFinishingUseCases } from '@/application/sessionFinishing';
import type { SessionFinishingPort } from '@/application/sessionFinishing';

describe('SessionFinishingUseCases', () => {
  it('delegates discard to the persistence boundary', async () => {
    const discardSession = vi.fn().mockResolvedValue(undefined);
    const useCases = new SessionFinishingUseCases({ discardSession } as unknown as SessionFinishingPort);

    await useCases.discardSession('session-1');

    expect(discardSession).toHaveBeenCalledWith('session-1');
  });
});
