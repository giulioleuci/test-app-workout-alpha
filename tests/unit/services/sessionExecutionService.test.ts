import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock systemService BEFORE importing activeSessionStore
vi.mock('@/services/systemService', () => ({
  systemService: {
    isInitialized: () => true,
    getCurrentUserId: () => 'test-user-id'
  }
}));

import { useActiveSessionStore } from '@/stores/activeSessionStore';
import { nanoid } from 'nanoid';

// Mock dependencies
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
    it('should initialize a session correctly', async () => {
      const sessionId = nanoid();

      useActiveSessionStore.getState().setActiveSession(sessionId);

      const currentState = useActiveSessionStore.getState();
      expect(currentState.activeSessionId).toBe(sessionId);
    });

    it('should discard a session and clear the store', async () => {
        const sessionId = nanoid();

        useActiveSessionStore.getState().setActiveSession(sessionId);
        expect(useActiveSessionStore.getState().activeSessionId).toBe(sessionId);

        useActiveSessionStore.getState().reset();

        expect(useActiveSessionStore.getState().activeSessionId).toBeNull();
    });
  });
});
