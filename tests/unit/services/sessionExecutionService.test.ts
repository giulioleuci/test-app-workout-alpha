import { nanoid } from 'nanoid';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useActiveSessionStore } from '@/stores/activeSessionStore';

// vi.mock calls are hoisted, so they run before the imports above are evaluated.
vi.mock('@/composition/system', () => ({
  systemCommands: {
    isInitialized: () => true,
    getCurrentUserId: () => 'test-user-id'
  }
}));

vi.mock('@/db/repositories/SessionRepository', () => ({
  SessionRepository: {
    saveFullSession: vi.fn().mockResolvedValue('session-id'),
  }
}));

describe('SessionExecutionService', () => {
  beforeEach(() => {
    useActiveSessionStore.getState().reset();
    vi.clearAllMocks();
  });

  describe('Session Lifecycle', () => {
    it('should initialize a session correctly', () => {
      const sessionId = nanoid();

      useActiveSessionStore.getState().setActiveSession(sessionId);

      const currentState = useActiveSessionStore.getState();
      expect(currentState.activeSessionId).toBe(sessionId);
    });

    it('should discard a session and clear the store', () => {
        const sessionId = nanoid();

        useActiveSessionStore.getState().setActiveSession(sessionId);
        expect(useActiveSessionStore.getState().activeSessionId).toBe(sessionId);

        useActiveSessionStore.getState().reset();

        expect(useActiveSessionStore.getState().activeSessionId).toBeNull();
    });
  });
});
