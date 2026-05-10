import { renderHook, act, waitFor } from '@testing-library/react';
import { useNavigate } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useSessionActivation } from '@/hooks/useSessionActivation';
import * as toastHook from '@/hooks/useToast';
import * as activationService from '@/services/sessionActivation';
import * as activeSessionStore from '@/stores/activeSessionStore';

// Mocks
vi.mock('@/services/sessionActivation', () => ({
  prepareSessionActivation: vi.fn(),
  activateSession: vi.fn(),
  findPendingSessionInfo: vi.fn(),
}));

vi.mock('@/stores/activeSessionStore', () => ({
  useActiveSessionStore: vi.fn(),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
}));

describe('useSessionActivation', () => {
  const mockNavigate = vi.fn();
  const mockToast = vi.fn();
  const mockSetActiveSession = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as any).mockReturnValue(mockNavigate);
    (toastHook.useToast as any).mockReturnValue({ toast: mockToast });
    (activeSessionStore.useActiveSessionStore as any).mockImplementation((selector: any) => {
        if (!selector) return { activeSessionId: null, setActiveSession: mockSetActiveSession };
        // Simple mock for selector: call it with state
        return selector({ activeSessionId: null, setActiveSession: mockSetActiveSession });
    });
  });

  it('should activate session directly if no pending session and no substitutions', async () => {
    (activationService.findPendingSessionInfo as any).mockResolvedValue(null);
    (activationService.prepareSessionActivation as any).mockResolvedValue({ substitutionPrompts: [] });
    (activationService.activateSession as any).mockResolvedValue('new-session-id');

    const { result } = renderHook(() => useSessionActivation());

    await act(async () => {
      await result.current.handleStartSession('plan-id', 'workout-id');
    });

    expect(activationService.findPendingSessionInfo).toHaveBeenCalled();
    expect(activationService.prepareSessionActivation).toHaveBeenCalledWith('plan-id');
    expect(activationService.activateSession).toHaveBeenCalledWith('plan-id', undefined);
    expect(mockSetActiveSession).toHaveBeenCalledWith('new-session-id', 'plan-id', 'workout-id');
    expect(mockNavigate).toHaveBeenCalledWith('/session/active');
  });

  it('should show pending session dialog if pending session exists', async () => {
    const pendingSession = { id: 'pending-id', startedAt: new Date(), sessionName: 'Pending' };
    (activationService.findPendingSessionInfo as any).mockResolvedValue(pendingSession);

    const { result } = renderHook(() => useSessionActivation());

    await act(async () => {
      await result.current.handleStartSession('plan-id', 'workout-id');
    });

    expect(result.current.pendingDialogOpen).toBe(true);
    expect(result.current.pendingSession).toEqual(pendingSession);
    expect(activationService.activateSession).not.toHaveBeenCalled();
  });

  it('should activate session after resolving pending session', async () => {
    const pendingSession = { id: 'pending-id', startedAt: new Date(), sessionName: 'Pending' };
    (activationService.findPendingSessionInfo as any).mockResolvedValue(pendingSession);
    (activationService.prepareSessionActivation as any).mockResolvedValue({ substitutionPrompts: [] });
    (activationService.activateSession as any).mockResolvedValue('new-session-id');

    const { result } = renderHook(() => useSessionActivation());

    await act(async () => {
      await result.current.handleStartSession('plan-id', 'workout-id');
    });

    // Simulate user resolving pending session (e.g., discarding it via dialog which calls handlePendingResolved)
    // Note: The hook logic sets a callback.

    act(() => {
        result.current.onPendingResolved();
    });

    await waitFor(() => {
        expect(activationService.activateSession).toHaveBeenCalled();
    });
  });

  it('should show substitution dialog if prompts exist', async () => {
    (activationService.findPendingSessionInfo as any).mockResolvedValue(null);
    (activationService.prepareSessionActivation as any).mockResolvedValue({
      substitutionPrompts: [{ plannedExerciseItemId: 'item1', originalExerciseName: 'Ex1' }]
    });

    const { result } = renderHook(() => useSessionActivation());

    await act(async () => {
      await result.current.handleStartSession('plan-id', 'workout-id');
    });

    expect(result.current.subDialogOpen).toBe(true);
    expect(result.current.subPrompts).toHaveLength(1);
    expect(activationService.activateSession).not.toHaveBeenCalled();
  });

  it('should activate session with choices after substitution complete', async () => {
    (activationService.findPendingSessionInfo as any).mockResolvedValue(null);
    (activationService.prepareSessionActivation as any).mockResolvedValue({
      substitutionPrompts: [{ plannedExerciseItemId: 'item1', originalExerciseName: 'Ex1' }]
    });
    (activationService.activateSession as any).mockResolvedValue('new-session-id');

    const { result } = renderHook(() => useSessionActivation());

    await act(async () => {
      await result.current.handleStartSession('plan-id', 'workout-id');
    });

    const choices = new Map([['item1', 'sub-ex-id']]);
    act(() => {
        result.current.onSubstitutionComplete(choices);
    });

    await waitFor(() => {
        expect(activationService.activateSession).toHaveBeenCalledWith('plan-id', choices);
    });
  });
});
